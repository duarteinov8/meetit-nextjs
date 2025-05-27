import Link from 'next/link';
import { Mic, Users, Clock, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            MeetIt - AI-Powered Meeting Assistant
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Transform your meetings with real-time transcription, speaker identification, and AI-powered summaries.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <Mic className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Transcription</h3>
            <p className="text-gray-600">
              Capture every word with accurate, real-time transcription powered by Azure Speech Services.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <Users className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Speaker Identification</h3>
            <p className="text-gray-600">
              Automatically identify and label different speakers in your meetings.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <Clock className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI Summaries</h3>
            <p className="text-gray-600">
              Get instant summaries, action items, and key points from your meetings.
            </p>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-full">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Currently in Beta - Limited to 3 hours of recording time per user</span>
          </div>
        </div>
      </div>
    </div>
  );
}
