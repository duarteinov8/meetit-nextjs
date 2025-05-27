import mongoose from 'mongoose';
import connectDB from '../mongoose';

// Ensure MongoDB connection
connectDB();

export interface IUsage extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  service: 'speech' | 'meeting' | 'ai';
  duration: number;
  timestamp: Date;
}

const usageSchema = new mongoose.Schema<IUsage>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usage must belong to a user']
  },
  service: {
    type: String,
    enum: ['speech', 'meeting', 'ai'],
    required: [true, 'Please specify the service type']
  },
  duration: {
    type: Number,  // in seconds
    required: [true, 'Please provide the duration']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying of user usage
usageSchema.index({ userId: 1, service: 1, timestamp: -1 });

// Create the model if it doesn't exist
export const Usage = mongoose.models.Usage || mongoose.model<IUsage>('Usage', usageSchema);

export default Usage; 