const express = require("express");
const {
  submitPayment,
  paymentStatus,
  pendingPayments,
  approvedPayments,
  updatePaymentStatus,
  paymentSummary,
} = require("../controllers/paymentController");
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const router = express.Router();

router.use(protect);

// POST   /api/v1/payments/submit
router.post("/submit", upload.single("screenshot"), submitPayment);

// GET    /api/v1/payments/summary
router.get("/summary", paymentSummary);

// GET    /api/v1/payments/pending
router.get("/pending", pendingPayments);
router.get("/approved", approvedPayments);

// GET    /api/v1/payments/status/:courseId
router.get("/status/:courseId", paymentStatus);

// PUT    /api/v1/payments/:id/status
router.put("/:id/status", updatePaymentStatus);

module.exports = router;




