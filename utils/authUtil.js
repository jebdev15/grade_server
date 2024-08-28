const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = require('../utils/envVariables');

module.exports = {
    generateToken: (payload, expiresIn = '1d') => {
        return jwt.sign({token: payload}, JWT_SECRET_KEY, { expiresIn });
    },
    decodeToken: (token) => {
        return jwt.decode(token);
    }
}