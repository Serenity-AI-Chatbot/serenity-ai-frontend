'use client';

import { useState } from 'react';
import { Pencil, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"


const moods = ['😊 Happy', '😐 Neutral', '😢 Sad', '😰 Anxious', '😡 Angry'];

export function JournalEntry() {
  const { toast } = useToast();
  const [entry, setEntry] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.trim() || !selectedMood) {
      toast({
        title: 'Error',
        description: 'Please fill in both the journal entry and mood',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Success',
        description: 'Journal entry saved successfully!',
        variant: 'default',
      });
      setEntry('');
      setSelectedMood('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save journal entry',
        variant: 'destructive',
      });
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Pencil className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-semibold text-gray-800">Daily Journal</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How are you feeling today?
          </label>
          <div className="flex flex-wrap gap-3">
            {moods.map((mood) => (
              <button
                key={mood}
                type="button"
                onClick={() => setSelectedMood(mood)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${
                    selectedMood === mood
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="entry"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Write your thoughts...
          </label>
          <textarea
            id="entry"
            rows={6}
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="What's on your mind today?"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? 'Saving...' : 'Save Entry'}
        </button>
      </form>
    </div>
  );
}