import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  testAttempts: many(testAttempts),
  sessions: many(sessions),
}));

// Courses
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in weeks
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coursesRelations = relations(courses, ({ many, one }) => ({
  lessons: many(lessons),
  enrollments: many(enrollments),
  tests: many(tests),
}));

// Lessons
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url"),
  content: text("content").notNull(),
  duration: integer("duration"), // in minutes
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
}));

// Enrollments
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  testId: integer("test_id").references(() => tests.id, { onDelete: "cascade" }), // Optional, if enrollment is for a specific test
  enrollmentType: text("enrollment_type", { enum: ["course", "test"] }).notNull().default("course"),
  status: text("status", { enum: ["pending", "approved", "rejected", "completed"] }).default("pending"),
  progress: integer("progress").default(0), // Percentage complete
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  approvedBy: integer("approved_by").references(() => users.id), // Admin/teacher who approved
});

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  test: one(tests, {
    fields: [enrollments.testId],
    references: [tests.id],
  }),
  approver: one(users, {
    fields: [enrollments.approvedBy],
    references: [users.id],
  }),
}));

// Tests
export const tests = pgTable("tests", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in minutes
  passingScore: integer("passing_score").notNull(), // Percentage
  totalQuestions: integer("total_questions").notNull(),
  totalMarks: integer("total_marks").notNull().default(0),
  negativeMarking: doublePrecision("negative_marking").default(0),
  instructions: text("instructions").default(""),
  isActive: boolean("is_active").notNull().default(false), // Whether the test is published and available to students
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const testsRelations = relations(tests, ({ one, many }) => ({
  course: one(courses, {
    fields: [tests.courseId],
    references: [courses.id],
  }),
  questions: many(questions),
  testAttempts: many(testAttempts),
}));

// Questions
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: json("options").$type<string[]>().notNull(),
  correctOption: integer("correct_option").notNull(),
  explanation: text("explanation"),
  marks: integer("marks").notNull().default(1),
  order: integer("order").notNull(),
});

export const questionsRelations = relations(questions, ({ one }) => ({
  test: one(tests, {
    fields: [questions.testId],
    references: [tests.id],
  }),
}));

// Test Attempts
export const testAttempts = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  testId: integer("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
  score: integer("score"),
  maxScore: integer("max_score").notNull(),
  percentage: doublePrecision("percentage"),
  answers: json("answers").$type<Record<number, number>>(), // Question ID -> Selected option index
  status: text("status").notNull().default("pending"), // pending, completed, missed
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const testAttemptsRelations = relations(testAttempts, ({ one }) => ({
  user: one(users, {
    fields: [testAttempts.userId],
    references: [users.id],
  }),
  test: one(tests, {
    fields: [testAttempts.testId],
    references: [tests.id],
  }),
}));

// Doubt Sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").references(() => users.id), // Optional, for 1-1 sessions
  instructorId: integer("instructor_id").notNull().references(() => users.id),
  sessionDate: timestamp("session_date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  meetingUrl: text("meeting_url"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  instructor: one(users, {
    fields: [sessions.instructorId],
    references: [users.id],
  }),
}));

// Define insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  title: true,
  description: true,
  duration: true,
  thumbnail: true,
});

export const insertLessonSchema = createInsertSchema(lessons).pick({
  courseId: true,
  title: true,
  description: true,
  videoUrl: true,
  content: true,
  duration: true,
  order: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).pick({
  userId: true,
  courseId: true,
  testId: true,
  enrollmentType: true,
  status: true,
  progress: true,
  approvedBy: true
});

export const insertTestSchema = createInsertSchema(tests).pick({
  courseId: true,
  title: true,
  description: true,
  duration: true,
  passingScore: true,
  totalQuestions: true,
  totalMarks: true,
  negativeMarking: true,
  instructions: true,
  isActive: true,
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  testId: true,
  question: true,
  options: true,
  correctOption: true,
  explanation: true,
  marks: true,
  order: true,
});

export const insertTestAttemptSchema = createInsertSchema(testAttempts).pick({
  userId: true,
  testId: true,
  score: true,
  maxScore: true,
  percentage: true,
  answers: true,
  status: true,
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  title: true,
  description: true,
  userId: true,
  instructorId: true,
  sessionDate: true,
  duration: true,
  meetingUrl: true,
  status: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;

export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;
export type TestAttempt = typeof testAttempts.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
