import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { createOrder, verifyPayment, getMyPurchases } from "../controllers/payment.controller";

const router = Router();

router.post("/create-order", requireAuth, createOrder);
router.post("/verify", requireAuth, verifyPayment);
router.get("/my-purchases", requireAuth, getMyPurchases);

export default router;
