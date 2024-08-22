const envVariables = {
    DB_HOST,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    FRONT_URLS,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? JSON.parse(process.env.ALLOWED_ORIGINS) : [],
    JWT_SECRET,
    GOOGLE_CLIENT_ID,
} = process.env;

module.exports = envVariables