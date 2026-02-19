const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const User = require("../models/User");

// ─── GET /api/v1/users/me ────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    data: {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role === "teacher" ? "tutor" : u.role,
      settings: u.settings || {},
    },
  });
});

// ─── PUT /api/v1/users/me ────────────────────────────────
const updateMe = asyncHandler(async (req, res) => {
  const u = req.user;
  if (req.body.name !== undefined) u.name = req.body.name;
  if (req.body.email !== undefined) u.email = req.body.email;
  if (req.body.phone !== undefined) u.phone = req.body.phone;
  await u.save();
  res.json({
    success: true,
    data: {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role === "teacher" ? "tutor" : u.role,
      settings: u.settings || {},
    },
  });
});

// ─── PUT /api/v1/users/me/password ───────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  // Fetch user with password
  const Model = req.user.constructor;
  const withPw = await Model.findById(req.user._id).select("+password");

  if (currentPassword) {
    const match = await bcrypt.compare(currentPassword, withPw.password);
    if (!match) {
      res.status(400);
      throw new Error("Current password is incorrect");
    }
  }

  withPw.password = newPassword; // pre-save hook will hash
  await withPw.save();

  res.json({ success: true, data: { message: "Password updated" } });
});

// ─── PUT /api/v1/users/me/settings ───────────────────────
const updateSettings = asyncHandler(async (req, res) => {
  const u = req.user;
  const incoming = req.body.settings || req.body;

  u.settings = {
    twoFactorEnabled: incoming.twoFactorEnabled ?? u.settings?.twoFactorEnabled ?? false,
    showProfile: incoming.showProfile ?? u.settings?.showProfile ?? true,
    emailUpdates: incoming.emailUpdates ?? u.settings?.emailUpdates ?? true,
  };

  await u.save();

  res.json({
    success: true,
    data: {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role === "teacher" ? "tutor" : u.role,
      settings: u.settings,
    },
  });
});

const getMyFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("favoriteCourseIds favoriteLessonIds role")
    .populate("favoriteCourseIds", "title category imageUrl thumbnailUrl tutor")
    .populate({
      path: "favoriteLessonIds",
      select: "title course",
      populate: { path: "course", select: "title category imageUrl thumbnailUrl tutor" },
    });

  res.json({
    success: true,
    data: {
      courses: Array.isArray(user?.favoriteCourseIds) ? user.favoriteCourseIds : [],
      lessons: Array.isArray(user?.favoriteLessonIds) ? user.favoriteLessonIds : [],
    },
  });
});

const getReceivedFavorites = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role !== "tutor") {
    res.json({
      success: true,
      data: {
        items: [],
        summary: { totalFavorites: 0, uniqueStudents: 0, uniqueCourses: 0 },
      },
    });
    return;
  }

  const courses = await Course.find({ tutor: req.user._id }).select("_id title category");
  const courseIds = courses.map((c) => c._id);
  if (!courseIds.length) {
    res.json({
      success: true,
      data: {
        items: [],
        summary: { totalFavorites: 0, uniqueStudents: 0, uniqueCourses: 0 },
      },
    });
    return;
  }

  const students = await User.find({
    role: "student",
    favoriteCourseIds: { $in: courseIds },
  }).select("name email favoriteCourseIds");

  const allowedCourseSet = new Set(courseIds.map((id) => String(id)));
  const courseMap = new Map(courses.map((course) => [String(course._id), course]));

  const items = [];
  const uniqueStudents = new Set();
  const uniqueCourses = new Set();

  for (const student of students) {
    uniqueStudents.add(String(student._id));
    const favoriteIds = Array.isArray(student.favoriteCourseIds)
      ? student.favoriteCourseIds.map((id) => String(id))
      : [];
    for (const cid of favoriteIds) {
      if (!allowedCourseSet.has(cid)) continue;
      const course = courseMap.get(cid);
      if (!course) continue;
      uniqueCourses.add(cid);
      items.push({
        student: {
          _id: String(student._id),
          name: student.name || "Student",
          email: student.email || "",
        },
        course: {
          _id: String(course._id),
          title: course.title || "Course",
          category: course.category || "General",
        },
      });
    }
  }

  res.json({
    success: true,
    data: {
      items,
      summary: {
        totalFavorites: items.length,
        uniqueStudents: uniqueStudents.size,
        uniqueCourses: uniqueCourses.size,
      },
    },
  });
});

const addFavoriteCourse = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role !== "student") {
    res.status(403);
    throw new Error("Only students can favorite courses");
  }

  const course = await Course.findById(req.params.courseId).select("_id");
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { favoriteCourseIds: course._id },
  });

  res.json({ success: true, data: { added: true } });
});

const removeFavoriteCourse = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { favoriteCourseIds: req.params.courseId },
  });

  res.json({ success: true, data: { removed: true } });
});

const removeFavoriteLesson = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { favoriteLessonIds: req.params.lessonId },
  });

  res.json({ success: true, data: { removed: true } });
});

const addFavoriteLesson = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role !== "student") {
    res.status(403);
    throw new Error("Only students can favorite lessons");
  }

  const lesson = await Lesson.findById(req.params.lessonId).select("_id");
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { favoriteLessonIds: lesson._id },
  });

  res.json({ success: true, data: { added: true } });
});

module.exports = {
  getMe,
  updateMe,
  changePassword,
  updateSettings,
  getMyFavorites,
  getReceivedFavorites,
  addFavoriteCourse,
  addFavoriteLesson,
  removeFavoriteCourse,
  removeFavoriteLesson,
};




