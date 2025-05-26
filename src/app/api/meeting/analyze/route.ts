import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/auth';

// Configure Azure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT?.replace('/chat/completions?api-version=2023-12-01-preview', ''),
  defaultQuery: { 'api-version': '2023-12-01-preview' },
  defaultHeaders: {
    'api-key': process.env.OPENAI_API_KEY,
  },
});

const DEPLOYMENT_NAME = 'gpt-4';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface MeetingAnalysis {
  summary: string;
  actionItems: string[];
  keyPoints: string[];
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Helper function to retry operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { transcript } = await request.json();
    
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: 'Invalid transcript format' },
        { status: 400 }
      );
    }

    // Format transcript for analysis
    const formattedTranscript = transcript
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n');

    // Construct the prompt
    const prompt = `Analyze the following meeting transcript and provide a structured response with a summary, action items, and key points. Format the response as a JSON object with the following structure:
    {
      "summary": "A concise summary of the meeting",
      "actionItems": ["List of specific action items identified"],
      "keyPoints": ["List of key points discussed"]
    }

    Meeting Transcript:
    ${formattedTranscript}`;

    // Call OpenAI API with retry logic
    const response = await retryOperation(async () => {
      const completion = await openai.chat.completions.create({
        model: DEPLOYMENT_NAME,
        messages: [
          {
            role: 'system',
            content: 'You are a meeting analysis assistant. Provide clear, concise, and actionable insights from meeting transcripts.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion;
    });

    // Parse and validate the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid response from OpenAI');
    }

    let analysis: MeetingAnalysis;
    try {
      analysis = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate the analysis structure
    if (!analysis.summary || !Array.isArray(analysis.actionItems) || !Array.isArray(analysis.keyPoints)) {
      throw new Error('Invalid analysis structure');
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing meeting:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze meeting',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 