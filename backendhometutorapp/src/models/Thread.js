const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Chat" },
    participants: [{ type: String }], // store ObjectId strings for both Student/Teacher
    studentId: { type: String, default: "" },
    tutorId: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    requestedBy: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    lastMessageAt: { type: Date, default: null },
    lastMessageText: { type: String, default: "" },
    unreadBy: [{ type: String }],
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Thread", threadSchema);




