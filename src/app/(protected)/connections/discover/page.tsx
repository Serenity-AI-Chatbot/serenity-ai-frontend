"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UserRecommendationCard from "@/components/UserRecommendationCard";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

type UserRecommendation = {
  recommended_user_id: string;
  display_name: string;
  bio: string;
  profile_picture_url: string | null;
  match_score: number;
  mood_similarity: number;
  activity_similarity: number;
  context_similarity: number;
};

export default function DiscoverPage() {
  const supabase = createClientComponentClient();
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      // Get user recommendations
      const { data, error } = await supabase
        .rpc('generate_user_recommendations', { 
          p_user_id: user.id,
          p_limit: 10
        });

      if (error) {
        console.error("Error fetching recommendations:", error);
        return;
      }

      setRecommendations(data || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleConnect = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .rpc('request_connection', {
          p_user_id: user.id,
          p_recommended_user_id: userId
        });

      if (error) {
        console.error("Error connecting with user:", error);
        return;
      }

      // Remove from recommendations
      setRecommendations(prev => 
        prev.filter(rec => rec.recommended_user_id !== userId)
      );

    } catch (error) {
      console.error("Error connecting with user:", error);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .rpc('reject_connection', {
          p_user_id: user.id,
          p_recommended_user_id: userId
        });

      if (error) {
        console.error("Error rejecting user:", error);
        return;
      }

      // Remove from recommendations
      setRecommendations(prev => 
        prev.filter(rec => rec.recommended_user_id !== userId)
      );

    } catch (error) {
      console.error("Error rejecting user:", error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRecommendations();
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-2 text-emerald-700" asChild>
            <Link href="/connections">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-emerald-800">Discover People</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : recommendations.length === 0 ? (
        <Card className="p-8 text-center border-emerald-100 bg-emerald-50">
          <h2 className="text-xl font-semibold mb-2 text-emerald-800">No recommendations right now</h2>
          <p className="text-emerald-700 mb-6">
            We couldn't find any recommendations for you at the moment.
            Try refreshing or check back later.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-emerald-600">
              Adding more journal entries and completing activities can help us find better matches for you.
            </p>
            <Button onClick={handleRefresh} className="bg-emerald-600 hover:bg-emerald-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
            <p className="text-emerald-700">
              Based on your journal entries, activities, and interests, we've found 
              {recommendations.length > 1 
                ? ` ${recommendations.length} people` 
                : ' someone'} you might connect with.
            </p>
          </div>
          
          <div>
            {recommendations.map((recommendation) => (
              <UserRecommendationCard
                key={recommendation.recommended_user_id}
                recommendation={recommendation}
                onConnect={handleConnect}
                onReject={handleReject}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
} 