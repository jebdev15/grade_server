require('dotenv').config();

const DB_HOST = JSON.parse(process.env.DB_HOST);
const DB_NAME = JSON.parse(process.env.DB_NAME);
const DB_USER = JSON.parse(process.env.DB_USER);
const DB_PASSWORD = JSON.parse(process.env.DB_PASSWORD);
const FRONT_URLS = JSON.parse(process.env.FRONT_URLS);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? JSON.parse(process.env.ALLOWED_ORIGINS) : [];
const {
    GOOGLE_CLIENT_ID,
    JWT_SECRET_KEY
} = process.env;

module.exports = {
    DB_HOST,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    FRONT_URLS,
    ALLOWED_ORIGINS,
    GOOGLE_CLIENT_ID,
    JWT_SECRET_KEY
}