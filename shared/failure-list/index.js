/**
 * Shared Failure List Module Index
 * Exports all public APIs from shared infrastructure
 */

const service = require("./services/failure-list.service");
const repository = require("./repositories/failure-list.repository");
const helpers = require("./helpers");
const config = require("./config/failure-list.config");

module.exports = {
  // Services (core business logic)
  service,
  getFailureListPolicy: service.getFailureListPolicy,
  enforceFailureListPolicy: service.enforceFailureListPolicy,
  applyAutoPassForNonListed: service.applyAutoPassForNonListed,
  getFailureListRoster: service.getFailureListRoster,

  // Repository (data access)
  repository,

  // Helpers (utilities)
  helpers,
  ...helpers,

  // Config (constants)
  config,
};
