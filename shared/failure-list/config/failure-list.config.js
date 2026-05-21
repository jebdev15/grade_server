/**
 * Failure List Configuration
 * Constants, enums, and feature flags for the failure-list module
 */

const SPECIAL_REMARKS = new Set([
  "inc",
  "drp",
  "na",
  "ng",
  "w",
  "incomplete",
  "dropped",
  "no attendance",
  "no grade",
  "withdrawn",
]);

const UG_PROGRAM_PREFIXES = ["BS", "BT", "BP", "BI", "BE", "AB"];

const EXCLUDED_PREFIXES = ["TCP"];

const POST_DEADLINE_ACTIONS = {
  RESTRICT_ONLY: "restrict_only",
  AUTO_PASS: "auto_pass",
};

const FAILURE_LIST_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
};

const DEFAULT_PASSING_GRADE = 75;

const FEATURE_FLAGS = {
  ENABLE_FAILURE_LIST: true,
  AUTO_PASS_ENABLED: true,
};

module.exports = {
  SPECIAL_REMARKS,
  UG_PROGRAM_PREFIXES,
  EXCLUDED_PREFIXES,
  POST_DEADLINE_ACTIONS,
  FAILURE_LIST_STATUS,
  DEFAULT_PASSING_GRADE,
  FEATURE_FLAGS,
};
