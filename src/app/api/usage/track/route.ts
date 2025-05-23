import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Usage } from '@/lib/models/Usage';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { service, duration, userId } = body;

    // Verify the user is tracking their own usage
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create usage record
    const usage = await Usage.create({
      userId,
      service,
      duration,
    });

    return NextResponse.json({ success: true, usage });
  } catch (error) {
    console.error('Error tracking usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 