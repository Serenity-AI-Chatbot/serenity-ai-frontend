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
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-black text-gray-900 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
          }`}
        >
          <PenSquare className="w-5 h-5" />
          Write Entry
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            view === 'history'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-black text-gray-900 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
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