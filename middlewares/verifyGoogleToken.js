const { OAuth2Client } = require('google-auth-library');
const { GOOGLE_CLIENT_ID } = require('../utils/envVariables');
const client = new OAuth2Client(GOOGLE_CLIENT_ID); // Replace with your actual Google client ID

const verifyGoogleToken = async (req, res, next) => {
  const { token } = req.body; // Assuming the token is sent in the body

  if (!token) {
    return res.status(400).json({ error: 'Token is missing' });
  }

  try {
    // Verify the token using Google's public keys
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
    });

    const payload = ticket.getPayload();
    // console.log(payload); // This contains the decoded JWT information

    // You can store the payload in req.user for use in subsequent middleware or route handlers
    req.user = payload;

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Error verifying Google token:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyGoogleToken;
