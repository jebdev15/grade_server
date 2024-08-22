const cors = require("cors")
// List of allowed origins
const envVariables = require('../utils/envVariables');

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if(origin) {
        if (envVariables.ALLOWED_ORIGINS.includes(origin) || !origin) {
            // console.log(origin);
            callback(null, true);
        } else {
            // console.log(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
        console.log({ALLOWED_ORIGINS: envVariables.ALLOWED_ORIGINS});
        
    }
  },
  credentials: true,
};

module.exports = cors(corsOptions)