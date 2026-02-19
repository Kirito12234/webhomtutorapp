const express = require("express");
const {
  getMe,
  updateMe,
  changePassword,
  updateSettings,
  getMyFavorites,
  getReceivedFavorites,
  addFavoriteCourse,
  addFavoriteLesson,
  removeFavoriteCourse,
  removeFavoriteLesson,
} = require("../controllers/userController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

// GET    /api/v1/users/me
router.get("/me", getMe);

// PUT    /api/v1/users/me
router.put("/me", updateMe);

// PUT    /api/v1/users/me/password
router.put("/me/password", changePassword);

// PUT    /api/v1/users/me/settings
router.put("/me/settings", updateSettings);

router.get("/me/favorites", getMyFavorites);
router.get("/me/favorites/received", getReceivedFavorites);
router.post("/me/favorites/courses/:courseId", addFavoriteCourse);
router.post("/me/favorites/lessons/:lessonId", addFavoriteLesson);
router.delete("/me/favorites/courses/:courseId", removeFavoriteCourse);
router.delete("/me/favorites/lessons/:lessonId", removeFavoriteLesson);

module.exports = router;




