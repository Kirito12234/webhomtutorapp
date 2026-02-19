const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const PayoutSetting = require("../models/PayoutSetting");
const Lesson = require("../models/Lesson");
const LessonProgress = require("../models/LessonProgress");
const TeacherRequest = require("../models/TeacherRequest");
const Session = require("../models/Session");
const LiveSession = require("../models/LiveSession");
const Thread = require("../models/Thread");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const toUserId = (value) => String(value || "");

const deleteCourseCascade = async (courseId) => {
  await Promise.all([
    Lesson.deleteMany({ $or: [{ course: courseId }, { courseId }] }),
    LessonProgress.deleteMany({ course: courseId }),
    Enrollment.deleteMany({ course: courseId }),
    Payment.deleteMany({ course: courseId }),
    TeacherRequest.deleteMany({ course: courseId }),
    Session.deleteMany({
      $or: [{ courseRef: courseId }, { course: String(courseId) }],
    }),
    LiveSession.deleteMany({ course: courseId }),
  ]);
};

const deleteUserCascade = async (user) => {
  const userId = user._id;
  const userIdText = toUserId(userId);

  const baseTasks = [
    Enrollment.deleteMany({ student: userId }),
    Payment.deleteMany({ student: userId }),
    Payment.deleteMany({ tutor: userId }),
    TeacherRequest.deleteMany({ student: userId }),
    TeacherRequest.deleteMany({ tutor: userId }),
    LessonProgress.deleteMany({ student: userId }),
    LessonProgress.deleteMany({ tutor: userId }),
    Session.deleteMany({ student: userId }),
    Session.deleteMany({ tutor: userId }),
    LiveSession.deleteMany({ tutor: userId }),
    Notification.deleteMany({ user: userIdText }),
    Message.deleteMany({ sender: userIdText }),
  ];

  if (user.role === "student") {
    baseTasks.push(Student.findOneAndDelete({ user: userId }));
  }

  if (user.role === "teacher") {
    baseTasks.push(Teacher.findOneAndDelete({ user: userId }));
    baseTasks.push(PayoutSetting.deleteMany({ tutor: userId }));
    const courses = await Course.find({
      $or: [{ tutor: userId }, { teacher: userId }],
    }).select("_id");
    for (const course of courses) {
      await deleteCourseCascade(course._id);
    }
    baseTasks.push(Course.deleteMany({ $or: [{ tutor: userId }, { teacher: userId }] }));
  }

  const threads = await Thread.find({
    $or: [
      { studentId: userIdText },
      { tutorId: userIdText },
      { participants: userIdText },
    ],
  }).select("_id");
  const threadIds = threads.map((item) => item._id);
  if (threadIds.length > 0) {
    baseTasks.push(Message.deleteMany({ thread: { $in: threadIds } }));
    baseTasks.push(Thread.deleteMany({ _id: { $in: threadIds } }));
  }

  await Promise.all(baseTasks);
};

// ─── GET /api/admin/dashboard-stats ──────────────────────
const getDashboardStats = asyncHandler(async (_req, res) => {
  const [
    totalStudents,
    totalTeachers,
    approvedTeachers,
    pendingTeachers,
    totalCourses,
    totalEnrollments,
    paymentSummary,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    Teacher.countDocuments({ isApproved: true }),
    Teacher.countDocuments({ isApproved: false }),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    Payment.aggregate([
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          paidPayments: {
            $sum: { $cond: [{ $in: ["$status", ["paid", "approved"]] }, 1, 0] },
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ["$status", ["paid", "approved"]] }, "$amount", 0],
            },
          },
        },
      },
    ]),
  ]);

  const ps = paymentSummary[0] || {
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  };

  res.json({
    success: true,
    data: {
      totalStudents,
      totalTeachers,
      approvedTeachers,
      pendingTeachers,
      totalCourses,
      totalEnrollments,
      totalPayments: ps.totalPayments,
      paidPayments: ps.paidPayments,
      pendingPayments: ps.pendingPayments,
      totalRevenue: ps.totalRevenue,
    },
  });
});

// ─── GET /api/admin/students ─────────────────────────────
const getStudents = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: "student" }).sort({ createdAt: -1 });
  const profiles = await Student.find({ user: { $in: users.map((u) => u._id) } });
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));
  const data = users.map((u) => {
    const p = byUser.get(String(u._id));
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      isApproved: typeof p?.isApproved === "boolean" ? p.isApproved : true,
      isBlocked: p?.isBlocked || false,
      createdAt: u.createdAt,
    };
  });
  res.json({ success: true, data });
});

// ─── GET /api/admin/teachers ─────────────────────────────
const getTeachers = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: "teacher" }).sort({ createdAt: -1 });
  const profiles = await Teacher.find({ user: { $in: users.map((u) => u._id) } });
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));
  const data = users.map((u) => {
    const p = byUser.get(String(u._id));
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      subject: p?.subject || "",
      experience: p?.experience || "",
      isApproved: p?.isApproved || false,
      isBlocked: p?.isBlocked || false,
      createdAt: u.createdAt,
    };
  });
  res.json({ success: true, data });
});

// ─── GET /api/admin/pending-teachers ─────────────────────
const getPendingTeachers = asyncHandler(async (_req, res) => {
  const profiles = await Teacher.find({ isApproved: false }).sort({ createdAt: -1 });
  const users = await User.find({ _id: { $in: profiles.map((p) => p.user) } });
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const data = profiles.map((p) => {
    const u = byId.get(String(p.user));
    return {
      _id: u?._id || p.user,
      name: u?.name || "Teacher",
      email: u?.email || "",
      phone: u?.phone || "",
      subject: p.subject || "",
      experience: p.experience || "",
      isApproved: p.isApproved || false,
      isBlocked: p.isBlocked || false,
      createdAt: u?.createdAt || p.createdAt,
    };
  });
  res.json({ success: true, data });
});

// ─── GET /api/admin/courses ──────────────────────────────
const getCourses = asyncHandler(async (_req, res) => {
  const courses = await Course.find()
    .populate("teacher", "name email")
    .populate("tutor", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: courses });
});

// ─── GET /api/admin/payments ─────────────────────────────
const getPayments = asyncHandler(async (_req, res) => {
  const payments = await Payment.find()
    .populate("student", "name email")
    .populate("course", "title subject")
    .populate("tutor", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});

// ─── GET /api/admin/enrollments ─────────────────────────
const getEnrollments = asyncHandler(async (_req, res) => {
  const enrollments = await Enrollment.find()
    .populate("student", "name email")
    .populate("course", "title category price")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: enrollments });
});

// ─── GET /api/admin/payout-settings ──────────────────────
const getPayoutSettings = asyncHandler(async (_req, res) => {
  const settings = await PayoutSetting.find()
    .populate("tutor", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: settings });
});

// ─── GET /api/admin/profile ──────────────────────────────
const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await User.findById(req.user._id);
  if (!admin || admin.role !== "admin") {
    res.status(404);
    throw new Error("Admin not found");
  }
  res.json({ success: true, data: admin });
});

// ─── PUT /api/admin/profile ──────────────────────────────
const updateAdminProfile = asyncHandler(async (req, res) => {
  const admin = await User.findById(req.user._id).select("+password");
  if (!admin || admin.role !== "admin") {
    res.status(404);
    throw new Error("Admin not found");
  }

  const nextName = String(req.body.name || "").trim();
  const nextEmail = String(req.body.email || "").trim().toLowerCase();
  const nextPhone = String(req.body.phone || "").trim();
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (nextName) admin.name = nextName;
  if (nextPhone) admin.phone = nextPhone;

  const emailChanged = nextEmail && nextEmail !== String(admin.email || "").toLowerCase();
  const passwordChanged = Boolean(newPassword);
  if (emailChanged || passwordChanged) {
    if (!currentPassword) {
      res.status(400);
      throw new Error("Current password is required");
    }
    const isValid = await admin.matchPassword(currentPassword);
    if (!isValid) {
      res.status(401);
      throw new Error("Current password is incorrect");
    }
  }

  if (emailChanged) {
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: admin._id } }).select("_id");
    if (existing) {
      res.status(400);
      throw new Error("Email already in use");
    }
    admin.email = nextEmail;
  }

  if (passwordChanged) {
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error("New password must be at least 6 characters");
    }
    admin.password = newPassword;
  }

  await admin.save();
  const payload = admin.toObject();
  delete payload.password;
  res.json({ success: true, message: "Admin profile updated", data: payload });
});

// ─── PUT /api/admin/approve-teacher/:id ──────────────────
const approveTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ user: req.params.id });
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  teacher.isApproved = true;
  await teacher.save();
  res.json({ success: true, message: "Teacher approved successfully" });
});

const approveStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { user: req.params.id },
    { $set: { isApproved: true, isBlocked: false } },
    { upsert: true, new: true }
  );
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }
  res.json({ success: true, message: "Student approved successfully" });
});

const approveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  course.approvalStatus = "approved";
  course.isPublished = true;
  await course.save();
  res.json({ success: true, message: "Course approved successfully" });
});

const rejectCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  course.approvalStatus = "rejected";
  course.isPublished = false;
  await course.save();
  res.json({ success: true, message: "Course rejected successfully" });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid course id");
  }
  const course = await Course.findById(id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  await deleteCourseCascade(course._id);
  await Course.findByIdAndDelete(course._id);
  res.json({ success: true, message: "Course deleted with related records" });
});

// ─── PUT /api/admin/block-user/:id ───────────────────────
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid user id");
  }
  const blockValue =
    typeof req.body.isBlocked === "boolean" ? req.body.isBlocked : true;

  const u = await User.findById(id);
  if (!u) {
    res.status(404);
    throw new Error("User not found");
  }

  if (u.role === "student") {
    await Student.findOneAndUpdate(
      { user: u._id },
      { $set: { isBlocked: blockValue } },
      { upsert: true }
    );
    return res.json({ success: true, message: "Student block status updated" });
  }

  if (u.role === "teacher") {
    await Teacher.findOneAndUpdate(
      { user: u._id },
      { $set: { isBlocked: blockValue } },
      { upsert: true }
    );
    return res.json({ success: true, message: "Teacher block status updated" });
  }

  res.status(404);
  throw new Error("User not found");
});

// ─── DELETE /api/admin/delete-user/:id ───────────────────
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid user id");
  }

  const u = await User.findById(id);
  if (!u) {
    res.status(404);
    throw new Error("User not found");
  }

  await deleteUserCascade(u);
  await User.findByIdAndDelete(u._id);
  return res.json({ success: true, message: "User deleted" });

});

const getSupportRequests = asyncHandler(async (_req, res) => {
  const items = await Notification.find({
    title: { $regex: "^Support Request", $options: "i" },
  }).sort({ createdAt: -1 });
  res.json({ success: true, data: items });
});

const resolveSupportRequest = asyncHandler(async (req, res) => {
  const note = await Notification.findById(req.params.id);
  if (!note) {
    res.status(404);
    throw new Error("Support request not found");
  }
  note.title = `${note.title} [Resolved]`;
  await note.save();
  res.json({ success: true, message: "Support request marked as resolved", data: note });
});

module.exports = {
  getDashboardStats,
  getStudents,
  getTeachers,
  getPendingTeachers,
  getCourses,
  getPayments,
  getEnrollments,
  getPayoutSettings,
  getAdminProfile,
  updateAdminProfile,
  approveTeacher,
  approveStudent,
  approveCourse,
  rejectCourse,
  deleteCourse,
  getSupportRequests,
  resolveSupportRequest,
  blockUser,
  deleteUser,
};
