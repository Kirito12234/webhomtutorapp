const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const { submitSupportRequest } = require("../controllers/supportController");

const router = express.Router();

router.use(protect);
router.post("/", submitSupportRequest);

module.exports = router;
