const asyncHandler = require("express-async-handler");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");

// ─── GET /api/v1/enrollments ─────────────────────────────
const listEnrollments = asyncHandler(async (req, res) => {
  const filter = {};
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;

  if (role === "student") {
    filter.student = req.user._id;
  } else if (role === "tutor") {
    // Find courses owned by this tutor, then find enrollments for those courses
    const tutorCourses = await Course.find({
      $or: [{ tutor: req.user._id }, { teacher: req.user._id }],
    }).select("_id");
    const courseIds = tutorCourses.map((c) => c._id);
    filter.course = { $in: courseIds };
  }

  const enrollments = await Enrollment.find(filter)
    .populate("student", "name email")
    .populate("course", "title category price")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: enrollments });
});

// DELETE /api/v1/enrollments/:id
const deleteEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id).populate("course", "title tutor teacher");
  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role !== "tutor" && role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to remove enrollment");
  }

  if (role === "tutor") {
    const courseTutorId = String(enrollment.course?.tutor || enrollment.course?.teacher || "");
    if (!courseTutorId || courseTutorId !== String(req.user._id)) {
      res.status(403);
      throw new Error("You can only manage your own students");
    }
  }

  const studentId = String(enrollment.student);
  const courseTitle = enrollment.course?.title || "course";
  await enrollment.deleteOne();

  const note = await Notification.create({
    user: studentId,
    title: "Enrollment Removed",
    message: `Your enrollment for "${courseTitle}" has been removed by tutor.`,
  });

  const io = getIO();
  if (io) {
    io.to(`user:${studentId}`).emit("notification:new", { notification: note });
  }

  res.json({ success: true, message: "Enrollment removed successfully" });
});

module.exports = { listEnrollments, deleteEnrollment };
