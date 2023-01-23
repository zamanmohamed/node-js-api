const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, "Please add a course title"],
  },
  description: {
    type: String,
    required: [true, "Please add a description"],
  },
  weeks: {
    type: String,
    required: [true, "Please add number of weeks"],
  },
  tuition: {
    type: Number,
    required: [true, "Please add a tuition cost"],
  },
  minimumSkill: {
    type: String,
    required: [true, "Please add a minimum skill"],
    enum: ["beginner", "intermediate", "advanced"],
  },
  scholarshipAvailable: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  //relationship between Courses and bootcamp
  bootcamp: {
    type: mongoose.Schema.ObjectId,
    ref: "Bootcamp",
    required: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
});

// Static method to get avg of course tuitions
CourseSchema.statics.getAverageCost = async function (bootcampId) {
  //id එක අනුව aggregate කරනවා
  const obj = await this.aggregate([
    {
      $match: { bootcamp: bootcampId },
    },
    {
      $group: {
        _id: "$bootcamp",
        averageCost: { $avg: "$tuition" },
      },
    },
  ]);

  // console.log(obj);
  // ====== OUT PUT =========
  // {
  //   _id: new ObjectId("5d725a1b7b292f5f8ceff788"),
  //   averageCost: 7166.666666666667
  // }
  // ========================

  try {
    if (obj[0]) {
      await this.model("Bootcamp").findByIdAndUpdate(bootcampId, {
        //obj වලින් ලැබුනු averageCost එක 10ට වටයලා save කරනවා
        averageCost: Math.ceil(obj[0].averageCost / 10) * 10,
      });
    } else {
      await this.model("Bootcamp").findByIdAndUpdate(bootcampId, {
        averageCost: undefined,
      });
    }
  } catch (err) {
    console.error(err);
  }
};

// Call getAverageCost  function after every save in course route
CourseSchema.post("save", async function () {
  //after every save in get the bootcamp ID
  await this.constructor.getAverageCost(this.bootcamp);
});

// Call getAverageCost  function after every remove in course route
CourseSchema.post("remove", async function () {
  //after every remove in course get the bootcamp ID
  await this.constructor.getAverageCost(this.bootcamp);
});

module.exports = mongoose.model("Course", CourseSchema);
