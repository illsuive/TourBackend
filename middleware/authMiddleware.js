import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // 1. Look for token inside authorization header tags
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Split "Bearer <token_string>" into its exact token string segment
      token = req.headers.authorization.split(' ')[1];

      // 2. Decode token using your global system secret key signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Hydrate req.user while excluding raw password hash variables from payloads
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ error: 'User record no longer exists in system memory.' });
      }

      // 4. Check if the user is suspended or blocked by an admin
      if (req.user.isBlocked) {
        return res.status(403).json({ error: 'Your account access has been suspended.' });
      }

      return next(); // Authorization passed successfully!
    } catch (error) {
      console.error('JWT Token Verification Error:', error.message);
      return res.status(401).json({ error: 'Not authorized, token signature verification failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, access token is missing.' });
  }
};

export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
};