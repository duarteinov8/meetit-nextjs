'use client';

import { useEffect, useRef, useState } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { startTranscription, stopTranscription } from '@/lib/azure/speech';
import { Mic, MicOff, Square } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Transcription {
  text: string;
  timestamp: number;
  isFinal: boolean;
  speakerId?: string;
}

// Function to get a display name for a speaker
function getSpeakerDisplayName(speakerId: string | undefined, lastSpeaker: string = 'Speaker 1'): string | null {
  if (!speakerId) return null;
  
  // Handle Guest speaker IDs
  if (speakerId.startsWith('Guest-')) {
    const guestNumber = speakerId.replace('Guest-', '');
    return `Speaker ${guestNumber}`;
  }
  
  // Handle conversation speaker IDs
  if (speakerId.startsWith('CONVERSATION_SPEAKER_')) {
    const speakerNumber = speakerId.replace('CONVERSATION_SPEAKER_', '');
    return `Speaker ${speakerNumber}`;
  }
  
  // Only return a speaker name if it's a proper speaker ID
  if (speakerId.startsWith('Speaker_') || /^[0-9]+$/.test(speakerId)) {
    return `Speaker ${speakerId.replace('Speaker_', '')}`;
  }
  
  return null;
}

export default function MeetingRecorder() {
  const { data: session } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const recognizerRef = useRef<sdk.ConversationTranscriber | null>(null);
  const audioConfigRef = useRef<sdk.AudioConfig | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const interimTranscriptionsRef = useRef<Map<string, Transcription>>(new Map());
  const lastSpeakerRef = useRef<string>('Speaker 1');

  const trackUsage = async (duration: number) => {
    if (!session?.user?.id) return;
    
    try {
      await fetch('/api/usage/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'speech',
          duration,
          userId: session.user.id,
        }),
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Clear previous transcriptions
      setTranscriptions([]);
      interimTranscriptionsRef.current.clear();
      lastSpeakerRef.current = 'Speaker 1';
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio config from the stream
      audioConfigRef.current = sdk.AudioConfig.fromStreamInput(stream);
      
      // Start transcription
      recognizerRef.current = await startTranscription(audioConfigRef.current);
      
      // Set up event handlers
      if (recognizerRef.current) {
        recognizerRef.current.transcribed = (s, e) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            // Get the speaker ID from the result
            const speakerId = e.result.speakerId ? 
              getSpeakerDisplayName(e.result.speakerId, lastSpeakerRef.current) : 
              null;
            
            // Only process if we have a valid speaker ID
            if (speakerId) {
              // Update last speaker
              lastSpeakerRef.current = speakerId;
              
              // Create the final transcription
              const finalTranscription = {
                text: e.result.text,
                timestamp: Date.now(),
                isFinal: true,
                speakerId
              };

              // Remove the interim transcription for this speaker
              interimTranscriptionsRef.current.delete(speakerId);
              
              // Update the transcriptions array
              setTranscriptions(prev => {
                // Remove any interim transcription for this speaker
                const filteredTranscriptions = prev.filter(t => 
                  t.speakerId !== speakerId || t.isFinal
                );
                
                // Add the final transcription
                return [...filteredTranscriptions, finalTranscription];
              });
            }
          }
        };

        recognizerRef.current.transcribing = (s, e) => {
          // Get the speaker ID from the result
          const speakerId = e.result.speakerId ? 
            getSpeakerDisplayName(e.result.speakerId, lastSpeakerRef.current) : 
            null;

          // Only process if we have a valid speaker ID
          if (speakerId) {
            // Create the interim transcription
            const interimTranscription = {
              text: e.result.text,
              timestamp: Date.now(),
              isFinal: false,
              speakerId
            };

            // Store the interim transcription
            interimTranscriptionsRef.current.set(speakerId, interimTranscription);

            // Update the transcriptions array
            setTranscriptions(prev => {
              // Get all final transcriptions
              const finalTranscriptions = prev.filter(t => t.isFinal);
              
              // Add all current interim transcriptions
              const allTranscriptions = [
                ...finalTranscriptions,
                ...Array.from(interimTranscriptionsRef.current.values())
              ];

              // Sort by timestamp
              return allTranscriptions.sort((a, b) => a.timestamp - b.timestamp);
            });
          }
        };
      }

      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (recognizerRef.current) {
      await stopTranscription(recognizerRef.current);
      recognizerRef.current = null;
    }
    if (audioConfigRef.current) {
      audioConfigRef.current.close();
      audioConfigRef.current = null;
    }
    
    // Convert any remaining interim transcriptions to final, excluding "Unknown Speaker" entries
    setTranscriptions(prev => 
      prev
        .filter(t => t.speakerId !== 'Speaker Unknown')
        .map(t => t.isFinal ? t : { ...t, isFinal: true })
    );
    
    // Clear interim transcriptions
    interimTranscriptionsRef.current.clear();
    
    // Track usage if we have a start time
    if (startTimeRef.current) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      await trackUsage(duration);
      startTimeRef.current = null;
    }
    
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        stopRecording();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Meeting Recording</h2>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`btn ${isRecording ? 'btn-error' : 'btn-primary'}`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </>
          )}
        </button>
      </div>

      {/* Transcription Display */}
      <div className="bg-white rounded-lg shadow p-4 h-[400px] overflow-y-auto">
        {transcriptions.map((transcription, index) => (
          <div
            key={`${transcription.timestamp}-${index}`}
            className={`mb-2 p-2 rounded ${
              transcription.isFinal && !isRecording ? 'bg-blue-50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200 text-gray-700">
                {transcription.speakerId}
              </span>
              <div className="flex-1">
                <p className={`text-sm ${transcription.isFinal && !isRecording ? 'text-gray-900' : 'text-gray-500'}`}>
                  {transcription.text}
                </p>
                <span className="text-xs text-gray-400">
                  {new Date(transcription.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 