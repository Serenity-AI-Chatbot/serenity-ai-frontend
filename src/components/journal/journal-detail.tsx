"use client";

import {
  ArrowLeft,
  Calendar,
  MapPin,
  ImageIcon,
  Newspaper,
  Music,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

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
    is_processing?: boolean;
    nearbyPlaces: {
      places: Array<{
        name: string;
        rating: number;
        address: string;
        user_ratings_total: number;
        image_url?: string;
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
  return {
    places: journal.nearbyPlaces?.places || [],
    keywords: journal.keywords || [],
    articles: journal.latestArticles?.articles || [],
  };
};

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string) => {
  if (!url) return null;
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export function JournalDetail({ journal: initialJournal }: JournalDetailProps) {
  const router = useRouter();
  const [journal, setJournal] = useState(initialJournal);
  const [isRefetching, setIsRefetching] = useState(false);
  
  const suggestions = getJournalSuggestions(journal);
  const videoId = getYouTubeVideoId(journal.song);

  const fetchJournal = async () => {
    try {
      setIsRefetching(true);
      const response = await fetch(`/api/journal/${journal.id}`);
      if (response.ok) {
        const data = await response.json();
        setJournal(data);
      }
    } catch (error) {
      console.error("Error fetching journal:", error);
    } finally {
      setIsRefetching(false);
    }
  };

  // Set up auto-refresh if journal is processing
  useEffect(() => {
    if (journal.is_processing) {
      const intervalId = setInterval(fetchJournal, 10000); // Refetch every 10 seconds
      
      // Cleanup interval on unmount
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [journal.is_processing, journal.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-500 hover:text-emerald-600"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Journal List
        </button>
        
        {journal.is_processing && (
          <button 
            onClick={fetchJournal}
            disabled={isRefetching}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 ${isRefetching ? 'opacity-50' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Processing Banner */}
      {journal.is_processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <h3 className="text-xl font-medium text-blue-700 mb-2">Your journal is being processed</h3>
          <p className="text-blue-600 max-w-lg">
            We're analyzing your journal entry and preparing AI insights. This process usually takes 
            about 2 minutes to complete. You can refresh this page to check the status or wait for 
            the automatic refresh.
          </p>
        </div>
      )}

      {/* Main journal content */}
      <Card>
        <CardContent>
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
            {!journal.is_processing && journal.mood && (
              <span className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500 rounded-full flex items-center gap-2">
                {journal.mood}
              </span>
            )}
          </div>

          {journal.title && (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-emerald-500 mb-4">
              {journal.title}
            </h1>
          )}

          {!journal.is_processing && journal.summary && (
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <p className="text-gray-700 dark:text-emerald-400 italic">
                {journal.summary}
              </p>
            </div>
          )}

          <p className="text-gray-700 dark:text-emerald-500/70 text-lg leading-relaxed whitespace-pre-wrap">
            {journal.entry}
          </p>

          {!journal.is_processing && journal.keywords && journal.keywords.length > 0 && (
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
        </CardContent>
      </Card>

      {journal.is_processing ? (
        // Placeholder cards for processing state
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-emerald-500">
                  Suggested Song
                </h2>
              </div>
              <div className="animate-pulse space-y-4">
                <div className="h-48 bg-gray-200 dark:bg-emerald-500/20 rounded-lg w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-emerald-500/20 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-emerald-500">
                  Nearby Places
                </h2>
              </div>
              <div className="animate-pulse space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-48 bg-gray-200 dark:bg-emerald-500/20 rounded-lg w-full"></div>
                      <div className="h-4 bg-gray-200 dark:bg-emerald-500/20 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-emerald-500/20 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-emerald-500">
                  Latest Articles
                </h2>
              </div>
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-emerald-500/20 rounded-lg w-full"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        // Actual content when not processing
        <>
          {videoId && (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-emerald-500">
                    Suggested Song
                  </h2>
                </div>
                <div
                  className="relative w-full"
                  style={{ paddingBottom: "56.25%" }}
                >
                  <iframe
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title="Suggested Song"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Nearby places */}
          {suggestions.places.length > 0 && (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-emerald-500">Nearby Places</h2>
                </div>
                <Carousel className="w-full mx-auto">
                  <CarouselContent className="-ml-1">
                    {suggestions.places.map((place, index) => (
                      <CarouselItem
                        className="pl-1 gap-2 md:basis-1/2 lg:basis-1/3"
                        key={index}
                      >
                        <Card className="w-full h-full">
                          <CardContent className="p-4">
                            <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                              <Image
                                src={
                                  place.image_url ||
                                  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop"
                                }
                                alt={place.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover"
                              />
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-emerald-500">{place.name}</h3>
                            <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-emerald-500/70">
                              <span>
                                ⭐ {place.rating ? place.rating.toFixed(1) : 'N/A'} ({place.user_ratings_total || 0}{" "}
                                reviews)
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-emerald-500/50">
                              {place.address}
                            </p>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </CardContent>
            </Card>
          )}

          {/* Latest articles */}
          {suggestions.articles.length > 0 && (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-emerald-500">
                    Latest Articles
                  </h2>
                </div>
                <div className="space-y-4">
                  {suggestions.articles.map((article, index) => (
                    <div key={index} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline font-medium"
                      >
                        {article.title}
                      </a>
                      <p className="mt-2 text-sm text-gray-700 dark:text-emerald-500/70">{article.snippet}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
