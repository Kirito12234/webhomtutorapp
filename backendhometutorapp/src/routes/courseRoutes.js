const express = require("express");
const {
  listCourses,
  createCourse,
  getCourse,
  deleteCourse,
  uploadCourseImage,
  createLesson,
  uploadLessonMaterials,
} = require("../controllers/courseController");
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
const { tutorOnly } = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");

const router = express.Router();

// GET    /api/v1/courses
router.get("/", optionalAuth, listCourses);

// POST   /api/v1/courses
router.post("/", protect, tutorOnly, createCourse);

// GET    /api/v1/courses/:id
router.get("/:id", optionalAuth, getCourse);

// DELETE /api/v1/courses/:id
router.delete("/:id", protect, deleteCourse);

// POST   /api/v1/courses/:id/image
router.post("/:id/image", protect, upload.single("image"), uploadCourseImage);

// POST   /api/v1/courses/:id/lessons
router.post("/:id/lessons", protect, tutorOnly, upload.single("lessonFile"), createLesson);

// POST   /api/v1/courses/:id/lessons/:lessonId/materials
router.post(
  "/:id/lessons/:lessonId/materials",
  protect,
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "lessonFile", maxCount: 1 },
  ]),
  uploadLessonMaterials
);

module.exports = router;




