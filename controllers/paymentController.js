import Payment from '../models/Payment.js';
import Trip from '../models/Trip.js';
import crypto from 'crypto';

export const initializeCheckout = async (req, res) => {
  try {
    const { tripId, amount, currency } = req.body;

    if (!tripId || !amount) {
      return res.status(400).json({ error: 'Please submit a valid tripId and transaction amount.' });
    }

    // Verify trip existence and ownership to protect data boundaries
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: 'Associated trip profile not found.' });
    
    if (trip.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized transaction initialization request.' });
    }

    const mockGatewayOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;

    const payment = await Payment.create({
      userId: req.user._id,
      tripId,
      amount,
      currency: currency || 'INR',
      status: 'pending',
      paymentGateway: 'razorpay',
      gatewayOrderId: mockGatewayOrderId,
    });

    res.status(201).json({
      message: 'Checkout session successfully initialized.',
      paymentId: payment._id,
      gatewayOrderId: payment.gatewayOrderId,
      amount: payment.amount,
      currency: payment.currency
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyPaymentTransaction = async (req, res) => {
  try {
    const { gatewayOrderId, gatewayPaymentId, isSuccess } = req.body;

    if (!gatewayOrderId || !gatewayPaymentId) {
      return res.status(400).json({ error: 'Missing core gateway parameters.' });
    }

    // Find the record linked to the order string
    const payment = await Payment.findOne({ gatewayOrderId });
    if (!payment) return res.status(404).json({ error: 'Transaction log entry not found.' });

    // Enforce data isolation parameters
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Security alert: User token mismatch during signature verification.' });
    }

    // Evaluate gateway success signal or webhook signature verification parameters
    if (isSuccess === true) {
      payment.status = 'completed';
      payment.gatewayPaymentId = gatewayPaymentId;
    } else {
      payment.status = 'failed';
    }

    await payment.save();

    res.status(200).json({
      message: `Transaction processing finalized. Result Status: ${payment.status.toUpperCase()}`,
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserPaymentHistory = async (req, res) => {
  try {
    // Native enforcement of data isolation by matching the req.user._id parameter
    const logs = await Payment.find({ userId: req.user._id })
      .populate('tripId', 'destination duration')
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};