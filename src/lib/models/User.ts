import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
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
  } catch (error: any) {
    next(error);
  }
});

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  image?: string;
  emailVerified?: Date;
  subscription: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// Ensure we're connected to MongoDB before creating the model
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User; 