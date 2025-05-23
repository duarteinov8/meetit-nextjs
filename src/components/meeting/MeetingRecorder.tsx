'use client';

import { useEffect, useRef, useState } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { startTranscription, stopTranscription } from '@/lib/azure/speech';
import { Mic, MicOff, Square, Pencil, X, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import MeetingSummary from './MeetingSummary';

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
  const [speakerNames, setSpeakerNames] = useState<{ [id: string]: string }>({});
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const editingRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastClickTimeRef = useRef<number>(0);
  const isEditingRef = useRef<boolean>(false);

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
    
    // Process transcriptions when stopping
    setTranscriptions(prev => {
      // Get all final transcriptions
      const finalTranscriptions = prev.filter(t => t.isFinal);
      
      // Get all interim transcriptions that aren't already in final form
      const interimTranscriptions = Array.from(interimTranscriptionsRef.current.values())
        .filter(t => t.speakerId !== 'Speaker Unknown')
        .filter(t => !finalTranscriptions.some(ft => 
          ft.speakerId === t.speakerId && 
          ft.text === t.text
        ));
      
      // Convert interim to final and combine with existing final transcriptions
      const allTranscriptions = [
        ...finalTranscriptions,
        ...interimTranscriptions.map(t => ({ ...t, isFinal: true }))
      ];
      
      // Sort by timestamp
      return allTranscriptions.sort((a, b) => a.timestamp - b.timestamp);
    });
    
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

  // Helper: get display name for a speaker
  function getDisplayName(speakerId: string) {
    return speakerNames[speakerId] || speakerId;
  }

  // When recording stops, initialize speakerNames mapping
  useEffect(() => {
    if (!isRecording && transcriptions.length > 0) {
      console.log('Recording stopped, initializing speaker names');
      const uniqueSpeakers = Array.from(new Set(transcriptions.map(t => t.speakerId)));
      console.log('Unique speakers:', uniqueSpeakers);
      setSpeakerNames(prev => {
        const updated = { ...prev };
        uniqueSpeakers.forEach(id => {
          if (id && !updated[id]) updated[id] = id;
        });
        console.log('Updated speaker names:', updated);
        return updated;
      });
    }
  }, [isRecording, transcriptions]);

  // Inline edit handlers
  const startEditing = (speakerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Starting edit for speaker:', speakerId);
    const currentSpeakerId = speakerId.trim();
    
    editingRef.current = currentSpeakerId;
    setEditingSpeaker(currentSpeakerId);
    setEditingValue(speakerNames[currentSpeakerId] || currentSpeakerId);
    
    // Focus the input after it's rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  };

  const saveEdit = () => {
    if (!editingRef.current) return;

    const currentSpeakerId = editingRef.current;
    const newName = editingValue.trim();
    
    if (!newName) {
      cancelEdit();
      return;
    }

    console.log('Saving speaker name for:', currentSpeakerId);
    setSpeakerNames(prev => ({ ...prev, [currentSpeakerId]: newName }));
    editingRef.current = null;
    setEditingSpeaker(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    editingRef.current = null;
    setEditingSpeaker(null);
    setEditingValue('');
  };

  // Add a function to format transcriptions into a single string
  const getFormattedTranscript = () => {
    return transcriptions
      .filter(t => t.isFinal && t.speakerId && t.speakerId !== 'Speaker Unknown')
      .map(t => `${getDisplayName(t.speakerId || '')}: ${t.text}`)
      .join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Meeting Recording</h2>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`btn ${isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
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
              {/* Inline editable speaker name */}
              {(!isRecording && editingRef.current === transcription.speakerId?.trim()) ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    className="text-xs font-medium px-2 py-1 rounded bg-white text-gray-900 outline-none border border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    style={{ minWidth: 60 }}
                  />
                  <button
                    onClick={saveEdit}
                    className="p-1 text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                    title="Save"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200 text-gray-900">
                    {getDisplayName(transcription.speakerId || '')}
                  </span>
                  {!isRecording && (
                    <button
                      onClick={(e) => startEditing(transcription.speakerId || '', e)}
                      className="p-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
                      title="Edit speaker name"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1">
                <p className={`text-sm ${transcription.isFinal && !isRecording ? 'text-gray-900' : 'text-gray-600'}`}>
                  {transcription.text}
                </p>
                <span className="text-xs text-gray-500">
                  {new Date(transcription.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Meeting Summary Section */}
      {!isRecording && transcriptions.length > 0 && (
        <div className="mt-8">
          <MeetingSummary transcript={getFormattedTranscript()} />
        </div>
      )}
    </div>
  );
}