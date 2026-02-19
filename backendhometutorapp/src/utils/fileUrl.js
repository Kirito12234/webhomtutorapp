const path = require("path");

const normalizeUploadUrl = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const unix = raw.replace(/\\/g, "/");
  const uploadsIdx = unix.indexOf("/uploads/");
  if (uploadsIdx >= 0) {
    return unix.slice(uploadsIdx);
  }
  if (unix.startsWith("uploads/")) {
    return `/${unix}`;
  }
  if (unix.startsWith("/")) {
    return unix;
  }
  return `/uploads/${unix}`;
};

const toRelativeUploadUrl = (file) => {
  if (!file) return "";
  const byPath = normalizeUploadUrl(file.path || "");
  if (byPath) return byPath;
  return normalizeUploadUrl(file.filename || "");
};

const toAbsoluteUrl = (req, value) => {
  const normalized = normalizeUploadUrl(value);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}${normalized}`;
};

module.exports = {
  normalizeUploadUrl,
  toRelativeUploadUrl,
  toAbsoluteUrl,
};

