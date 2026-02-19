const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");

// ─── GET /api/v1/notifications ───────────────────────────
const listNotifications = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const notifications = await Notification.find({
    $or: [{ user: userId }, { user: null }, { user: "" }],
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: notifications });
});

module.exports = { listNotifications };




