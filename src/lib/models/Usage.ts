import mongoose from 'mongoose';
import connectDB from '../mongoose';

// Ensure MongoDB connection
connectDB();

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: String,
    enum: ['speech', 'meeting', 'ai'],
    required: true
  },
  duration: {
    type: Number,  // in seconds
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // We can add more fields later like:
  // - licenseTier
  // - monthlyQuota
  // - usageCost
  // - organizationId
});

// Index for efficient querying of user usage
usageSchema.index({ userId: 1, service: 1, timestamp: -1 });

export const Usage = mongoose.models.Usage || mongoose.model('Usage', usageSchema); 