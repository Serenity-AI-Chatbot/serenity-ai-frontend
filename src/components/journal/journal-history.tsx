'use client';

import { Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Journal {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  summary: string | null;
  mood_tags: string[];
  keywords: string[];
  latest_articles: Record<string, any>;
  nearby_places: Record<string, any>;
  sentences: string[];
  created_at: string;
  tags: string[];
  is_processing?: boolean;
}

export function JournalHistory() {
  const router = useRouter();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchJournals() {
    try {
      const response = await fetch('/api/journal');
      const data = await response.json();
      setJournals(data);
    } catch (error) {
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchJournals();
  }, []);

  const handleJournalClick = (id: string) => {
    router.push(`/journal/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-black rounded-lg shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-emerald-500/20 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-emerald-500/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-black rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-emerald-500">Previous Entries</h2>
      </div>

      <div className="space-y-4">
        {journals.map((journal) => (
          <button
            key={journal.id}
            onClick={() => handleJournalClick(journal.id)}
            className="w-full p-4 bg-white dark:bg-black border border-gray-200 dark:border-emerald-500/20 rounded-lg hover:border-emerald-500 transition-colors text-left group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{journal.mood_tags?.[0] || '😊'}</span>
                <span className="text-sm text-gray-600 dark:text-emerald-500/70">
                  {new Date(journal.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                {journal.is_processing && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {journal.mood_tags?.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-1">
              {journal.title && (
                <h3 className="font-medium text-gray-900 dark:text-emerald-500">{journal.title}</h3>
              )}
              <p className="text-gray-700 dark:text-emerald-500/70 line-clamp-2">
                {journal.summary || journal.content}
              </p>
              {journal.keywords?.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {journal.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="text-xs text-gray-500 dark:text-emerald-500/50"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}