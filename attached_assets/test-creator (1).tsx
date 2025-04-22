import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { safeParseInt, safeParseFloat } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  FileUp,
  CheckCircle2,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
// Create a temporary schema for tests since we don't have access to the shared schema
const insertTestSchema = z.object({
  title: z.string(),
  description: z.string(),
  duration: z.number(),
  totalMarks: z.number(),
  passingMarks: z.number(),
  negativeMarking: z.number(),
  instructions: z.string().optional(),
  courseId: z.number().optional(),
  isActive: z.boolean().default(true),
});

// Form schemas
const questionOption = z.object({
  id: z.number().optional(),
  text: z.string().min(1, "Option text is required"),
  isCorrect: z.boolean().default(false),
});

const mcqQuestionSchema = z.object({
  id: z.number().optional(),
  type: z.literal("mcq"),
  text: z.string().min(1, "Question text is required"),
  options: z.array(questionOption).min(2, "At least 2 options are required"),
  explanation: z.string().optional(),
  marks: z.number().min(1, "Marks must be at least 1"),
});

const trueFalseQuestionSchema = z.object({
  id: z.number().optional(),
  type: z.literal("truefalse"),
  text: z.string().min(1, "Question text is required"),
  correctAnswer: z.boolean(),
  explanation: z.string().optional(),
  marks: z.number().min(1, "Marks must be at least 1"),
});

const fillBlankQuestionSchema = z.object({
  id: z.number().optional(),
  type: z.literal("fillblank"),
  text: z.string().min(1, "Question text is required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  explanation: z.string().optional(),
  marks: z.number().min(1, "Marks must be at least 1"),
});

const subjectiveQuestionSchema = z.object({
  id: z.number().optional(),
  type: z.literal("subjective"),
  text: z.string().min(1, "Question text is required"),
  modelAnswer: z.string().min(1, "Model answer is required"),
  explanation: z.string().optional(),
  marks: z.number().min(1, "Marks must be at least 1"),
});

const questionSchema = z.discriminatedUnion("type", [
  mcqQuestionSchema,
  trueFalseQuestionSchema,
  fillBlankQuestionSchema,
  subjectiveQuestionSchema,
]);

const testFormSchema = insertTestSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  totalMarks: z.number().min(1, "Total marks must be at least 1"),
  passingMarks: z.number().min(1, "Passing marks must be at least 1"),
  passingScore: z.number().min(1, "Passing score must be at least 1"),
  totalQuestions: z.number().min(1, "Total questions must be at least 1"),
  negativeMarking: z.number().min(0, "Negative marking cannot be negative"),
  instructions: z.string().optional(),
  questions: z.array(questionSchema).optional(),
  courseId: z.number().optional(),
  isActive: z.boolean().default(true),
});

type TestFormValues = z.infer<typeof testFormSchema>;
type QuestionType = "mcq" | "truefalse" | "fillblank" | "subjective";

// Using safeParseInt and safeParseFloat utility functions from @/lib/utils

export default function TestCreator() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("details");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionType, setCurrentQuestionType] =
    useState<QuestionType>("mcq");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<
    number | null
  >(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);

  const isEditing = Boolean(id);

  // MCQ question form
  const mcqForm = useForm<z.infer<typeof mcqQuestionSchema>>({
    resolver: zodResolver(mcqQuestionSchema),
    defaultValues: {
      type: "mcq" as const,
      text: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      explanation: "",
      marks: 1,
    },
  });

  const {
    fields: mcqOptionsFields,
    append: mcqAppendOption,
    remove: mcqRemoveOption,
  } = useFieldArray({
    control: mcqForm.control,
    name: "options",
  });

  // True/False question form
  const trueFalseForm = useForm<z.infer<typeof trueFalseQuestionSchema>>({
    resolver: zodResolver(trueFalseQuestionSchema),
    defaultValues: {
      type: "truefalse" as const,
      text: "",
      correctAnswer: true,
      explanation: "",
      marks: 1,
    },
  });

  // Fill in the blank question form
  const fillBlankForm = useForm<z.infer<typeof fillBlankQuestionSchema>>({
    resolver: zodResolver(fillBlankQuestionSchema),
    defaultValues: {
      type: "fillblank" as const,
      text: "",
      correctAnswer: "",
      explanation: "",
      marks: 1,
    },
  });

  // Subjective question form
  const subjectiveForm = useForm<z.infer<typeof subjectiveQuestionSchema>>({
    resolver: zodResolver(subjectiveQuestionSchema),
    defaultValues: {
      type: "subjective" as const,
      text: "",
      modelAnswer: "",
      explanation: "",
      marks: 1,
    },
  });

  // Test form
  const testForm = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: 60,
      totalMarks: 100,
      passingMarks: 40,
      negativeMarking: 0.25,
      instructions: "",
      isActive: true,
      courseId: undefined,
    },
  });

  // Fetch courses for dropdown
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ["/api/courses"],
  });

  // Fetch test data if editing
  const { data: testData, isLoading: loadingTest } = useQuery({
    queryKey: ["/api/admin/tests", safeParseInt(id)],
    enabled: isEditing,
    onSuccess: (data) => {
      if (data) {
        testForm.reset({
          title: data.title,
          description: data.description,
          duration: data.duration,
          totalMarks: data.totalMarks,
          passingMarks: data.passingMarks,
          negativeMarking: data.negativeMarking,
          instructions: data.instructions,
          isActive: data.isActive,
          courseId: data.courseId,
        });
      }
    },
  });

  // Fetch questions if editing
  const { data: questionData, isLoading: loadingQuestions } = useQuery({
    queryKey: ["/api/admin/tests", safeParseInt(id), "questions"],
    enabled: isEditing,
    onSuccess: (data) => {
      if (data) {
        setQuestions(data);
      }
    },
  });

  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: async (data: TestFormValues) => {
      const testResponse = await apiRequest("POST", "/api/admin/tests", data);
      const test = await testResponse.json();

      // Add questions if they exist
      if (questions.length > 0) {
        for (const question of questions) {
          await apiRequest("POST", `/api/admin/questions`, {
            ...question,
            testId: test.id,
          });
        }
      }

      return test;
    },
    onSuccess: () => {
      toast({
        title: "Test created",
        description: "Test has been created successfully.",
      });
      navigate("/admin/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create test",
        description:
          error.message || "An error occurred while creating the test.",
        variant: "destructive",
      });
    },
  });

  // Update test mutation
  const updateTestMutation = useMutation({
    mutationFn: async (data: TestFormValues) => {
      await apiRequest("PUT", `/api/admin/tests/${id}`, data);

      // Add/update questions
      // This is a simplified approach - in reality you might want to compare existing questions
      if (questions.length > 0) {
        for (const question of questions) {
          if (question.id) {
            await apiRequest(
              "PUT",
              `/api/admin/questions/${question.id}`,
              question,
            );
          } else {
            await apiRequest("POST", `/api/admin/questions`, {
              ...question,
              testId: safeParseInt(id),
            });
          }
        }
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Test updated",
        description: "Test has been updated successfully.",
      });

      // Invalidate test data queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tests", safeParseInt(id)] });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/tests", safeParseInt(id), "questions"],
      });

      navigate("/admin/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update test",
        description:
          error.message || "An error occurred while updating the test.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmitTest = (data: TestFormValues) => {
    if (questions.length === 0) {
      toast({
        title: "No questions added",
        description: "Please add at least one question to the test.",
        variant: "destructive",
      });
      return;
    }

    const totalMarks = questions.reduce((total, q) => total + q.marks, 0);
    
    // Validate passing marks
    if (data.passingMarks > totalMarks) {
      toast({
        title: "Invalid passing marks",
        description: "Passing marks cannot be greater than total marks.",
        variant: "destructive",
      });
      return;
    }

    const finalData = {
      ...data,
      totalMarks,
      totalQuestions: questions.length,
      passingScore: data.passingMarks,
      isActive: true, // Set to true when publishing
      questions: questions // Include questions array
    };

    if (isEditing) {
      updateTestMutation.mutate(finalData);
    } else {
      createTestMutation.mutate(finalData);
    }
  };

  // Handle MCQ form submission
  const onSubmitMcqQuestion = (data: z.infer<typeof mcqQuestionSchema>) => {
    // Ensure there's at least one correct answer
    const hasCorrectOption = data.options.some((option) => option.isCorrect);

    if (!hasCorrectOption) {
      toast({
        title: "Invalid question",
        description: "Please mark at least one option as correct.",
        variant: "destructive",
      });
      return;
    }

    if (isEditingQuestion && editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...questions];
      updatedQuestions[editingQuestionIndex] = data;
      setQuestions(updatedQuestions);
      setIsEditingQuestion(false);
      setEditingQuestionIndex(null);
    } else {
      // Add new question
      setQuestions([...questions, data]);
    }

    // Reset the form
    mcqForm.reset({
      type: "mcq",
      text: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      explanation: "",
      marks: 1,
    });

    toast({
      title: isEditingQuestion ? "Question updated" : "Question added",
      description: isEditingQuestion
        ? "The question has been updated successfully."
        : "The question has been added to the test.",
    });
  };

  // Handle True/False form submission
  const onSubmitTrueFalseQuestion = (
    data: z.infer<typeof trueFalseQuestionSchema>,
  ) => {
    if (isEditingQuestion && editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...questions];
      updatedQuestions[editingQuestionIndex] = data;
      setQuestions(updatedQuestions);
      setIsEditingQuestion(false);
      setEditingQuestionIndex(null);
    } else {
      // Add new question
      setQuestions([...questions, data]);
    }

    // Reset the form
    trueFalseForm.reset({
      type: "truefalse",
      text: "",
      correctAnswer: true,
      explanation: "",
      marks: 1,
    });

    toast({
      title: isEditingQuestion ? "Question updated" : "Question added",
      description: isEditingQuestion
        ? "The question has been updated successfully."
        : "The question has been added to the test.",
    });
  };

  // Handle Fill in the Blank form submission
  const onSubmitFillBlankQuestion = (
    data: z.infer<typeof fillBlankQuestionSchema>,
  ) => {
    if (isEditingQuestion && editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...questions];
      updatedQuestions[editingQuestionIndex] = data;
      setQuestions(updatedQuestions);
      setIsEditingQuestion(false);
      setEditingQuestionIndex(null);
    } else {
      // Add new question
      setQuestions([...questions, data]);
    }

    // Reset the form
    fillBlankForm.reset({
      type: "fillblank",
      text: "",
      correctAnswer: "",
      explanation: "",
      marks: 1,
    });

    toast({
      title: isEditingQuestion ? "Question updated" : "Question added",
      description: isEditingQuestion
        ? "The question has been updated successfully."
        : "The question has been added to the test.",
    });
  };

  // Handle Subjective form submission
  const onSubmitSubjectiveQuestion = (
    data: z.infer<typeof subjectiveQuestionSchema>,
  ) => {
    if (isEditingQuestion && editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...questions];
      updatedQuestions[editingQuestionIndex] = data;
      setQuestions(updatedQuestions);
      setIsEditingQuestion(false);
      setEditingQuestionIndex(null);
    } else {
      // Add new question
      setQuestions([...questions, data]);
    }

    // Reset the form
    subjectiveForm.reset({
      type: "subjective",
      text: "",
      modelAnswer: "",
      explanation: "",
      marks: 1,
    });

    toast({
      title: isEditingQuestion ? "Question updated" : "Question added",
      description: isEditingQuestion
        ? "The question has been updated successfully."
        : "The question has been added to the test.",
    });
  };

  // Edit a question
  const editQuestion = (index: number) => {
    const question = questions[index];
    setEditingQuestionIndex(index);
    setIsEditingQuestion(true);
    setCurrentQuestionType(question.type);

    switch (question.type) {
      case "mcq":
        mcqForm.reset(question);
        break;
      case "truefalse":
        trueFalseForm.reset(question);
        break;
      case "fillblank":
        fillBlankForm.reset(question);
        break;
      case "subjective":
        subjectiveForm.reset(question);
        break;
    }

    setActiveTab("questions");
  };

  // Remove a question
  const removeQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);

    toast({
      title: "Question removed",
      description: "The question has been removed from the test.",
    });
  };

  // Preview a question
  const previewQuestionHandler = (index: number) => {
    setPreviewQuestion(questions[index]);
    setIsPreviewDialogOpen(true);
  };

  // Calculate total marks
  const totalMarks = questions.reduce((total, q) => total + q.marks, 0);

  // Loading state
  if ((isEditing && (loadingTest || loadingQuestions)) || loadingCourses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold px-4">
            {isEditing ? "Edit Test" : "Create New Test"}
          </h1>          
        </div>
        <div className="flex gap-2 px-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/dashboard")}
          >
            Cancel
          </Button>          
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 px-2">
          <TabsTrigger value="details">Test Details</TabsTrigger>
          <TabsTrigger value="questions">
            Questions
            {questions.length > 0 && (
              <Badge className="ml-2 bg-primary" variant="default">
                {questions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview">Preview Test</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
              <CardDescription>
                Enter the basic details for your test
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Form {...testForm}>
                <form id="test-details-form" className="space-y-4" onSubmit={testForm.handleSubmit(onSubmitTest)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={testForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Calculus Mid-Term Exam"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={testForm.control}
                      name="courseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associated Course</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(safeParseInt(value))
                            }
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a course (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {courses?.map((course: any) => (
                                <SelectItem
                                  key={course.id}
                                  value={course.id.toString()}
                                >
                                  {course.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={testForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide a brief description of the test"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={testForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(safeParseInt(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={testForm.control}
                      name="passingMarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passing Marks</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(safeParseInt(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={testForm.control}
                      name="negativeMarking"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Negative Marking</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.25"
                              {...field}
                              onChange={(e) =>
                                field.onChange(safeParseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Marks deducted for wrong answers (0 for no
                            deduction)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={testForm.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Instructions for students taking the test"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={testForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Make this test available to students
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>

            <CardFooter className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total marks: {totalMarks}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total questions: {questions.length}
                </p>
              </div>
              <Button onClick={() => setActiveTab("questions")}>
                Continue to Questions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Question Type Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Add Questions</CardTitle>
                  <CardDescription>
                    Choose the type of question you want to add
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select
                      value={currentQuestionType}
                      onValueChange={(value) =>
                        setCurrentQuestionType(value as QuestionType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="truefalse">True/False</SelectItem>
                        <SelectItem value="fillblank">
                          Fill in the Blank
                        </SelectItem>
                        <SelectItem value="subjective">Subjective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>               

                  
                </CardContent>
              </Card>
            </div>

            {/* Question Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isEditingQuestion
                      ? "Edit Question"
                      : `Add ${
                          currentQuestionType === "mcq"
                            ? "Multiple Choice"
                            : currentQuestionType === "truefalse"
                              ? "True/False"
                              : currentQuestionType === "fillblank"
                                ? "Fill in the Blank"
                                : "Subjective"
                        } Question`}
                  </CardTitle>
                  <CardDescription>
                    {isEditingQuestion
                      ? "Edit the question details"
                      : "Create a new question for the test"}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Multiple Choice Question Form */}
                  {currentQuestionType === "mcq" && (
                    <Form {...mcqForm}>
                      <form
                        onSubmit={mcqForm.handleSubmit(onSubmitMcqQuestion)}
                        className="space-y-4"
                      >
                        <FormField
                          control={mcqForm.control}
                          name="text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Text</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter your question here"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4">
                          <FormLabel>Options</FormLabel>
                          {mcqOptionsFields.map((field, index) => (
                            <div
                              key={field.id}
                              className="flex items-start space-x-2"
                            >
                              <FormField
                                control={mcqForm.control}
                                name={`options.${index}.isCorrect`}
                                render={({ field }) => (
                                  <FormItem className="mt-2">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={mcqForm.control}
                                name={`options.${index}.text`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input
                                        placeholder={`Option ${index + 1}`}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {index > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => mcqRemoveOption(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              mcqAppendOption({ text: "", isCorrect: false })
                            }
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                          </Button>
                        </div>

                        <FormField
                          control={mcqForm.control}
                          name="explanation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Explanation (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Explain the correct answer"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={mcqForm.control}
                          name="marks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marks</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(safeParseInt(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          {isEditingQuestion && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsEditingQuestion(false);
                                setEditingQuestionIndex(null);
                                mcqForm.reset({
                                  type: "mcq",
                                  text: "",
                                  options: [
                                    { text: "", isCorrect: false },
                                    { text: "", isCorrect: false },
                                    { text: "", isCorrect: false },
                                    { text: "", isCorrect: false },
                                  ],
                                  explanation: "",
                                  marks: 1,
                                });
                              }}
                            >
                              Cancel Edit
                            </Button>
                          )}
                          <Button type="submit">
                            {isEditingQuestion
                              ? "Update Question"
                              : "Add Question"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}

                  {/* True/False Question Form */}
                  {currentQuestionType === "truefalse" && (
                    <Form {...trueFalseForm}>
                      <form
                        onSubmit={trueFalseForm.handleSubmit(
                          onSubmitTrueFalseQuestion,
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={trueFalseForm.control}
                          name="text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Text</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter your true/false statement here"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={trueFalseForm.control}
                          name="correctAnswer"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Correct Answer</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={(value) =>
                                    field.onChange(value === "true")
                                  }
                                  value={field.value ? "true" : "false"}
                                  className="flex space-x-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="true" id="true" />
                                    <Label htmlFor="true">True</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="false" id="false" />
                                    <Label htmlFor="false">False</Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={trueFalseForm.control}
                          name="explanation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Explanation (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Explain the correct answer"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={trueFalseForm.control}
                          name="marks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marks</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(safeParseInt(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          {isEditingQuestion && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsEditingQuestion(false);
                                setEditingQuestionIndex(null);
                                trueFalseForm.reset({
                                  type: "truefalse",
                                  text: "",
                                  correctAnswer: true,
                                  explanation: "",
                                  marks: 1,
                                });
                              }}
                            >
                              Cancel Edit
                            </Button>
                          )}
                          <Button type="submit">
                            {isEditingQuestion
                              ? "Update Question"
                              : "Add Question"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}

                  {/* Fill in the Blank Question Form */}
                  {currentQuestionType === "fillblank" && (
                    <Form {...fillBlankForm}>
                      <form
                        onSubmit={fillBlankForm.handleSubmit(
                          onSubmitFillBlankQuestion,
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={fillBlankForm.control}
                          name="text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Text</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter your question with blank(s) indicated by underscores or blanks"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Use underscores or [blank] to indicate where the
                                blank should be, e.g. "The capital of France is
                                _____ ."
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={fillBlankForm.control}
                          name="correctAnswer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correct Answer</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter the correct answer"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={fillBlankForm.control}
                          name="explanation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Explanation (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Explain the correct answer"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={fillBlankForm.control}
                          name="marks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marks</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(safeParseInt(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          {isEditingQuestion && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsEditingQuestion(false);
                                setEditingQuestionIndex(null);
                                fillBlankForm.reset({
                                  type: "fillblank",
                                  text: "",
                                  correctAnswer: "",
                                  explanation: "",
                                  marks: 1,
                                });
                              }}
                            >
                              Cancel Edit
                            </Button>
                          )}
                          <Button type="submit">
                            {isEditingQuestion
                              ? "Update Question"
                              : "Add Question"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}

                  {/* Subjective Question Form */}
                  {currentQuestionType === "subjective" && (
                    <Form {...subjectiveForm}>
                      <form
                        onSubmit={subjectiveForm.handleSubmit(
                          onSubmitSubjectiveQuestion,
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={subjectiveForm.control}
                          name="text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Text</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter your subjective question here"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={subjectiveForm.control}
                          name="modelAnswer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model Answer</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide a model answer or key points for grading"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={subjectiveForm.control}
                          name="explanation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Additional notes for graders"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={subjectiveForm.control}
                          name="marks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marks</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(safeParseInt(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          {isEditingQuestion && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsEditingQuestion(false);
                                setEditingQuestionIndex(null);
                                subjectiveForm.reset({
                                  type: "subjective",
                                  text: "",
                                  modelAnswer: "",
                                  explanation: "",
                                  marks: 1,
                                });
                              }}
                            >
                              Cancel Edit
                            </Button>
                          )}
                          <Button type="submit">
                            {isEditingQuestion
                              ? "Update Question"
                              : "Add Question"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>

              {/* Question List */}
              {questions.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Added Questions</CardTitle>
                    <CardDescription>
                      {questions.length} question
                      {questions.length !== 1 ? "s" : ""} added to this test
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <div key={index} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Badge>
                                {question.type === "mcq"
                                  ? "Multiple Choice"
                                  : question.type === "truefalse"
                                    ? "True/False"
                                    : question.type === "fillblank"
                                      ? "Fill in Blank"
                                      : "Subjective"}
                              </Badge>
                              <Badge variant="outline">
                                {question.marks} mark
                                {question.marks !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => previewQuestionHandler(index)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => editQuestion(index)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuestion(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm font-medium mb-1">
                            Question {index + 1}:
                          </p>
                          <p>{question.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Test Preview</CardTitle>
              <CardDescription>
                Review your test before finalizing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold">
                  {testForm.watch("title")}
                </h2>
                <p className="text-gray-500 mt-1">
                  {testForm.watch("description")}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">
                      {testForm.watch("duration")} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Marks</p>
                    <p className="font-medium">{totalMarks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Passing Marks</p>
                    <p className="font-medium">
                      {testForm.watch("passingMarks")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Negative Marking</p>
                    <p className="font-medium">
                      {testForm.watch("negativeMarking")}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {testForm.watch("instructions")}
                </p>
              </div>

              {questions.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Questions</h3>
                  <div className="space-y-6">
                    {questions.map((question, index) => (
                      <div key={index} className="border rounded-md p-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium">Question {index + 1}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {question.marks} mark
                              {question.marks !== 1 ? "s" : ""}
                            </Badge>
                            <Badge>
                              {question.type === "mcq"
                                ? "Multiple Choice"
                                : question.type === "truefalse"
                                  ? "True/False"
                                  : question.type === "fillblank"
                                    ? "Fill in Blank"
                                    : "Subjective"}
                            </Badge>
                          </div>
                        </div>

                        <p className="my-2">{question.text}</p>

                        {question.type === "mcq" && (
                          <div className="pl-4 space-y-2 mt-3">
                            {question.options.map(
                              (option: any, optIndex: number) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center gap-2"
                                >
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${option.isCorrect ? "bg-green-100 border-green-500" : "border-gray-300"}`}
                                  >
                                    {option.isCorrect && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                  <span>{option.text}</span>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                        {question.type === "truefalse" && (
                          <div className="pl-4 space-y-2 mt-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${question.correctAnswer ? "bg-green-100 border-green-500" : "border-gray-300"}`}
                              >
                                {question.correctAnswer && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <span>True</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${!question.correctAnswer ? "bg-green-100 border-green-500" : "border-gray-300"}`}
                              >
                                {!question.correctAnswer && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <span>False</span>
                            </div>
                          </div>
                        )}

                        {question.type === "fillblank" && (
                          <div className="pl-4 mt-3">
                            <p className="text-sm text-gray-500">
                              Correct Answer:
                            </p>
                            <p className="font-medium">
                              {question.correctAnswer}
                            </p>
                          </div>
                        )}

                        {question.type === "subjective" && (
                          <div className="pl-4 mt-3">
                            <p className="text-sm text-gray-500">
                              Model Answer:
                            </p>
                            <p className="text-sm italic border-l-2 border-gray-300 pl-2 mt-1">
                              {question.modelAnswer}
                            </p>
                          </div>
                        )}

                        {question.explanation && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-500">
                              Explanation:
                            </p>
                            <p className="text-sm">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md bg-gray-50">
                  <p className="text-gray-500">No questions added yet.</p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setActiveTab("questions")}
                  >
                    Add Questions
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveTab("questions")}
              >
                Back to Questions
              </Button>
              <Button
                type="submit"
                form="test-details-form"
                disabled={
                  createTestMutation.isPending || updateTestMutation.isPending
                }
                onClick={() => {
                  // When publishing from preview tab, ensure the test is set to active
                  if (activeTab === "preview") {
                    testForm.setValue("isActive", true);
                  }
                }}
              >
                {(createTestMutation.isPending ||
                  updateTestMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update Test" : "Publish Test"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
            <DialogDescription>
              This is how the question will appear to students
            </DialogDescription>
          </DialogHeader>

          {previewQuestion && (
            <div className="space-y-4">
              <p className="font-medium">{previewQuestion.text}</p>

              {previewQuestion.type === "mcq" && (
                <div className="space-y-2">
                  {previewQuestion.options.map((option: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={index.toString()}
                        id={`opt-${index}`}
                      />
                      <Label htmlFor={`opt-${index}`}>{option.text}</Label>
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.type === "truefalse" && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="preview-true" />
                    <Label htmlFor="preview-true">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="preview-false" />
                    <Label htmlFor="preview-false">False</Label>
                  </div>
                </div>
              )}

              {previewQuestion.type === "fillblank" && (
                <div>
                  <Input placeholder="Your answer" />
                </div>
              )}

              {previewQuestion.type === "subjective" && (
                <div>
                  <Textarea
                    placeholder="Your answer"
                    className="min-h-[150px]"
                  />
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex justify-between">
                  <Badge variant="outline">
                    {previewQuestion.marks} mark
                    {previewQuestion.marks !== 1 ? "s" : ""}
                  </Badge>
                  <Badge>
                    {previewQuestion.type === "mcq"
                      ? "Multiple Choice"
                      : previewQuestion.type === "truefalse"
                        ? "True/False"
                        : previewQuestion.type === "fillblank"
                          ? "Fill in Blank"
                          : "Subjective"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
