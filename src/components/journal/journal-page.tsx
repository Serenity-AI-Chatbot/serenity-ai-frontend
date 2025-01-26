'use client';

import { useState } from 'react';
import { JournalEntry } from './journal-entry';
import { JournalHistory } from './journal-history';
import { BookOpen, PenSquare } from 'lucide-react';

type View = 'write' | 'history';

export function MainContent() {
  const [view, setView] = useState<View>('write');

  return (
    <>
      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={() => setView('write')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            view === 'write'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <PenSquare className="w-5 h-5" />
          Write Entry
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            view === 'history'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          View History
        </button>
      </div>

      {view === 'write' && <JournalEntry />}
      {view === 'history' && <JournalHistory />}
    </>
  );
}