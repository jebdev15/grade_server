const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = require('../utils/envVariables');

const verifyToken = (req, res, next) => {
    const { token } = req.cookies;
    
    if (!token) {
        return res.status(403).json({ message: 'No token provided.' });
    }

    jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized or invalid token.' });
        }
        req.user = decoded; // Save the decoded user information to the request object
        next(); // Move to the next middleware or route handler
    });
};

module.exports = verifyToken;
