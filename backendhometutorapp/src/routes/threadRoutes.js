const express = require("express");
const {
  listThreads,
  createThread,
  listMessages,
  sendMessage,
} = require("../controllers/threadController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

// GET    /api/v1/threads
router.get("/", listThreads);

// POST   /api/v1/threads
router.post("/", createThread);

// GET    /api/v1/threads/:threadId/messages
router.get("/:threadId/messages", listMessages);

// POST   /api/v1/threads/:threadId/messages
router.post("/:threadId/messages", sendMessage);

module.exports = router;




