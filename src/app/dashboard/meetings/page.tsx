'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Clock, Users, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  participants?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function MeetingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the fetchMeetings function
  const fetchMeetings = useCallback(async (page: number = 1, searchQuery: string = search) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/meetings?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch meetings');

      const data = await response.json();
      setMeetings(data.meetings);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, pagination.limit, search]);

  // Create a debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      fetchMeetings(1, query);
    }, 300),
    [fetchMeetings]
  );

  // Update search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    debouncedSearch(newSearch);
  };

  // Initial load effect
  useEffect(() => {
    if (session?.user?.id) {
      fetchMeetings();
    }
  }, [session?.user?.id, fetchMeetings]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <button
          onClick={() => router.push('/dashboard/meeting/new')}
          className="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          New Meeting
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No meetings found. Start by creating a new meeting!
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {meetings.map((meeting) => (
              <div
                key={meeting._id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/meeting/${meeting._id}`)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {meeting.title}
                    </h3>
                    {meeting.description && (
                      <p className="text-gray-600 mb-4">{meeting.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(meeting.startTime), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(meeting.startTime), 'h:mm a')}
                        {meeting.endTime &&
                          ` - ${format(new Date(meeting.endTime), 'h:mm a')}`}
                      </div>
                      {meeting.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(meeting.duration)}
                        </div>
                      )}
                      {meeting.participants && meeting.participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {meeting.participants.length} participants
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {meeting.tags && meeting.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {meeting.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => fetchMeetings(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => fetchMeetings(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 