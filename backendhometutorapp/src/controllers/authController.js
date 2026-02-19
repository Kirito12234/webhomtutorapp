const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const generateToken = require("../services/token.service");

// ─── helpers ─────────────────────────────────────────────
const safeUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  role: u.role === "teacher" ? "tutor" : u.role,
  settings: u.settings || {},
  createdAt: u.createdAt,
});

const findByEmail = async (email) => {
  const lower = email.toLowerCase();
  return await User.findOne({ email: lower }).select("+password");
};

const findByPhone = async (phone) => {
  return await User.findOne({ phone }).select("+password");
};

// ─── POST /api/v1/auth/register ──────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, fullName, email, phone, password, role } = req.body;
  const userName = name || fullName || "User";
  const userEmail = email?.toLowerCase().trim();

  if (!userEmail) {
    res.status(400);
    throw new Error("Email is required");
  }
  if (!password || password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const existing = await User.findOne({ email: userEmail });
  if (existing) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const normalizedRole =
    role === "tutor" || role === "teacher" ? "teacher" : "student";

  const user = await User.create({
    name: userName,
    email: userEmail,
    phone: phone?.trim() || undefined,
    password,
    role: normalizedRole,
  });

  // Create profile doc
  if (normalizedRole === "teacher") {
    await Teacher.create({
      user: user._id,
      email: user.email,
      isApproved: true, // keep auto-approve as before
      isBlocked: false,
      subject: "",
      experience: "",
    });
  } else {
    await Student.create({ user: user._id, email: user.email, isBlocked: false });
  }

  const token = generateToken(user);
  res.status(201).json({
    success: true,
    token,
    user: safeUser(user),
  });
});

// ─── POST /api/v1/auth/login ─────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { emailOrPhone, email, password } = req.body;
  const identity = (emailOrPhone || email || "").trim();

  if (!identity || !password) {
    res.status(400);
    throw new Error("Email/phone and password are required");
  }

  // Try email first, then phone
  let user = await findByEmail(identity);
  if (!user && identity.startsWith("+")) {
    user = await findByPhone(identity);
  }
  if (!user) {
    // Try phone even without +
    user = await findByPhone(identity);
  }

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  // profile block checks
  if (user.role === "teacher") {
    const t = await Teacher.findOne({ user: user._id });
    if (t?.isBlocked) {
      res.status(403);
      throw new Error("Your account is blocked");
    }
  }
  if (user.role === "student") {
    const s = await Student.findOne({ user: user._id });
    if (s?.isBlocked) {
      res.status(403);
      throw new Error("Your account is blocked");
    }
  }

  const token = generateToken(user);
  res.status(200).json({
    success: true,
    token,
    user: safeUser(user),
  });
});

// ─── GET /api/v1/auth/me ─────────────────────────────────
const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: safeUser(req.user) },
  });
});

// ——— POST /api/v1/auth/forgot-password ————————————————————————————————————————————
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpires");
  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If the account exists, reset instructions have been sent",
    });
  }

  const resetToken = String(Math.floor(100000 + Math.random() * 900000));
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = expiresAt;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Reset token generated",
    data: { resetToken, expiresAt: expiresAt.toISOString() },
  });
});

// ——— POST /api/v1/auth/reset-password ————————————————————————————————————————————
const resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.newPassword || "");

  if (!token || !newPassword) {
    res.status(400);
    throw new Error("Token and newPassword are required");
  }
  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }
  if (!/^\d{6}$/.test(token)) {
    res.status(400);
    throw new Error("Token must be a 6-digit number");
  }

  const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+password +resetPasswordToken +resetPasswordExpires");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

// ─── POST /api/admin/login ───────────────────────────────
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").toLowerCase().trim();
  let admin = await User.findOne({ email: normalizedEmail, role: "admin" }).select("+password");

  if (!admin) {
    const legacyAdmin = await Admin.findOne({ email: normalizedEmail }).select("+password");
    if (legacyAdmin && (await legacyAdmin.matchPassword(password))) {
      admin = await User.create({
        name: legacyAdmin.name || "Admin User",
        email: normalizedEmail,
        password,
        role: "admin",
      });
      admin = await User.findById(admin._id).select("+password");
    }
  }

  if (!admin || !(await admin.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.status(200).json({
    success: true,
    token: generateToken(admin),
    user: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
    },
  });
});

module.exports = { register, login, me, forgotPassword, resetPassword, adminLogin };
