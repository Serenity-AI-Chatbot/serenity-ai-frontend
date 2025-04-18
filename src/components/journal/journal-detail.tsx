"use client";

import {
  ArrowLeft,
  Calendar,
  MapPin,
  ImageIcon,
  Newspaper,
  Music,
  RefreshCw,
  Clock,
  Tag,
  Star,
  Trash2
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
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [journal, setJournal] = useState(initialJournal);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Determine if journal is still processing based on missing AI-generated content
  const isProcessing = journal.is_processing || 
    (!journal.summary && 
     (!journal.keywords || journal.keywords.length === 0) && 
     (!journal.nearbyPlaces?.places || journal.nearbyPlaces.places.length === 0) && 
     (!journal.latestArticles?.articles || journal.latestArticles.articles.length === 0));
  
  const suggestions = getJournalSuggestions(journal);
  const videoId = getYouTubeVideoId(journal.song);

  console.log("===============")
  console.log(journal)
  console.log("isProcessing:", isProcessing)
  console.log("===============")

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

  const deleteJournal = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/journal/${journal.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "Journal deleted",
          description: "Your journal entry has been successfully deleted.",
          variant: "default",
        });
        router.push('/journal');
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to delete",
          description: errorData.error || "Could not delete this journal entry. Please try again.",
          variant: "destructive",
        });
        setIsDeleting(false);
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Error deleting journal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Set up auto-refresh if journal is processing
  useEffect(() => {
    if (isProcessing) {
      const intervalId = setInterval(fetchJournal, 3000); // Refetch every 3 seconds
      
      // Cleanup interval on unmount
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isProcessing, journal.id]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-8 px-4 py-8"
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Journal List
        </Button>
        
        <div className="flex gap-2">
          {isProcessing && (
            <Button 
              variant="outline"
              onClick={fetchJournal}
              disabled={isRefetching}
              className="flex items-center gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your journal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteJournal} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Processing Banner */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col items-center justify-center text-center"
          >
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
            <h3 className="text-xl font-medium text-emerald-700 mb-2">Your journal is being processed</h3>
            <p className="text-gray-700 dark:text-gray-300 max-w-lg">
              We're analyzing your journal entry and preparing AI insights. This process usually takes 
              about 2 minutes to complete. The page will automatically refresh when ready.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main journal content */}
      <Card className="border-emerald-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 border-b border-emerald-100 dark:border-emerald-800/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-lg font-medium text-emerald-800 dark:text-emerald-400">
                  {new Date(journal.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {isProcessing && (
                  <div className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100/80 text-emerald-800">
                    <Clock className="animate-spin h-3 w-3 mr-1" />
                    Processing
                  </div>
                )}
              </div>
              {!isProcessing && journal.mood && (
                <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-2">
                  <span className="text-xl mr-1">
                    {journal.mood.includes('Happy') ? '😊' : 
                     journal.mood.includes('Sad') ? '😔' : 
                     journal.mood.includes('Anxious') ? '😰' : 
                     journal.mood.includes('Relaxed') ? '😌' : '✨'}
                  </span>
                  {journal.mood}
                </div>
              )}
              {isProcessing && (
                <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-2 opacity-50">
                  <span className="text-xl mr-1">✨</span>
                  Analyzing mood...
                </div>
              )}
            </div>

            {journal.title && (
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                  {journal.title}
                </h1>
              </div>
            )}

            {!isProcessing && journal.summary && (
              <div className="mb-4 p-4 bg-white/80 dark:bg-emerald-900/40 rounded-lg border border-emerald-100 dark:border-emerald-800/50 italic">
                <p className="text-gray-700 dark:text-gray-300">
                  {journal.summary}
                </p>
              </div>
            )}
          </div>

          <div className="p-6">
            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">
              {journal.entry}
            </p>

            {!isProcessing && journal.keywords && journal.keywords.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-6 flex flex-wrap gap-2"
              >
                {journal.keywords.map((keyword, index) => (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    key={index}
                    className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 
                              text-gray-700 dark:text-gray-300 rounded-full text-sm flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3 text-emerald-500" />
                    {keyword}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {isProcessing ? (
        // Placeholder cards for processing state
        <>
          <Card className="border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center">
                  <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-400">
                  Suggested Song
                </h2>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-48 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg w-full relative flex items-center justify-center animate-pulse overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-gray-700 dark:text-gray-300 text-center px-4">
                        Finding the perfect song to match your journal's mood...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-400">
                  Nearby Places
                </h2>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg overflow-hidden border border-emerald-100 dark:border-emerald-800/50">
                    <div className="h-32 bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 animate-pulse"></div>
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-emerald-100 dark:bg-emerald-900/30 rounded w-2/3 animate-pulse"></div>
                      <div className="h-3 bg-emerald-100 dark:bg-emerald-900/30 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-400">
                  Latest Articles
                </h2>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/50 space-y-2">
                    <div className="h-4 bg-emerald-100 dark:bg-emerald-900/30 rounded w-3/4 animate-pulse"></div>
                    <div className="h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded w-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        // Actual content when not processing
        <>
          {!isProcessing && videoId && (
            <Card className="border-emerald-100 shadow-sm overflow-hidden">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center">
                    <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-400">
                    Suggested Song
                  </h2>
                </div>
              </div>
              <CardContent className="p-6">
                <div
                  className="relative w-full rounded-lg overflow-hidden shadow-sm"
                  style={{ paddingBottom: "56.25%" }}
                >
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
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
            <Card className="border-emerald-100 shadow-sm overflow-hidden">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-400">
                    Nearby Places
                  </h2>
                </div>
              </div>
              <CardContent className="p-6">
                <Carousel className="w-full mx-auto">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {suggestions.places.map((place, index) => (
                      <CarouselItem
                        className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3"
                        key={index}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.5 }}
                        >
                          <Card className="w-full h-full border-emerald-100 overflow-hidden shadow-sm">
                            <CardContent className="p-0">
                              <div className="relative h-48 w-full">
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
                                <div className="absolute top-2 right-2 bg-emerald-100/80 backdrop-blur-sm text-emerald-800 px-2 py-1 rounded-md text-sm font-medium flex items-center">
                                  <Star className="h-3 w-3 text-amber-500 mr-1 fill-amber-500" />
                                  {place.rating ? place.rating.toFixed(1) : 'N/A'}
                                </div>
                              </div>
                              <div className="p-4">
                                <h3 className="font-medium text-emerald-800 dark:text-emerald-400 mb-1">{place.name}</h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  {place.user_ratings_total ? `${place.user_ratings_total} reviews` : 'No reviews yet'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {place.address}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="text-emerald-800 border-emerald-200 hover:bg-emerald-100" />
                  <CarouselNext className="text-emerald-800 border-emerald-200 hover:bg-emerald-100" />
                </Carousel>
              </CardContent>
            </Card>
          )}

          {/* Latest articles */}
          {suggestions.articles.length > 0 && (
            <Card className="border-emerald-100 shadow-sm overflow-hidden">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-400">
                    Latest Articles
                  </h2>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {suggestions.articles.map((article, index) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      key={index} 
                      className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50 hover:border-emerald-300 transition-colors"
                    >
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline font-medium block mb-2"
                      >
                        {article.title}
                      </a>
                      <p className="text-sm text-gray-700 dark:text-gray-400">{article.snippet}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
