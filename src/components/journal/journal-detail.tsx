"use client";

import {
  ArrowLeft,
  Calendar,
  MapPin,
  ImageIcon,
  Newspaper,
  Music,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface JournalDetailProps {
  journal: {
    id: string;
    date: string;
    mood: string;
    entry: string;
    title?: string;
    summary?: string;
    keywords: string[];
    song: string;
    nearbyPlaces: {
      places: Array<{
        name: string;
        rating: number;
        address: string;
        user_ratings_total: number;
      }>;
    };
    latestArticles: {
      articles: Array<{
        link: string;
        title: string;
        snippet: string;
      }>;
    };
  };
}

const getJournalSuggestions = (journal: JournalDetailProps["journal"]) => {
  const defaultPhotos = [
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476611317561-60117649dd94?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop",
  ];

  return {
    photos: defaultPhotos,
    places: journal.nearbyPlaces.places,
    keywords: journal.keywords || [],
    articles: journal.latestArticles.articles,
  };
};

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string) => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export function JournalDetail({ journal }: JournalDetailProps) {
  const router = useRouter();
  const suggestions = getJournalSuggestions(journal);
  console.log(journal);
  const videoId = getYouTubeVideoId(journal.song);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-500 hover:text-emerald-600"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Journal List
        </button>
      </div>

      {/* Main journal content */}
      <div className="bg-white dark:bg-black rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <span className="text-lg font-medium text-gray-900 dark:text-emerald-500">
              {new Date(journal.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <span className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500 rounded-full flex items-center gap-2">
            {journal.mood}
          </span>
        </div>

        {journal.title && (
          <h1 className="text-2xl font-bold text-gray-900 dark:text-emerald-500 mb-4">
            {journal.title}
          </h1>
        )}

        {journal.summary && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <p className="text-gray-700 dark:text-emerald-400 italic">
              {journal.summary}
            </p>
          </div>
        )}

        <p className="text-gray-700 dark:text-emerald-500/70 text-lg leading-relaxed whitespace-pre-wrap">
          {journal.entry}
        </p>

        {journal.keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {journal.keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 
                          text-emerald-700 dark:text-emerald-400 rounded-full text-sm"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      {videoId && (
        <div className="bg-white dark:bg-black rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-emerald-500">
              Suggested Song
            </h2>
          </div>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="Suggested Song"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Suggested photos */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Related Imagery
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.photos.map((photo, index) => (
            <div
              key={index}
              className="relative h-48 rounded-lg overflow-hidden"
            >
              <Image
                src={photo || "/placeholder.svg"}
                alt={`Suggestion ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover hover:opacity-90 transition-opacity"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Nearby places */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">Nearby Places</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.places.slice(0, 6).map((place, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
            >
              <h3 className="font-medium text-gray-900">{place.name}</h3>
              <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                <span>
                  ⭐ {place.rating.toFixed(1)} ({place.user_ratings_total}{" "}
                  reviews)
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{place.address}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Latest articles */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Latest Articles
          </h2>
        </div>
        <div className="space-y-4">
          {suggestions.articles.map((article, index) => (
            <div key={index} className="p-4 bg-emerald-50 rounded-lg">
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline font-medium"
              >
                {article.title}
              </a>
              <p className="mt-2 text-sm text-gray-700">{article.snippet}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
