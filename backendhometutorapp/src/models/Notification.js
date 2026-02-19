const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: String }, // ObjectId string – nullable for broadcast
    title: { type: String, default: "" },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);




