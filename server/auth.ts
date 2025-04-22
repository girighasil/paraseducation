import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";
import memoryStore from "memorystore";
import url from 'url';
import { db } from './db';
import { sql, eq } from 'drizzle-orm';
import { users, type User } from '@shared/schema';

const scryptAsync = promisify(scrypt);

export async function createInitialAdmin() {
  try {
    // Check if admin user exists - using drizzle syntax to be more compatible
    const existingAdmin = await db.select().from(users).where(sql`username = 'admin'`);

    if (!existingAdmin || existingAdmin.length === 0) {
      // Create admin user
      // Using scrypt + salt for password hashing
      const hashedPassword = await hashPassword('admin123');
      
      await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        fullName: 'Administrator',
        role: 'admin'
      });

      console.log('Created initial admin user');
    } else {
      console.log('Admin user already exists');
    }
    
    // Create teacher user if it doesn't exist
    const existingTeacher = await db.select().from(users).where(sql`username = 'teacher'`);
    
    if (!existingTeacher || existingTeacher.length === 0) {
      // Create teacher user
      const hashedPassword = await hashPassword('teacher123');
      
      await db.insert(users).values({
        username: 'teacher',
        password: hashedPassword,
        email: 'teacher@example.com',
        fullName: 'Teacher User',
        role: 'teacher'
      });

      console.log('Created initial teacher user');
    } else {
      console.log('Teacher user already exists');
    }
  } catch (error) {
    console.error('Error creating initial users:', error);
  }
}

// Initialize session store based on database type
let sessionStore: session.Store;

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sqlite')) {
  // If using PostgreSQL, use pg session store
  console.log("Using PostgreSQL session store");
  const PostgresSessionStore = connectPg(session);
  
  // Create the PostgreSQL session store
  sessionStore = new PostgresSessionStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
    },
    createTableIfMissing: true
  });
} else {
  // If using SQLite or no DB URL specified, use memory store
  console.log("Using in-memory session store");
  const MemoryStore = memoryStore(session);
  
  // Create the memory session store
  sessionStore = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
}

export function setupAuth(app: Express) {
  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "maths-magic-town-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({
      message: "Logged in successfully",
      user: {
        id: req.user!.id,
        username: req.user!.username,
        email: req.user!.email,
        fullName: req.user!.fullName,
        role: req.user!.role
      }
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/session", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        isAuthenticated: true,
        user: {
          id: req.user!.id,
          username: req.user!.username,
          email: req.user!.email,
          fullName: req.user!.fullName,
          role: req.user!.role,
          phone: req.user!.phone
        }
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // Registration route
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, fullName, phone, role } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        fullName,
        phone,
        role: role || "user" // Default to "user" if no role specified
      });

      // Auto login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          message: "User registered successfully",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          }
        });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  // Change password route
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      
      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user password
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check if user is admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
}

// Middleware to check if user is teacher or admin
export function isTeacherOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user?.role === "teacher" || req.user?.role === "admin")) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Teacher or Admin access required" });
}

// Middleware to check if user is teacher
export function isTeacher(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === "teacher") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Teacher access required" });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    return false;
  }
}