import Trip from '../models/Trip.js';
import * as tripService from '../services/tripService.js';
import { hasResourceAccess } from '../utils/permission.js';
import User from '../models/User.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// 🛠️ THE EXACT IMPORT FIX: Pull both required generation functions cleanly out of the AI service layer
import { generateNewItinerary, regenerateSpecificDay } from '../services/aiService.js';

export const createTrip = async (req, res) => {
  try {
    const { destination, duration, budgetType, interests } = req.body;
    
    const newTrip = await tripService.generateAndSaveTrip({
      destination, duration, budgetType, interests,
      userId: req.user._id // Sandboxed to the authenticated user ID
    });

    res.status(201).json(newTrip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    // One-line security validation using our utility gate
    if (!hasResourceAccess(req.user, trip.userId)) {
      return res.status(403).json({ error: 'Unauthorized to view this resource.' });
    }

    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const modifyManualActivity = async (req, res) => {
  try {
    const { action, dayNumber, activityText } = req.body;
    
    if (!dayNumber || !activityText || !['ADD', 'REMOVE'].includes(action)) {
      return res.status(400).json({ error: 'Missing valid action (ADD/REMOVE), dayNumber, or activity text.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip document not found.' });

    // Security Gate check
    if (!hasResourceAccess(req.user, trip.userId)) {
      return res.status(403).json({ error: 'Unauthorized data modification request.' });
    }

    const dayIndex = trip.itinerary.findIndex((d) => d.day === Number(dayNumber));
    if (dayIndex === -1) {
      return res.status(400).json({ error: `Day ${dayNumber} does not exist in this schedule.` });
    }

    if (action === 'ADD') {
      trip.itinerary[dayIndex].activities.push(activityText);
    } else if (action === 'REMOVE') {
      trip.itinerary[dayIndex].activities = trip.itinerary[dayIndex].activities.filter(
        (act) => act !== activityText
      );
    }

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const regenerateDay = async (req, res) => {
  try {
    const { dayNumber, prompt } = req.body;

    if (!dayNumber || !prompt) {
      return res.status(400).json({ error: 'Please specify the target day number and revision prompt.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip document not found.' });

    // Security Gate check
    if (!hasResourceAccess(req.user, trip.userId)) {
      return res.status(403).json({ error: 'Unauthorized to modify this travel document.' });
    }

    const dayIndex = trip.itinerary.findIndex((d) => d.day === Number(dayNumber));
    if (dayIndex === -1) {
      return res.status(400).json({ error: `Targeted Day ${dayNumber} tracking out of scope.` });
    }

    // 🛠️ THE CALL FIX: Invoke the named function directly instead of calling a non-existent object property method!
    const updatedDayObject = await regenerateSpecificDay(trip, dayNumber, prompt);

    // Swap the newly generated activity details array into your Mongoose model tracking index
    trip.itinerary[dayIndex].activities = updatedDayObject.activities;
    
    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createAICoreTripPackage = async (req, res) => {
  try {
    let { destination, duration, budgetType, interests } = req.body;

    if (!destination || !duration || !budgetType) {
      return res.status(400).json({ error: 'Missing mandatory configuration variables parameters.' });
    }

    // 🛠️ FIX: Normalize formatting so it never violates your database schema enum barriers
    let processedBudget = budgetType.toLowerCase().trim();
    if (processedBudget === 'mid-range') processedBudget = 'Mid-Range'; // Matches whatever format your schema prefers
    if (processedBudget === 'budget') processedBudget = 'Budget';
    if (processedBudget === 'luxury') processedBudget = 'Luxury';

    // Dispatch generation request to the AI service wrapper
    const generatedData = await generateNewItinerary({
      destination,
      duration,
      budgetType: processedBudget,
      interests: interests || []
    });

    // Hydrate database instantiation documents
    const deployedPackage = new Trip({
      ...generatedData,
      budgetType: processedBudget, // Enforce normalized layout strings explicitly
      userId: req.user._id,
      category: req.body.category || 'Group Tour',
      totalSeats: Number(req.body.totalSeats) || 50,
      seatsAllotted: 0
    });

    await deployedPackage.save();
    res.status(201).json(deployedPackage);

  } catch (error) {
    console.error('Controller catch node intercepting failure:', error.message);
    res.status(500).json({ 
      error: `AI generation runtime exception: ${error.message}` 
    });
  }
};

export const getUserTrips = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🛠️ NO DUPLICATES: Query personal sandboxes, public packages, and personal admin assignments all at once
    const trips = await Trip.find({
      $or: [
        { userId: userId },
        { isPublic: true },
        { assignedTo: userId }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Initialize Razorpay instance securely using environment variables
const razorpayClient = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 💳 ACTION 1: Initialize Payment Transaction Order Request
export const initializePackagePayment = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Target travel package not found.' });

    // Validate seat availability criteria for public tours
    if (trip.isPublic && trip.seatsAllotted >= trip.totalSeats) {
      return res.status(400).json({ error: 'This tour package booking capacity is fully maxed out.' });
    }

    const orderOptions = {
      amount: (trip.price || 299) * 100, // Convert standard pricing currency to lowest unit (paise)
      currency: "INR",
      receipt: `receipt_trip_${trip._id}_${Date.now()}`
    };

    const razorpayOrder = await razorpayClient.orders.create(orderOptions);
    res.status(200).json(razorpayOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 💳 ACTION 2: Validate Cryptographic Gateway Checksum Signatures
export const verifyPackagePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // 1. Cryptographic Gateway Validation Pass
    const tokenPayload = razorpay_order_id + "|" + razorpay_payment_id;
    const computedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(tokenPayload.toString())
      .digest('hex');

    if (computedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Gateway signature validation security mismatch.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Package file not found.' });

    // 2. Hydrate the embedded booking manifest log array
    const paymentReceipt = {
      userId: req.user._id, // Tracks exactly who completed the checkout loop
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: trip.price
    };

    if (trip.isPublic) {
      // Check if user already bought a seat to prevent double bookings
      const alreadyBooked = trip.bookingManifest.some(log => log.userId.toString() === req.user._id.toString());
      if (alreadyBooked) {
        return res.status(400).json({ error: 'You have already secured a seat in this package tour manifest.' });
      }

      trip.seatsAllotted += 1;
      trip.bookingManifest.push(paymentReceipt);
    } else {
      // If it's a private assigned package, toggle the purchase parameters directly
      trip.isPurchased = true;
      trip.bookingManifest.push(paymentReceipt);
    }
    
    await trip.save();
    res.status(200).json({ success: true, message: 'Transaction verified and logged successfully!', trip });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};