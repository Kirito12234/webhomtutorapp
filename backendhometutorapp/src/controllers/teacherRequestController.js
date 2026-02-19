const asyncHandler = require("express-async-handler");
const TeacherRequest = require("../models/TeacherRequest");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");

// ─── GET /api/v1/teacher-requests ────────────────────────
const listRequests = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;

  let filter = {};
  if (role === "tutor") filter.tutor = req.user._id;
  if (role === "student") filter.student = req.user._id;

  const requests = await TeacherRequest.find(filter)
    .populate("student", "name email")
    .populate("tutor", "name email")
    .populate("course", "title")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
});

// ─── POST /api/v1/teacher-requests ───────────────────────
const createRequest = asyncHandler(async (req, res) => {
  const { tutor, course, message } = req.body;

  const request = await TeacherRequest.create({
    tutor,
    student: req.user._id,
    course: course || undefined,
    message: message || "",
    status: "pending",
  });

  // Notify tutor
  const note = await Notification.create({
    user: tutor,
    message: `${req.user.name} sent you a tutor request.`,
  });

  const io = getIO();
  if (io) {
    io.to(`user:${tutor}`).emit("notification:new", { notification: note });
  }

  res.status(201).json({ success: true, data: request });
});

// ─── PUT /api/v1/teacher-requests/:id ────────────────────
const updateRequest = asyncHandler(async (req, res) => {
  const request = await TeacherRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error("Request not found");
  }

  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role !== "tutor" && role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to update request");
  }

  if (role === "tutor" && String(request.tutor) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You can only manage your own requests");
  }

  const nextStatus = String(req.body.status || "pending").toLowerCase();
  if (!["pending", "accepted", "rejected"].includes(nextStatus)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  request.status = nextStatus;
  await request.save();

  // Notify student with more details
  const Course = require("../models/Course");
  const Enrollment = require("../models/Enrollment");
  const course = request.course ? await Course.findById(request.course).select("title") : null;
  const courseTitle = course ? course.title : "course";

  if (request.status === "accepted" && request.course) {
    const exists = await Enrollment.findOne({ student: request.student, course: request.course });
    if (!exists) {
      await Enrollment.create({
        student: request.student,
        course: request.course,
        status: "active",
      });
    }

    // Auto-create/update earning entry for accepted course access
    // so tutor dashboard earnings follow the course price.
    const Payment = require("../models/Payment");
    const fullCourse = await Course.findById(request.course).select("title price tutor");
    const effectiveTutor = request.tutor || fullCourse?.tutor;
    const effectiveAmount = Number(fullCourse?.price || 0);
    if (effectiveTutor && effectiveAmount > 0) {
      const existingPayment = await Payment.findOne({
        student: request.student,
        course: request.course,
      });
      if (existingPayment) {
        existingPayment.tutor = effectiveTutor;
        existingPayment.amount = Number(existingPayment.amount || 0) > 0 ? existingPayment.amount : effectiveAmount;
        existingPayment.status = "approved";
        existingPayment.paymentMethod = existingPayment.paymentMethod || "manual";
        existingPayment.provider = existingPayment.provider || "teacher_request_auto";
        await existingPayment.save();
      } else {
        await Payment.create({
          student: request.student,
          course: request.course,
          tutor: effectiveTutor,
          amount: effectiveAmount,
          paymentMethod: "manual",
          provider: "teacher_request_auto",
          status: "approved",
        });
      }
    }
  }

  if (request.status === "rejected" && request.course) {
    await Enrollment.deleteMany({ student: request.student, course: request.course });
  }
  
  const note = await Notification.create({
    user: String(request.student),
    title: request.status === "accepted" ? "Request Approved!" : "Request Updated",
    message: request.status === "accepted" 
      ? `Your request for "${courseTitle}" has been approved! You can now access the course.`
      : `Your request for "${courseTitle}" was ${request.status}.`,
  });

  const io = getIO();
  if (io) {
    io.to(`user:${request.student}`).emit("notification:new", { notification: note });
  }

  res.json({ success: true, data: request });
});

module.exports = { listRequests, createRequest, updateRequest };
