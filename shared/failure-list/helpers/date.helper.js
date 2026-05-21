/**
 * Date Helper
 * Utilities for date normalization and comparison
 */

const normalizeDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const isDateInRange = (date, startDate, endDate) => {
  const normalized = normalizeDateOnly(date);
  const normalizedStart = normalizeDateOnly(startDate);
  const normalizedEnd = normalizeDateOnly(endDate);
  
  if (!normalized || !normalizedStart || !normalizedEnd) {
    return false;
  }
  
  return normalized >= normalizedStart && normalized <= normalizedEnd;
};

const isDatePassed = (date) => {
  const normalized = normalizeDateOnly(date);
  const today = normalizeDateOnly(new Date());
  return today > normalized;
};

module.exports = {
  normalizeDateOnly,
  isDateInRange,
  isDatePassed,
};
