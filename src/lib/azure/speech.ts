import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

let speechConfig: sdk.SpeechConfig | null = null;

function getSpeechConfig() {
  if (typeof window === 'undefined') {
    // We're on the server, return null
    return null;
  }

  if (!speechConfig) {
    const key = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
    const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

    if (!key || !region) {
      console.error('Azure Speech credentials are not configured');
      return null;
    }

    speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    
    // Set the speech recognition language
    speechConfig.speechRecognitionLanguage = 'en-US';
    
    // Enable conversation transcription
    speechConfig.setProperty(
      'SpeechServiceConnection_EnableConversationTranscription',
      'true'
    );

    // Enable speaker diarization
    speechConfig.setProperty(
      'SpeechServiceConnection_EnableDiarization',
      'true'
    );

    // Set the number of speakers
    speechConfig.setProperty(
      'SpeechServiceConnection_NumberOfSpeakers',
      '2'
    );

    // Enable detailed results
    speechConfig.setProperty(
      'SpeechServiceResponse_RequestDetailedResultJsonForLongRunningAudio',
      'true'
    );

    // Set the conversation transcription language
    speechConfig.setProperty(
      'SpeechServiceConnection_ConversationTranscriptionLanguage',
      'en-US'
    );

    // Set the endpoint for conversation transcription
    const endpointString = `wss://${region}.stt.speech.microsoft.com/speech/universal/v2`;
    speechConfig.setProperty(
      sdk.PropertyId.SpeechServiceConnection_Endpoint,
      endpointString
    );

    // Enable audio logging for debugging
    speechConfig.enableAudioLogging();
  }

  return speechConfig;
}

async function createConversationTranscriber(
  config: sdk.SpeechConfig,
  audioConfig: sdk.AudioConfig
): Promise<sdk.ConversationTranscriber> {
  if (!(config instanceof sdk.SpeechConfig)) {
    throw new Error('Invalid speech config provided');
  }

  const transcriber = new sdk.ConversationTranscriber(config, audioConfig);
  
  // Configure recognition settings
  transcriber.transcribed = (_s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
      // Get the detailed JSON result
      const jsonResult = e.result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult
      );
      
      // Log the full JSON result for debugging
      console.log('Full JSON Result:', jsonResult);
      
      try {
        const result = JSON.parse(jsonResult);
        // Log the complete parsed result structure
        console.log('Complete Result Structure:', JSON.stringify(result, null, 2));
        
        // Log speaker information
        console.log('Speaker Information:', {
          speakerId: e.result.speakerId,
          text: e.result.text,
          offset: e.result.offset,
          duration: e.result.duration
        });
      } catch (error) {
        console.error('Error parsing JSON result:', error);
      }
    }
  };

  transcriber.transcribing = (_s, e) => {
    // Log interim results
    console.log('Interim Result:', {
      speakerId: e.result.speakerId,
      text: e.result.text,
      offset: e.result.offset,
      duration: e.result.duration
    });
  };

  transcriber.canceled = (_s, e: sdk.ConversationTranscriptionCanceledEventArgs) => {
    console.log(`CANCELED: Reason=${e.reason}`);
    if (e.reason === sdk.CancellationReason.Error) {
      console.log(`CANCELED: ErrorCode=${e.errorCode}`);
      console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
    }
  };

  transcriber.sessionStopped = () => {
    console.log('Session stopped');
    transcriber.stopTranscribingAsync();
  };

  return transcriber;
}

export async function createSpeechRecognizer(audioConfig: sdk.AudioConfig) {
  const config = getSpeechConfig();
  if (!config) {
    throw new Error('Azure Speech Services is not configured');
  }

  if (!(config instanceof sdk.SpeechConfig)) {
    throw new Error('Invalid speech config type');
  }

  return createConversationTranscriber(config, audioConfig);
}

export async function startTranscription(audioConfig: sdk.AudioConfig): Promise<sdk.ConversationTranscriber> {
  const config = getSpeechConfig();
  if (!config) {
    throw new Error('Azure Speech Services is not configured');
  }

  // Set speech recognition language
  config.speechRecognitionLanguage = 'en-US';

  // Enable real-time diarization for interim results
  config.setProperty(
    sdk.PropertyId.SpeechServiceResponse_DiarizeIntermediateResults,
    'true'
  );

  // Enable detailed results for better speaker identification
  config.setProperty(
    sdk.PropertyId.SpeechServiceResponse_RequestDetailedResultTrueFalse,
    'true'
  );

  // Create conversation transcriber
  const transcriber = new sdk.ConversationTranscriber(config, audioConfig);

  // Add detailed logging for debugging
  transcriber.transcribed = (_s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
      console.log('Transcribed (Final):', {
        text: e.result.text,
        speakerId: e.result.speakerId,
        json: e.result.json
      });
    }
  };

  transcriber.transcribing = (_s, e) => {
    console.log('Transcribing (Interim):', {
      text: e.result.text,
      speakerId: e.result.speakerId,
      json: e.result.json
    });
  };

  // Start transcription
  await transcriber.startTranscribingAsync();
  return transcriber;
}

export async function stopTranscription(transcriber: sdk.ConversationTranscriber) {
  await transcriber.stopTranscribingAsync();
  transcriber.close();
} 