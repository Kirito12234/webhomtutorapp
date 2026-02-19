const express = require("express");
const {
  listSessions,
  createSession,
  updateSessionStatus,
} = require("../controllers/sessionController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

// GET    /api/v1/sessions
router.get("/", listSessions);

// POST   /api/v1/sessions
router.post("/", createSession);
router.patch("/:id/status", updateSessionStatus);

module.exports = router;




