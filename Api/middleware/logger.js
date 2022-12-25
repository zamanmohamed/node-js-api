// @desc    Logs request to console
const logger = (req, res, next) => {
  console.log(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  next();
};

module.exports = logger;

// eg:-
// POST http://localhost:5000/api/v1/bootcamps
// PUT http://localhost:5000/api/v1/bootcamps/1
