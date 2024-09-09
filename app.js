const express = require("express");
var debug = require("debug")("server");
const app = express();
const setupMiddleware = require("./config/middleware");
const setupRoutes = require("./routes");
setupMiddleware(app);
setupRoutes(app);
app.set("port", process.env.PORT || 3001);

var server = app.listen(app.get("port"), () => {
  debug("Express server listening on port " + server.address().port);
});
