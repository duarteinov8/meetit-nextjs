'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { startTranscription, stopTranscription } from '@/lib/azure/speech';
import { Mic, Square, Pencil, X, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import MeetingSummary from './MeetingSummary';
import { toast } from 'react-hot-toast';

interface Transcription {
  text: string;
  timestamp: number;
  isFinal: boolean;
  speakerId?: string;
  speakerName?: string;
}

interface TranscriptionCallback {
  (text: string, isFinal: boolean, speakerId?: string): void;
}

// Function to get a display name for a speaker
function getSpeakerDisplayName(speakerId: string | undefined, speakerNames: Record<string, string> = {}): string | null {
  if (!speakerId) return null;
  
  // First check if we have a saved name for this speaker
  if (speakerNames[speakerId]) {
    return speakerNames[speakerId];
  }
  
  // If no saved name, use the default formatting
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

interface MeetingRecorderProps {
  meetingId?: string; // Optional meeting ID for existing meetings
  readOnly?: boolean; // Whether to show in read-only mode
  initialTranscriptions?: Array<{
    text: string;
    timestamp: number;
    speakerId?: string;
    speakerName?: string;
    isFinal?: boolean; // Optional, defaults to true for initial transcriptions
  }>;
  initialSpeakerNames?: Record<string, string>;
  initialSummary?: {
    summary: string;
    actionItems: string[];
    keyPoints: string[];
  };
}

export default function MeetingRecorder({ 
  meetingId, 
  readOnly = false,
  initialTranscriptions = [],
  initialSpeakerNames = {},
  initialSummary
}: MeetingRecorderProps) {
  const { data: session } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>(
    initialTranscriptions.map(t => ({
      ...t,
      isFinal: true // All initial transcriptions are final
    }))
  );
  const [meetingTitle, setMeetingTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const recognizerRef = useRef<sdk.ConversationTranscriber | null>(null);
  const audioConfigRef = useRef<sdk.AudioConfig | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const interimTranscriptionsRef = useRef<Map<string, Transcription>>(new Map());
  const [meetingSummary, setMeetingSummary] = useState<{
    summary: string;
    actionItems: string[];
    keyPoints: string[];
  } | null>(initialSummary || null);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>(initialSpeakerNames);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const editingRef = useRef<string | null>(null);
  const inputRefCallback = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus();
      node.select();
    }
  }, []);
  const [hasIdentifiedSpeakers, setHasIdentifiedSpeakers] = useState(false);

  // Memoize getDisplayName first
  const getDisplayName = useCallback((speakerId: string) => {
    if (!speakerId) return 'Unknown Speaker';
    return speakerNames[speakerId] || `Guest-${speakerId.split('-')[1] || '1'}`;
  }, [speakerNames]);

  // Function to detect and extract speaker names from text
  const detectSpeakerName = useCallback((text: string): string | null => {
    const lowerText = text.toLowerCase().trim();
    
    // Common patterns for name introduction
    const namePatterns = [
      // "Hi my name is Joe"
      /(?:hi|hello|hey|good morning|good afternoon|good evening)\s+(?:my\s+)?name\s+is\s+([a-zA-Z]+)/i,
      // "I'm John" or "I am John"
      /(?:i'?m|i\s+am)\s+([a-zA-Z]+)/i,
      // "This is Joe speaking"
      /this\s+is\s+([a-zA-Z]+)(?:\s+speaking)?/i,
      // "Joe here" or "It's Joe"
      /(?:it'?s\s+)?([a-zA-Z]+)\s+here/i,
      // "My name's Joe"
      /my\s+name'?s\s+([a-zA-Z]+)/i,
      // "Call me Joe"
      /call\s+me\s+([a-zA-Z]+)/i,
      // "You can call me Joe"
      /you\s+can\s+call\s+me\s+([a-zA-Z]+)/i,
      // "I go by Joe"
      /i\s+go\s+by\s+([a-zA-Z]+)/i,
      // "Everyone calls me Joe"
      /everyone\s+calls\s+me\s+([a-zA-Z]+)/i,
      // "My friends call me Joe"
      /my\s+friends\s+call\s+me\s+([a-zA-Z]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        const detectedName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        console.log('Detected speaker name:', {
          text: text,
          pattern: pattern.source,
          detectedName: detectedName
        });
        return detectedName;
      }
    }

    return null;
  }, []);

  // Initialize transcriptions with speaker names
  useEffect(() => {
    if (meetingId && initialTranscriptions.length > 0) {
      const processedTranscriptions = initialTranscriptions.map(t => ({
        ...t,
        speakerName: t.speakerId ? getDisplayName(t.speakerId) : undefined,
        isFinal: t.isFinal ?? true // Default to true for initial transcriptions
      }));
      setTranscriptions(processedTranscriptions);
    }
    if (Object.keys(initialSpeakerNames).length > 0) {
      setSpeakerNames(initialSpeakerNames);
    }
    if (initialSummary) {
      setMeetingSummary(initialSummary);
    }
  }, [meetingId, initialTranscriptions, initialTranscriptions.length, initialSpeakerNames, initialSummary, getDisplayName]);

  // Load existing meeting data if meetingId is provided and we don't have initial data
  useEffect(() => {
    if (meetingId && (!initialTranscriptions.length || !Object.keys(initialSpeakerNames).length)) {
      const loadMeeting = async () => {
        try {
          const response = await fetch(`/api/meetings/${meetingId}`);
          if (!response.ok) throw new Error('Failed to load meeting');
          
          const meeting = await response.json();
          console.log('Loaded meeting data:', {
            id: meeting._id,
            speakerNames: meeting.speakerNames,
            transcriptionsCount: meeting.transcriptions?.length || 0,
            sampleTranscription: meeting.transcriptions?.[0]
          });

          setMeetingTitle(meeting.title);
          // Only set transcriptions if we don't have initial ones
          if (!initialTranscriptions.length) {
            const processedTranscriptions = (meeting.transcriptions || []).map((t: { text: string; timestamp: number; speakerId?: string; speakerName?: string }) => {
              const speakerId = t.speakerId || '';
              const displayName = meeting.speakerNames?.[speakerId] || t.speakerName || getDisplayName(speakerId);
              console.log('Processing loaded transcription:', {
                speakerId,
                speakerName: t.speakerName,
                savedName: meeting.speakerNames?.[speakerId],
                displayName
              });
              return {
                ...t,
                isFinal: true, // All transcriptions in past meetings are final
                speakerName: displayName // Use the display name from speakerNames if available
              };
            });
            setTranscriptions(processedTranscriptions);
          }
          // Only set speaker names if we don't have initial ones
          if (!Object.keys(initialSpeakerNames).length && meeting.speakerNames) {
            console.log('Setting speaker names from loaded meeting:', meeting.speakerNames);
            setSpeakerNames(meeting.speakerNames);
          }
          // Only set summary if we don't have an initial one
          if (!initialSummary && meeting.summary) {
            setMeetingSummary(meeting.summary);
          }
        } catch (error) {
          console.error('Error loading meeting:', error);
          toast.error('Failed to load meeting data');
        }
      };
      loadMeeting();
    }
  }, [meetingId, initialTranscriptions.length, initialSpeakerNames, initialSummary, getDisplayName]);

  // Memoize saveMeeting
  const saveMeeting = useCallback(async (endTime?: Date) => {
    if (!session?.user?.id) return;
    
    setIsSaving(true);
    try {
      // Filter out any transcriptions that don't have text
      const validTranscriptions = transcriptions.filter(t => t.text && t.text.trim().length > 0);

      console.log('Saving meeting with filtered transcriptions:', {
        originalCount: transcriptions.length,
        validCount: validTranscriptions.length,
        removedCount: transcriptions.length - validTranscriptions.length
      });

      // Update speakerNames map with any names from transcriptions
      const updatedSpeakerNames = { ...speakerNames };
      validTranscriptions.forEach(t => {
        if (t.speakerId && t.speakerName) {
          updatedSpeakerNames[t.speakerId] = t.speakerName;
        }
      });

      const meetingData = {
        title: meetingTitle || 'Untitled Meeting',
        startTime: startTimeRef.current ? new Date(startTimeRef.current) : new Date(),
        endTime: endTime || new Date(),
        transcriptions: validTranscriptions.map(t => ({
          text: t.text.trim(),
          timestamp: t.timestamp,
          isFinal: t.isFinal,
          speakerId: t.speakerId || '',
          speakerName: updatedSpeakerNames[t.speakerId || ''] || getDisplayName(t.speakerId || '')
        })),
        speakerNames: updatedSpeakerNames,
        summary: meetingSummary,
      };

      // Always use PATCH if we have a meeting ID, otherwise POST
      const url = meetingId ? `/api/meetings/${meetingId}` : '/api/meetings';
      const method = meetingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to save meeting');
      }

      const savedMeeting = await response.json();

      // Update local state with the saved data
      if (savedMeeting.speakerNames) {
        setSpeakerNames(savedMeeting.speakerNames);
      }

      toast.success('Meeting saved successfully');
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error('Failed to save meeting');
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id, transcriptions, speakerNames, meetingTitle, meetingSummary, getDisplayName, meetingId]);

  // Optimize the auto-save effect
  useEffect(() => {
    let autoSaveInterval: NodeJS.Timeout | undefined;
    
    if (isRecording && transcriptions.length > 0) {
      // Only set up auto-save if we're recording and have transcriptions
      autoSaveInterval = setInterval(() => {
        if (!isSaving) { // Don't auto-save if we're already saving
          saveMeeting();
        }
      }, 60000); // Save every minute
    }

    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [isRecording, transcriptions.length, isSaving, saveMeeting]);

  const startRecording = async () => {
    if (!session?.user?.id) {
      toast.error('Please sign in to start recording');
      return;
    }

    try {
      // Reset speaker identification state
      setHasIdentifiedSpeakers(false);
      interimTranscriptionsRef.current.clear();
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio config from the stream
      const audioConfig = sdk.AudioConfig.fromStreamInput(stream);
      audioConfigRef.current = audioConfig;

      // Start transcription with the audio config
      const recognizer = await startTranscription(audioConfig);
      
      if (!recognizer) {
        throw new Error('Failed to start transcription');
      }

      // Set up event handlers
      if (recognizer) {
        const handleTranscription: TranscriptionCallback = (text, isFinal, speakerId) => {
          const timestamp = Date.now();
          
          // Get the display name for the speaker
          const displayName = getSpeakerDisplayName(speakerId, speakerNames);
          
          // If we get a valid speaker ID, mark as identified
          if (displayName && !hasIdentifiedSpeakers) {
            console.log('Speaker identified:', displayName);
            setHasIdentifiedSpeakers(true);
          }

          // Detect speaker name from the text if it's a final transcription
          let detectedName: string | null = null;
          if (isFinal && speakerId) {
            detectedName = detectSpeakerName(text);
            if (detectedName) {
              console.log('Auto-assigning speaker name:', {
                speakerId: speakerId,
                detectedName: detectedName,
                text: text
              });
              
              // Update speaker names immediately
              setSpeakerNames(prev => ({
                ...prev,
                [speakerId]: detectedName!
              }));

              // Show toast notification
              toast.success(`Automatically assigned speaker name: ${detectedName}`);
            }
          }

          // Create transcription with the display name (use detected name if available)
          const transcription: Transcription = {
            text,
            timestamp,
            isFinal,
            speakerId: speakerId, // Keep the original speaker ID
            speakerName: detectedName || getSpeakerDisplayName(speakerId, speakerNames) || speakerId,
          };

          if (isFinal) {
            // For final transcriptions, replace any interim transcription for this speaker
            setTranscriptions(prev => {
              const filtered = prev.filter(t => 
                // Keep all final transcriptions
                t.isFinal ||
                // Keep interim transcriptions from other speakers
                (t.speakerId !== transcription.speakerId)
              );
              return [...filtered, transcription];
            });
            interimTranscriptionsRef.current.delete(transcription.speakerId || '');
          } else {
            // For interim transcriptions, update if we have a valid speaker
            if (displayName || hasIdentifiedSpeakers) {
              interimTranscriptionsRef.current.set(transcription.speakerId || '', transcription);
              setTranscriptions(prev => {
                const filtered = prev.filter(t => 
                  // Keep all final transcriptions
                  t.isFinal ||
                  // Keep interim transcriptions from other speakers
                  (t.speakerId !== transcription.speakerId)
                );
                return [...filtered, transcription];
              });
            }
          }
        };

        recognizer.transcribed = (s, e) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            const speakerId = e.result.speakerId || undefined;
            handleTranscription(e.result.text, true, speakerId);
          }
        };

        recognizer.transcribing = (s, e) => {
          const speakerId = e.result.speakerId || undefined;
          handleTranscription(e.result.text, false, speakerId);
        };
      }

      recognizerRef.current = recognizer;
      startTimeRef.current = Date.now();
      setIsRecording(true);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recognizerRef.current) return;

    try {
      await stopTranscription(recognizerRef.current);
      recognizerRef.current = null;
      audioConfigRef.current = null;
      setIsRecording(false);

      // Don't save here - let user save manually or use auto-save
      toast.success('Recording stopped');
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };

  // When recording stops, initialize speakerNames mapping
  useEffect(() => {
    if (!isRecording && transcriptions.length > 0) {
      const uniqueSpeakers = Array.from(new Set(transcriptions.map(t => t.speakerId).filter(Boolean)));
      
      // Only update if we have new speakers that aren't already in speakerNames
      const hasNewSpeakers = uniqueSpeakers.some(id => id && !speakerNames[id]);
      
      if (hasNewSpeakers) {
        setSpeakerNames(prev => {
          const updated = { ...prev };
          uniqueSpeakers.forEach(id => {
            if (id && !updated[id]) {
              // If we have a speakerName in the transcription, use that
              const transcription = transcriptions.find(t => t.speakerId === id);
              if (transcription?.speakerName) {
                updated[id] = transcription.speakerName;
              } else {
                updated[id] = getDisplayName(id);
              }
            }
          });
          return updated;
        });
      }
    }
  }, [isRecording, transcriptions, speakerNames, getDisplayName]);

  // Inline edit handlers
  const startEditing = (speakerId: string, e: React.MouseEvent, uniqueId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRecording) {
      toast.error('Cannot edit speaker names while recording');
      return;
    }

    console.log('Starting edit for speaker:', speakerId);
    const currentSpeakerId = speakerId.trim();
    
    editingRef.current = currentSpeakerId;
    setEditingSpeaker(uniqueId);
    setEditingValue(speakerNames[currentSpeakerId] || getDisplayName(currentSpeakerId));
  };

  const saveEdit = async () => {
    if (!editingRef.current) return;

    const currentSpeakerId = editingRef.current;
    const newName = editingValue.trim();
    
    if (!newName) {
      cancelEdit();
      return;
    }

    console.log('Saving speaker name edit locally:', {
      speakerId: currentSpeakerId,
      newName,
      currentSpeakerNames: speakerNames,
      meetingId: meetingId || 'new-meeting'
    });

    try {
      // Update local state only - no API call
      const updatedSpeakerNames = { ...speakerNames, [currentSpeakerId]: newName };
      setSpeakerNames(updatedSpeakerNames);

      // Update transcriptions to use the new name
      setTranscriptions(prev => prev.map(t => {
        if (t.speakerId === currentSpeakerId) {
          return {
            ...t,
            speakerName: newName
          };
        }
        return t;
      }));

      // Clear edit state
      editingRef.current = null;
      setEditingSpeaker(null);
      setEditingValue('');

      toast.success('Speaker name updated (will be saved when you click Save)');
    } catch (error) {
      console.error('Error updating speaker name locally:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error('Failed to update speaker name');
    }
  };

  const cancelEdit = () => {
    if (editingRef.current) {
      // Revert any changes to speaker names
      const speakerId = editingRef.current;
      setSpeakerNames(prev => {
        const updated = { ...prev };
        delete updated[speakerId];
        return updated;
      });
    }
    editingRef.current = null;
    setEditingSpeaker(null);
    setEditingValue('');
  };

  // Add a function to format transcriptions into a single string
  const getFormattedTranscript = () => {
    return transcriptions
      .filter(t => t.isFinal && t.speakerId && t.speakerId !== 'Speaker Unknown')
      .map(t => {
        const speakerId = t.speakerId || '';
        const displayName = getDisplayName(speakerId);
        return `${displayName}: ${t.text}`;
      })
      .join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="Meeting Title"
            className="w-full px-4 py-2 text-xl font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
            disabled={isRecording || readOnly}
          />
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`btn ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={isSaving}
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
            {!isRecording && transcriptions.length > 0 && (
              <button
                onClick={() => saveMeeting()}
                disabled={isSaving}
                className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            )}
          </div>
        )}
      </div>

      {/* Show transcriptions if we have any */}
      {transcriptions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 h-[400px] overflow-y-auto">
          {transcriptions.map((transcription, index) => {
            const speakerId = transcription.speakerId || '';
            const displayName = getDisplayName(speakerId);
            const uniqueId = `${speakerId}-${index}`; // Create unique ID for each transcription entry
            return (
              <div
                key={`${transcription.timestamp}-${index}`}
                className={`mb-2 p-2 rounded ${
                  transcription.isFinal ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1">
                    {editingSpeaker === uniqueId ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={inputRefCallback}
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="text-xs px-2 py-1 rounded bg-white border border-gray-300 focus:border-blue-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={saveEdit}
                          className="p-1 text-green-600 hover:text-green-900 focus:outline-none"
                          title="Save"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-red-600 hover:text-red-900 focus:outline-none"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200 text-gray-900">
                          {displayName}
                        </span>
                        {!readOnly && (
                          <button
                            onClick={(e) => startEditing(speakerId, e, uniqueId)}
                            className="p-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit speaker name"
                            disabled={isRecording}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      transcription.isFinal ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {transcription.text}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(transcription.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show AI features if we have a summary or transcriptions */}
      {(meetingSummary || transcriptions.length > 0) && (
        <div className="mt-8">
          <MeetingSummary 
            transcript={getFormattedTranscript()} 
            initialSummary={meetingSummary || undefined}
            onSummaryGenerated={(summary) => {
              setMeetingSummary(summary);
              // Auto-save the meeting when a summary is generated
              saveMeeting();
            }}
          />
        </div>
      )}

      {/* Show a message if no transcriptions and no summary */}
      {transcriptions.length === 0 && !meetingSummary && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {readOnly ? (
            "No transcriptions or summary available for this meeting."
          ) : isRecording && !hasIdentifiedSpeakers ? (
            "Waiting for speaker identification..."
          ) : (
            "Start recording to capture meeting transcriptions."
          )}
        </div>
      )}
    </div>
  );
}