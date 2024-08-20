const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const indexRouter = require("./routes");
const adminRouter = require("./routes/admin");
const downloadRouter = require("./routes/download");
const {v4: uuidv4} = require("uuid");
const jwt = require('jsonwebtoken')
var debug = require("debug")("server");
const app = express();

app.enable('trust proxy')
app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter); // Index Router that starts with forward slash('/') followed by /login, /getClassStudents, /getClassCodeDetails, /getCurrentSchoolYear, /getLoad
app.use("/admin", adminRouter); /* Viewing Router that starts with forward slash('/admin') followed by /getCurrentSchedule, /getEmails, /getSubjectLoad, /gradeSubmissionLogs, /downloadLogs, /updateClassCodeStatus, /updateSchedule */
app.use("/download", downloadRouter); // Allowing download of logs
app.get('/checkToken', async (req, res) => {
  const uuid = uuidv4();
  const token = uuid;
  const tokenSigned = jwt.sign({foo: 'bar'}, token)
  res.send({message: 'OK', token, tokenSigned })
})

app.set("port", process.env.PORT || 3001);

var server = app.listen(app.get("port"), () => {
  debug("Express server listening on port " + server.address().port);
});
