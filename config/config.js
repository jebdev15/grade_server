const cors = require("cors");
// List of allowed origins
const { ALLOWED_ORIGINS } = require('../utils/envVariables');
// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

module.exports = cors(corsOptions);