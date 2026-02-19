const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");

const submitSupportRequest = asyncHandler(async (req, res) => {
  const body = String(req.body.message || "").trim();
  if (!body) {
    res.status(400);
    throw new Error("Support message is required");
  }

  const senderId = String(req.user?._id || "");
  const senderRole = String(req.user?.role || "user");
  const senderName = String(req.user?.name || "User");
  const title = "Support Request";
  const message = `[${senderRole}] ${senderName}: ${body}`;

  const admins = await User.find({ role: "admin" }).select("_id");
  const adminIds = admins.map((item) => String(item._id));

  const rows = [];
  if (adminIds.length > 0) {
    for (const adminId of adminIds) {
      rows.push({
        user: adminId,
        title,
        message,
      });
    }
  } else {
    rows.push({ user: "", title, message });
  }

  const created = await Notification.insertMany(rows);
  const io = getIO();
  if (io) {
    created.forEach((note) => {
      if (note.user) {
        io.to(`user:${note.user}`).emit("notification:new", { notification: note });
      }
    });
  }

  res.status(201).json({ success: true, message: "Support request sent", data: { count: created.length, from: senderId } });
});

module.exports = { submitSupportRequest };
