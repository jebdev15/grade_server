const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const express = require("express");
const corsOptions = require('./config')

module.exports = (app) => {
  app.enable('trust proxy');
  app.use(logger("dev"));
  app.use(corsOptions);
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, "../public"))); // Adjust path as necessary
};
