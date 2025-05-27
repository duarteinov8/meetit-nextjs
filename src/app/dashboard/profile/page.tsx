import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-config';
import UsageBar from '@/components/dashboard/UsageBar';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Profile</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">Name</label>
            <p className="mt-1 text-lg text-gray-900">{session.user.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900">Email</label>
            <p className="mt-1 text-lg text-gray-900">{session.user.email}</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <UsageBar />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 