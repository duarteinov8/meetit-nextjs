import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teams - MeetIt',
  description: 'Manage your teams',
};

export default function TeamsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Teams</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">
          Team management features are coming soon.
        </p>
      </div>
    </div>
  );
} 