import express from 'express';

import { protect, admin } from '../middleware/auth.js';
import { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent } from '../controllers/event.controller.js';

const router = express.Router();

// Get All Events
router.get('/', getAllEvents);

// get events by id
router.get('/:id', getEventById);

// create Event (admin only)
router.post('/', protect, admin, createEvent);

// update Event (admin only)
router.put('/:id', protect, admin, updateEvent);

// Delete Event (Admin only)
router.delete('/:id', protect, admin, deleteEvent);

export default router;