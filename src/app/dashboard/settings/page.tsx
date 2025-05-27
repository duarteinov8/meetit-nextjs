import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - MeetIt',
  description: 'Manage your account settings',
};

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">
          Settings features are coming soon.
        </p>
      </div>
    </div>
  );
} 