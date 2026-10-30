import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: String, 
            required: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
            index: true, // Speeds up category filtering on the frontend
        },
        totalSeats: {
            type: Number,
            required: true,
            min: [1, "Total seats must be at least 1"],
        },
        availableSeats: {
            type: Number,
            required: true,
            min: [0, "Available seats cannot be negative"],
            validate: {
                validator: function (value) {
                    // Ensures availableSeats never exceeds totalSeats during creation/save
                    return typeof this.totalSeats === "number"
                        ? value <= this.totalSeats
                        : true;
                },
                message: "Available seats cannot exceed total seats",
            },
        },
        ticketPrice: {
            type: Number,
            required: true,
            min: [0, "Ticket price cannot be negative"],
        },
        imageUrl: {
            type: String,
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// 1. INDEX FOR CATEGORY & SEAT AVAILABILITY FILTERING
eventSchema.index({ category: 1, availableSeats: 1 });

const Event = mongoose.model("Event", eventSchema);
export default Event;