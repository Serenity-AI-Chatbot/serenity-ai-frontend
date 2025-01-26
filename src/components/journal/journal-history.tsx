'use client';

import { Calendar, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Journal {
  id: number;
  date: string;
  mood: string;
  entry: string;
}

export function JournalHistory() {
  const router = useRouter();
  const [journals, setJournals] = useState<Journal[]>([]);

  useEffect(() => {
    async function fetchJournals() {
      const response = await fetch('/api/journal');
      const data = await response.json();
      setJournals(data);
    }
    fetchJournals();
  }, []);

  const handleJournalClick = (id: number) => {
    router.push(`/journal/${id}`);
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-semibold text-gray-800">Previous Entries</h2>
      </div>

      <div className="space-y-4">
        {journals.map((journal) => (
          <button
            key={journal.id}
            onClick={() => handleJournalClick(journal.id)}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors text-left group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{journal.mood.split(' ')[0]}</span>
                <span className="text-sm text-gray-600">
                  {new Date(journal.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                  {journal.mood.split(' ')[1]}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </div>
            <p className="text-gray-700 line-clamp-2">{journal.entry}</p>
          </button>
        ))}
      </div>
    </div>
  );
}