const express = require("express");

const {
  getCourses,
  getCourse,
  addCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courses");

//මෙහි route එක bootcamp route හිද use කර ඇති බැවින්  { mergeParams: true } යොදා ඇත.
const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/auth");

router.route("/").get(getCourses).post(protect, addCourse);
router
  .route("/:id")
  .get(getCourse)
  .put(updateCourse)
  .put(protect, updateCourse)
  .delete(protect, deleteCourse);

module.exports = router;
