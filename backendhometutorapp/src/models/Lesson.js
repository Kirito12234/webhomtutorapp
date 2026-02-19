const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    // Keep legacy key for existing unique index compatibility (courseId_1_order_1)
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    durationMinutes: { type: Number, default: 0 },
    order: { type: Number, default: 1 },
    fileType: {
      type: String,
      enum: ["pdf", "video", "image", "resource"],
      default: "resource",
    },
    fileUrl: { type: String, default: "" },
    fileName: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
    pdfName: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

lessonSchema.pre("validate", function (next) {
  if (!this.courseId && this.course) this.courseId = this.course;
  if (!this.course && this.courseId) this.course = this.courseId;
  next();
});

module.exports = mongoose.model("Lesson", lessonSchema);




