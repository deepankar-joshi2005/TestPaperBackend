import { Router } from "express";
import { listPayments, getPaymentsSummary } from "../../controllers/admin/payments.controller";

const router = Router();

router.get("/", listPayments);
router.get("/summary", getPaymentsSummary);

export default router;
