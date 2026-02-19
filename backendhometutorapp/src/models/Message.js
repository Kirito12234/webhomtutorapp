const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    sender: { type: String, required: true }, // ObjectId string
    senderRole: { type: String, default: "student" },
    senderName: { type: String, default: "" },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);




