const isNaNOrNullOrEmpty = (value) => {
  return isNaN(value) || value === null || value === '';
}

module.exports = {
    isNaNOrNullOrEmpty
}