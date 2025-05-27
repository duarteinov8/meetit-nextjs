import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import User from '@/lib/models/User';
import { IMeeting } from '@/lib/models/Meeting';
import Meeting from '@/lib/models/Meeting';
import connectToDatabase from '@/lib/mongodb';

// GET /api/users/recording-time
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate actual time used from meetings
    const meetings = await Meeting.find({ userId: user._id });
    const totalTimeUsed = meetings.reduce((total: number, meeting: IMeeting) => {
      if (meeting.endTime && meeting.startTime) {
        const duration = Math.floor((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 1000);
        return total + duration;
      }
      return total;
    }, 0);

    // Update user's recordingTimeUsed if it differs from actual usage
    if (user.recordingTimeUsed !== totalTimeUsed) {
      user.recordingTimeUsed = totalTimeUsed;
      await user.save();
    }

    return NextResponse.json({
      timeUsed: totalTimeUsed,
      timeLimit: user.recordingTimeLimit,
      remainingTime: Math.max(0, user.recordingTimeLimit - totalTimeUsed),
      percentageUsed: Math.min(100, (totalTimeUsed / user.recordingTimeLimit) * 100),
    });
  } catch (error) {
    console.error('Error fetching recording time:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users/recording-time
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, duration } = await request.json();
    if (!meetingId || typeof duration !== 'number') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the meeting's endTime if it's not set
    const meeting = await Meeting.findOne({ _id: meetingId, userId: user._id });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (!meeting.endTime) {
      meeting.endTime = new Date(meeting.startTime.getTime() + duration * 1000);
      await meeting.save();
    }

    // Recalculate total time used from all meetings
    const meetings = await Meeting.find({ userId: user._id });
    const totalTimeUsed = meetings.reduce((total: number, meeting: IMeeting) => {
      if (meeting.endTime && meeting.startTime) {
        const meetingDuration = Math.floor((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 1000);
        return total + meetingDuration;
      }
      return total;
    }, 0);

    // Update user's recordingTimeUsed
    user.recordingTimeUsed = totalTimeUsed;
    await user.save();

    return NextResponse.json({
      timeUsed: totalTimeUsed,
      timeLimit: user.recordingTimeLimit,
      remainingTime: Math.max(0, user.recordingTimeLimit - totalTimeUsed),
      percentageUsed: Math.min(100, (totalTimeUsed / user.recordingTimeLimit) * 100),
    });
  } catch (error) {
    console.error('Error updating recording time:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 