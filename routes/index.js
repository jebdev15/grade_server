const indexRouter = require("./indexRoute");
const authRouter = require("./authRoute");
const adminRouter = require("./adminRoute");
const downloadRouter = require("./downloadRoute");
const verifyToken = require("../middlewares/verifyToken");

const setupRoutes = (app) => {
  app.use("/auth", authRouter);
  app.use(verifyToken); // this will verify the token before proceeding except auth route
  app.use("/", indexRouter);
  app.use("/admin", adminRouter);
  app.use("/download", downloadRouter);
};

module.exports = setupRoutes;
