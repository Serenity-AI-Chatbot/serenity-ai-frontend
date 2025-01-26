'use client';

import { ArrowLeft, Calendar, MapPin, Sparkles, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface JournalDetailProps {
  journal: {
    id: number;
    date: string;
    mood: string;
    entry: string;
  };
}

// Function to analyze journal content and return relevant suggestions
const getJournalSuggestions = (entry: string) => {
  const keywords = entry.toLowerCase();
  
  if (keywords.includes('beach') || keywords.includes('sea') || keywords.includes('ocean')) {
    return {
      photos: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1484821582734-6c6c9f99a672?w=800&auto=format&fit=crop',
      ],
      places: [
        { name: 'Sunset Beach Park', rating: 4.8, distance: '2.3 miles' },
        { name: 'Ocean View Trail', rating: 4.6, distance: '3.1 miles' },
        { name: 'Coastal Meditation Center', rating: 4.9, distance: '1.8 miles' },
      ],
      activities: [
        'Beach meditation at sunrise',
        'Collect and paint seashells',
        'Try beach yoga',
        'Practice nature photography',
      ],
    };
  }

  // Default suggestions for other moods/content
  return {
    photos: [
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1476611317561-60117649dd94?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop',
    ],
    places: [
      { name: 'Mindfulness Garden', rating: 4.7, distance: '1.5 miles' },
      { name: 'Community Park', rating: 4.5, distance: '0.8 miles' },
      { name: 'Local Art Gallery', rating: 4.4, distance: '2.0 miles' },
    ],
    activities: [
      'Practice mindful walking',
      'Start a gratitude journal',
      'Join a local community group',
      'Try a new hobby',
    ],
  };
};

export function JournalDetail({ journal }: JournalDetailProps) {
  const router = useRouter();
  const suggestions = getJournalSuggestions(journal.entry);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Journal List
        </button>
      </div>

      {/* Main journal content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span className="text-lg font-medium text-gray-900">
              {new Date(journal.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-2">
            {journal.mood}
          </span>
        </div>
        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
          {journal.entry}
        </p>
      </div>

      {/* Suggested photos */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Related Imagery</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.photos.map((photo, index) => (
            <div 
              key={index} 
              className="relative h-48 rounded-lg overflow-hidden"
            >
              <Image
                src={photo}
                alt={`Suggestion ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover hover:opacity-90 transition-opacity"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Suggested places */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Recommended Places</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.places.map((place, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
            >
              <h3 className="font-medium text-gray-900">{place.name}</h3>
              <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                <span>⭐ {place.rating}</span>
                <span>{place.distance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested activities */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Suggested Activities</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.activities.map((activity, index) => (
            <div
              key={index}
              className="p-4 bg-indigo-50 rounded-lg flex items-center gap-3"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 rounded-full text-indigo-600">
                {index + 1}
              </span>
              <span className="text-gray-800">{activity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}