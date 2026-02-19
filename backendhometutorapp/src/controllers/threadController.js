const asyncHandler = require("express-async-handler");
const Thread = require("../models/Thread");
const Message = require("../models/Message");
const User = require("../models/User");
const { getIO } = require("../services/socket.service");

const normalizeId = (value) => String(value || "");

const resolveUser = async (id) => {
  const user = await User.findById(id).select("name role");
  if (user) {
    return {
      _id: user._id,
      name: user.name,
      role: user.role === "teacher" ? "tutor" : user.role,
    };
  }
  return { _id: id, name: "User", role: "student" };
};

const emitThreadNew = (participants, thread) => {
  const io = getIO();
  if (!io) return;
  participants.forEach((participantId) => {
    io.to(`user:${participantId}`).emit("thread:new", { thread });
  });
};

const createThreadDoc = async ({
  participants,
  title = "Chat",
  status = "approved",
  studentId = "",
  tutorId = "",
  requestedBy = "",
}) => {
  const approvedAt = status === "approved" ? new Date() : null;
  return Thread.create({
    title,
    participants,
    status,
    studentId,
    tutorId,
    requestedBy,
    approvedAt,
    unreadBy: participants.filter((id) => id !== requestedBy),
  });
};

const listThreads = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const threads = await Thread.find({ participants: userId }).sort({
    lastMessageAt: -1,
    updatedAt: -1,
  });

  const result = [];
  for (const thread of threads) {
    const latest = await Message.findOne({ thread: thread._id }).sort({ createdAt: -1 }).lean();
    const otherParticipantId =
      (thread.participants || []).map((v) => String(v)).find((id) => id !== userId) || "";
    const otherParticipant = otherParticipantId ? await resolveUser(otherParticipantId) : null;

    result.push({
      _id: thread._id,
      id: thread._id,
      title: thread.title || "Chat",
      status: thread.status || "approved",
      studentId: thread.studentId || "",
      tutorId: thread.tutorId || "",
      otherParticipantId,
      otherParticipantName: otherParticipant?.name || "",
      otherParticipantRole: otherParticipant?.role || "",
      lastMessageText: latest?.text || thread.lastMessageText || "",
      lastMessageAt: latest?.createdAt || thread.lastMessageAt || thread.createdAt,
      unreadBy: Array.isArray(thread.unreadBy) ? thread.unreadBy : [],
      isUnread: Array.isArray(thread.unreadBy) ? thread.unreadBy.includes(userId) : false,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    });
  }

  res.json({ success: true, data: result });
});

const createThread = asyncHandler(async (req, res) => {
  const me = String(req.user._id);
  const participants = Array.from(
    new Set([
      ...(Array.isArray(req.body.participants)
        ? req.body.participants.map((id) => String(id)).filter(Boolean)
        : []),
      me,
    ])
  );

  const thread = await createThreadDoc({
    participants,
    title: req.body.title || "Chat",
    status: req.body.status || "approved",
    studentId: normalizeId(req.body.studentId),
    tutorId: normalizeId(req.body.tutorId),
    requestedBy: normalizeId(req.body.requestedBy) || me,
  });

  emitThreadNew(participants, thread);
  res.status(201).json({ success: true, data: thread });
});

const startThread = asyncHandler(async (req, res) => {
  const me = String(req.user._id);
  const studentId = normalizeId(req.body.studentId);
  if (!studentId) {
    res.status(400);
    throw new Error("studentId is required");
  }

  const existing = await Thread.findOne({
    participants: { $all: [me, studentId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
    status: { $ne: "rejected" },
  });
  if (existing) {
    return res.json({ success: true, data: existing });
  }

  const isTutor = req.user.role === "teacher" || req.user.role === "tutor";
  const thread = await createThreadDoc({
    participants: [me, studentId],
    status: "approved",
    studentId: isTutor ? studentId : me,
    tutorId: isTutor ? me : studentId,
    requestedBy: me,
  });

  emitThreadNew([me, studentId], thread);
  res.status(201).json({ success: true, data: thread });
});

const requestThread = asyncHandler(async (req, res) => {
  const me = String(req.user._id);
  const tutorId = normalizeId(req.body.tutorId);
  if (!tutorId) {
    res.status(400);
    throw new Error("tutorId is required");
  }

  const existing = await Thread.findOne({
    participants: { $all: [me, tutorId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
    status: { $in: ["pending", "approved"] },
  });
  if (existing) {
    return res.json({ success: true, data: existing });
  }

  const thread = await createThreadDoc({
    participants: [me, tutorId],
    status: "pending",
    studentId: me,
    tutorId,
    requestedBy: me,
  });

  emitThreadNew([me, tutorId], thread);
  res.status(201).json({ success: true, data: thread });
});

const approveThread = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) {
    res.status(404);
    throw new Error("Thread not found");
  }
  thread.status = "approved";
  thread.approvedAt = new Date();
  thread.rejectedAt = null;
  await thread.save();
  res.json({ success: true, data: thread });
});

const rejectThread = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) {
    res.status(404);
    throw new Error("Thread not found");
  }
  thread.status = "rejected";
  thread.rejectedAt = new Date();
  await thread.save();
  res.json({ success: true, data: thread });
});

const markRead = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) {
    res.status(404);
    throw new Error("Thread not found");
  }

  thread.unreadBy = (thread.unreadBy || []).filter((id) => String(id) !== userId);
  thread.lastReadAt = thread.lastReadAt || new Map();
  thread.lastReadAt.set(userId, new Date());
  await thread.save();

  res.json({ success: true, data: { threadId: thread._id, userId } });
});

const searchThreadMessages = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const query = String(req.query.q || "").trim();
  if (!query) return res.json({ success: true, data: [] });

  const threads = await Thread.find({ participants: userId }).select("_id");
  const threadIds = threads.map((item) => item._id);
  if (!threadIds.length) return res.json({ success: true, data: [] });

  const messages = await Message.find({
    thread: { $in: threadIds },
    text: { $regex: query, $options: "i" },
  })
    .sort({ createdAt: -1 })
    .limit(50);

  const mapped = [];
  for (const msg of messages) {
    const sender = await resolveUser(msg.sender);
    mapped.push({
      _id: msg._id,
      threadId: String(msg.thread),
      text: msg.text,
      createdAt: msg.createdAt,
      sender,
    });
  }

  res.json({ success: true, data: mapped });
});

const listMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ thread: req.params.threadId }).sort({ createdAt: 1 });
  const mapped = [];
  for (const msg of messages) {
    const sender = await resolveUser(msg.sender);
    mapped.push({
      _id: msg._id,
      text: msg.text,
      createdAt: msg.createdAt,
      sender,
    });
  }
  res.json({ success: true, data: mapped });
});

const sendMessage = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) {
    res.status(404);
    throw new Error("Thread not found");
  }

  if (thread.status && thread.status !== "approved") {
    res.status(403);
    throw new Error("Cannot send message until thread is approved");
  }

  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  const msg = await Message.create({
    thread: thread._id,
    sender: String(req.user._id),
    senderRole: role,
    senderName: req.user.name,
    text: req.body.text || "",
  });

  const now = new Date();
  const senderId = String(req.user._id);
  const participants = (thread.participants || []).map((id) => String(id));
  thread.lastMessageText = msg.text;
  thread.lastMessageAt = now;
  thread.unreadBy = participants.filter((id) => id !== senderId);
  thread.lastReadAt = thread.lastReadAt || new Map();
  thread.lastReadAt.set(senderId, now);
  await thread.save();

  const payload = {
    threadId: String(thread._id),
    message: {
      _id: msg._id,
      text: msg.text,
      createdAt: msg.createdAt,
      sender: { _id: req.user._id, name: req.user.name, role },
    },
  };

  const io = getIO();
  if (io) {
    io.to(`thread:${thread._id}`).emit("message:new", payload);
    participants.forEach((id) => io.to(`user:${id}`).emit("message:new", payload));
  }

  res.status(201).json({ success: true, data: payload.message });
});

module.exports = {
  listThreads,
  createThread,
  startThread,
  requestThread,
  approveThread,
  rejectThread,
  markRead,
  searchThreadMessages,
  listMessages,
  sendMessage,
};
