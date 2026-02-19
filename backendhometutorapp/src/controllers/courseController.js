const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");
const TeacherRequest = require("../models/TeacherRequest");
const Enrollment = require("../models/Enrollment");
const {
  toRelativeUploadUrl,
  toAbsoluteUrl,
} = require("../utils/fileUrl");

const normalizeRole = (role) => (role === "teacher" ? "tutor" : role);
const withCourseFileUrls = (req, course) => ({
  ...course,
  imageUrl: toAbsoluteUrl(req, course.imageUrl),
});

const withLessonFileUrls = (req, lesson) => ({
  ...lesson,
  fileUrl: toAbsoluteUrl(req, lesson.fileUrl),
  pdfUrl: toAbsoluteUrl(req, lesson.pdfUrl),
  imageUrl: toAbsoluteUrl(req, lesson.imageUrl),
});

const buildLessonCourseFilter = (courseId) => ({
  $or: [{ course: courseId }, { courseId }],
});

const getStudentAllowedCourseIds = async (studentId) => {
  const [reqs, enrolls] = await Promise.all([
    TeacherRequest.find({ student: studentId, status: "accepted" }).select(
      "course"
    ),
    Enrollment.find({ student: studentId }).select("course"),
  ]);
  const ids = new Set();
  reqs.forEach((r) => r.course && ids.add(String(r.course)));
  enrolls.forEach((e) => e.course && ids.add(String(e.course)));
  return Array.from(ids);
};

const notifyStudentsForCourse = async ({ courseId, title, message }) => {
  const io = getIO();
  // notify accepted-request students + enrolled students
  const [reqs, enrolls] = await Promise.all([
    TeacherRequest.find({ course: courseId, status: "accepted" }).select(
      "student"
    ),
    Enrollment.find({ course: courseId }).select("student"),
  ]);
  const studentIds = new Set();
  reqs.forEach((r) => r.student && studentIds.add(String(r.student)));
  enrolls.forEach((e) => e.student && studentIds.add(String(e.student)));

  for (const sid of studentIds) {
    const note = await Notification.create({
      user: String(sid),
      title: title || "",
      message: message || "",
    });
    if (io) {
      io.to(`user:${sid}`).emit("notification:new", { notification: note });
    }
  }
};

// ─── GET /api/v1/courses ─────────────────────────────────
const listCourses = asyncHandler(async (req, res) => {
  const { search, category, isPopular, isNew } = req.query;
  const filter = {};

  if (search) filter.title = { $regex: search, $options: "i" };
  if (category) filter.category = category;
  if (isPopular === "true") filter.isPopular = true;
  if (isNew === "true") filter.isNewCourse = true;

  // Teachers only see their own courses
  if (req.user && normalizeRole(req.user.role) === "tutor") {
    filter.tutor = req.user._id;
  }

  // Students can discover new courses (including pending approval),
  // but hidden rejected courses should not appear.
  if (req.user && normalizeRole(req.user.role) === "student") {
    filter.approvalStatus = { $ne: "rejected" };
  }

  const courses = await Course.find(filter)
    .populate("tutor", "name email")
    .sort({ createdAt: -1 });

  const serializedCourses = courses.map((course) =>
    withCourseFileUrls(req, course.toObject())
  );

  // For students, mark which courses they have access to
  if (req.user && normalizeRole(req.user.role) === "student") {
    const allowedIds = await getStudentAllowedCourseIds(req.user._id);
    const coursesWithAccess = serializedCourses.map((courseObj) => {
      courseObj.hasAccess = allowedIds.includes(String(courseObj._id));
      return courseObj;
    });
    return res.json({ success: true, data: coursesWithAccess });
  }

  res.json({ success: true, data: serializedCourses });
});

// ─── POST /api/v1/courses ────────────────────────────────
const createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    level,
    subject,
    price,
    durationHours,
    lessonCount,
    scheduleDate,
    scheduleTime,
    features,
  } = req.body;

  const normalizedFeatures = Array.isArray(features)
    ? features.map((item) => String(item || "").trim()).filter(Boolean)
    : String(features || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const course = await Course.create({
    title: title || "Untitled Course",
    description: description || "",
    category: category || "General",
    level: level || "Beginner",
    subject: subject || "",
    price: Number(price) || 0,
    durationHours: Number(durationHours) || 0,
    durationInWeeks: Math.ceil((Number(durationHours) || 1) / 10),
    lessonCount: Number(lessonCount) || 0,
    scheduleDate: scheduleDate || "",
    scheduleTime: scheduleTime || "",
    features: normalizedFeatures,
    tutor: req.user._id,
    teacher: req.user._id,
    isNewCourse: true,
    isPublished: false,
    approvalStatus: "pending",
  });

  const populated = await Course.findById(course._id).populate(
    "tutor",
    "name email"
  );

  // ── Notify ALL students about the new course ──────────
  try {
    const students = await User.find({ role: "student" }).select("_id");
    const io = getIO();
    for (const s of students) {
      const note = await Notification.create({
        user: String(s._id),
        title: "New Course Available",
        message: `New course "${course.title}" created by ${req.user.name}. Check it out!`,
      });
      if (io) {
        io.to(`user:${s._id}`).emit("notification:new", { notification: note });
      }
    }
  } catch (err) {
    console.error("Course notification error:", err.message);
  }

  res.status(201).json({ success: true, data: populated });
});

// ─── GET /api/v1/courses/:id ─────────────────────────────
const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate(
    "tutor",
    "name email"
  );
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  const lessons = await Lesson.find(buildLessonCourseFilter(course._id)).sort({ order: 1 });

  // If student is authenticated, block access until accepted/enrolled
  if (req.user && normalizeRole(req.user.role) === "student") {
    const allowedIds = await getStudentAllowedCourseIds(req.user._id);
    if (!allowedIds.includes(String(course._id))) {
      res.status(403);
      throw new Error("Course not available yet. Request tutor approval first.");
    }
  }

  res.json({
    success: true,
    data: {
      ...withCourseFileUrls(req, course.toObject()),
      lessons: lessons.map((lesson) => withLessonFileUrls(req, lesson.toObject())),
    },
  });
});

// ─── DELETE /api/v1/courses/:id ──────────────────────────
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  await Lesson.deleteMany(buildLessonCourseFilter(req.params.id));
  res.json({ success: true, data: { deleted: true } });
});

// ─── POST /api/v1/courses/:id/image ─────────────────────
const uploadCourseImage = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("Image file is required");
  }
  const relativeUrl = toRelativeUploadUrl(req.file);
  course.imageUrl = relativeUrl;
  await course.save();
  res.json({
    success: true,
    data: { url: toAbsoluteUrl(req, relativeUrl), relativeUrl },
  });
});

// ─── POST /api/v1/courses/:id/lessons ────────────────────
const createLesson = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  const fileType = String(req.body.fileType || "resource").toLowerCase();
  const requestedOrder = Number(req.body.order || req.body.orderIndex) || 1;
  let finalOrder = Math.max(1, requestedOrder);
  const existingAtOrder = await Lesson.findOne({
    ...buildLessonCourseFilter(course._id),
    order: finalOrder,
  }).select("_id");
  if (existingAtOrder) {
    const last = await Lesson.find(buildLessonCourseFilter(course._id))
      .sort({ order: -1 })
      .limit(1)
      .select("order");
    finalOrder = Math.max(finalOrder, Number(last?.[0]?.order || 0) + 1);
  }

  const lesson = await Lesson.create({
    courseId: course._id,
    course: course._id,
    title: req.body.title || "Lesson",
    description: req.body.description || "",
    durationMinutes: Number(req.body.durationMinutes) || 0,
    order: finalOrder,
    fileType:
      fileType === "pdf" || fileType === "video" || fileType === "image"
        ? fileType
        : "resource",
  });

  if (req.file) {
    const relativeUrl = toRelativeUploadUrl(req.file);
    lesson.fileUrl = relativeUrl;
    lesson.fileName = req.file.originalname || "";
    if (lesson.fileType === "pdf") {
      lesson.pdfUrl = relativeUrl;
      lesson.pdfName = req.file.originalname || "";
    }
    if (lesson.fileType === "image") {
      lesson.imageUrl = relativeUrl;
    }
    await lesson.save();
  }

  // Notify allowed students that a new lesson was added
  try {
    await notifyStudentsForCourse({
      courseId: course._id,
      title: "New Lesson Added",
      message: `New lesson added in "${course.title}": ${lesson.title}`,
    });
  } catch (err) {
    console.error("Lesson notification error:", err.message);
  }

  res.status(201).json({ success: true, data: withLessonFileUrls(req, lesson.toObject()) });
});

// ─── POST /api/v1/courses/:courseId/lessons/:lessonId/materials ──
const uploadLessonMaterials = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findOne({
    _id: req.params.lessonId,
    ...buildLessonCourseFilter(req.params.id),
  });
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  if (req.files) {
    if (req.files.lessonFile && req.files.lessonFile[0]) {
      const f = req.files.lessonFile[0];
      const relativeUrl = toRelativeUploadUrl(f);
      lesson.fileUrl = relativeUrl;
      lesson.fileName = f.originalname || "";
      const incomingType = String(req.body.fileType || "").toLowerCase();
      if (incomingType === "pdf" || incomingType === "video" || incomingType === "image") {
        lesson.fileType = incomingType;
      } else if ((f.mimetype || "").includes("pdf")) {
        lesson.fileType = "pdf";
      } else if ((f.mimetype || "").includes("video")) {
        lesson.fileType = "video";
      } else if ((f.mimetype || "").includes("image")) {
        lesson.fileType = "image";
      } else {
        lesson.fileType = "resource";
      }
      if (lesson.fileType === "pdf") {
        lesson.pdfUrl = relativeUrl;
        lesson.pdfName = f.originalname || "";
      }
      if (lesson.fileType === "image") {
        lesson.imageUrl = relativeUrl;
      }
    }
    if (req.files.pdf && req.files.pdf[0]) {
      lesson.pdfUrl = toRelativeUploadUrl(req.files.pdf[0]);
      lesson.pdfName = req.files.pdf[0].originalname;
      lesson.fileUrl = lesson.pdfUrl;
      lesson.fileName = lesson.pdfName;
      lesson.fileType = "pdf";
    }
    if (req.files.image && req.files.image[0]) {
      lesson.imageUrl = toRelativeUploadUrl(req.files.image[0]);
      if (!lesson.fileUrl) {
        lesson.fileUrl = lesson.imageUrl;
        lesson.fileName = req.files.image[0].originalname || "";
        lesson.fileType = "image";
      }
    }
  }

  await lesson.save();

  // Notify allowed students that materials were updated
  try {
    const course = await Course.findById(req.params.id).select("title");
    await notifyStudentsForCourse({
      courseId: req.params.id,
      title: "Lesson Materials Updated",
      message: `New materials uploaded for "${course?.title || "your course"}" · ${lesson.title}`,
    });
  } catch (err) {
    console.error("Materials notification error:", err.message);
  }
  res.json({
    success: true,
    data: {
      uploaded: true,
      pdfUrl: toAbsoluteUrl(req, lesson.pdfUrl),
      imageUrl: toAbsoluteUrl(req, lesson.imageUrl),
    },
  });
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  lesson.title = req.body.title ?? lesson.title;
  lesson.durationMinutes =
    req.body.durationMinutes !== undefined
      ? Number(req.body.durationMinutes)
      : lesson.durationMinutes;
  lesson.order = req.body.order !== undefined ? Number(req.body.order) : lesson.order;

  if (req.file) {
    lesson.pdfUrl = toRelativeUploadUrl(req.file);
    lesson.pdfName = req.file.originalname || "";
  }

  await lesson.save();
  res.json({ success: true, data: withLessonFileUrls(req, lesson.toObject()) });
});

const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByIdAndDelete(req.params.lessonId);
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }
  res.json({ success: true, data: { deleted: true } });
});

module.exports = {
  listCourses,
  createCourse,
  getCourse,
  deleteCourse,
  uploadCourseImage,
  createLesson,
  uploadLessonMaterials,
  updateLesson,
  deleteLesson,
};
