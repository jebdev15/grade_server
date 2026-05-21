/**
 * Admin Module Index
 * Exports admin module routes and services
 */

const adminRoutes = require("./routes");
const adminService = require("./service");

module.exports = {
  routes: adminRoutes,
  service: adminService,
};
