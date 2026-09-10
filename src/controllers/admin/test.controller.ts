import { Response } from "express";
import Test from "../../models/test.model";
import Question from "../../models/question.model";
import TestSeries from "../../models/testSeries.model";
import TestAttempt from "../../models/testAttempt.model";
import { AuthRequest } from "../../middleware/auth.middleware";

const CONFIG_FIELDS = [
  "title",
  "subject",
  "description",
  "difficulty",
  "totalQuestions",
  "totalMarks",
  "durationMinutes",
  "passingMarks",
  "negativeMarkingEnabled",
  "negativeMarks",
  "maxAttempts",
  "startDate",
  "endDate",
] as const;

export const listAllTests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query as { search?: string };
    const filter: Record<string, unknown> = {};
    if (search) filter.title = { $regex: search, $options: "i" };

    const tests = await Test.find(filter).sort({ createdAt: -1 }).limit(200);
    const seriesMap = new Map(
      (await TestSeries.find({ _id: { $in: tests.map((t) => t.series) } })).map((s) => [
        String(s._id),
        s.title,
      ])
    );

    const withAttemptCounts = await Promise.all(
      tests.map(async (t) => ({
        id: t._id,
        title: t.title,
        seriesTitle: seriesMap.get(String(t.series)) ?? "",
        status: t.status,
        totalQuestions: t.totalQuestions,
        attemptCount: await TestAttempt.countDocuments({ test: t._id, status: "completed" }),
      }))
    );

    res.status(200).json(withAttemptCounts);
  } catch (error) {
    res.status(500).json({ message: "Failed to load tests", error });
  }
};

export const createTest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, series, subject, description, difficulty } = req.body as Record<
      string,
      string | undefined
    >;

    if (!title || !title.trim()) {
      res.status(400).json({ message: "Test name is required" });
      return;
    }
    if (!series) {
      res.status(400).json({ message: "Test series is required" });
      return;
    }

    const order = await Test.countDocuments({ series });
    const test = await Test.create({
      series,
      title: title.trim(),
      subject: subject ?? "Multiple Subjects",
      description: description ?? "",
      difficulty: difficulty ?? "Mixed",
      status: "draft",
      order,
    });

    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: "Failed to create test", error });
  }
};

export const updateTestConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    for (const field of CONFIG_FIELDS) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    const test = await Test.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!test) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: "Failed to update test configuration", error });
  }
};

export const getTestDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: "Failed to load test", error });
  }
};

export const getPublishChecklist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    const questionCount = await Question.countDocuments({ test: test._id });

    res.status(200).json({
      testId: test._id,
      title: test.title,
      questionCount,
      checklist: {
        nameAdded: !!test.title,
        questionsAdded: questionCount > 0,
        durationSet: test.durationMinutes > 0,
        marksConfigured: test.totalMarks > 0,
        negativeMarkingConfigured: true,
        allValidated: questionCount > 0,
      },
      summary: {
        questionCount,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        negativeMarks: test.negativeMarkingEnabled ? test.negativeMarks : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load publish checklist", error });
  }
};

export const publishTest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    const questionCount = await Question.countDocuments({ test: test._id });
    if (questionCount === 0) {
      res.status(400).json({ message: "Add at least one question before publishing" });
      return;
    }
    test.status = "published";
    await test.save();
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: "Failed to publish test", error });
  }
};

export const deleteTest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) {
      res.status(404).json({ message: "Test not found" });
      return;
    }
    await Question.deleteMany({ test: test._id });
    res.status(200).json({ message: "Test deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete test", error });
  }
};
