const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadRoot = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const resolveSubdir = (req, file) => {
  if (file.fieldname === "pdf") return "lessons";
  if (file.fieldname === "lessonFile") return "lessons";
  if (file.fieldname === "qrCode") return "qr";
  if (file.fieldname === "screenshot") return "payments";
  if (file.fieldname === "image") {
    if (req.originalUrl.includes("/lessons/")) return "lessons";
    if (req.originalUrl.includes("/courses/")) return "courses";
    return "images";
  }
  return "misc";
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = resolveSubdir(req, file);
    const destination = path.join(uploadRoot, subdir);
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    cb(null, destination);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|mp4|webm/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error("Only images, PDF, and video (mp4/webm) files are allowed"));
};

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 500);
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
});
upload.lessonUpload = upload;

module.exports = upload;




