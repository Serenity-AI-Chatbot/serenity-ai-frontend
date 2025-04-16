import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useState } from "react";

type UserRecommendationCardProps = {
  recommendation: {
    recommended_user_id: string;
    display_name: string;
    bio: string;
    profile_picture_url: string | null;
    match_score: number;
    mood_similarity: number;
    activity_similarity: number;
    context_similarity: number;
  };
  onConnect: (userId: string) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
};

export default function UserRecommendationCard({
  recommendation,
  onConnect,
  onReject,
}: UserRecommendationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Format score as percentage
  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };
  
  // Calculate progress color based on score
  const getProgressColor = (score: number) => {
    if (score >= 0.7) return "bg-emerald-500";
    if (score >= 0.4) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await onConnect(recommendation.recommended_user_id);
    } catch (error) {
      console.error("Error connecting with user:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(recommendation.recommended_user_id);
    } catch (error) {
      console.error("Error rejecting user:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="mb-4 p-4 shadow-md border-emerald-100 hover:border-emerald-300 transition-colors">
      <div className="flex items-start">
        {/* User Avatar */}
        <Avatar className="w-16 h-16 mr-4 ring-2 ring-emerald-100">
          {recommendation.profile_picture_url && (
            <AvatarImage 
              src={recommendation.profile_picture_url} 
              alt={recommendation.display_name} 
            />
          )}
          <AvatarFallback className="bg-emerald-100 text-emerald-800">
            {recommendation.display_name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* User Info */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-emerald-800">{recommendation.display_name}</h3>
          <p className="text-emerald-700 text-sm mb-2">{recommendation.bio || "No bio available"}</p>
          
          {/* Compatibility Score */}
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-emerald-800">Overall Match</span>
              <span className="text-sm font-medium text-emerald-800">{formatScore(recommendation.match_score)}</span>
            </div>
            <Progress 
              value={recommendation.match_score * 100} 
              className={`h-2 ${getProgressColor(recommendation.match_score)}`}
            />
          </div>
          
          {/* Similarity Details */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="text-xs text-center mb-1 text-emerald-700">Mood</div>
                    <Progress 
                      value={recommendation.mood_similarity * 100} 
                      className={`h-1 ${getProgressColor(recommendation.mood_similarity)}`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-emerald-50 border-emerald-200 text-emerald-800">
                  Based on similar mood patterns in journal entries
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="text-xs text-center mb-1 text-emerald-700">Activities</div>
                    <Progress 
                      value={recommendation.activity_similarity * 100} 
                      className={`h-1 ${getProgressColor(recommendation.activity_similarity)}`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-emerald-50 border-emerald-200 text-emerald-800">
                  Based on similar activities and interests
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="text-xs text-center mb-1 text-emerald-700">Context</div>
                    <Progress 
                      value={recommendation.context_similarity * 100} 
                      className={`h-1 ${getProgressColor(recommendation.context_similarity)}`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-emerald-50 border-emerald-200 text-emerald-800">
                  Based on similar context and preferences
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReject}
              disabled={isLoading}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Skip
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={handleConnect}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Connect
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
} 