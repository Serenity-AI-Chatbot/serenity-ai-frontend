'use client';

import { Calendar, ChevronRight } from 'lucide-react';

// Dummy data for previous journal entries
const dummyJournals = [
  {
    id: 1,
    date: '2024-01-26',
    mood: '😊 Happy',
    entry: 'Had a great day! Went for a walk at the beach and collected some sea shells. The scenery was beautiful and I enjoyed listening to the sounds of nature around me.',
  },
  {
    id: 2,
    date: '2024-01-25',
    mood: '😐 Neutral',
    entry: 'Regular work day. Nothing special happened, but that\'s okay too.',
  },
  {
    id: 3,
    date: '2024-01-24',
    mood: '😢 Sad',
    entry: 'Feeling a bit down today. Missing family and friends back home.',
  },
  {
    id: 4,
    date: '2024-01-23',
    mood: '😊 Happy',
    entry: 'Achieved a major milestone at work! Celebrated with the team.',
  },
];

interface JournalHistoryProps {
  onJournalSelect: (journal: any) => void;
}

export function JournalHistory({ onJournalSelect }: JournalHistoryProps) {
  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-semibold text-gray-800">Previous Entries</h2>
      </div>

      <div className="space-y-4">
        {dummyJournals.map((journal) => (
          <button
            key={journal.id}
            onClick={() => onJournalSelect(journal)}
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