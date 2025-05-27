import { getSession } from '@/auth';
import { redirect } from 'next/navigation';
import MeetingRecorder from '@/components/meeting/MeetingRecorder';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

export default async function MeetingPage() {
  try {
    console.log('Attempting to load meeting page...');
    const session = await getSession();
    console.log('Session:', session ? 'Found' : 'Not found');
    
    if (!session) {
      console.log('No session found, redirecting to login...');
      redirect('/login');
    }

    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Meeting Room</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <MeetingRecorder />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in meeting page:', error);
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Meeting Room</h2>
          <p className="text-red-600 mt-2">
            There was an error loading the meeting room. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
} 