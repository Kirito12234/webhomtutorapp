const asyncHandler = require("express-async-handler");
const Payment = require("../models/Payment");
const Course = require("../models/Course");
const Notification = require("../models/Notification");
const Enrollment = require("../models/Enrollment");
const { getIO } = require("../services/socket.service");
const { toRelativeUploadUrl, toAbsoluteUrl } = require("../utils/fileUrl");

const resolveEffectiveAmount = (primaryAmount, fallbackCoursePrice) => {
  const amount = Number(primaryAmount || 0);
  const price = Number(fallbackCoursePrice || 0);

  // Prefer explicit payment amount.
  if (amount > 0) {
    // Legacy data guard: some records were stored as 1000 fallback
    // even when the course had a higher real price.
    if (amount === 1000 && price > 1000) return price;
    return amount;
  }

  // Fall back to course price when payment amount is missing.
  if (price > 0) return price;

  // Do not inject arbitrary defaults into earnings math.
  return 0;
};

// ─── POST /api/v1/payments/submit ────────────────────────
const submitPayment = asyncHandler(async (req, res) => {
  const courseId = req.body.courseId;
  const course = await Course.findById(courseId).populate("tutor", "name");
  if (!course || !course.tutor) {
    res.status(400);
    throw new Error("Invalid course");
  }

  const screenshotUrl = req.file ? toRelativeUploadUrl(req.file) : "";

  const payment = await Payment.create({
    student: req.user._id,
    course: course._id,
    tutor: course.tutor._id,
    amount: resolveEffectiveAmount(req.body.amount, course.price),
    paymentMethod: req.body.paymentMethod || "khalti",
    provider: req.body.paymentMethod || "manual",
    screenshotUrl,
    status: "pending",
  });

  // Notify tutor
  const note = await Notification.create({
    user: String(course.tutor._id),
    title: "Payment Screenshot Uploaded",
    message: `${req.user.name} uploaded payment screenshot for "${course.title}". Please review and approve.`,
    type: "payment",
    relatedId: String(payment._id),
  });

  const io = getIO();
  if (io) {
    io.to(`user:${course.tutor._id}`).emit("notification:new", { notification: note });
    console.log(`Payment notification sent to tutor ${course.tutor._id}`);
  }

  const paymentObj = payment.toObject();
  paymentObj.screenshotUrl = toAbsoluteUrl(req, paymentObj.screenshotUrl);
  res.status(201).json({ success: true, data: paymentObj });
});

// ─── GET /api/v1/payments/status/:courseId ────────────────
const paymentStatus = asyncHandler(async (req, res) => {
  const Enrollment = require("../models/Enrollment");
  const TeacherRequest = require("../models/TeacherRequest");
  
  const payment = await Payment.findOne({
    course: req.params.courseId,
    student: req.user._id,
  }).sort({ createdAt: -1 });

  // Check if student has access via enrollment or accepted teacher request
  const [enrollment, teacherRequest] = await Promise.all([
    Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
    }),
    TeacherRequest.findOne({
      student: req.user._id,
      course: req.params.courseId,
      status: "accepted",
    }),
  ]);

  const hasAccess = 
    payment?.status === "approved" || 
    payment?.status === "paid" ||
    !!enrollment ||
    !!teacherRequest;

  res.json({
    success: true,
    data: {
      status: payment ? payment.status : "none",
      hasAccess,
    },
  });
});

// ─── GET /api/v1/payments/pending ────────────────────────
const pendingPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    tutor: req.user._id,
    status: "pending",
  })
    .populate("student", "name email")
    .populate("course", "title")
    .sort({ createdAt: -1 });

  const items = payments.map((p) => {
    const payment = p.toObject();
    payment.screenshotUrl = toAbsoluteUrl(req, payment.screenshotUrl);
    return payment;
  });
  res.json({ success: true, data: items });
});

// GET /api/v1/payments/approved
const approvedPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    tutor: req.user._id,
    status: { $in: ["approved", "paid"] },
  })
    .populate("student", "name email")
    .populate("course", "title price")
    .sort({ updatedAt: -1, createdAt: -1 });

  const items = payments.map((p) => {
    const payment = p.toObject();
    payment.amount = resolveEffectiveAmount(payment.amount, payment.course?.price);
    payment.screenshotUrl = toAbsoluteUrl(req, payment.screenshotUrl);
    return payment;
  });
  res.json({ success: true, data: items });
});

// ─── PUT /api/v1/payments/:id/status ─────────────────────
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  const newStatus = req.body.status === "approved" ? "approved" : "rejected";
  payment.status = newStatus;
  if (req.body.rejectionReason) payment.rejectionReason = req.body.rejectionReason;
  const course = await Course.findById(payment.course);
  if (newStatus === "approved" && Number(payment.amount || 0) <= 0) {
    payment.amount = resolveEffectiveAmount(req.body.amount, course?.price);
  }
  await payment.save();

  // If approved, create enrollment
  if (newStatus === "approved") {
    const exists = await Enrollment.findOne({
      student: payment.student,
      course: payment.course,
    });
    if (!exists) {
      await Enrollment.create({ student: payment.student, course: payment.course });
      console.log(`Enrollment created for student ${payment.student} in course ${payment.course}`);
    }
  }

  // Notify student
  const note = await Notification.create({
    user: String(payment.student),
    title: newStatus === "approved" ? "Payment Approved" : "Payment Rejected",
    message:
      newStatus === "approved"
        ? `Your payment for "${course?.title || "the course"}" has been approved. You can now access the course!`
        : `Your payment for "${course?.title || "the course"}" was rejected.${req.body.rejectionReason ? ` Reason: ${req.body.rejectionReason}` : ""}`,
    type: "payment",
    relatedId: String(payment._id),
  });

  const io = getIO();
  if (io) {
    io.to(`user:${payment.student}`).emit("notification:new", { notification: note });
    // Also emit payment status update so course page can refresh
    io.to(`user:${payment.student}`).emit("payment:status-updated", {
      courseId: String(payment.course),
      status: newStatus,
      hasAccess: newStatus === "approved",
    });
    console.log(`Payment ${newStatus} notification sent to student ${payment.student}`);
  }

  const paymentObj = payment.toObject();
  paymentObj.screenshotUrl = toAbsoluteUrl(req, paymentObj.screenshotUrl);
  res.json({ success: true, data: paymentObj });
});

// ─── GET /api/v1/payments/summary ────────────────────────
const paymentSummary = asyncHandler(async (req, res) => {
  const tutorId = req.user._id;
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [approvedRows, pendingRows] = await Promise.all([
    Payment.find({
      tutor: tutorId,
      status: { $in: ["approved", "paid"] },
    })
      .populate("course", "price")
      .select("amount updatedAt course"),
    Payment.find({
      tutor: tutorId,
      status: "pending",
    })
      .populate("course", "price")
      .select("amount course"),
  ]);

  const effectiveAmount = (payment) => resolveEffectiveAmount(payment?.amount, payment?.course?.price);

  let thisMonth = 0;
  let lastMonth = 0;
  let total = 0;
  approvedRows.forEach((row) => {
    const amount = effectiveAmount(row);
    total += amount;
    const ts = new Date(row.updatedAt || row.createdAt || 0);
    if (ts >= startThisMonth) {
      thisMonth += amount;
    } else if (ts >= startLastMonth && ts < startThisMonth) {
      lastMonth += amount;
    }
  });

  let pending = 0;
  pendingRows.forEach((row) => {
    pending += effectiveAmount(row);
  });

  res.json({
    success: true,
    data: {
      thisMonth,
      lastMonth,
      total,
      pending,
      currency: "NPR",
    },
  });
});

module.exports = {
  submitPayment,
  paymentStatus,
  pendingPayments,
  approvedPayments,
  updatePaymentStatus,
  paymentSummary,
};

