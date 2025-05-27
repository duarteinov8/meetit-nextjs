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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { transcript, question } = await request.json();
    
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: 'Invalid transcript format' },
        { status: 400 }
      );
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Format transcript for analysis
    const formattedTranscript = transcript
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n');

    // Construct the prompt
    const prompt = `Based on the following meeting transcript, please answer the question. Provide a clear, concise, and accurate response that directly addresses the question using only information from the transcript.

    Meeting Transcript:
    ${formattedTranscript}

    Question: ${question}

    Answer:`;

    // Call OpenAI API with retry logic
    const response = await retryOperation(async () => {
      const completion = await openai.chat.completions.create({
        model: DEPLOYMENT_NAME,
        messages: [
          {
            role: 'system',
            content: 'You are a meeting analysis assistant. Answer questions about the meeting transcript accurately and concisely, using only information from the transcript.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more focused answers
        max_tokens: 500,
      });

      return completion;
    });

    // Extract and validate the response
    const answer = response.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('Invalid response from OpenAI');
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process query',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 