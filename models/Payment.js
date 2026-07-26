import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payment must be linked to a user account'],
      index: true, // Optimizes speed for user billing histories
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Payment must be associated with a generated trip plan'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR', // Defaulting to INR, can adjust based on location preference
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'wallet', 'simulated'],
      default: 'razorpay',
    },
    gatewayOrderId: {
      type: String,
      required: [true, 'Gateway Order ID is required for transaction tracking'],
      unique: true, // Prevents duplicate transaction logs
    },
    gatewayPaymentId: {
      type: String, // Filled after successful capture from webhook/frontend confirmation
      sparse: true, // Allows null/missing values while maintaining uniqueness for captured runs
      unique: true,
    },
    gatewaySignature: {
      type: String, // Used to verify webhook validity
      select: false,
    },
  },
  {
    timestamps: true, // Captures exact transaction initialization and completion times
  }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;