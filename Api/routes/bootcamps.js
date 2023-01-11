const express = require("express");
const router = express.Router();

const {
  getBootcamp,
  getBootcamps,
  createBootcamp,
  updateBootcamp,
  deleteBootcamp,
  getBootcampsInRadius,
  bootcampPhotoUpload,
} = require("../controllers/bootcamps");

// Include other resource routers
const courseRouter = require("./courses");
const { protect } = require("../middleware/auth");

// -----------Re-route into other resource routers--------------------
// bootcamps route file coures route  වලට call කිරීම
router.use("/:bootcampId/courses", courseRouter);

//------------Normal routes-------------------------------------------
router.route("/radius/:zipcode/:distance").get(getBootcampsInRadius);
router.route("/:id/photo").put(protect, bootcampPhotoUpload);
router.route("/").get(getBootcamps).post(protect, createBootcamp);
router
  .route("/:id")
  .get(getBootcamp)
  .put(protect, updateBootcamp)
  .delete(protect, deleteBootcamp);

module.exports = router;
