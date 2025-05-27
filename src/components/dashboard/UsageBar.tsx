'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface UsageData {
  timeUsed: number;
  timeLimit: number;
  remainingTime: number;
  percentageUsed: number;
}

export default function UsageBar() {
  const { data: session } = useSession();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const response = await fetch('/api/users/recording-time');
        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }
        const data = await response.json();
        setUsageData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage data');
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchUsageData();
    }
  }, [session]);

  if (isLoading) {
    return <div className="animate-pulse h-4 bg-gray-200 rounded w-full"></div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  if (!usageData) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-900">
        <span>Recording Time Used</span>
        <span className="font-medium">
          {formatTime(usageData.timeUsed)} / {formatTime(usageData.timeLimit)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${
            usageData.percentageUsed >= 90
              ? 'bg-red-500'
              : usageData.percentageUsed >= 75
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${usageData.percentageUsed}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-900">
        {usageData.remainingTime > 0
          ? `${formatTime(usageData.remainingTime)} remaining`
          : 'Recording time limit reached'}
      </p>
    </div>
  );
} 