'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

interface MeetingSummaryProps {
  transcript: string;
  initialSummary?: MeetingAnalysis;
  onSummaryGenerated?: (summary: MeetingAnalysis) => void;
}

interface MeetingAnalysis {
  summary: string;
  actionItems: string[];
  keyPoints: string[];
}

interface Transcription {
  speaker: string;
  text: string;
}

export default function MeetingSummary({ transcript, initialSummary, onSummaryGenerated }: MeetingSummaryProps) {
  const [summary, setSummary] = useState<MeetingAnalysis | null>(initialSummary || null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  // Convert transcript string to array of transcriptions
  const parseTranscript = (transcriptStr: string): Transcription[] => {
    return transcriptStr
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [speaker, ...textParts] = line.split(':');
        return {
          speaker: speaker.trim(),
          text: textParts.join(':').trim()
        };
      });
  };

  const generateSummary = async () => {
    setIsLoading(true);
    try {
      const transcriptions = parseTranscript(transcript);
      
      const response = await fetch('/api/meeting/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: transcriptions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const result = await response.json();
      setSummary(result);
      // Notify parent component about the new summary
      if (onSummaryGenerated) {
        onSummaryGenerated(result);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate meeting summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsQuerying(true);
    try {
      const transcriptions = parseTranscript(transcript);
      
      const response = await fetch('/api/meeting/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: transcriptions,
          question: query 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process question');
      }

      const result = await response.json();
      setAnswer(result.answer);
    } catch (error) {
      console.error('Error querying meeting:', error);
      alert(error instanceof Error ? error.message : 'Failed to process your question. Please try again.');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Meeting Summary</h2>
        {!summary && !isLoading && (
          <button
            onClick={generateSummary}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            disabled={isLoading}
          >
            Generate Summary
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-700">Generating summary...</span>
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
            <p className="text-gray-700">{summary.summary}</p>
          </div>

          {summary.actionItems.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-2">Action Items</h3>
              <ul className="list-disc list-inside space-y-1">
                {summary.actionItems.map((item, index) => (
                  <li key={index} className="text-gray-700">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.keyPoints.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-2">Key Points</h3>
              <ul className="list-disc list-inside space-y-1">
                {summary.keyPoints.map((point, index) => (
                  <li key={index} className="text-gray-700">{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 bg-white rounded-lg shadow p-4">
        <h3 className="font-medium text-gray-900 mb-4">Ask about the meeting</h3>
        <form onSubmit={handleQuery} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., What were the main decisions made?"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
              disabled={isQuerying}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isQuerying || !query.trim()}
            >
              {isQuerying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {answer && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-gray-900">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
} 