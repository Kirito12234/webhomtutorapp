const express = require("express");
const { adminLogin } = require("../controllers/authController");
const {
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
} = require("../controllers/adminController");
const { protect } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/role.middleware");

const router = express.Router();

// POST /api/admin/login
router.post("/login", adminLogin);

// All routes below require admin auth
router.use(protect, adminOnly);

router.get("/dashboard-stats", getDashboardStats);
router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);
router.get("/students", getStudents);
router.get("/teachers", getTeachers);
router.get("/pending-teachers", getPendingTeachers);
router.get("/courses", getCourses);
router.get("/payments", getPayments);
router.get("/enrollments", getEnrollments);
router.get("/payout-settings", getPayoutSettings);
router.get("/support-requests", getSupportRequests);
router.put("/approve-teacher/:id", approveTeacher);
router.put("/approve-student/:id", approveStudent);
router.put("/courses/:id/approve", approveCourse);
router.put("/courses/:id/reject", rejectCourse);
router.delete("/courses/:id", deleteCourse);
router.put("/support-requests/:id/resolve", resolveSupportRequest);
router.put("/block-user/:id", blockUser);
router.delete("/delete-user/:id", deleteUser);

module.exports = router;




