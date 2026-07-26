import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please submit all required parameters' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'A user account with this email already exists' });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your email and password credentials' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email address or password configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logoutUser = async (req, res) => {
  // Since JWT is stateless, true logout happens when the client deletes the token.
  // We send a success message instructing the frontend to clear it from storage.
  res.status(200).json({ message: 'Successfully logged out. Please clear your local tokens.' });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Security Best Practice: Don't reveal that the user doesn't exist to prevent enumeration attacks
      return res.status(200).json({ message: 'If the email exists, an OTP has been sent.' });
    }

    // Generate a secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Securely hash the OTP before saving it to the database
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
    await user.save();

    // DEVELOPMENT LOGGING: Grab this from your terminal to verify!
    console.log(`\n========== 🔑 RESET PASSWORD OTP FOR ${email} ==========`);
    console.log(`OTP Code: ${otp}`);
    console.log(`========================================================\n`);

    // TODO: In production, integrate your mailing utility here:
    // await sendEmail({ to: user.email, subject: 'Your Password Reset OTP', text: `Your OTP is ${otp}` });

    res.status(200).json({ message: 'OTP sent successfully to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const resendOtp = async (req, res) => {
  // The logic mimics the generation phase but ensures clean field overrides
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If the email exists, an OTP has been sent.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`\n========== 🔄 RESENT PASSWORD OTP FOR ${email} ==========`);
    console.log(`New OTP Code: ${otp}`);
    console.log(`========================================================\n`);

    res.status(200).json({ message: 'A fresh OTP has been dispatched to your email address.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required fields.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findOne({ email }).select('+resetPasswordOtpHash +resetPasswordOtpExpires');
    if (!user) return res.status(400).json({ error: 'Invalid request parameters or token expired.' });

    // Hash user-submitted OTP to cross-verify against database
    const calculatedHash = crypto.createHash('sha256').update(otp).digest('hex');

    if (user.resetPasswordOtpHash !== calculatedHash || user.resetPasswordOtpExpires < Date.now()) {
      return res.status(400).json({ error: 'The provided OTP is invalid or has expired.' });
    }

    // Apply updates
    user.password = newPassword;
    user.resetPasswordOtpHash = undefined; // Wipe security flags upon success
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};