/**
 * Role-based access control middleware factory.
 * Usage: authorize("admin") or authorize("tutor", "student")
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    // Normalize: "teacher" and "tutor" are interchangeable
    const normalizedRole =
      req.user.role === "teacher" ? "tutor" : req.user.role;
    const allowedRoles = roles.map((r) => (r === "teacher" ? "tutor" : r));

    if (!allowedRoles.includes(normalizedRole)) {
      res.status(403);
      throw new Error("Not authorized for this action");
    }

    next();
  };

const adminOnly = authorize("admin");
const tutorOnly = authorize("tutor");
const studentOnly = authorize("student");
const tutorOrStudent = authorize("tutor", "student");

const requireRole = (...roles) => authorize(...roles);

module.exports = {
  authorize,
  requireRole,
  adminOnly,
  tutorOnly,
  studentOnly,
  tutorOrStudent,
};




