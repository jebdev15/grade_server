/**
 * Program Helper
 * Utilities for program code validation and filtering
 */

const { UG_PROGRAM_PREFIXES, EXCLUDED_PREFIXES } = require("../config/failure-list.config");

const isUndergradProgram = (programCode) => {
  if (!programCode) return false;
  const upper = programCode.toUpperCase();
  const isUndergradPrefix = UG_PROGRAM_PREFIXES.some((prefix) => upper.startsWith(prefix));
  const isTcp = EXCLUDED_PREFIXES.some((prefix) => upper.includes(prefix));
  return isUndergradPrefix && !isTcp;
};

const isTcpProgram = (programCode) => {
  if (!programCode) return false;
  const upper = programCode.toUpperCase();
  return EXCLUDED_PREFIXES.some((prefix) => upper.includes(prefix));
};

const isProgramApplicable = (programCode, isGraduate) => {
  if (isGraduate) return false;
  return isUndergradProgram(programCode);
};

module.exports = {
  isUndergradProgram,
  isTcpProgram,
  isProgramApplicable,
};
