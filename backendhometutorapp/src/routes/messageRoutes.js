const express = require("express");
const Joi = require("joi");
const {
  listThreads,
  createThread,
  startThread,
  requestThread,
  approveThread,
  rejectThread,
  markRead,
  searchThreadMessages,
  listMessages,
  sendMessage,
} = require("../controllers/threadController");
const { protect } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { messageSendRateLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

const createThreadSchema = Joi.object({
  participants: Joi.array().items(Joi.string()).default([]),
  title: Joi.string().allow("").optional(),
  status: Joi.string().valid("pending", "approved", "rejected").optional(),
  studentId: Joi.string().allow("").optional(),
  tutorId: Joi.string().allow("").optional(),
  requestedBy: Joi.string().allow("").optional(),
});

const startThreadSchema = Joi.object({
  studentId: Joi.string().required(),
});

const requestThreadSchema = Joi.object({
  tutorId: Joi.string().required(),
});

const sendSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required(),
});

router.use(protect);

router.get("/threads", listThreads);
router.post("/threads", validate(createThreadSchema), createThread);
router.post("/threads/start", validate(startThreadSchema), startThread);
router.post("/threads/request", validate(requestThreadSchema), requestThread);
router.post("/threads/:threadId/approve", approveThread);
router.post("/threads/:threadId/reject", rejectThread);
router.post("/threads/:threadId/read", markRead);
router.get("/threads/:threadId/messages", listMessages);
router.get("/search", searchThreadMessages);
router.post(
  "/threads/:threadId/messages",
  messageSendRateLimiter,
  validate(sendSchema),
  sendMessage
);

module.exports = router;
