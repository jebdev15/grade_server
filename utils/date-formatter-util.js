const formatDateTime = (date) => {
  if (!date) return '';

  return new Date(date).toLocaleString('en-PH', {
    month: 'long',   // Full month name
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

module.exports = { formatDateTime };