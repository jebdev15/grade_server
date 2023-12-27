const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const indexRouter = require("./routes");
const viewingRouter = require("./routes/viewing");
var debug = require("debug")("server");
const app = express();

app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/viewing", viewingRouter);

app.set("port", process.env.PORT || 3001);

var server = app.listen(app.get("port"), () => {
  debug("Express server listening on port " + server.address().port);
});
