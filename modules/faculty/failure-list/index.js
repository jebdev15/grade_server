/**
 * Faculty Module Index
 * Exports faculty module routes and services
 */

const facultyRoutes = require("./routes");
const facultyService = require("./service");

module.exports = {
  routes: facultyRoutes,
  service: facultyService,
};
