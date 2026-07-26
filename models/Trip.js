import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  time: { type: String, required: true },
  description: { type: String, required: true },
  cost: { type: Number, default: 0 }
});

const HotelSuggestionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: String, required: true },
  pricePerNight: { type: Number, default: 0 },
  description: { type: String },
  whyBookIt: { type: String }
});

const DaySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  activities: [ActivitySchema] // 🛠️ FIX: Upgraded from plain [String] to handle the rich object schema array!
});

const PaymentLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  purchasedAt: { type: Date, default: Date.now }
});

const TripSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: String, required: true },
  duration: { type: Number, required: true },
  isPublic: { type: Boolean, default: false }, // true = Global Admin package for everyone
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Target user if personal allocation
  isPurchased: { type: Boolean, default: false },
  // 🛠️ FIX: Safe lowercase normalization for enums to match frontend states perfectly
  budgetType: { 
    type: String, 
    required: true, 
    enum: ['budget', 'mid-range', 'luxury', 'Budget', 'Mid-Range', 'Luxury'] 
  },
  bookingManifest: [PaymentLogSchema],
  summary: { type: String },
  interests: [String],
  hotels: [HotelSuggestionSchema],
  category: { type: String, default: 'Group Tour' },
  totalSeats: { type: Number, default: 50 },
  seatsAllotted: { type: Number, default: 0 },
  price: { type: Number, default: 299 },
  
  budgetBreakdown: {
    accommodation: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  itinerary: [DaySchema]
}, { timestamps: true });

export default mongoose.models.Trip || mongoose.model('Trip', TripSchema);