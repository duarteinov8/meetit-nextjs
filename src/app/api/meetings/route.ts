import { NextResponse } from 'next/server';
import { getSession } from '@/auth';
import Meeting from '@/lib/models/Meeting';
import connectDB from '@/lib/mongoose';
import mongoose from 'mongoose';

interface MeetingQuery {
  userId: mongoose.Types.ObjectId;
  status?: string;
  $or?: Array<{
    [key: string]: { $regex: string; $options: string };
  }>;
}

// GET /api/meetings - Get all meetings for the current user
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: MeetingQuery = { userId: new mongoose.Types.ObjectId(session.user.id) };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    // Get meetings with pagination
    const meetings = await Meeting.find(query)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Meeting.countDocuments(query);

    return NextResponse.json({
      meetings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Create a new meeting
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('POST request body:', {
      transcriptionsCount: body.transcriptions?.length || 0,
      transcriptions: body.transcriptions,
      speakerNames: body.speakerNames,
      hasSummary: !!body.summary,
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime
    });

    const { 
      title, 
      description, 
      startTime, 
      endTime,
      participants, 
      tags,
      transcriptions,
      speakerNames,
      summary
    } = body;

    if (!title || !startTime) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      );
    }

    await connectDB();

    try {
      const meeting = await Meeting.create({
        title,
        description,
        userId: session.user.id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        participants,
        tags,
        transcriptions: transcriptions || [],
        speakerNames: speakerNames || {},
        summary
      });

      // Log the created meeting document
      console.log('Created meeting in MongoDB:', {
        id: meeting._id,
        hasSpeakerNames: !!meeting.speakerNames,
        speakerNamesKeys: meeting.speakerNames ? Object.keys(meeting.speakerNames) : [],
        transcriptionsCount: meeting.transcriptions?.length || 0,
        firstTranscription: meeting.transcriptions?.[0] ? {
          speakerId: meeting.transcriptions[0].speakerId,
          speakerName: meeting.transcriptions[0].speakerName,
          text: meeting.transcriptions[0].text
        } : null
      });

      // Convert to plain object
      const meetingData = meeting.toObject();
      
      // Log the data being returned
      console.log('Returning meeting data:', {
        id: meetingData._id,
        hasSpeakerNames: !!meetingData.speakerNames,
        speakerNamesKeys: meetingData.speakerNames ? Object.keys(meetingData.speakerNames) : [],
        transcriptionsCount: meetingData.transcriptions?.length || 0,
        firstTranscription: meetingData.transcriptions?.[0] ? {
          speakerId: meetingData.transcriptions[0].speakerId,
          speakerName: meetingData.transcriptions[0].speakerName,
          text: meetingData.transcriptions[0].text
        } : null
      });

      return NextResponse.json(meetingData, { status: 201 });
    } catch (dbError: unknown) {
      if (dbError instanceof mongoose.Error.ValidationError) {
        console.error('Database validation error creating meeting:', {
          error: dbError,
          errorName: dbError.name,
          errorMessage: dbError.message,
          validationErrors: Object.entries(dbError.errors).map(([key, err]) => ({
            field: key,
            message: err.message
          }))
        });
      } else if (dbError instanceof mongoose.Error) {
        console.error('Database error creating meeting:', {
          error: dbError,
          errorName: dbError.name,
          errorMessage: dbError.message
        });
      } else {
        console.error('Unknown database error:', dbError);
      }
      throw dbError;
    }
  } catch (error: unknown) {
    console.error('Error creating meeting:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to create meeting',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 