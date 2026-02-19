const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional. NOTE: in some existing DBs, a unique index on phone may already exist.
    // Keeping this field optional (not defaulting to "") avoids duplicate-key issues on empty strings.
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["admin", "teacher", "student"],
      default: "student",
    },
    settings: {
      twoFactorEnabled: { type: Boolean, default: false },
      showProfile: { type: Boolean, default: true },
      emailUpdates: { type: Boolean, default: true },
    },
    favoriteCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    favoriteLessonIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
