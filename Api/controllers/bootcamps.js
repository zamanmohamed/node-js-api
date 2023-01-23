const path = require("path");
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
  // via req.query get the datas in api after ? symbol
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
  //-------------------populate --> virtual middleware ------------------------------
  // Reverse populate with virtuals --> called in bootcamps model virtual middleware.
  // මෙහිදී "courses" vairable එක යටතෙ Course හි variable popultae කරයි.
  /* All Bootcamp display වෙද්දි එම Bootcamp එකට ඇති
   many courses display කරයි  */
  query = Bootcamp.find(JSON.parse(queryStr)).populate("courses");

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
  // Add user to req,body
  req.body.user = req.user.id;

  // Check for published bootcamp
  const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

  // If the user is not an admin, they can only add one bootcamp
  if (publishedBootcamp && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `The user with ID ${req.user.id} has already published a bootcamp`,
        400
      )
    );
  }

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
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

  /* bootcamp model හි create කර ඇති remove middleware එක අනුව,
   delete courses when a bootcamp is deleted */
  bootcamp.remove();

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

// @desc      Upload photo for bootcamp
// @route     PUT /api/v1/bootcamps/:id/photo
// @access    Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  console.log(req.files);
  /* ------- Sample output-------------
  [Object: null prototype] {
  file: {
    name: '2.pdf',
    data: <Buffer 25 50 44 46 2d 31 2e 37 0d 0a 25 b5 b5 b5 b5 0d 0a 31 20 30 20 6f 62 6a 0d 0a 3c 3c 2f 54 79 70 65 2f 43 61 74 61 6c 6f 67 2f 50 61 67 65 73 20 32 20 ... 160718 more bytes>,
    size: 160768,
    encoding: '7bit',
    tempFilePath: '',
    truncated: false,
    mimetype: 'application/pdf',
    md5: '5007d08ff4596716337ffddab687a21c',
    mv: [Function: mv]
  }
} 
--------------------------------------
*/

  const file = req.files.file;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith("image")) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

    res.status(200).json({
      success: true,
      data: file.name,
    });
  });
});
