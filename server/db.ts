import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import ws from "ws";
import * as schema from "@shared/schema";
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Configure Neon database
neonConfig.webSocketConstructor = ws;

// Database type
let db: any;

// Initialize database based on availability
if (process.env.DATABASE_URL) {
  // Use PostgreSQL if DATABASE_URL is available
  console.log("Using PostgreSQL database");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePostgres({ client: pool, schema });
} else {
  // Otherwise, fall back to SQLite
  console.log("DATABASE_URL not set, using SQLite database");
  
  // Make sure the data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Use SQLite database
  const sqlite = new Database(path.join(dataDir, 'maths-magic-town.db'));
  db = drizzleSQLite(sqlite, { schema });
  
  // Set a fake DATABASE_URL environment variable for compatibility 
  // with other parts of the codebase that might check for it
  process.env.DATABASE_URL = 'sqlite://maths-magic-town.db';
  
  // Also set fake Postgres environment variables for session store compatibility
  process.env.PGDATABASE = 'sqlite';
  process.env.PGHOST = 'localhost';
  process.env.PGPORT = '5432';
  process.env.PGUSER = 'sqlite';
  process.env.PGPASSWORD = 'sqlite';
}

export { db };
