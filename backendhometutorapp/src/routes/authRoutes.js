const express = require("express");
const { register, login, me, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// POST /api/v1/auth/register
router.post("/register", register);
router.post("/signup", register);

// POST /api/v1/auth/login
router.post("/login", login);
router.post("/signin", login);

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/v1/auth/reset-password
router.post("/reset-password", resetPassword);

// GET  /api/v1/auth/me
router.get("/me", protect, me);

module.exports = router;




