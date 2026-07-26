import Trip from '../models/Trip.js';
import * as aiService from './aiService.js';

export const generateAndSaveTrip = async ({ destination, duration, budgetType, interests, userId, category, totalSeats }) => {
  const generatedData = await aiService.generateNewItinerary({
    destination,
    duration,
    budgetType,
    interests: interests || [],
  });

  return await Trip.create({
    ...generatedData,
    userId,
    interests: interests || [],
    budgetType,
    duration,
    category: category || 'Custom AI Run',
    totalSeatsAvailable: totalSeats || 0,
    seatsAllotted: 0
  });
};

export const updateTripFields = async (tripId, updateData) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new Error('Trip document not found.');

  const allowedUpdates = ['destination', 'category', 'totalSeatsAvailable', 'itinerary'];
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      trip[field] = updateData[field];
    }
  });

  return await trip.save();
};