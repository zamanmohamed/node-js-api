const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const geocoder = require("../utils/geocoder");
const Bootcamp = require("../models/Bootcamp");

// @desc      Get all bootcamps
// @route     GET /api/v1/bootcamps
// @access    Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  // const bootcamps = await Bootcamp.find(req.query);

  // console.log(JSON.stringify(req.query));

  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ["select", "sort", "page", "limit"];

  // Loop over removeFields and delete them from reqQuery
  /*api එකෙ removeFields array එකෙහි වචන තිබුනා නම් එ 
  වචනයත් එක්ක ඊට පසුව එන සියලුම value delete කරයි*/
  // --------------------eg:-----------------------------
  /*{{URL}}/api/v1/bootcamps?select=name,website  
   API හි select=name,website සියල්ල remove කරයි */
  // ---------------------------------------------------
  removeFields.forEach((param) => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  // මෙහිදී gt, gte වගෙ කෑලි තිබෙ නම් එවට ඉස්සරහින් $ කෑල්ලක් දමයි
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  // Finding resource
  // {{URL}}/api/v1/bootcamps?averageCost[lte]=12000
  // {{URL}}/api/v1/bootcamps?name=Codemasters
  // වගෙ searching api මෙහිදී --කෙලින්ම-- pass කරනු ලැබෙ.
  query = Bootcamp.find(JSON.parse(queryStr));

  // Select Fields
  // {{URL}}/api/v1/bootcamps?select="name"
  // - display only id, name field
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
    //මෙහි api හි select ඇති බැවින්
    //Bootcamp.find({}).select(fields);
  }

  // Sort
  // {{URL}}/api/v1/bootcamps?sort="name"
  // sort acording to the name
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
    //Bootcamp.find({}).sort(fields);
  } else {
    // {{URL}}/api/v1/bootcamps?sort
    query = query.sort("-createdAt");
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 2;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Bootcamp.countDocuments(JSON.parse(queryStr));

  // {{URL}}/api/v1/bootcamps?page=1&limit=3
  // - මෙම api එකෙන් පලමු පිටුවෙ පලමු item 3 පමණක් dispaly කරයි
  // {{URL}}/api/v1/bootcamps?page=2&limit=3
  // - මෙම api එකෙන් දෙවන පිටුවෙ පලමු item 3 ට පසුව එන ඉතුරු item ටික dispaly කරයි
  query = query.skip(startIndex).limit(limit);

  // if (populate) {
  //   query = query.populate(populate);
  // }

  // Executing query
  const bootcamps = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({ success: true, pagination, data: bootcamps });
});

// @desc      Get all bootcamps
// @route     GET /api/v1/bootcamps/:id
// @access    Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: bootcamp });
});

// @desc      Create new bootcamp
// @route     POST /api/v1/bootcamps
// @access    Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.create(req.body);

  res.status(201).json({
    success: true,
    data: bootcamp,
  });
});

// @desc      Update bootcamp
// @route     PUT /api/v1/bootcamps/:id
// @access    Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: bootcamp });
});

// @desc      Delete bootcamp
// @route     DELETE /api/v1/bootcamps/:id
// @access    Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndDelete(req.params.id);

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }
  res.status(200).json({ success: true, data: {} });
});

// @desc      Get bootcamps within a radius
// @route     GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access    Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
  const { zipcode, distance } = req.params;

  // Get lat/lng from geocoder
  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  // Calc radius using radians
  // Divide dist by radius of Earth
  // Earth Radius = 3,963 mi / 6,378 km
  const radius = distance / 3963;

  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps,
  });
});
