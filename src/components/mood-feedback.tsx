"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface MoodFeedbackProps {
  moodTag: string;
}

export function MoodFeedback({ moodTag }: MoodFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!rating) {
      toast({
        title: "Please select a rating",
        description: "Please select a rating to submit your feedback",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/mood-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moodTag,
          accuracyRating: rating,
          feedbackComment: comment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      toast({
        title: "Thank you for your feedback!",
      });
      setRating(null);
      setComment("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Failed to submit feedback",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>How accurate was this mood detection?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <Button
              key={value}
              variant={rating === value ? "default" : "outline"}
              onClick={() => setRating(value)}
              className="w-10 h-10 p-0"
            >
              {value}
            </Button>
          ))}
        </div>
        <Textarea
          placeholder="Any additional comments? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !rating}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
} 