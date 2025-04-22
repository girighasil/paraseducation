import { 
  users, type User, type InsertUser,
  courses, type Course, type InsertCourse,
  doubtSessions, type DoubtSession, type InsertDoubtSession,
  testSeries, type TestSeries, type InsertTestSeries,
  testimonials, type Testimonial, type InsertTestimonial,
  contacts, type Contact, type InsertContact,
  faqs, type FAQ, type InsertFAQ,
  siteConfig, type SiteConfig, type InsertSiteConfig,
  tests, type Test, type InsertTest,
  questions, type Question, type InsertQuestion,
  options, type Option, type InsertOption,
  explanations, type Explanation, type InsertExplanation,
  testAttempts, type TestAttempt, type InsertTestAttempt,
  userAnswers, type UserAnswer, type InsertUserAnswer,
  courseVideos, type CourseVideo, type InsertCourseVideo
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  // Courses
  getAllCourses(): Promise<Course[]>;
  getCoursesByCategory(category: string): Promise<Course[]>;
  getCoursesByCreator(creatorId: number): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: number): Promise<void>;
  
  // Doubt Sessions
  createDoubtSession(session: InsertDoubtSession): Promise<DoubtSession>;
  getDoubtSession(id: number): Promise<DoubtSession | undefined>;
  getDoubtSessionsByUser(userId: number): Promise<DoubtSession[]>;
  getDoubtSessionsByTeacher(teacherId: number): Promise<DoubtSession[]>;
  getAllDoubtSessions(): Promise<DoubtSession[]>;
  updateDoubtSession(id: number, session: Partial<InsertDoubtSession>): Promise<DoubtSession>;
  deleteDoubtSession(id: number): Promise<void>;
  
  // Test Series
  getAllTestSeries(): Promise<TestSeries[]>;
  getTestSeriesByCreator(creatorId: number): Promise<TestSeries[]>;
  getTestSeries(id: number): Promise<TestSeries | undefined>;
  createTestSeries(testSeries: InsertTestSeries): Promise<TestSeries>;
  updateTestSeries(id: number, testSeries: Partial<InsertTestSeries>): Promise<TestSeries>;
  deleteTestSeries(id: number): Promise<void>;
  
  // Testimonials
  getAllTestimonials(): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: number, testimonial: Partial<InsertTestimonial>): Promise<Testimonial>;
  deleteTestimonial(id: number): Promise<void>;
  
  // Contact Messages
  createContact(contact: InsertContact): Promise<Contact>;
  getAllContacts(): Promise<Contact[]>;
  deleteContact(id: number): Promise<void>;
  
  // FAQs
  getAllFAQs(): Promise<FAQ[]>;
  createFAQ(faq: InsertFAQ): Promise<FAQ>;
  updateFAQ(id: number, faq: Partial<InsertFAQ>): Promise<FAQ>;
  deleteFAQ(id: number): Promise<void>;
  
  // Tests
  getAllTests(): Promise<Test[]>;
  getTestsByTestSeries(testSeriesId: number): Promise<Test[]>;
  getTest(id: number): Promise<Test | undefined>;
  createTest(test: InsertTest): Promise<Test>;
  updateTest(id: number, test: Partial<InsertTest>): Promise<Test>;
  deleteTest(id: number): Promise<void>;
  
  // Questions
  getQuestionsByTest(testId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, question: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: number): Promise<void>;
  
  // Options
  getOptionsByQuestion(questionId: number): Promise<Option[]>;
  createOption(option: InsertOption): Promise<Option>;
  updateOption(id: number, option: Partial<InsertOption>): Promise<Option>;
  deleteOption(id: number): Promise<void>;
  
  // Explanations
  getExplanationByQuestion(questionId: number): Promise<Explanation | undefined>;
  createExplanation(explanation: InsertExplanation): Promise<Explanation>;
  updateExplanation(id: number, explanation: Partial<InsertExplanation>): Promise<Explanation>;
  deleteExplanation(id: number): Promise<void>;
  
  // Site Configuration
  getSiteConfig(key: string): Promise<any>;
  getAllSiteConfig(): Promise<Record<string, any>>;
  updateSiteConfig(key: string, value: any): Promise<void>;
  
  // Test Attempts
  createTestAttempt(testAttempt: InsertTestAttempt): Promise<TestAttempt>;
  getTestAttempt(id: number): Promise<TestAttempt | undefined>;
  getTestAttemptsByUser(userId: number): Promise<TestAttempt[]>;
  getIncompleteTestAttemptsByUserAndTest(userId: number, testId: number): Promise<TestAttempt[]>;
  updateTestAttempt(id: number, testAttemptData: Partial<InsertTestAttempt>): Promise<TestAttempt>;
  
  // User Answers
  createUserAnswer(userAnswer: InsertUserAnswer): Promise<UserAnswer>;
  getUserAnswersByTestAttempt(testAttemptId: number): Promise<UserAnswer[]>;
  getUserAnswerByQuestionAndAttempt(testAttemptId: number, questionId: number): Promise<UserAnswer | undefined>;
  updateUserAnswer(id: number, userAnswerData: Partial<InsertUserAnswer>): Promise<UserAnswer>;
  
  // Course Videos
  getAllCourseVideos(): Promise<CourseVideo[]>;
  getCourseVideosByCourse(courseId: number): Promise<CourseVideo[]>;
  getCourseVideo(id: number): Promise<CourseVideo | undefined>;
  createCourseVideo(courseVideo: InsertCourseVideo): Promise<CourseVideo>;
  updateCourseVideo(id: number, courseVideo: Partial<InsertCourseVideo>): Promise<CourseVideo>;
  deleteCourseVideo(id: number): Promise<void>;
  
  // Database Setup
  setupInitialData(): Promise<void>;
}

import { db } from "./db";
import { eq, desc, asc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
  
  // Courses
  async getAllCourses(): Promise<Course[]> {
    try {
      const result = await db.select().from(courses);
      return result;
    } catch (error) {
      console.error("Error in getAllCourses:", error);
      return [];
    }
  }
  
  async getCoursesByCategory(category: string): Promise<Course[]> {
    try {
      // Use custom SQL query to filter by array membership
      const { rows } = await db.execute(
        sql`SELECT * FROM courses WHERE ${category} = ANY(categories)`
      );
      return rows as Course[];
    } catch (error) {
      console.error("Error in getCoursesByCategory:", error);
      return [];
    }
  }
  
  async getCoursesByCreator(creatorId: number): Promise<Course[]> {
    try {
      return await db.select().from(courses).where(eq(courses.creatorId, creatorId));
    } catch (error) {
      console.error("Error in getCoursesByCreator:", error);
      return [];
    }
  }
  
  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }
  
  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(insertCourse).returning();
    return course;
  }
  
  async updateCourse(id: number, courseData: Partial<InsertCourse>): Promise<Course> {
    const [course] = await db
      .update(courses)
      .set(courseData)
      .where(eq(courses.id, id))
      .returning();
    return course;
  }
  
  async deleteCourse(id: number): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }
  
  // Doubt Sessions
  async createDoubtSession(insertSession: InsertDoubtSession): Promise<DoubtSession> {
    const [session] = await db.insert(doubtSessions).values(insertSession).returning();
    return session;
  }
  
  async getDoubtSession(id: number): Promise<DoubtSession | undefined> {
    const [session] = await db.select().from(doubtSessions).where(eq(doubtSessions.id, id));
    return session;
  }
  
  async getDoubtSessionsByUser(userId: number): Promise<DoubtSession[]> {
    return await db.select().from(doubtSessions).where(eq(doubtSessions.userId, userId));
  }
  
  async getDoubtSessionsByTeacher(teacherId: number): Promise<DoubtSession[]> {
    return await db.select().from(doubtSessions).where(eq(doubtSessions.userId, teacherId));
  }
  
  async getAllDoubtSessions(): Promise<DoubtSession[]> {
    return await db.select().from(doubtSessions);
  }
  
  async updateDoubtSession(id: number, sessionData: Partial<InsertDoubtSession>): Promise<DoubtSession> {
    const [session] = await db
      .update(doubtSessions)
      .set(sessionData)
      .where(eq(doubtSessions.id, id))
      .returning();
    return session;
  }
  
  async deleteDoubtSession(id: number): Promise<void> {
    await db.delete(doubtSessions).where(eq(doubtSessions.id, id));
  }
  
  // Test Series
  async getAllTestSeries(): Promise<TestSeries[]> {
    return await db.select().from(testSeries);
  }
  
  async getTestSeriesByCreator(creatorId: number): Promise<TestSeries[]> {
    try {
      return await db.select().from(testSeries).where(eq(testSeries.creatorId, creatorId));
    } catch (error) {
      console.error("Error in getTestSeriesByCreator:", error);
      return [];
    }
  }
  
  async getTestSeries(id: number): Promise<TestSeries | undefined> {
    const [series] = await db.select().from(testSeries).where(eq(testSeries.id, id));
    return series;
  }
  
  async createTestSeries(insertTestSeries: InsertTestSeries): Promise<TestSeries> {
    const [series] = await db.insert(testSeries).values(insertTestSeries).returning();
    return series;
  }
  
  async updateTestSeries(id: number, testSeriesData: Partial<InsertTestSeries>): Promise<TestSeries> {
    const [series] = await db
      .update(testSeries)
      .set(testSeriesData)
      .where(eq(testSeries.id, id))
      .returning();
    return series;
  }
  
  async deleteTestSeries(id: number): Promise<void> {
    await db.delete(testSeries).where(eq(testSeries.id, id));
  }
  
  // Tests
  async getAllTests(): Promise<Test[]> {
    return await db.select().from(tests);
  }
  
  async getTestsByTestSeries(testSeriesId: number): Promise<Test[]> {
    return await db.select().from(tests).where(eq(tests.testSeriesId, testSeriesId));
  }
  
  async getTest(id: number): Promise<Test | undefined> {
    const [test] = await db.select().from(tests).where(eq(tests.id, id));
    return test;
  }
  
  async createTest(insertTest: InsertTest): Promise<Test> {
    const [test] = await db.insert(tests).values(insertTest).returning();
    return test;
  }
  
  async updateTest(id: number, testData: Partial<InsertTest>): Promise<Test> {
    const [test] = await db
      .update(tests)
      .set(testData)
      .where(eq(tests.id, id))
      .returning();
    return test;
  }
  
  async deleteTest(id: number): Promise<void> {
    await db.delete(tests).where(eq(tests.id, id));
  }
  
  // Questions
  async getQuestionsByTest(testId: number): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.testId, testId));
  }
  
  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }
  
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(insertQuestion).returning();
    return question;
  }
  
  async updateQuestion(id: number, questionData: Partial<InsertQuestion>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set(questionData)
      .where(eq(questions.id, id))
      .returning();
    return question;
  }
  
  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }
  
  // Options
  async getOptionsByQuestion(questionId: number): Promise<Option[]> {
    return await db.select().from(options).where(eq(options.questionId, questionId));
  }
  
  async createOption(insertOption: InsertOption): Promise<Option> {
    const [option] = await db.insert(options).values(insertOption).returning();
    return option;
  }
  
  async updateOption(id: number, optionData: Partial<InsertOption>): Promise<Option> {
    const [option] = await db
      .update(options)
      .set(optionData)
      .where(eq(options.id, id))
      .returning();
    return option;
  }
  
  async deleteOption(id: number): Promise<void> {
    await db.delete(options).where(eq(options.id, id));
  }
  
  // Explanations
  async getExplanationByQuestion(questionId: number): Promise<Explanation | undefined> {
    const [explanation] = await db.select().from(explanations).where(eq(explanations.questionId, questionId));
    return explanation;
  }
  
  async createExplanation(insertExplanation: InsertExplanation): Promise<Explanation> {
    const [explanation] = await db.insert(explanations).values(insertExplanation).returning();
    return explanation;
  }
  
  async updateExplanation(id: number, explanationData: Partial<InsertExplanation>): Promise<Explanation> {
    const [explanation] = await db
      .update(explanations)
      .set(explanationData)
      .where(eq(explanations.id, id))
      .returning();
    return explanation;
  }
  
  async deleteExplanation(id: number): Promise<void> {
    await db.delete(explanations).where(eq(explanations.id, id));
  }
  
  // Testimonials
  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials);
  }
  
  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db.insert(testimonials).values(insertTestimonial).returning();
    return testimonial;
  }
  
  async updateTestimonial(id: number, testimonialData: Partial<InsertTestimonial>): Promise<Testimonial> {
    const [testimonial] = await db
      .update(testimonials)
      .set(testimonialData)
      .where(eq(testimonials.id, id))
      .returning();
    return testimonial;
  }
  
  async deleteTestimonial(id: number): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }
  
  // Contact Messages
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(insertContact).returning();
    return contact;
  }
  
  async getAllContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }
  
  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }
  
  // FAQs
  async getAllFAQs(): Promise<FAQ[]> {
    return await db.select().from(faqs).orderBy(asc(faqs.order));
  }
  
  async createFAQ(insertFAQ: InsertFAQ): Promise<FAQ> {
    const [faq] = await db.insert(faqs).values(insertFAQ).returning();
    return faq;
  }
  
  async updateFAQ(id: number, faqData: Partial<InsertFAQ>): Promise<FAQ> {
    const [faq] = await db
      .update(faqs)
      .set(faqData)
      .where(eq(faqs.id, id))
      .returning();
    return faq;
  }
  
  async deleteFAQ(id: number): Promise<void> {
    await db.delete(faqs).where(eq(faqs.id, id));
  }
  
  // Site Configuration
  async getSiteConfig(key: string): Promise<any> {
    const [config] = await db.select().from(siteConfig).where(eq(siteConfig.key, key));
    return config ? config.value : null;
  }
  
  async getAllSiteConfig(): Promise<Record<string, any>> {
    const configs = await db.select().from(siteConfig);
    const result: Record<string, any> = {};
    
    for (const config of configs) {
      result[config.key] = config.value;
    }
    
    return result;
  }
  
  async updateSiteConfig(key: string, value: any): Promise<void> {
    const existing = await db.select().from(siteConfig).where(eq(siteConfig.key, key));
    
    if (existing.length > 0) {
      await db
        .update(siteConfig)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteConfig.key, key));
    } else {
      await db.insert(siteConfig).values({
        key,
        value,
      });
    }
  }
  
  // Test Attempts
  async createTestAttempt(insertTestAttempt: InsertTestAttempt): Promise<TestAttempt> {
    const [testAttempt] = await db.insert(testAttempts).values(insertTestAttempt).returning();
    
    // Fetch the test details to join them with the test attempt
    if (testAttempt) {
      const test = await this.getTest(testAttempt.testId);
      if (test) {
        (testAttempt as any).test = test;
      }
    }
    
    return testAttempt;
  }
  
  async getTestAttempt(id: number): Promise<TestAttempt | undefined> {
    const [testAttempt] = await db.select().from(testAttempts).where(eq(testAttempts.id, id));
    
    // Fetch the test details to join them with the test attempt
    if (testAttempt) {
      const test = await this.getTest(testAttempt.testId);
      if (test) {
        (testAttempt as any).test = test;
      }
    }
    
    return testAttempt;
  }
  
  async getTestAttemptsByUser(userId: number): Promise<TestAttempt[]> {
    const attempts = await db.select().from(testAttempts)
      .where(eq(testAttempts.userId, userId))
      .orderBy(desc(testAttempts.startTime));
    
    // Fetch tests for each attempt
    for (const attempt of attempts) {
      const test = await this.getTest(attempt.testId);
      if (test) {
        (attempt as any).test = test;
      }
    }
    
    return attempts;
  }
  
  async getIncompleteTestAttemptsByUserAndTest(userId: number, testId: number): Promise<TestAttempt[]> {
    const attempts = await db.select().from(testAttempts)
      .where(and(
        eq(testAttempts.userId, userId),
        eq(testAttempts.testId, testId),
        eq(testAttempts.isCompleted, false)
      ));
    
    // Fetch test for each attempt
    for (const attempt of attempts) {
      const test = await this.getTest(attempt.testId);
      if (test) {
        (attempt as any).test = test;
      }
    }
    
    return attempts;
  }
  
  async updateTestAttempt(id: number, testAttemptData: Partial<InsertTestAttempt>): Promise<TestAttempt> {
    const [testAttempt] = await db
      .update(testAttempts)
      .set(testAttemptData)
      .where(eq(testAttempts.id, id))
      .returning();
    
    // Fetch the test details to join them with the test attempt
    if (testAttempt) {
      const test = await this.getTest(testAttempt.testId);
      if (test) {
        (testAttempt as any).test = test;
      }
    }
    
    return testAttempt;
  }
  
  // User Answers
  async createUserAnswer(insertUserAnswer: InsertUserAnswer): Promise<UserAnswer> {
    const [userAnswer] = await db.insert(userAnswers).values(insertUserAnswer).returning();
    return userAnswer;
  }
  
  async getUserAnswersByTestAttempt(testAttemptId: number): Promise<UserAnswer[]> {
    return await db.select().from(userAnswers).where(eq(userAnswers.testAttemptId, testAttemptId));
  }
  
  async getUserAnswerByQuestionAndAttempt(testAttemptId: number, questionId: number): Promise<UserAnswer | undefined> {
    const [userAnswer] = await db.select().from(userAnswers)
      .where(and(
        eq(userAnswers.testAttemptId, testAttemptId),
        eq(userAnswers.questionId, questionId)
      ));
    return userAnswer;
  }
  
  async updateUserAnswer(id: number, userAnswerData: Partial<InsertUserAnswer>): Promise<UserAnswer> {
    const [userAnswer] = await db
      .update(userAnswers)
      .set(userAnswerData)
      .where(eq(userAnswers.id, id))
      .returning();
    return userAnswer;
  }
  
  // Course Videos
  async getAllCourseVideos(): Promise<CourseVideo[]> {
    return await db.select().from(courseVideos).orderBy(asc(courseVideos.order));
  }
  
  async getCourseVideosByCourse(courseId: number): Promise<CourseVideo[]> {
    return await db
      .select()
      .from(courseVideos)
      .where(eq(courseVideos.courseId, courseId))
      .orderBy(asc(courseVideos.order));
  }
  
  async getCourseVideo(id: number): Promise<CourseVideo | undefined> {
    const [video] = await db.select().from(courseVideos).where(eq(courseVideos.id, id));
    return video;
  }
  
  async createCourseVideo(insertCourseVideo: InsertCourseVideo): Promise<CourseVideo> {
    const [video] = await db.insert(courseVideos).values(insertCourseVideo).returning();
    return video;
  }
  
  async updateCourseVideo(id: number, courseVideoData: Partial<InsertCourseVideo>): Promise<CourseVideo> {
    const [video] = await db
      .update(courseVideos)
      .set(courseVideoData)
      .where(eq(courseVideos.id, id))
      .returning();
    return video;
  }
  
  async deleteCourseVideo(id: number): Promise<void> {
    await db.delete(courseVideos).where(eq(courseVideos.id, id));
  }
  
  // Initialize the database with sample data
  async setupInitialData() {
    const courseCount = await db.select({ count: sql`count(*)` }).from(courses);
    
    if (courseCount[0].count === '0') {
      // Create courses
      const courseData: InsertCourse[] = [
        {
          title: "JEE Main Mathematics",
          description: "Comprehensive course covering all JEE Main mathematics topics with regular doubt sessions and weekly tests.",
          duration: "6 months",
          modules: 24,
          price: 15999,
          discountPrice: 12999,
          imageUrl: "https://images.unsplash.com/photo-1678893574262-74f8451fea2f",
          categories: ["JEE Main/Advanced", "Mathematics"],
          popular: true,
          isLive: true
        },
        {
          title: "Banking Exams Quantitative Aptitude",
          description: "Master quantitative aptitude for banking exams with shortcut techniques and extensive practice.",
          duration: "3 months",
          modules: 15,
          price: 8999,
          discountPrice: 6499,
          imageUrl: "https://images.unsplash.com/photo-1609743522653-52354461eb27",
          categories: ["Banking", "Quantitative Aptitude"],
          popular: false,
          isLive: true
        },
        {
          title: "Advanced Calculus for IIT-JEE",
          description: "Specialized course focusing on advanced calculus problems frequently appearing in IIT-JEE Advanced.",
          duration: "2 months",
          modules: 8,
          price: 7999,
          discountPrice: 5999,
          imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb",
          categories: ["JEE Main/Advanced", "IIT-JEE", "Calculus"],
          popular: false,
          isLive: true
        }
      ];
      
      await db.insert(courses).values(courseData);
      
      // Create test series
      const testSeriesData: InsertTestSeries[] = [
        {
          title: "JEE Main Mock Test Series",
          description: "Complete mock tests with JEE Main pattern, difficulty level and time constraints.",
          category: "JEE Main/Advanced",
          testCount: 30,
          price: 3499,
          features: ["All India Rank Comparison", "Detailed Performance Analysis"]
        },
        {
          title: "Topic-wise Test Series",
          description: "Focus on specific topics with our specialized test series for targeted improvement.",
          category: "General",
          testCount: 100,
          price: 2999,
          features: ["Chapter-wise Questions", "Video Solutions Included"]
        },
        {
          title: "Previous Year Papers",
          description: "Practice with actual questions from previous years with detailed explanations.",
          category: "General",
          testCount: 10,
          price: 1999,
          features: ["Year-wise Categorized", "Trend Analysis Reports"]
        }
      ];
      
      await db.insert(testSeries).values(testSeriesData);
      
      // Create testimonials
      const testimonialData: InsertTestimonial[] = [
        {
          name: "Rahul Sharma",
          testimonial: "The doubt clearing sessions at Maths Magic Town were a game-changer for me. I could get all my calculus concepts cleared just before my JEE Advanced exam. Secured AIR 342!",
          rating: 5,
          examName: "JEE Advanced 2023",
          rank: "AIR 342",
          imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
        },
        {
          name: "Priya Patel",
          testimonial: "The practice tests were perfect replicas of the actual SBI PO exam. The quantitative section became my strongest area thanks to the topic-wise tests. Cleared the exam in my first attempt!",
          rating: 4,
          examName: "SBI PO 2023",
          rank: "",
          imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
        },
        {
          name: "Aditya Verma",
          testimonial: "Mathematics used to be my weak point until I joined Maths Magic Town. The way they break down complex topics made a huge difference. Scored 98 percentile in JEE Main mathematics!",
          rating: 5,
          examName: "JEE Main 2023",
          rank: "98 percentile",
          imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
        }
      ];
      
      await db.insert(testimonials).values(testimonialData);
      
      // Create FAQs
      const faqData: InsertFAQ[] = [
        {
          question: "How are the doubt clearing sessions conducted?",
          answer: "Our doubt clearing sessions are conducted via live video calls with experienced faculty. You can book a slot in advance according to your preferred time and topic. Sessions are typically 30 minutes long and focused on your specific questions.",
          order: 1
        },
        {
          question: "Do you provide recorded lectures for all topics?",
          answer: "Yes, we offer comprehensive recorded lectures for all mathematics topics covered in competitive exams. These are available 24/7 and can be watched at your own pace. Each video is accompanied by downloadable notes and practice problems.",
          order: 2
        },
        {
          question: "How frequently are the test series updated?",
          answer: "Our test series are updated annually to reflect the latest exam patterns and question types. Additionally, we introduce new tests throughout the year based on any changes announced by examination authorities.",
          order: 3
        },
        {
          question: "Can I get a refund if I'm not satisfied with the course?",
          answer: "Yes, we offer a 7-day money-back guarantee for all our courses. If you're not satisfied with the quality of our content or teaching methodology, you can request a full refund within 7 days of purchase.",
          order: 4
        },
        {
          question: "Do you offer any scholarships or discounts?",
          answer: "Yes, we offer merit-based scholarships for deserving students. We also run seasonal discounts and special offers for group enrollments. Contact our support team to learn about current scholarship opportunities.",
          order: 5
        }
      ];
      
      await db.insert(faqs).values(faqData);
    }
  }
}

export const storage = new DatabaseStorage();