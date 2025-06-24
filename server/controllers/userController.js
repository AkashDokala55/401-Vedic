const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendSMS = require('../utils/sendSMS');
const SECRET_KEY=process.env.JWT_SECRET;
exports.signup = async (req, res) => {
  const { username, phone, password, email, department } = req.body;

  if (!username || !phone || !password || !email || !department)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const existing = await User.findOne({ phone });
    if (existing)
      return res.status(400).json({ message: 'Phone already registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new User({
      username,
      email,
      phone,
      password, // 🔥 Don't hash manually — let schema handle it
      department,
      otp,
      verified: false,
      otpExpires: Date.now() + 5 * 60 * 1000,
    });

    await user.save();
    await sendSMS(phone, otp);

    res.json({ message: 'OTP sent to your phone. Please verify.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed' });
  }
};



exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: 'User not found' });

    if (user.otp !== otp || Date.now() > user.otpExpires)
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Phone verified. You can now login.' });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ message: 'Verification failed' });
  }
};

exports.resendOtp = async (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.status(400).json({ message: 'Phone number is required' });

  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendSMS(phone, otp);

    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ message: 'Could not resend OTP' });
  }
};

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
        department: user.department
      },
      SECRET_KEY,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      username: user.username,
      department: user.department
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

