const verifyToken = require("../middlewares/verifyToken");

const setupRoutes = (app) => {
  app.use("/auth", require("./authRoute"));
  app.use(verifyToken); // this will verify the token before proceeding except auth route
  app.use("/", require("./indexRoute"));
  app.use("/admin", require("./adminRoute"));
  app.use("/admin-student/grades", require("./admin/student-grades-routes"));
  app.use("/download", require("./downloadRoute"));
};

module.exports = setupRoutes;
