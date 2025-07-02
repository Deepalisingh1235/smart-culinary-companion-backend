
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🧪 Decoded token:', decoded);

    const user = await User.findById(decoded.userId).select('_id email');
    if (!user) return res.status(401).json({ message: 'Unauthorized: User not found' });

    req.user = { userId: user._id, email: user.email };
    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return res.status(403).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};


