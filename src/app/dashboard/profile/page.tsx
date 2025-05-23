import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">User Profile</h1>
      <div className="flex items-center space-x-4 mb-6">
        {session.user.image ? (
          <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
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
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            defaultValue={session.user.name || ''}
            className="input input-bordered w-full mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            className="file-input file-input-bordered w-full mt-1"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">Update Profile</button>
      </form>
    </div>
  );
} 