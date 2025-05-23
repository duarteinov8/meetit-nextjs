import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a meeting title'],
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  transcription: {
    type: String,
  },
  summary: {
    type: String,
  },
  aiInsights: {
    actionItems: [{
      text: String,
      assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending',
      },
    }],
    topics: [{
      name: String,
      confidence: Number,
    }],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
    },
  },
  recordingUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
meetingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add indexes for common queries
meetingSchema.index({ host: 1, startTime: -1 });
meetingSchema.index({ participants: 1, startTime: -1 });
meetingSchema.index({ status: 1, startTime: -1 });

const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);

export default Meeting; 