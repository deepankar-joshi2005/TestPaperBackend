import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware";
import dashboardRoutes from "./dashboard.routes";
import categoryRoutes from "./category.routes";
import seriesRoutes from "./series.routes";
import testRoutes from "./test.routes";
import questionRoutes from "./question.routes";
import studentRoutes from "./student.routes";
import uploadRoutes from "./upload.routes";
import notesSubjectRoutes from "./notesSubject.routes";
import noteRoutes from "./note.routes";
import currentAffairRoutes from "./currentAffair.routes";
import paymentsRoutes from "./payments.routes";

const router = Router();

router.use(requireAuth, requireAdmin);

router.use("/dashboard", dashboardRoutes);
router.use("/categories", categoryRoutes);
router.use("/series", seriesRoutes);
router.use("/tests", testRoutes);
router.use("/questions", questionRoutes);
router.use("/students", studentRoutes);
router.use("/upload", uploadRoutes);
router.use("/notes-subjects", notesSubjectRoutes);
router.use("/notes", noteRoutes);
router.use("/current-affairs", currentAffairRoutes);
router.use("/payments", paymentsRoutes);

export default router;
