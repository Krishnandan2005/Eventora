import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        enum: ["account_verification", "event_booking"],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // MongoDB TTL index: auto-deletes document after 300 seconds (5 mins)
    },
});

// ATOMIC UNIQUENESS PER ACTION
// Ensures only ONE active OTP can exist per email + action pair at any time.
// Also speeds up `findOneAndUpdate` and `findOneAndDelete` queries.
otpSchema.index({ email: 1, action: 1 }, { unique: true });

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;