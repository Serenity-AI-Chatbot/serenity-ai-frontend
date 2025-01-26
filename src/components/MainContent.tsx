'use client';

import { useState } from 'react';
import { JournalEntry } from './JournalEntry';
import { JournalHistory } from './JournalHistory';
import { JournalDetail } from './JournalDetail';
import { BookOpen, PenSquare } from 'lucide-react';

type View = 'write' | 'history' | 'detail';

export function MainContent() {
  const [view, setView] = useState<View>('write');
  const [selectedJournal, setSelectedJournal] = useState<any>(null);

  const handleJournalSelect = (journal: any) => {
    setSelectedJournal(journal);
    setView('detail');
  };

  const handleBack = () => {
    setView('history');
    setSelectedJournal(null);
  };

  return (
    <>
      {view !== 'detail' && (
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
      )}

      {view === 'write' && <JournalEntry />}
      {view === 'history' && <JournalHistory onJournalSelect={handleJournalSelect} />}
      {view === 'detail' && selectedJournal && (
        <JournalDetail journal={selectedJournal} onBack={handleBack} />
      )}
    </>
  );
}