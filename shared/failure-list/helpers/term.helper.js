/**
 * Term Type Helper
 * Utilities for normalizing and validating term types
 */

const normalizeTermType = (value) => {
  if (!value) return value;
  const normalized = String(value).toLowerCase();
  return normalized === "finalterm" ? "endterm" : normalized;
};

const isValidTermType = (value) => {
  const normalized = normalizeTermType(value);
  return normalized === "midterm" || normalized === "endterm";
};

module.exports = {
  normalizeTermType,
  isValidTermType,
};
