const express = require("express");
const { listEnrollments, deleteEnrollment } = require("../controllers/enrollmentController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// GET /api/v1/enrollments
router.get("/", protect, listEnrollments);
router.delete("/:id", protect, deleteEnrollment);

module.exports = router;




