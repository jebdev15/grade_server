const verifyToken = require("../middlewares/verifyToken");

const setupRoutes = (app) => {
  app.get("/health", (req, res) => res.status(200).send("ok"));
  app.use("/auth", require("./auth-routes"));
  app.use(verifyToken); // this will verify the token before proceeding except auth route
  app.use("/", require("./index-routes"));
  app.use("/admin", require("./admin-routes"));
  app.use("/student-grades", require("./student-grades-routes"));
  app.use("/admin-student", require("./student-grades-routes"));
  app.use("/download", require("./download-routes"));
  app.use("/excel-export", require("./excel-export-routes"));
  app.use("/admin-report", require("./generate-report-routes"));
  app.use(
    "/failure-list/admin",
    require("../modules/admin/failure-list").routes
  );
  app.use(
    "/failure-list/faculty",
    require("../modules/faculty/failure-list").routes
  );
};

module.exports = setupRoutes;
