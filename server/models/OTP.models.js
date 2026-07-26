import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true,
    },
    otp: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        enum: ['account_verification', 'event_booking'],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // OTP expires after 5 minutes
    },
});

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;