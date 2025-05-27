'use client';

import { getSession } from '@/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">User Profile</h1>
      <div className="flex items-center space-x-4 mb-6">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt="Profile"
            width={64}
            height={64}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-400 text-3xl font-bold">
            {session.user.name?.[0]}
          </div>
        )}
        <div>
          <div className="text-lg font-semibold text-gray-900">{session.user.name}</div>
          <div className="text-gray-500">{session.user.email}</div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-sm">
            Profile customization features are coming soon! You'll be able to update your profile picture and name in a future update.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          <p>Name: {session.user.name}</p>
          <p>Email: {session.user.email}</p>
        </div>
      </div>
    </div>
  );
} 