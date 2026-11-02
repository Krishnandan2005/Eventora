import Event from '../models/Event.models.js';

// get all events
export const getAllEvents = async (req, res) => {
    try {
        // Prevent browser/proxy 304 caching on dynamic queries
        res.set('Cache-Control', 'no-store');

        const { search, category, location, ticketPrice } = req.query;
        const filters = {};

        // 1. Global Search (Title, Description, Category, Location)
        if (search && search.trim() !== '') {
            const regex = new RegExp(search.trim(), 'i');
            filters.$or = [
                { title: regex },
                { description: regex },
                { category: regex },
                { location: regex }
            ];
        }

        // 2. Specific Field Filters
        if (category) {
            filters.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
        }
        if (location) {
            filters.location = { $regex: new RegExp(location.trim(), 'i') };
        }
        if (ticketPrice !== undefined && ticketPrice !== '') {
            filters.ticketPrice = Number(ticketPrice);
        }

        const events = await Event.find(filters).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// get event by id
export const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// create event
export const createEvent = async (req, res) => {
    try {
        const { title, description, date, location, category, totalSeats, ticketPrice, imageUrl } = req.body;
        const event = await Event.create({
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            availableSeats: totalSeats,
            ticketPrice: ticketPrice || 0,
            imageUrl,
            createdBy: req.user.id
        });
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// update event
export const updateEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// delete event
export const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};