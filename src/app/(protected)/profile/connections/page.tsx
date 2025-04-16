"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/hooks/use-toast";

type UserProfile = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  interests: string[];
  profile_picture_url: string | null;
  is_discoverable: boolean;
  shared_mood_data: boolean;
  shared_activity_data: boolean;
  shared_context_data: boolean;
  connection_preferences: {
    mood_match_weight: number;
    activity_match_weight: number;
    context_match_weight: number;
  };
  created_at: string;
  updated_at: string;
};

export default function ConnectionsProfilePage() {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [sharedMoodData, setSharedMoodData] = useState(true);
  const [sharedActivityData, setSharedActivityData] = useState(true);
  const [sharedContextData, setSharedContextData] = useState(true);
  const [moodMatchWeight, setMoodMatchWeight] = useState(50);
  const [activityMatchWeight, setActivityMatchWeight] = useState(30);
  const [contextMatchWeight, setContextMatchWeight] = useState(20);
  
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
        return;
      }
      
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setIsDiscoverable(data.is_discoverable);
        setSharedMoodData(data.shared_mood_data);
        setSharedActivityData(data.shared_activity_data);
        setSharedContextData(data.shared_context_data);
        
        // Set weights
        if (data.connection_preferences) {
          setMoodMatchWeight(data.connection_preferences.mood_match_weight * 100);
          setActivityMatchWeight(data.connection_preferences.activity_match_weight * 100);
          setContextMatchWeight(data.connection_preferences.context_match_weight * 100);
        }
      } else {
        // Create a new profile if it doesn't exist
        handleSaveProfile();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      // Normalize weights to sum to 1
      const totalWeight = moodMatchWeight + activityMatchWeight + contextMatchWeight;
      const normalizedMoodWeight = moodMatchWeight / totalWeight;
      const normalizedActivityWeight = activityMatchWeight / totalWeight;
      const normalizedContextWeight = contextMatchWeight / totalWeight;
      
      const profileData = {
        user_id: user.id,
        display_name: displayName || user.email?.split('@')[0] || 'User',
        bio,
        is_discoverable: isDiscoverable,
        shared_mood_data: sharedMoodData,
        shared_activity_data: sharedActivityData,
        shared_context_data: sharedContextData,
        connection_preferences: {
          mood_match_weight: normalizedMoodWeight,
          activity_match_weight: normalizedActivityWeight,
          context_match_weight: normalizedContextWeight
        }
      };
      
      const { data, error } = profile 
        ? await supabase
            .from('user_profiles')
            .update(profileData)
            .eq('user_id', user.id)
        : await supabase
            .from('user_profiles')
            .insert(profileData)
            .select();
      
      if (error) {
        console.error("Error saving profile:", error);
        toast({
          title: "Error",
          description: "Failed to save profile settings.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Settings saved",
        description: "Your connection preferences have been updated."
      });
      
      // Refetch profile to ensure all data is up-to-date
      fetchUserProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle weight changes to ensure they add up to 100%
  const handleWeightChange = (type: 'mood' | 'activity' | 'context', value: number) => {
    const total = 100;
    let newMood = moodMatchWeight;
    let newActivity = activityMatchWeight;
    let newContext = contextMatchWeight;
    
    if (type === 'mood') {
      newMood = value;
      // Adjust other weights proportionally
      const remainingTotal = total - value;
      const ratio = activityMatchWeight / (activityMatchWeight + contextMatchWeight);
      newActivity = Math.round(remainingTotal * ratio);
      newContext = total - newMood - newActivity;
    } else if (type === 'activity') {
      newActivity = value;
      // Adjust other weights proportionally
      const remainingTotal = total - value;
      const ratio = moodMatchWeight / (moodMatchWeight + contextMatchWeight);
      newMood = Math.round(remainingTotal * ratio);
      newContext = total - newMood - newActivity;
    } else {
      newContext = value;
      // Adjust other weights proportionally
      const remainingTotal = total - value;
      const ratio = moodMatchWeight / (moodMatchWeight + activityMatchWeight);
      newMood = Math.round(remainingTotal * ratio);
      newActivity = total - newMood - newContext;
    }
    
    setMoodMatchWeight(newMood);
    setActivityMatchWeight(newActivity);
    setContextMatchWeight(newContext);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Connection Settings</h1>
      
      <Tabs defaultValue="privacy" className="space-y-6">
        <TabsList>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="matching">Matching Preferences</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control what information is shared with other users and whether you're discoverable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="discoverable" className="text-base">Discoverable</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to discover your profile in recommendations
                    </p>
                  </div>
                  <Switch
                    id="discoverable"
                    checked={isDiscoverable}
                    onCheckedChange={setIsDiscoverable}
                  />
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Data Sharing</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose what information can be used for matching. Disabling these will reduce match quality.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mood-data"
                        checked={sharedMoodData}
                        onCheckedChange={(checked) => 
                          setSharedMoodData(checked as boolean)
                        }
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="mood-data" className="text-base">Share Mood Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Use your journal moods to find similar users
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="activity-data"
                        checked={sharedActivityData}
                        onCheckedChange={(checked) => 
                          setSharedActivityData(checked as boolean)
                        }
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="activity-data" className="text-base">Share Activity Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Use your completed activities to find similar users
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="context-data"
                        checked={sharedContextData}
                        onCheckedChange={(checked) => 
                          setSharedContextData(checked as boolean)
                        }
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="context-data" className="text-base">Share Context Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Use your personal context information to find similar users
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="matching">
          <Card>
            <CardHeader>
              <CardTitle>Matching Preferences</CardTitle>
              <CardDescription>
                Customize how different aspects are weighted when matching you with others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <Label htmlFor="mood-weight" className="text-base">Mood Similarity</Label>
                      <span>{moodMatchWeight}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      How much weight to give to mood similarity in matches
                    </p>
                    <Slider
                      id="mood-weight"
                      min={10}
                      max={80}
                      step={5}
                      value={[moodMatchWeight]}
                      onValueChange={(values) => handleWeightChange('mood', values[0])}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <Label htmlFor="activity-weight" className="text-base">Activity Similarity</Label>
                      <span>{activityMatchWeight}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      How much weight to give to activity similarity in matches
                    </p>
                    <Slider
                      id="activity-weight"
                      min={10}
                      max={80}
                      step={5}
                      value={[activityMatchWeight]}
                      onValueChange={(values) => handleWeightChange('activity', values[0])}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <Label htmlFor="context-weight" className="text-base">Context Similarity</Label>
                      <span>{contextMatchWeight}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      How much weight to give to context/interests similarity in matches
                    </p>
                    <Slider
                      id="context-weight"
                      min={10}
                      max={80}
                      step={5}
                      value={[contextMatchWeight]}
                      onValueChange={(values) => handleWeightChange('context', values[0])}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Weights Total: 100%</p>
                  <div className="h-4 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div className="flex h-full">
                      <div 
                        className="bg-blue-500" 
                        style={{ width: `${moodMatchWeight}%` }}
                        title="Mood Similarity"
                      />
                      <div 
                        className="bg-green-500" 
                        style={{ width: `${activityMatchWeight}%` }}
                        title="Activity Similarity"
                      />
                      <div 
                        className="bg-purple-500" 
                        style={{ width: `${contextMatchWeight}%` }}
                        title="Context Similarity"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>Mood</span>
                    <span>Activity</span>
                    <span>Context</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>
                Information visible to other users when they connect with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others a bit about yourself..."
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    {bio.length}/250 characters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleSaveProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 