import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  varchar,
  jsonb,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role").default("user").notNull(), // Can be "admin", "teacher", or "user"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
});

// We'll define user relations after testAttempts is defined

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: text("duration").notNull(),
  modules: integer("modules").notNull(),
  price: integer("price").notNull(),
  discountPrice: integer("discount_price"),
  imageUrl: text("image_url").notNull(),
  categories: text("categories").array().notNull(),
  popular: boolean("popular").default(false),
  isLive: boolean("is_live").default(true),
  creatorId: integer("creator_id").references(() => users.id),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  title: true,
  description: true,
  duration: true,
  modules: true,
  price: true,
  discountPrice: true,
  imageUrl: true,
  categories: true,
  popular: true,
  isLive: true,
  creatorId: true,
  isPublished: true,
});

export const doubtSessions = pgTable("doubt_sessions", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDoubtSessionSchema = createInsertSchema(doubtSessions).pick({
  subject: true,
  date: true,
  timeSlot: true,
  description: true,
  imageUrl: true,
  userId: true,
  name: true,
  email: true,
  phone: true,
  status: true,
});

export const doubtSessionsRelations = relations(doubtSessions, ({ one }) => ({
  user: one(users, {
    fields: [doubtSessions.userId],
    references: [users.id],
  }),
}));

export const testSeries = pgTable("test_series", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  testCount: integer("test_count").notNull(),
  price: integer("price").notNull(),
  features: text("features").array().notNull(),
  creatorId: integer("creator_id").references(() => users.id),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestSeriesSchema = createInsertSchema(testSeries).pick({
  title: true,
  description: true,
  category: true,
  testCount: true,
  price: true,
  features: true,
  creatorId: true,
  isPublished: true,
});

export const tests = pgTable("tests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  testSeriesId: integer("test_series_id").references(() => testSeries.id, {
    onDelete: "cascade",
  }),
  duration: integer("duration").notNull(), // in minutes
  totalMarks: integer("total_marks").notNull(),
  passingMarks: integer("passing_marks").notNull(),
  negativeMarking: decimal("negative_marking").notNull(), // factor for negative marking (e.g., 0.25)
  instructions: text("instructions"),
  fileUrl: text("file_url"), // URL to the uploaded file (optional)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestSchema = createInsertSchema(tests).pick({
  title: true,
  description: true,
  testSeriesId: true,
  duration: true,
  totalMarks: true,
  passingMarks: true,
  negativeMarking: true,
  instructions: true,
  fileUrl: true,
  isActive: true,
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").references(() => tests.id, {
    onDelete: "cascade",
  }),
  questionText: text("question_text").notNull(),
  marks: integer("marks").notNull().default(1),
  questionType: text("question_type").notNull().default("mcq"), // mcq, multi-select, etc.
  imageUrl: text("image_url"), // optional image with the question
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  testId: true,
  questionText: true,
  marks: true,
  questionType: true,
  imageUrl: true,
});

export const options = pgTable("options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => questions.id, {
    onDelete: "cascade",
  }),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOptionSchema = createInsertSchema(options).pick({
  questionId: true,
  optionText: true,
  isCorrect: true,
});

export const explanations = pgTable("explanations", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => questions.id, {
    onDelete: "cascade",
  }),
  explanationText: text("explanation_text").notNull(),
  imageUrl: text("image_url"), // optional image
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExplanationSchema = createInsertSchema(explanations).pick({
  questionId: true,
  explanationText: true,
  imageUrl: true,
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  testimonial: text("testimonial").notNull(),
  rating: integer("rating").notNull(),
  examName: text("exam_name"),
  rank: text("rank"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).pick({
  name: true,
  testimonial: true,
  rating: true,
  examName: true,
  rank: true,
  imageUrl: true,
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  name: true,
  email: true,
  phone: true,
  subject: true,
  message: true,
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFaqSchema = createInsertSchema(faqs).pick({
  question: true,
  answer: true,
  order: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type DoubtSession = typeof doubtSessions.$inferSelect;
export type InsertDoubtSession = z.infer<typeof insertDoubtSessionSchema>;

export const questionsRelations = relations(questions, ({ one, many }) => ({
  test: one(tests, {
    fields: [questions.testId],
    references: [tests.id],
  }),
  options: many(options),
  explanation: one(explanations, {
    fields: [questions.id],
    references: [explanations.questionId],
  }),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.questionId],
    references: [questions.id],
  }),
}));

export const explanationsRelations = relations(explanations, ({ one }) => ({
  question: one(questions, {
    fields: [explanations.questionId],
    references: [questions.id],
  }),
}));

export const testSeriesRelations = relations(testSeries, ({ many }) => ({
  tests: many(tests),
}));

export type TestSeries = typeof testSeries.$inferSelect;
export type InsertTestSeries = z.infer<typeof insertTestSeriesSchema>;

export type Test = typeof tests.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Option = typeof options.$inferSelect;
export type InsertOption = z.infer<typeof insertOptionSchema>;

export type Explanation = typeof explanations.$inferSelect;
export type InsertExplanation = z.infer<typeof insertExplanationSchema>;

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type FAQ = typeof faqs.$inferSelect;
export type InsertFAQ = z.infer<typeof insertFaqSchema>;

// Test Attempts - tracks each test session by a user
export const testAttempts = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  testId: integer("test_id")
    .references(() => tests.id, { onDelete: "cascade" })
    .notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  score: decimal("score"),
  totalMarks: integer("total_marks").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  timeTaken: integer("time_taken"), // in seconds
  correctAnswers: integer("correct_answers"),
  incorrectAnswers: integer("incorrect_answers"),
  unanswered: integer("unanswered"),
  percentage: decimal("percentage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestAttemptSchema = createInsertSchema(testAttempts).pick({
  userId: true,
  testId: true,
  startTime: true,
  endTime: true,
  score: true,
  totalMarks: true,
  isCompleted: true,
  timeTaken: true,
  correctAnswers: true,
  incorrectAnswers: true,
  unanswered: true,
  percentage: true,
});

// User Answers - stores individual answers for each question in a test attempt
export const userAnswers = pgTable("user_answers", {
  id: serial("id").primaryKey(),
  testAttemptId: integer("test_attempt_id")
    .references(() => testAttempts.id, { onDelete: "cascade" })
    .notNull(),
  questionId: integer("question_id")
    .references(() => questions.id, { onDelete: "cascade" })
    .notNull(),
  answer: text("answer").notNull(), // Stores the selected option ID for MCQs or text for other question types
  isCorrect: boolean("is_correct"),
  marksObtained: decimal("marks_obtained"), // Can be negative in case of negative marking
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserAnswerSchema = createInsertSchema(userAnswers).pick({
  testAttemptId: true,
  questionId: true,
  answer: true,
  isCorrect: true,
  marksObtained: true,
});

// Relationships for test attempts
export const testAttemptsRelations = relations(
  testAttempts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [testAttempts.userId],
      references: [users.id],
    }),
    test: one(tests, {
      fields: [testAttempts.testId],
      references: [tests.id],
    }),
    userAnswers: many(userAnswers),
  }),
);

// Relationships for user answers
export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  testAttempt: one(testAttempts, {
    fields: [userAnswers.testAttemptId],
    references: [testAttempts.id],
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id],
  }),
}));

// Complete testsRelations definition
export const testsRelations = relations(tests, ({ one, many }) => ({
  testSeries: one(testSeries, {
    fields: [tests.testSeriesId],
    references: [testSeries.id],
  }),
  questions: many(questions),
  testAttempts: many(testAttempts),
}));

// Export types for test attempts and user answers
export type TestAttempt = typeof testAttempts.$inferSelect;
export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;

export type UserAnswer = typeof userAnswers.$inferSelect;
export type InsertUserAnswer = z.infer<typeof insertUserAnswerSchema>;

// Site Configuration Schema
export const siteConfig = pgTable("site_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SiteConfig = typeof siteConfig.$inferSelect;
export type InsertSiteConfig = typeof siteConfig.$inferInsert;

// Course Videos Schema
export const courseVideos = pgTable("course_videos", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  videoType: text("video_type").notNull(), // 'youtube', 'upload', etc.
  videoUrl: text("video_url"), // URL for YouTube videos
  videoFile: text("video_file"), // Path to uploaded video file
  thumbnail: text("thumbnail"), // Thumbnail image URL
  duration: text("duration"), // Duration in format "HH:MM:SS" or minutes
  order: integer("order").default(0).notNull(), // For ordering videos in a course
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCourseVideoSchema = createInsertSchema(courseVideos).pick({
  courseId: true,
  title: true,
  description: true,
  videoType: true,
  videoUrl: true,
  videoFile: true,
  thumbnail: true,
  duration: true,
  order: true,
  isPublished: true,
});

export type CourseVideo = typeof courseVideos.$inferSelect;
export type InsertCourseVideo = z.infer<typeof insertCourseVideoSchema>;

export const coursesRelations = relations(courses, ({ many }) => ({
  videos: many(courseVideos),
}));

export const courseVideosRelations = relations(courseVideos, ({ one }) => ({
  course: one(courses, {
    fields: [courseVideos.courseId],
    references: [courses.id],
  }),
}));

// Define user relations now that testAttempts is defined
export const usersRelations = relations(users, ({ many }) => ({
  doubtSessions: many(doubtSessions),
  testAttempts: many(testAttempts),
}));
