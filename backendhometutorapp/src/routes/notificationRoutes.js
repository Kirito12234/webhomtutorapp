const express = require("express");
const { listNotifications } = require("../controllers/notificationController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// GET /api/v1/notifications
router.get("/", protect, listNotifications);

module.exports = router;




