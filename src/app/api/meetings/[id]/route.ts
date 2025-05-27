import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/auth';
import Meeting from '@/lib/models/Meeting';
import connectDB from '@/lib/mongoose';

type RouteContext = {
  params: {
    id: string;
  };
};

// GET /api/meetings/[id] - Get a specific meeting
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const meeting = await Meeting.findOne({
      _id: context.params.id,
      userId: session.user.id,
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Log the raw meeting document from MongoDB
    console.log('Raw meeting from MongoDB:', {
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
    
    // Log the converted data
    console.log('Converted meeting data:', {
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

    return NextResponse.json(meetingData);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PATCH /api/meetings/[id] - Update a meeting
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('PATCH request body:', {
      id: context.params.id,
      transcriptionsCount: body.transcriptions?.length || 0,
      speakerNames: body.speakerNames,
      hasSummary: !!body.summary,
      sampleTranscription: body.transcriptions?.[0]
    });

    const {
      title,
      description,
      startTime,
      endTime,
      status,
      participants,
      tags,
      transcriptions,
      speakerNames,
      summary,
    } = body;

    await connectDB();

    // Find and update the meeting
    const meeting = await Meeting.findOneAndUpdate(
      {
        _id: context.params.id,
        userId: session.user.id,
      },
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(status && { status }),
        ...(participants && { participants }),
        ...(tags && { tags }),
        ...(transcriptions && { transcriptions }),
        ...(speakerNames && { speakerNames }),
        ...(summary && { summary }),
      },
      { 
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Log the updated meeting
    console.log('Updated meeting in MongoDB:', {
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
    console.log('Returning updated meeting data:', {
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

    return NextResponse.json(meetingData);
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings/[id] - Delete a meeting
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const meeting = await Meeting.findOneAndDelete({
      _id: context.params.id,
      userId: session.user.id,
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
} 