const asyncHandler = require("express-async-handler");
const Session = require("../models/Session");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");

// ─── GET /api/v1/sessions ────────────────────────────────
const listSessions = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  const filter =
    role === "tutor"
      ? { tutor: req.user._id }
      : { student: req.user._id };

  const sessions = await Session.find(filter)
    .populate("tutor", "name")
    .populate("student", "name")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: sessions });
});

// ─── POST /api/v1/sessions ──────────────────────────────
const createSession = asyncHandler(async (req, res) => {
  const session = await Session.create({
    tutor: req.user._id,
    student: req.body.student || undefined,
    course: req.body.course || "",
    date: req.body.date || "",
    time: req.body.time || "",
    duration: Number(req.body.duration) || 60,
    notes: req.body.notes || "",
  });

  // ── Notify the student about the new session ──────────
  if (session.student) {
    try {
      const note = await Notification.create({
        user: String(session.student),
        title: "New Session Scheduled",
        message: `Your tutor ${req.user.name} scheduled a session on ${session.date || "TBD"} at ${session.time || "TBD"}.`,
      });
      const io = getIO();
      if (io) {
        io.to(`user:${session.student}`).emit("notification:new", { notification: note });
      }
    } catch (err) {
      console.error("Session notification error:", err.message);
    }
  }

  res.status(201).json({ success: true, data: session });
});

const updateSessionStatus = asyncHandler(async (req, res) => {
  const nextStatus = String(req.body?.status || "").toLowerCase();
  if (!["scheduled", "completed", "cancelled"].includes(nextStatus)) {
    res.status(400);
    throw new Error("Invalid session status");
  }

  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role === "tutor" && String(session.tutor) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not allowed");
  }
  if (role === "student" && String(session.student) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not allowed");
  }

  session.status = nextStatus;
  await session.save();

  res.json({ success: true, data: session });
});

module.exports = { listSessions, createSession, updateSessionStatus };
