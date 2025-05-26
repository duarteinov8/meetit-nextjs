'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import MeetingRecorder from '@/components/meeting/MeetingRecorder';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface Meeting {
  _id: string;
  title: string;
  startTime: string;
  endTime?: string;
  transcriptions: Array<{
    text: string;
    timestamp: number;
    speakerId?: string;
    speakerName?: string;
  }>;
  speakerNames: Record<string, string>;
  summary?: {
    summary: string;
    actionItems: string[];
    keyPoints: string[];
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MeetingPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeeting = async () => {
      try {
        const response = await fetch(`/api/meetings/${id}`);
        if (!response.ok) {
          throw new Error('Failed to load meeting');
        }

        const data = await response.json();
        console.log('Loaded meeting data:', {
          id: data._id,
          transcriptionsCount: data.transcriptions?.length || 0,
          sampleTranscription: data.transcriptions?.[0]
        });

        // Just use the data as is - the speakerName is already saved in each transcription
        setMeeting(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading meeting:', err);
        setError(err instanceof Error ? err.message : 'Failed to load meeting');
        setIsLoading(false);
      }
    };

    loadMeeting();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete meeting');

      toast.success('Meeting deleted successfully');
      router.push('/dashboard/past-meetings');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Meeting not found</p>
      </div>
    );
  }

  console.log('Rendering meeting page:', {
    id: meeting._id,
    endTime: meeting.endTime,
    transcriptionsCount: meeting.transcriptions?.length || 0,
    hasSummary: !!meeting.summary,
    sampleTranscription: meeting.transcriptions?.[0]
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
        <button
          onClick={handleDelete}
          className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Meeting
        </button>
      </div>
      <MeetingRecorder 
        meetingId={meeting._id}
        readOnly={true}
        initialTranscriptions={meeting.transcriptions || []}
        initialSpeakerNames={meeting.speakerNames || {}}
        initialSummary={meeting.summary}
      />
    </div>
  );
} 