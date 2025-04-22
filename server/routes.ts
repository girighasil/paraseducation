import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, DatabaseStorage } from "./storage";
import { 
  insertUserSchema, 
  insertDoubtSessionSchema, 
  insertContactSchema,
  insertCourseSchema,
  insertTestSeriesSchema,
  insertTestimonialSchema,
  insertFaqSchema,
  insertTestSchema,
  insertQuestionSchema,
  insertOptionSchema,
  insertExplanationSchema,
  insertTestAttemptSchema,
  insertUserAnswerSchema,
  insertCourseVideoSchema,
  type UserAnswer
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth, isAuthenticated, isAdmin, isTeacherOrAdmin, isTeacher, createInitialAdmin } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Initialize the database with sample data
  if (storage instanceof DatabaseStorage) {
    try {
      await storage.setupInitialData();
      console.log("Database initialized with sample data");

      // Create initial admin user if none exists
      await createInitialAdmin();
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }
  // API routes
  app.get("/api/courses", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      let courses;

      if (category && category !== "All Exams") {
        courses = await storage.getCoursesByCategory(category);
      } else {
        courses = await storage.getAllCourses();
      }

      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourse(id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.get("/api/test-series", async (req: Request, res: Response) => {
    try {
      const testSeries = await storage.getAllTestSeries();
      res.json(testSeries);
    } catch (error) {
      console.error("Error fetching test series:", error);
      res.status(500).json({ message: "Failed to fetch test series" });
    }
  });

  app.get("/api/test-series/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const testSeries = await storage.getTestSeries(id);
      if (!testSeries) {
        return res.status(404).json({ message: "Test series not found" });
      }
      res.json(testSeries);
    } catch (error) {
      console.error("Error fetching test series:", error);
      res.status(500).json({ message: "Failed to fetch test series" });
    }
  });

  app.get("/api/testimonials", async (req: Request, res: Response) => {
    try {
      const testimonials = await storage.getAllTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  app.get("/api/faqs", async (req: Request, res: Response) => {
    try {
      const faqs = await storage.getAllFAQs();
      res.json(faqs);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  // POST routes
  app.post("/api/doubt-sessions", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertDoubtSessionSchema.parse(req.body);

      // Create doubt session
      const doubtSession = await storage.createDoubtSession(validatedData);

      res.status(201).json({
        message: "Doubt session booked successfully!",
        doubtSession
      });
    } catch (error) {
      console.error("Error booking doubt session:", error);
      res.status(400).json({ message: "Failed to book doubt session", error });
    }
  });

  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      // Process the request body - convert empty email to null
      const contactData = {
        ...req.body,
        email: req.body.email || null
      };

      // Validate request body
      const validatedData = insertContactSchema.parse(contactData);

      // Create contact message
      const contact = await storage.createContact(validatedData);

      res.status(201).json({
        message: "Message sent successfully!",
        contact
      });
    } catch (error) {
      console.error("Error sending contact message:", error);
      res.status(400).json({ message: "Failed to send message", error });
    }
  });

  app.post("/api/users/register", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user
      const user = await storage.createUser(validatedData);

      res.status(201).json({
        message: "User registered successfully!",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(400).json({ message: "Failed to register user", error });
    }
  });

  // Teacher API routes
  // Teacher Courses
  app.post("/api/teacher/courses", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      // Add creator ID and set isPublished to false for teacher creations
      const data = {
        ...req.body,
        creatorId: req.user!.id,
        isPublished: req.user!.role === 'admin' ? req.body.isPublished : false
      };

      const validatedData = insertCourseSchema.parse(data);
      const course = await storage.createCourse(validatedData);
      res.status(201).json({
        message: "Course created successfully",
        course
      });
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(400).json({ message: "Failed to create course", error });
    }
  });

  app.put("/api/teacher/courses/:id", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Get the course to verify ownership
      const course = await storage.getCourse(id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if user is the creator or an admin
      if (course.creatorId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to edit this course" });
      }

      // Only admin can change publish status
      let data = req.body;
      if (req.user!.role !== 'admin' && 'isPublished' in req.body) {
        data = { ...req.body };
        delete data.isPublished;
      }

      const validatedData = insertCourseSchema.partial().parse(data);
      const updatedCourse = await storage.updateCourse(id, validatedData);

      res.json({
        message: "Course updated successfully",
        course: updatedCourse
      });
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(400).json({ message: "Failed to update course", error });
    }
  });

  app.get("/api/teacher/my-courses", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      // If admin, get all courses, otherwise get only the teacher's courses
      const courses = req.user!.role === 'admin' 
        ? await storage.getAllCourses()
        : await storage.getCoursesByCreator(req.user!.id);

      res.json(courses);
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      res.status(500).json({ message: "Failed to fetch courses", error });
    }
  });

  app.delete("/api/teacher/courses/:id", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Get the course to verify ownership
      const course = await storage.getCourse(id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if user is the creator or an admin
      if (course.creatorId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to delete this course" });
      }

      await storage.deleteCourse(id);
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course", error });
    }
  });

  // Teacher Test Series
  app.post("/api/teacher/test-series", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      // Add creator ID and set isPublished to false for teacher creations
      const data = {
        ...req.body,
        creatorId: req.user!.id,
        isPublished: req.user!.role === 'admin' ? req.body.isPublished : false
      };

      const validatedData = insertTestSeriesSchema.parse(data);
      const testSeries = await storage.createTestSeries(validatedData);
      res.status(201).json({
        message: "Test series created successfully",
        testSeries
      });
    } catch (error) {
      console.error("Error creating test series:", error);
      res.status(400).json({ message: "Failed to create test series", error });
    }
  });

  app.put("/api/teacher/test-series/:id", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Get the test series to verify ownership
      const testSeries = await storage.getTestSeries(id);

      if (!testSeries) {
        return res.status(404).json({ message: "Test series not found" });
      }

      // Check if user is the creator or an admin
      if (testSeries.creatorId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to edit this test series" });
      }

      // Only admin can change publish status
      let data = req.body;
      if (req.user!.role !== 'admin' && 'isPublished' in req.body) {
        data = { ...req.body };
        delete data.isPublished;
      }

      const validatedData = insertTestSeriesSchema.partial().parse(data);
      const updatedTestSeries = await storage.updateTestSeries(id, validatedData);

      res.json({
        message: "Test series updated successfully",
        testSeries: updatedTestSeries
      });
    } catch (error) {
      console.error("Error updating test series:", error);
      res.status(400).json({ message: "Failed to update test series", error });
    }
  });

  app.get("/api/teacher/my-test-series", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      // If admin, get all test series, otherwise get only the teacher's test series
      const testSeries = req.user!.role === 'admin' 
        ? await storage.getAllTestSeries()
        : await storage.getTestSeriesByCreator(req.user!.id);

      res.json(testSeries);
    } catch (error) {
      console.error("Error fetching teacher test series:", error);
      res.status(500).json({ message: "Failed to fetch test series", error });
    }
  });

  app.delete("/api/teacher/test-series/:id", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Get the test series to verify ownership
      const testSeries = await storage.getTestSeries(id);

      if (!testSeries) {
        return res.status(404).json({ message: "Test series not found" });
      }

      // Check if user is the creator or an admin
      if (testSeries.creatorId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to delete this test series" });
      }

      await storage.deleteTestSeries(id);
      res.json({ message: "Test series deleted successfully" });
    } catch (error) {
      console.error("Error deleting test series:", error);
      res.status(500).json({ message: "Failed to delete test series", error });
    }
  });

  // Teacher Tests
  app.post("/api/teacher/tests", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTestSchema.parse(req.body);

      // If test is linked to a test series, check if teacher owns that test series
      if (validatedData.testSeriesId) {
        const testSeries = await storage.getTestSeries(validatedData.testSeriesId);

        if (!testSeries) {
          return res.status(404).json({ message: "Test series not found" });
        }

        // Check if user is the creator of the test series or an admin
        if (testSeries.creatorId !== req.user!.id && req.user!.role !== 'admin') {
          return res.status(403).json({ 
            message: "You don't have permission to add tests to this test series" 
          });
        }
      }

      const test = await storage.createTest(validatedData);
      res.status(201).json({
        message: "Test created successfully",
        test
      });
    } catch (error) {
      console.error("Error creating test:", error);
      res.status(400).json({ message: "Failed to create test", error });
    }
  });

  // Admin API routes
  // Courses
  app.post("/api/admin/courses", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(validatedData);
      res.status(201).json({
        message: "Course created successfully",
        course
      });
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(400).json({ message: "Failed to create course", error });
    }
  });

  app.put("/api/admin/courses/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCourseSchema.partial().parse(req.body);
      const course = await storage.updateCourse(id, validatedData);
      res.json({
        message: "Course updated successfully",
        course
      });
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(400).json({ message: "Failed to update course", error });
    }
  });

  app.delete("/api/admin/courses/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCourse(id);
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course", error });
    }
  });

  // Test Series
  app.post("/api/admin/test-series", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTestSeriesSchema.parse(req.body);
      const testSeries = await storage.createTestSeries(validatedData);
      res.status(201).json({
        message: "Test series created successfully",
        testSeries
      });
    } catch (error) {
      console.error("Error creating test series:", error);
      res.status(400).json({ message: "Failed to create test series", error });
    }
  });

  app.put("/api/admin/test-series/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTestSeriesSchema.partial().parse(req.body);
      const testSeries = await storage.updateTestSeries(id, validatedData);
      res.json({
        message: "Test series updated successfully",
        testSeries
      });
    } catch (error) {
      console.error("Error updating test series:", error);
      res.status(400).json({ message: "Failed to update test series", error });
    }
  });

  app.delete("/api/admin/test-series/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTestSeries(id);
      res.json({ message: "Test series deleted successfully" });
    } catch (error) {
      console.error("Error deleting test series:", error);
      res.status(500).json({ message: "Failed to delete test series", error });
    }
  });

  // Tests Routes
  app.get("/api/tests", async (req: Request, res: Response) => {
    try {
      const tests = await storage.getAllTests();
      res.json(tests);
    } catch (error) {
      console.error("Error getting tests:", error);
      res.status(500).json({ message: "Failed to get tests", error });
    }
  });

  app.get("/api/test-series/:testSeriesId/tests", async (req: Request, res: Response) => {
    try {
      const testSeriesId = parseInt(req.params.testSeriesId);
      const tests = await storage.getTestsByTestSeries(testSeriesId);
      res.json(tests);
    } catch (error) {
      console.error("Error getting tests by test series:", error);
      res.status(500).json({ message: "Failed to get tests by test series", error });
    }
  });

  app.get("/api/tests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const test = await storage.getTest(id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      console.error("Error getting test:", error);
      res.status(500).json({ message: "Failed to get test", error });
    }
  });

  app.post("/api/admin/tests", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTestSchema.parse(req.body);
      const test = await storage.createTest(validatedData);
      res.status(201).json({
        message: "Test created successfully",
        test
      });
    } catch (error) {
      console.error("Error creating test:", error);
      res.status(400).json({ message: "Failed to create test", error });
    }
  });

  app.put("/api/admin/tests/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTestSchema.partial().parse(req.body);
      const test = await storage.updateTest(id, validatedData);
      res.json({
        message: "Test updated successfully",
        test
      });
    } catch (error) {
      console.error("Error updating test:", error);
      res.status(400).json({ message: "Failed to update test", error });
    }
  });

  // Link test to test series
  app.post("/api/admin/test-series/:testSeriesId/link-test", isAdmin, async (req: Request, res: Response) => {
    try {
      const testSeriesId = parseInt(req.params.testSeriesId);
      const { testId } = req.body;

      if (!testId) {
        return res.status(400).json({ message: "Test ID is required" });
      }

      // Get the test to update
      const test = await storage.getTest(parseInt(testId));
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      // Update the test's testSeriesId
      const updatedTest = await storage.updateTest(parseInt(testId), { 
        testSeriesId: testSeriesId 
      });

      res.json({ 
        message: "Test linked to test series successfully", 
        test: updatedTest 
      });
    } catch (error) {
      console.error("Error linking test to test series:", error);
      res.status(500).json({ message: "Failed to link test to test series", error });
    }
  });

  app.delete("/api/admin/tests/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTest(id);
      res.json({ message: "Test deleted successfully" });
    } catch (error) {
      console.error("Error deleting test:", error);
      res.status(500).json({ message: "Failed to delete test", error });
    }
  });

  // Questions Routes
  app.get("/api/tests/:testId/questions", async (req: Request, res: Response) => {
    try {
      const testId = parseInt(req.params.testId);
      const questions = await storage.getQuestionsByTest(testId);
      res.json(questions);
    } catch (error) {
      console.error("Error getting questions by test:", error);
      res.status(500).json({ message: "Failed to get questions by test", error });
    }
  });

  app.get("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const question = await storage.getQuestion(id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Also fetch options and explanation
      const options = await storage.getOptionsByQuestion(id);
      const explanation = await storage.getExplanationByQuestion(id);

      res.json({
        ...question,
        options,
        explanation
      });
    } catch (error) {
      console.error("Error getting question details:", error);
      res.status(500).json({ message: "Failed to get question details", error });
    }
  });

  app.post("/api/admin/questions", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(validatedData);
      res.status(201).json({
        message: "Question created successfully",
        question
      });
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(400).json({ message: "Failed to create question", error });
    }
  });

  app.put("/api/admin/questions/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertQuestionSchema.partial().parse(req.body);
      const question = await storage.updateQuestion(id, validatedData);
      res.json({
        message: "Question updated successfully",
        question
      });
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(400).json({ message: "Failed to update question", error });
    }
  });

  app.delete("/api/admin/questions/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteQuestion(id);
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question", error });
    }
  });

  // Options Routes
  app.post("/api/admin/options", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertOptionSchema.parse(req.body);
      const option = await storage.createOption(validatedData);
      res.status(201).json({
        message: "Option created successfully",
        option
      });
    } catch (error) {
      console.error("Error creating option:", error);
      res.status(400).json({ message: "Failed to create option", error });
    }
  });

  app.put("/api/admin/options/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertOptionSchema.partial().parse(req.body);
      const option = await storage.updateOption(id, validatedData);
      res.json({
        message: "Option updated successfully",
        option
      });
    } catch (error) {
      console.error("Error updating option:", error);
      res.status(400).json({ message: "Failed to update option", error });
    }
  });

  app.delete("/api/admin/options/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOption(id);
      res.json({ message: "Option deleted successfully" });
    } catch (error) {
      console.error("Error deleting option:", error);
      res.status(500).json({ message: "Failed to delete option", error });
    }
  });

  // Explanation Routes
  app.post("/api/admin/explanations", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertExplanationSchema.parse(req.body);
      const explanation = await storage.createExplanation(validatedData);
      res.status(201).json({
        message: "Explanation created successfully",
        explanation
      });
    } catch (error) {
      console.error("Error creating explanation:", error);
      res.status(400).json({ message: "Failed to create explanation", error });
    }
  });

  app.put("/api/admin/explanations/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertExplanationSchema.partial().parse(req.body);
      const explanation = await storage.updateExplanation(id, validatedData);
      res.json({
        message: "Explanation updated successfully",
        explanation
      });
    } catch (error) {
      console.error("Error updating explanation:", error);
      res.status(400).json({ message: "Failed to update explanation", error });
    }
  });

  app.delete("/api/admin/explanations/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExplanation(id);
      res.json({ message: "Explanation deleted successfully" });
    } catch (error) {
      console.error("Error deleting explanation:", error);
      res.status(500).json({ message: "Failed to delete explanation", error });
    }
  });

  // Bulk Create/Update Endpoints for Questions with Options and Explanations
  app.post("/api/admin/questions/bulk", isAdmin, async (req: Request, res: Response) => {
    try {
      const { questions } = req.body;
      const results = [];

      for (const item of questions) {
        // Create question
        const questionData = insertQuestionSchema.parse(item.question);
        const question = await storage.createQuestion(questionData);

        // Create options
        const options = [];
        for (const optionData of item.options) {
          const option = await storage.createOption({
            ...optionData,
            questionId: question.id
          });
          options.push(option);
        }

        // Create explanation if provided
        let explanation = null;
        if (item.explanation) {
          explanation = await storage.createExplanation({
            ...item.explanation,
            questionId: question.id
          });
        }

        results.push({
          question,
          options,
          explanation
        });
      }

      res.status(201).json({
        message: "Questions created successfully",
        results
      });
    } catch (error) {
      console.error("Error creating questions in bulk:", error);
      res.status(400).json({ message: "Failed to create questions in bulk", error });
    }
  });

  // File Upload for Tests
  app.post("/api/admin/tests/:id/upload", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Here we would handle file upload using multer or other library
      // For now, we'll just update the fileUrl directly
      const { fileUrl } = req.body;
      const test = await storage.updateTest(id, { fileUrl });

      res.json({
        message: "Test file uploaded successfully",
        test
      });
    } catch (error) {
      console.error("Error uploading test file:", error);
      res.status(500).json({ message: "Failed to upload test file", error });
    }
  });

  // Testimonials
  app.post("/api/admin/testimonials", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTestimonialSchema.parse(req.body);
      const testimonial = await storage.createTestimonial(validatedData);
      res.status(201).json({
        message: "Testimonial created successfully",
        testimonial
      });
    } catch (error) {
      console.error("Error creating testimonial:", error);
      res.status(400).json({ message: "Failed to create testimonial", error });
    }
  });

  app.put("/api/admin/testimonials/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTestimonialSchema.partial().parse(req.body);
      const testimonial = await storage.updateTestimonial(id, validatedData);
      res.json({
        message: "Testimonial updated successfully",
        testimonial
      });
    } catch (error) {
      console.error("Error updating testimonial:", error);
      res.status(400).json({ message: "Failed to update testimonial", error });
    }
  });

  app.delete("/api/admin/testimonials/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTestimonial(id);
      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      res.status(500).json({ message: "Failed to delete testimonial", error });
    }
  });

  // FAQs
  app.post("/api/admin/faqs", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertFaqSchema.parse(req.body);
      const faq = await storage.createFAQ(validatedData);
      res.status(201).json({
        message: "FAQ created successfully",
        faq
      });
    } catch (error) {
      console.error("Error creating FAQ:", error);
      res.status(400).json({ message: "Failed to create FAQ", error });
    }
  });

  app.put("/api/admin/faqs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertFaqSchema.partial().parse(req.body);
      const faq = await storage.updateFAQ(id, validatedData);
      res.json({
        message: "FAQ updated successfully",
        faq
      });
    } catch (error) {
      console.error("Error updating FAQ:", error);
      res.status(400).json({ message: "Failed to update FAQ", error });
    }
  });

  app.delete("/api/admin/faqs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFAQ(id);
      res.json({ message: "FAQ deleted successfully" });
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      res.status(500).json({ message: "Failed to delete FAQ", error });
    }
  });

  // Contact messages
  app.get("/api/admin/contacts", isAdmin, async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getAllContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ message: "Failed to fetch contact messages", error });
    }
  });

  app.delete("/api/admin/contacts/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContact(id);
      res.json({ message: "Contact message deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact message:", error);
      res.status(500).json({ message: "Failed to delete contact message", error });
    }
  });

  // Doubt Sessions
  app.get("/api/admin/doubt-sessions", isAdmin, async (req: Request, res: Response) => {
    try {
      const doubtSessions = await storage.getAllDoubtSessions();
      res.json(doubtSessions);
    } catch (error) {
      console.error("Error fetching doubt sessions:", error);
      res.status(500).json({ message: "Failed to fetch doubt sessions", error });
    }
  });

  // Create doubt session for admin
  app.post("/api/admin/doubt-sessions", isAdmin, async (req: Request, res: Response) => {
    try {
      // Add the current user as the creator
      const doubtSessionData = { 
        ...req.body,
        userId: req.user!.id,
        createdBy: req.user!.id,
        status: "scheduled"
      };

      const doubtSession = await storage.createDoubtSession(doubtSessionData);

      res.status(201).json({
        message: "Doubt session created successfully",
        doubtSession
      });
    } catch (error) {
      console.error("Error creating doubt session:", error);
      res.status(400).json({ message: "Failed to create doubt session", error });
    }
  });

  // Update doubt session for admin
  app.put("/api/admin/doubt-sessions/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const doubtSession = await storage.updateDoubtSession(id, req.body);

      res.json({
        message: "Doubt session updated successfully",
        doubtSession
      });
    } catch (error) {
      console.error("Error updating doubt session:", error);
      res.status(400).json({ message: "Failed to update doubt session", error });
    }
  });

  // Delete doubt session
  app.delete("/api/admin/doubt-sessions/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDoubtSession(id);

      res.json({
        message: "Doubt session deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting doubt session:", error);
      res.status(400).json({ message: "Failed to delete doubt session", error });
    }
  });

  app.put("/api/admin/doubt-sessions/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDoubtSessionSchema.partial().parse(req.body);
      const doubtSession = await storage.updateDoubtSession(id, validatedData);
      res.json({
        message: "Doubt session updated successfully",
        doubtSession
      });
    } catch (error) {
      console.error("Error updating doubt session:", error);
      res.status(400).json({ message: "Failed to update doubt session", error });
    }
  });

  // Approve a doubt session
  app.put("/api/admin/doubt-sessions/:id/approve", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const doubtSession = await storage.updateDoubtSession(id, { 
        status: 'approved'
      });
      res.json({
        message: "Doubt session approved successfully",
        doubtSession
      });
    } catch (error) {
      console.error("Error approving doubt session:", error);
      res.status(400).json({ message: "Failed to approve doubt session", error });
    }
  });

  // Approve a doubt session (teacher route - only for admins)
  app.put("/api/teacher/doubt-sessions/:id/approve", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const doubtSession = await storage.updateDoubtSession(id, { 
        status: 'approved'
      });
      res.json({
        message: "Doubt session approved successfully",
        doubtSession
      });
    } catch (error) {
      console.error("Error approving doubt session:", error);
      res.status(400).json({ message: "Failed to approve doubt session", error });
    }
  });

  app.delete("/api/admin/doubt-sessions/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDoubtSession(id);
      res.json({ message: "Doubt session deleted successfully" });
    } catch (error) {
      console.error("Error deleting doubt session:", error);
      res.status(500).json({ message: "Failed to delete doubt session", error });
    }
  });

  // Teacher Doubt Sessions
  app.get("/api/teacher/my-doubt-sessions", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      // If admin, get all doubt sessions, otherwise get only the teacher's doubt sessions
      const doubtSessions = req.user!.role === 'admin' 
        ? await storage.getAllDoubtSessions()
        : await storage.getDoubtSessionsByTeacher(req.user!.id);

      res.json(doubtSessions);
    } catch (error) {
      console.error("Error fetching teacher doubt sessions:", error);
      res.status(500).json({ message: "Failed to fetch doubt sessions", error });
    }
  });

  app.post("/api/teacher/doubt-sessions", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      // Add teacher ID and set status appropriately
      const data = {
        ...req.body,
        userId: req.user!.id,
        status: req.user!.role === 'admin' ? 'approved' : 'pending'
      };

      const validatedData = insertDoubtSessionSchema.parse(data);
      const doubtSession = await storage.createDoubtSession(validatedData);
      res.status(201).json({
        message: "Doubt session created successfully",
        doubtSession
      });
    } catch (error) {
      console.error("Error creating doubt session:", error);
      res.status(400).json({ message: "Failed to create doubt session", error });
    }
  });

  app.put("/api/teacher/doubt-sessions/:id", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Get the doubt session to verify ownership
      const doubtSession = await storage.getDoubtSession(id);

      if (!doubtSession) {
        return res.status(404).json({ message: "Doubt session not found" });
      }

      // Check if user is the creator or an admin
      if (doubtSession.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to update this doubt session" });
      }

      // If teacher is updating, don't allow changing the approval status
      let validatedData;
      if (req.user!.role === 'teacher') {
        const { status, ...teacherUpdatableData } = req.body;
        validatedData = insertDoubtSessionSchema.partial().parse(teacherUpdatableData);
      } else {
        validatedData = insertDoubtSessionSchema.partial().parse(req.body);
      }

      const updatedDoubtSession = await storage.updateDoubtSession(id, validatedData);
      res.json({
        message: "Doubt session updated successfully",
        doubtSession: updatedDoubtSession
      });
    } catch (error) {
      console.error("Error updating doubt session:", error);
      res.status(400).json({ message: "Failed to update doubt session", error });
    }
  });

  app.delete("/api/teacher/doubt-sessions/:id", isTeacherOrAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Get the doubt session to verify ownership
      const doubtSession = await storage.getDoubtSession(id);

      if (!doubtSession) {
        return res.status(404).json({ message: "Doubt session not found" });
      }

      // Check if user is the creator or an admin
      if (doubtSession.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to delete this doubt session" });
      }

      await storage.deleteDoubtSession(id);
      res.json({ message: "Doubt session deleted successfully" });
    } catch (error) {
      console.error("Error deleting doubt session:", error);
      res.status(500).json({ message: "Failed to delete doubt session", error });
    }
  });

  // Site Configuration Routes
  app.get("/api/site-config", async (req: Request, res: Response) => {
    try {
      const config = await storage.getAllSiteConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error fetching site config:", error);
      res.status(500).json({ message: "Failed to fetch site configuration", error });
    }
  });

  app.get("/api/site-config/:key", async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const value = await storage.getSiteConfig(key);

      if (value === null) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      res.json({ key, value });
    } catch (error: any) {
      console.error("Error fetching site config key:", error);
      res.status(500).json({ message: "Failed to fetch configuration", error });
    }
  });

  app.put("/api/admin/site-config/:key", isAdmin, async (req: Request, res: Response) => {
    try {
      const key = req.params.key;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({ message: "Value is required" });
      }

      await storage.updateSiteConfig(key, value);
      res.json({ message: "Configuration updated successfully", key, value });
    } catch (error: any) {
      console.error("Error updating site config:", error);
      res.status(500).json({ message: "Failed to update configuration", error });
    }
  });

  // Test Attempts API endpoints
  // Start a test attempt
  app.post("/api/tests/:testId/start", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const testId = parseInt(req.params.testId);
      const userId = req.user!.id; // User is authenticated, so req.user exists

      // Check if there's already an incomplete attempt for this test by this user
      const existingAttempts = await storage.getIncompleteTestAttemptsByUserAndTest(userId, testId);
      if (existingAttempts.length > 0) {
        return res.status(200).json({ 
          message: "Test already in progress",
          testAttempt: existingAttempts[0]
        });
      }

      // Get the test details for total marks
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      // Start a new test attempt
      const testAttempt = await storage.createTestAttempt({
        userId,
        testId,
        totalMarks: test.totalMarks,
        startTime: new Date(),
        isCompleted: false
      });

      res.status(201).json({
        message: "Test started successfully",
        testAttempt
      });
    } catch (error) {
      console.error("Error starting test attempt:", error);
      res.status(500).json({ message: "Failed to start test attempt", error });
    }
  });

  // Submit an answer during a test
  app.post("/api/test-attempts/:testAttemptId/submit-answer", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const testAttemptId = parseInt(req.params.testAttemptId);
      const userId = req.user!.id;

      // Validate request body
      const { questionId, answer } = req.body;
      if (!questionId || !answer) {
        return res.status(400).json({ message: "Question ID and answer are required" });
      }

      // Check if the test attempt exists and belongs to the user
      const testAttempt = await storage.getTestAttempt(testAttemptId);
      if (!testAttempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }

      if (testAttempt.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to test attempt" });
      }

      if (testAttempt.isCompleted) {
        return res.status(400).json({ message: "Test is already completed" });
      }

      // Get the question details
      const question = await storage.getQuestion(parseInt(questionId));
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // For MCQ questions, validate and auto-grade
      let isCorrect = false;
      let marksObtained = 0;

      if (question.questionType === "mcq") {
        // Get the selected option
        const options = await storage.getOptionsByQuestion(question.id);
        const selectedOption = options.find(option => option.id === parseInt(answer));

        if (selectedOption) {
          isCorrect = selectedOption.isCorrect;
          const test = await storage.getTest(testAttempt.testId);
          if (test) {
            marksObtained = isCorrect ? question.marks : -1 * question.marks * parseFloat(test.negativeMarking);
          }
        }
      }

      // Check if there's an existing answer for this question in this attempt
      const existingAnswer = await storage.getUserAnswerByQuestionAndAttempt(testAttemptId, parseInt(questionId));

      let userAnswer;
      if (existingAnswer) {
        // Update the existing answer
        userAnswer = await storage.updateUserAnswer(existingAnswer.id, {
          answer: answer.toString(),
          isCorrect,
          marksObtained: marksObtained.toString()
        });
      } else {
        // Create a new user answer
        userAnswer = await storage.createUserAnswer({
          testAttemptId,
          questionId: parseInt(questionId),
          answer: answer.toString(),
          isCorrect,
          marksObtained: marksObtained.toString()
        });
      }

      res.json({
        message: "Answer submitted successfully",
        userAnswer
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer", error });
    }
  });

  // Complete a test attempt
  app.post("/api/test-attempts/:testAttemptId/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const testAttemptId = parseInt(req.params.testAttemptId);
      const userId = req.user!.id;

      // Check if the test attempt exists and belongs to the user
      const testAttempt = await storage.getTestAttempt(testAttemptId);
      if (!testAttempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }

      if (testAttempt.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to test attempt" });
      }

      if (testAttempt.isCompleted) {
        return res.status(400).json({ message: "Test is already completed" });
      }

      // Get all the questions for this test
      const questions = await storage.getQuestionsByTest(testAttempt.testId);

      // Get all the answers for this attempt
      const userAnswers = await storage.getUserAnswersByTestAttempt(testAttemptId);

      // Calculate results
      let score = 0;
      let correctAnswers = 0;
      let incorrectAnswers = 0;
      let unanswered = questions.length - userAnswers.length;

      userAnswers.forEach((answer: UserAnswer) => {
        if (answer.isCorrect) {
          correctAnswers++;
        } else {
          incorrectAnswers++;
        }
        if (answer.marksObtained) {
          score += parseFloat(answer.marksObtained.toString());
        }
      });

      // Calculate percentage
      const percentage = (score / testAttempt.totalMarks) * 100;

      // Calculate time taken in seconds
      const endTime = new Date();
      const startTime = new Date(testAttempt.startTime);
      const timeTaken = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Update the test attempt
      const updatedTestAttempt = await storage.updateTestAttempt(testAttemptId, {
        endTime,
        score: score.toString(),
        isCompleted: true,
        timeTaken,
        correctAnswers,
        incorrectAnswers,
        unanswered,
        percentage: percentage.toString()
      });

      res.json({
        message: "Test completed successfully",
        testAttempt: updatedTestAttempt
      });
    } catch (error) {
      console.error("Error completing test:", error);
      res.status(500).json({ message: "Failed to complete test", error });
    }
  });

  // Get user's test attempts
  app.get("/api/users/test-attempts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const testAttempts = await storage.getTestAttemptsByUser(userId);
      res.json(testAttempts);
    } catch (error) {
      console.error("Error getting user test attempts:", error);
      res.status(500).json({ message: "Failed to get test attempts", error });
    }
  });

  // Get test attempt details
  app.get("/api/test-attempts/:testAttemptId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const testAttemptId = parseInt(req.params.testAttemptId);
      const userId = req.user!.id;

      // Get the test attempt
      const testAttempt = await storage.getTestAttempt(testAttemptId);

      if (!testAttempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }

      // Check if the test attempt belongs to the user or if the user is an admin
      if (testAttempt.userId !== userId && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized access to test attempt" });
      }

      // Get all user answers for this attempt
      const userAnswers = await storage.getUserAnswersByTestAttempt(testAttemptId);

      // Get all questions for this test
      const questions = await storage.getQuestionsByTest(testAttempt.testId);

      // Prepare the full data with questions and user answers
      const fullQuestions = await Promise.all(questions.map(async (question) => {
        const options = await storage.getOptionsByQuestion(question.id);
        const explanation = await storage.getExplanationByQuestion(question.id);
        const answer = userAnswers.find((ans: UserAnswer) => ans.questionId === question.id);

        return {
          ...question,
          options,
          explanation,
          userAnswer: answer || null
        };
      }));

      res.json({
        testAttempt,
        questions: fullQuestions
      });
    } catch (error) {
      console.error("Error getting test attempt details:", error);
      res.status(500).json({ message: "Failed to get test attempt details", error });
    }
  });

  // Get all test attempts for the current user
  app.get("/api/users/test-attempts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Get all test attempts for this user
      const testAttempts = await storage.getTestAttemptsByUser(userId);

      // For each test attempt, get the test details
      const fullTestAttempts = await Promise.all(testAttempts.map(async (attempt) => {
        const test = await storage.getTest(attempt.testId);
        return {
          ...attempt,
          test
        };
      }));

      res.json(fullTestAttempts);
    } catch (error) {
      console.error("Error getting user test attempts:", error);
      res.status(500).json({ message: "Failed to get test attempts", error });
    }
  });

  // Update user profile
  app.put("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure users can only update their own profile, unless they're admin
      if (req.user?.id !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }

      const { fullName, email, phone } = req.body;

      // Update user profile
      const updatedUser = await storage.updateUser(userId, {
        fullName,
        email,
        phone
      });

      // Return the updated user without the password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Set up storage for file uploads
  const videoStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadDir = path.join(process.cwd(), 'uploads/videos');
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
      // Create unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, `video-${uniqueSuffix}${extension}`);
    }
  });

  const videoUpload = multer({
    storage: videoStorage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
    fileFilter: function(req, file, cb) {
      // Accept video files only
      const filetypes = /mp4|webm|ogg|mov/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return cb(null, true);
      }

      cb(new Error("Error: Videos Only!"));
    }
  });

  // Set up storage for image uploads
  const imageStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadDir = path.join(process.cwd(), 'uploads/images');
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
      // Create unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, `image-${uniqueSuffix}${extension}`);
    }
  });

  const imageUpload = multer({
    storage: imageStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: function(req, file, cb) {
      // Accept image files only
      const filetypes = /jpeg|jpg|png|gif|webp/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return cb(null, true);
      }

      cb(new Error("Error: Images Only!"));
    }
  });

  // Course Videos Routes
  app.get("/api/course-videos", async (req: Request, res: Response) => {
    try {
      const videos = await storage.getAllCourseVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error getting course videos:", error);
      res.status(500).json({ message: "Failed to get course videos", error });
    }
  });

  app.get("/api/courses/:courseId/videos", async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      let videos = await storage.getCourseVideosByCourse(courseId);

      // Filter out unpublished videos for non-admin users
      if (req.user?.role !== 'admin') {
        videos = videos.filter(video => video.isPublished);
      }

      res.json(videos);
    } catch (error) {
      console.error("Error getting course videos:", error);
      res.status(500).json({ message: "Failed to get course videos", error });
    }
  });

  app.get("/api/course-videos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getCourseVideo(id);

      if (!video) {
        return res.status(404).json({ message: "Course video not found" });
      }

      res.json(video);
    } catch (error) {
      console.error("Error getting course video:", error);
      res.status(500).json({ message: "Failed to get course video", error });
    }
  });

  // Direct upload of video files
  app.post("/api/admin/course-videos/upload", isAdmin, videoUpload.single('video'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Store the file path in the response
      const filePath = `/uploads/videos/${req.file.filename}`;

      res.status(201).json({
        message: "Video uploaded successfully",
        videoFile: filePath,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ message: "Failed to upload video", error });
    }
  });

  // Create course video (either with file path or YouTube URL)
  app.post("/api/admin/course-videos", isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCourseVideoSchema.parse(req.body);
      const courseVideo = await storage.createCourseVideo(validatedData);

      res.status(201).json({
        message: "Course video created successfully",
        courseVideo
      });
    } catch (error) {
      console.error("Error creating course video:", error);
      res.status(400).json({ message: "Failed to create course video", error });
    }
  });

  // Update course video
  app.put("/api/admin/course-videos/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCourseVideoSchema.partial().parse(req.body);
      const courseVideo = await storage.updateCourseVideo(id, validatedData);

      res.json({
        message: "Course video updated successfully",
        courseVideo
      });
    } catch (error) {
      console.error("Error updating course video:", error);
      res.status(400).json({ message: "Failed to update course video", error });
    }
  });

  // Delete course video
  app.delete("/api/admin/course-videos/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getCourseVideo(id);

      if (!video) {
        return res.status(404).json({ message: "Course video not found" });
      }

      // If it's a direct upload, delete the file
      if (video.videoFile && typeof video.videoFile === 'string' && video.videoFile.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), video.videoFile);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await storage.deleteCourseVideo(id);
      res.json({ message: "Course video deleted successfully" });
    } catch (error) {
      console.error("Error deleting course video:", error);
      res.status(500).json({ message: "Failed to delete course video", error });
    }
  });

  // Image upload route for questions and explanations
  app.post("/api/admin/upload-image", isAdmin, imageUpload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      // Store the file path in the response
      const filePath = `/uploads/images/${req.file.filename}`;

      res.status(201).json({
        message: "Image uploaded successfully",
        imageUrl: filePath,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image", error });
    }
  });

  // Serve static files from the uploads directory
  app.use('/uploads', (req, res, next) => {
    // Check if user is authenticated for protected content
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(403).send('Unauthorized');
  }, express.static(path.join(process.cwd(), 'uploads')));

  const httpServer = createServer(app);
  return httpServer;
}
