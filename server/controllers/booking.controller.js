import Booking from "../models/Booking.models.js";
import Event from "../models/Event.models.js";
import Otp from "../models/OTP.models.js";

import {
    sendBookingEmail,
    sendOTPEmail,
} from "../utils/email.js";

import {
    generateTicketPDF,
} from "../utils/generateTicket.js";

// GENERATE OTP
const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

// SEND BOOKING OTP
export const sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP();

        // Atomic upsert: replaces existing OTP or creates a new one in 1 DB call
        await Otp.findOneAndUpdate(
            {
                email: req.user.email,
                action: "event_booking",
            },
            {
                $set: { otp, createdAt: new Date() },
            },
            { upsert: true, new: true }
        );

        await sendOTPEmail(
            req.user.email,
            otp,
            "event_booking"
        );

        res.json({
            message: "OTP sent successfully",
        });
    } catch (error) {
        console.error("Send booking OTP error:", error);
        res.status(500).json({
            message: "Error sending OTP",
            error: error.message,
        });
    }
};

// BOOK EVENT
export const bookEvent = async (req, res) => {
    try {
        const { eventId, otp } = req.body;

        // 1. ATOMIC OTP VERIFICATION & CONSUMPTION (With Strict 5-Min Expiry)
        // Prevents OTP replay attacks and enforces exact 5-minute expiration
        const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60 * 1000);

        const validOTP = await Otp.findOneAndDelete({
            email: req.user.email.toLowerCase().trim(),
            otp,
            action: "event_booking",
            createdAt: { $gt: FIVE_MINUTES_AGO },
        });

        if (!validOTP) {
            return res.status(400).json({
                message: "Invalid or expired OTP for booking",
            });
        }

        // 2. CHECK EVENT & SEAT AVAILABILITY
        const event = await Event.findOne({
            _id: eventId,
            availableSeats: { $gt: 0 },
        });

        if (!event) {
            return res.status(400).json({
                message: "Event not found or no seats available",
            });
        }

        // 3. CHECK DUPLICATE ACTIVE BOOKING
        const existingActiveBooking = await Booking.findOne({
            userId: req.user.id,
            eventId,
            status: { $ne: "cancelled" },
        });

        if (existingActiveBooking) {
            return res.status(400).json({
                message: "Already booked or pending",
            });
        }

        // 4. CREATE BOOKING
        // Protected by Partial Unique Index in Booking.models.js against race conditions
        const booking = await Booking.create({
            userId: req.user.id,
            eventId,
            status: "pending",
            paymentStatus: "not_paid",
            amount: event.ticketPrice,
        });

        res.status(201).json({
            message: "Booking request submitted",
            booking,
        });
    } catch (error) {
        // Catch duplicate key error from Partial Unique Index if concurrent requests race
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Already booked or pending",
            });
        }

        console.error("Book event error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

// CONFIRM BOOKING (ADMIN)
export const confirmBooking = async (req, res) => {
    try {
        const { paymentStatus } = req.body;

        // 1. ATOMIC BOOKING STATE TRANSITION
        // Only transitions if status is currently "pending".
        // Prevents admin double-click from confirming the same booking twice.
        const updateData = { status: "confirmed" };
        if (paymentStatus) {
            updateData.paymentStatus = paymentStatus;
        }

        const booking = await Booking.findOneAndUpdate(
            {
                _id: req.params.id,
                status: { $nin: ["confirmed", "cancelled"] },
            },
            { $set: updateData },
            { new: true }
        )
            .populate("userId")
            .populate("eventId");

        if (!booking) {
            return res.status(400).json({
                message: "Booking not found, already confirmed, or cancelled",
            });
        }

        // 2. ATOMIC SEAT DECREMENT
        // Decrements availableSeats ONLY IF availableSeats > 0 in a single atomic operation.
        const updatedEvent = await Event.findOneAndUpdate(
            {
                _id: booking.eventId._id,
                availableSeats: { $gt: 0 },
            },
            { $inc: { availableSeats: -1 } },
            { new: true }
        );

        // COMPENSATING ROLLBACK: If the last seat was taken milliseconds ago by another confirmation,
        // revert the booking status back to "pending" so the database stays consistent.
        if (!updatedEvent) {
            await Booking.findByIdAndUpdate(booking._id, {
                $set: { status: "pending" },
            });

            return res.status(400).json({
                message: "No seats available to confirm this booking",
            });
        }

        // 3. GENERATE PDF TICKET & SEND EMAIL
        const ticketBuffer = await generateTicketPDF(booking);

        await sendBookingEmail(
            booking.userId.email,
            booking.userId.name,
            booking.eventId.title,
            ticketBuffer
        );

        res.json({
            message: "Booking confirmed and ticket sent successfully",
            booking,
        });
    } catch (error) {
        console.error("Confirm booking error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

// GET MY BOOKINGS
export const getMyBookings = async (req, res) => {
    try {
        const bookings =
            req.user.role === "admin"
                ? await Booking.find()
                      .populate("eventId")
                      .populate("userId", "name email")
                      .sort({ createdAt: -1 })
                : await Booking.find({ userId: req.user.id })
                      .populate("eventId")
                      .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        console.error("Get bookings error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

// CANCEL BOOKING
export const cancelBooking = async (req, res) => {
    try {
        // 1. Build atomic filter combining ID, Authorization, and Status check
        const filter = {
            _id: req.params.id,
            status: { $ne: "cancelled" }, // Prevents double-cancellation race condition
        };

        // If not admin, restrict query to only match the user's own booking
        if (req.user.role !== "admin") {
            filter.userId = req.user.id;
        }

        // 2. ATOMIC CANCEL & RETURN PREVIOUS DOCUMENT STATE
        // { new: false } returns the document BEFORE the update, letting us know
        // atomically whether its previous state was "confirmed" or "pending".
        const previousBooking = await Booking.findOneAndUpdate(
            filter,
            { $set: { status: "cancelled" } },
            { new: false }
        );

        if (!previousBooking) {
            return res.status(400).json({
                message: "Booking not found, not authorized, or already cancelled",
            });
        }

        // 3. ATOMIC SEAT RESTORATION
        // Only increment seat if the booking was previously "confirmed"
        if (previousBooking.status === "confirmed") {
    await Event.findOneAndUpdate(
        {
            _id: previousBooking.eventId,
            $expr: { $lt: ["$availableSeats", "$totalSeats"] }, // Ensures availableSeats < totalSeats
        },
        { $inc: { availableSeats: 1 } }
    );
}

        res.json({
            message: "Booking cancelled successfully",
        });
    } catch (error) {
        console.error("Cancel booking error:", error);
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};