const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail'); // ✅ New utility for sending OTP emails
const SECRET_KEY = process.env.JWT_SECRET;

// =============================
// Signup Controller
// =============================
exports.signup = async (req, res) => {
  const { username, email, password, department } = req.body;

  if (!username || !email || !password || !department)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Email already registered' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new User({
      username,
      email,
      password, // hashed by schema middleware if implemented
      department,
      otp,
      verified: false,
      otpExpires: Date.now() + 5 * 60 * 1000, // valid for 5 mins
    });

    await user.save();

    // ✅ Send OTP to user's email
    await sendEmail(email, 'Verify Your Email OTP', `Your OTP is ${otp}. It expires in 5 minutes.`);

    res.json({ message: 'OTP sent to your email. Please verify.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed' });
  }
};

// =============================
// Verify Email OTP Controller
// =============================
exports.verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    if (user.otp !== otp || Date.now() > user.otpExpires)
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Email verified. You can now login.' });
  } catch (err) {
    console.error('Email OTP verification error:', err);
    res.status(500).json({ message: 'Verification failed' });
  }
};

// =============================
// Resend Email OTP Controller
// =============================
exports.resendEmailOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendEmail(email, 'Resend Email OTP', `Your new OTP is ${otp}. It expires in 5 minutes.`);

    res.json({ message: 'OTP resent successfully to your email' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ message: 'Could not resend OTP' });
  }
};

// =============================
// Login Controller
// =============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login Attempt:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.verified) {
      console.log('❌ User not verified');
      return res.status(401).json({ message: 'Please verify OTP before login' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        username: user.username,
        department: user.department,
      },
      SECRET_KEY,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      username: user.username,
      department: user.department,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};
