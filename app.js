const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const indexRouter = require("./routes");
const viewingRouter = require("./routes/viewing");
const adminRouter = require("./routes/admin");
var debug = require("debug")("server");
const app = express();

app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter); // Index Router that starts with forward slash('/') followed by /login, /getClassStudents, /getClassCodeDetails, /getCurrentSchoolYear, /getLoad
app.use("/viewing", viewingRouter); //Viewing Router that starts with forward slash('/viewing') followed by /login, and /getGrades
app.use("/admin", adminRouter); /* Viewing Router that starts with forward slash('/admin') followed by /getCurrentSchedule, /getEmails, /getSubjectLoad, /gradeSubmissionLogs, /downloadLogs, /updateClassCodeStatus, /updateSchedule */

app.set("port", process.env.PORT || 3001);

var server = app.listen(app.get("port"), () => {
  debug("Express server listening on port " + server.address().port);
});
