

import UserModel from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

   
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const newUser = new UserModel({ name, email, password: hashedPassword });
    await newUser.save();

    return res.status(201).json({ success: true, message: "Signup successful" });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

   
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await UserModel.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ success: false, message: "Token invalid or expired" });
  }
};


export const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const logout = (req, res) => {
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};
