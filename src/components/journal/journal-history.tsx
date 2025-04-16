'use client';

import { Calendar, ChevronRight, Loader2, Clock, Tag, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      setLoading(true);
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
  
  // Get emoji for mood tag
  const getMoodEmoji = (mood: string) => {
    if (!mood) return '✨';
    
    const lowerMood = mood.toLowerCase();
    if (lowerMood.includes('happy') || lowerMood.includes('joy')) return '😊';
    if (lowerMood.includes('sad') || lowerMood.includes('down')) return '😔';
    if (lowerMood.includes('anxious') || lowerMood.includes('stress')) return '😰';
    if (lowerMood.includes('calm') || lowerMood.includes('relax')) return '😌';
    if (lowerMood.includes('angry')) return '😠';
    if (lowerMood.includes('surprise')) return '😲';
    if (lowerMood.includes('love')) return '❤️';
    
    return '✨';
  };

  // Format date in a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show "Today"
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If this week, show the day name
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    if (date > weekAgo) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit' 
      });
    }
    
    // Otherwise show the full date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-8 bg-white dark:bg-black rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-900/30">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-emerald-800 dark:text-emerald-400">Journal History</h2>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 mb-4">
            <svg className="w-full h-full text-emerald-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300">Loading your journal entries...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto mt-8 p-8 bg-white dark:bg-black rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-900/30"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-emerald-800 dark:text-emerald-400">Journal History</h2>
        </div>
        
        <Button 
          onClick={fetchJournals} 
          variant="outline" 
          size="sm"
          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
        >
          Refresh
        </Button>
      </div>

      {journals.length === 0 ? (
        <div className="text-center py-16 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
          <Calendar className="w-16 h-16 text-emerald-400 dark:text-emerald-600 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-emerald-700 dark:text-emerald-400 mb-2">No journal entries yet</h3>
          <p className="text-gray-700 dark:text-gray-300 max-w-md mx-auto mb-6">
            Start documenting your thoughts and experiences by creating your first journal entry
          </p>
          <Button 
            onClick={() => router.push('/journal/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Create First Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {journals.map((journal, index) => (
            <motion.div
              key={journal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
            >
              <Card
                onClick={() => handleJournalClick(journal.id)}
                className="w-full p-4 bg-white dark:bg-black border border-emerald-100 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-lg transition-all hover:shadow-md cursor-pointer overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xl select-none group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/30 transition-colors">
                      {getMoodEmoji(journal.mood_tags?.[0] || '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(journal.created_at)}
                        </span>
                      </div>
                      
                      {journal.is_processing && (
                        <Badge variant="outline" className="text-xs text-blue-500">
                          <Clock className="w-3 h-3 animate-spin text-blue-500" />
                          <span>Processing</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {journal.mood_tags?.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:text-emerald-600 dark:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors transform group-hover:translate-x-1 duration-300" />
                  </div>
                </div>
                
                <div className="pl-12 space-y-1">
                  {journal.title && (
                    <h3 className="font-medium text-emerald-800 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                      {journal.title}
                    </h3>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-2 text-sm group-hover:text-gray-800 transition-colors">
                    {journal.summary || journal.content}
                  </p>
                  {journal.keywords?.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {journal.keywords.slice(0, 3).map((keyword, index) => (
                        <span
                          key={index}
                          className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
                        >
                          <Tag className="h-3 w-3 text-emerald-500" />
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      
      {journals.length > 0 && (
        <div className="mt-8 text-center">
          <Button 
            onClick={() => router.push('/journal/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Calendar className="w-4 h-4 mr-2" />
            New Journal Entry
          </Button>
        </div>
      )}
    </motion.div>
  );
}