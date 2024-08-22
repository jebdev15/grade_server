const indexRouter = require("./indexRoute");
const authRouter = require("./authRoute");
const adminRouter = require("./adminRoute");
const downloadRouter = require("./downloadRoute");

const setupRoutes = (app) => {
  app.use("/", indexRouter);
  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);
  app.use("/download", downloadRouter);
};

module.exports = setupRoutes;
