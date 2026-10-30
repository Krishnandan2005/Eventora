import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "pending"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "not_paid"],
      default: "not_paid",
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Booking amount cannot be negative"],
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 1. ATOMIC DUPLICATE BOOKING PREVENTION (Partial Unique Index)
// Prevents a user from creating two simultaneous "pending" or "confirmed" bookings
// for the same event, while still allowing them to re-book if a previous booking was "cancelled".
bookingSchema.index(
  { userId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed"] },
    },
  }
);

// 2. QUERY OPTIMIZATION FOR USER DASHBOARD (getMyBookings)
// Speeds up `Booking.find({ userId }).sort({ createdAt: -1 })` without an in-memory sort.
bookingSchema.index({ userId: 1, createdAt: -1 });

// 3. QUERY OPTIMIZATION FOR ADMIN ANALYTICS & APPROVALS
// Speeds up filtering by status/paymentStatus for revenue, paid-client, and pending-booking metrics.
bookingSchema.index({ status: 1, paymentStatus: 1, createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;