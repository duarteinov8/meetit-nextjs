import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  name: string;
  email: string;
  password: string;
  image?: string;
  emailVerified?: Date;
  recordingTimeUsed: number; // in seconds
  recordingTimeLimit: number; // in seconds (default 3 hours = 10800)
  betaUser: boolean;
  subscription: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    select: false, // Don't include password in queries by default
  },
  image: {
    type: String,
  },
  emailVerified: {
    type: Date,
  },
  recordingTimeUsed: {
    type: Number,
    default: 0,
    min: 0,
  },
  recordingTimeLimit: {
    type: Number,
    default: 10800, // 3 hours in seconds
    min: 0,
  },
  betaUser: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Add any additional fields you need for your application
  subscription: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const password = this.password as string;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(password, salt);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Failed to hash password'));
  }
});

// Ensure we're connected to MongoDB before creating the model
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User; 