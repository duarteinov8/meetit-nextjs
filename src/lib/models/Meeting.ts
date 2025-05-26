import mongoose from 'mongoose';
import connectDB from '../mongoose';

export interface ITranscription {
  text: string;
  timestamp: number;
  isFinal: boolean;
  speakerId?: string;
  speakerName?: string;
}

export interface IMeeting {
  title: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  transcriptions: ITranscription[];
  speakerNames: Record<string, string>;
  summary?: {
    text: string;
    actionItems: string[];
    keyPoints: string[];
  };
  participants?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new mongoose.Schema<IMeeting>({
  title: {
    type: String,
    required: [true, 'Please provide a meeting title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Meeting must belong to a user'],
  },
  startTime: {
    type: Date,
    required: [true, 'Please provide a start time'],
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number,
  },
  transcriptions: [{
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    speakerId: String,
    speakerName: String,
  }],
  speakerNames: {
    type: Object,
    default: {},
  },
  summary: {
    text: String,
    actionItems: [String],
    keyPoints: [String],
  },
  participants: [String],
  tags: [String],
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Index for faster queries
meetingSchema.index({ userId: 1, startTime: -1 });

// Update duration when endTime is set
meetingSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  next();
});

// Create the model if it doesn't exist
const Meeting = mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', meetingSchema);

export default Meeting; 