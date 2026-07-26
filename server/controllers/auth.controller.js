import bcrypt from 'bcryptjs';
import User from '../models/user.models.js';
import { sendOTPEmail } from '../utils/email.js';
import Otp from '../models/OTP.models.js';
import jwt from 'jsonwebtoken';

// generate token 
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// register user
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user',
            isVerified: false,
        });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`OTP for ${email}: ${otp}`);

        await Otp.create({ email, otp, action: 'account_verification' });
        await sendOTPEmail(email, otp, 'account_verification');

        res.status(201).json({ message: 'User registered successfully!', email: user.email });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(400).json({ error: 'Registration failed' });
    }
};

// login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials, please signup first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await Otp.deleteMany({ email, action: 'account_verification' });
            await Otp.create({ email, otp, action: 'account_verification' });
            await sendOTPEmail(email, otp, 'account_verification');
            return res.status(400).json({ error: 'Account not verified. A new OTP has been sent to your email.' });
        }

        res.status(200).json({
            message: 'Login successful.',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role),
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};

// verify otp
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const otpRecord = await Otp.findOne({ email, otp, action: 'account_verification' });
        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const user = await User.findOneAndUpdate(
            { email },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await Otp.deleteMany({ email, action: 'account_verification' });

        res.json({
            message: 'Account verified successfully. You can log in now.',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role),
        });
    } catch (error) {
        res.status(500).json({ error: 'OTP verification failed' });
    }
};

export { registerUser, loginUser, verifyOTP };