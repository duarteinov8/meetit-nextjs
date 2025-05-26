import { getSession } from '@/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserCircle, Calendar, Users, Settings, Video } from 'lucide-react';
import SignOutButton from './SignOutButton';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Left Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            MeetIt
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/dashboard/meeting"
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
          >
            <Video className="w-5 h-5 mr-3" />
            Meeting Room
          </Link>
          <Link
            href="/dashboard/past-meetings"
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
          >
            <Calendar className="w-5 h-5 mr-3" />
            Past Meetings
          </Link>
          <Link
            href="/dashboard/teams"
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
          >
            <Users className="w-5 h-5 mr-3" />
            Teams
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Link>
        </nav>

        {/* User Profile Area */}
        <div className="p-4 border-t border-gray-200">
          <Link href="/dashboard/profile" className="block">
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
              <div className="flex-shrink-0">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <UserCircle className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          </Link>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
} 