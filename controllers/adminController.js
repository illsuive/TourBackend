import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Payment from '../models/Payment.js';
import { generateNewItinerary } from '../services/aiService.js';

// --- 1. ANALYTICS & PLATFORM METRICS AUDITING ---
export const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalTrips = await Trip.countDocuments();
    
    // Aggregation pipeline to classify which budget tiers are most popular
    const budgetStats = await Trip.aggregate([
      { $group: { _id: '$budgetType', count: { $sum: 1 } } }
    ]);

    // Aggregation pipeline to calculate the total estimated budget managed by the platform
    const financialStats = await Trip.aggregate([
      { $group: { _id: null, overallBudget: { $sum: '$budgetBreakdown.total' } } }
    ]);

    res.status(200).json({
      metrics: {
        totalUsers,
        totalTrips,
        overallEstimatedBudget: financialStats[0]?.overallBudget || 0
      },
      budgetDistribution: budgetStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 2. Live Package Control & Inventory Matrix ---
export const getAllPlatformTrips = async (req, res) => {
  try {
    // Admins bypass individual filters; populate creator context for structural review
    const trips = await Trip.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
      
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminCreateTrip = async (req, res) => {
  try {
    const { destination, duration, budgetType, interests, category, totalSeats, price, isPublic, assignedToEmail } = req.body;

    if (!destination || !duration || !budgetType) {
      return res.status(400).json({ error: 'Missing mandatory configuration variables parameters.' });
    }

    // 1. Normalize formatting so it never violates your database schema enum barriers
    let processedBudget = budgetType.toLowerCase().trim();
    if (processedBudget === 'mid-range') processedBudget = 'Mid-Range';
    if (processedBudget === 'budget') processedBudget = 'Budget';
    if (processedBudget === 'luxury') processedBudget = 'Luxury';

    let targetUserId = null;
    if (isPublic === false && assignedToEmail) {
      const targetUser = await User.findOne({ email: assignedToEmail.trim() });
      if (!targetUser) return res.status(404).json({ error: 'Assigned user email reference target not found.' });
      targetUserId = targetUser._id;
    }

    // 2. Dispatch structured payload arrays cleanly out to your AI service layer
    const generatedData = await generateNewItinerary({
      destination,
      duration,
      budgetType: processedBudget,
      interests: interests || []
    });

    // 3. Hydrate standard model fields
    const adminTrip = new Trip({
      ...generatedData,
      budgetType: processedBudget,
      userId: req.user._id, // Tracks which admin initialized the generation pipeline
      category: category || 'Group Tour',
      totalSeats: Number(totalSeats) || 50,
      seatsAllotted: 0,
      price: Number(price) || 299,
      isPublic: isPublic !== undefined ? isPublic : true,
      assignedTo: targetUserId
    });

    await adminTrip.save();
    res.status(201).json({ message: 'Commercial package successfully deployed.', adminTrip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminEditTrip = async (req, res) => {
  try {
    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body }, 
      { new: true, runValidators: true }
    );
    if (!updatedTrip) return res.status(404).json({ error: 'Target itinerary package not found.' });
    
    res.status(200).json({ message: 'Itinerary successfully overwritten by administrator.', updatedTrip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminAllotSeat = async (req, res) => {
  try {
    const { seatsToBook } = req.body;
    const count = Number(seatsToBook) || 1;

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip package not found.' });

    // Capacity checking validation threshold using totalSeats bounds
    if (trip.seatsAllotted + count > trip.totalSeats) {
      return res.status(400).json({ 
        error: `Capacity overflow. Only ${trip.totalSeats - trip.seatsAllotted} seats remaining.` 
      });
    }

    trip.seatsAllotted += count;
    await trip.save();

    res.status(200).json({ 
      message: `Successfully allocated ${count} seats. Total remaining: ${trip.totalSeats - trip.seatsAllotted}`,
      trip 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminDeleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    
    res.status(200).json({ message: 'Trip successfully removed by administrator.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 3. USER GOVERNANCE CONTROL DESK ---
export const getAllUsers = async (req, res) => {
  try {
    // Select all identities whose roles are standard users
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminToggleUserAccess = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User profile tracking targets not found.' });

    // Administrative security checkpoint: Block self-suspension runs
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Administrative safety block: You cannot disable your own access privileges.' });
    }

    // Toggle active account status
    user.isAccountActive = !user.isAccountActive;
    await user.save();

    res.status(200).json({ 
      message: `User access state shifted successfully. Active status: ${user.isAccountActive.toString().toUpperCase()}`,
      user 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User account not found.' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Administrative safety block: You cannot delete your own account.' });
    }

    // Cascading Purge Pattern to clear structural files and avoid fragmentation
    await Trip.deleteMany({ userId: userId });
    await Payment.deleteMany({ userId: userId });
    await User.findByIdAndDelete(userId);

    res.status(200).json({ 
      message: 'User account and all associated itineraries/transactions successfully purged from the platform.' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 4. FINANCIAL HISTORY AUDITS ---
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name email')
      .populate('tripId', 'destination duration')
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};