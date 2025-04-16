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
import { Loader2, Save, User, Shield, Sliders } from "lucide-react";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-emerald-800">Connection Settings</h1>
              <p className="text-emerald-600 mt-1">Manage how you connect with others</p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>
        
        <Tabs defaultValue="privacy" className="space-y-8">
          <TabsList className="bg-emerald-50 border border-emerald-100 p-1 rounded-lg w-full">
            <TabsTrigger 
              value="privacy" 
              className="flex-1 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md transition-all"
            >
              <Shield className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger 
              value="matching" 
              className="flex-1 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md transition-all"
            >
              <Sliders className="h-4 w-4 mr-2" />
              Matching
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex-1 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md transition-all"
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="privacy">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-emerald-100 shadow-sm bg-white">
                <CardHeader className="bg-emerald-50 border-b border-emerald-100 rounded-t-lg">
                  <CardTitle className="text-emerald-800">Privacy Settings</CardTitle>
                  <CardDescription className="text-emerald-600">
                    Control what information is shared with other users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-emerald-100 shadow-sm">
                      <div>
                        <Label htmlFor="discoverable" className="text-base font-medium text-emerald-800">Discoverable</Label>
                        <p className="text-sm text-emerald-600 mt-1">
                          Allow others to discover your profile in recommendations
                        </p>
                      </div>
                      <Switch
                        id="discoverable"
                        checked={isDiscoverable}
                        onCheckedChange={setIsDiscoverable}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </div>
                    
                    <Separator className="my-6 bg-emerald-100" />
                    
                    <div className="bg-white p-5 rounded-lg border border-emerald-100 shadow-sm">
                      <h3 className="text-lg font-medium mb-3 text-emerald-800">Data Sharing</h3>
                      <p className="text-sm text-emerald-600 mb-6">
                        Choose what information can be used for matching. Disabling these will reduce match quality.
                      </p>
                      
                      <div className="space-y-5">
                        <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-emerald-50 transition-colors">
                          <Checkbox
                            id="mood-data"
                            checked={sharedMoodData}
                            onCheckedChange={(checked) => 
                              setSharedMoodData(checked as boolean)
                            }
                            className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-emerald-50 border-emerald-300"
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor="mood-data" className="text-base font-medium text-emerald-800">Share Mood Data</Label>
                            <p className="text-sm text-emerald-600">
                              Use your journal moods to find similar users
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-emerald-50 transition-colors">
                          <Checkbox
                            id="activity-data"
                            checked={sharedActivityData}
                            onCheckedChange={(checked) => 
                              setSharedActivityData(checked as boolean)
                            }
                            className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-emerald-50 border-emerald-300"
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor="activity-data" className="text-base font-medium text-emerald-800">Share Activity Data</Label>
                            <p className="text-sm text-emerald-600">
                              Use your completed activities to find similar users
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-emerald-50 transition-colors">
                          <Checkbox
                            id="context-data"
                            checked={sharedContextData}
                            onCheckedChange={(checked) => 
                              setSharedContextData(checked as boolean)
                            }
                            className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-emerald-50 border-emerald-300"
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor="context-data" className="text-base font-medium text-emerald-800">Share Context Data</Label>
                            <p className="text-sm text-emerald-600">
                              Use your personal context information to find similar users
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="matching">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-emerald-100 shadow-sm bg-white">
                <CardHeader className="bg-emerald-50 border-b border-emerald-100 rounded-t-lg">
                  <CardTitle className="text-emerald-800">Matching Preferences</CardTitle>
                  <CardDescription className="text-emerald-600">
                    Customize how different aspects are weighted when matching you with others
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-8">
                    <div className="p-5 rounded-lg border border-emerald-100 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label htmlFor="mood-weight" className="text-base font-medium text-emerald-800">Mood Similarity</Label>
                            <span className="text-sm font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">{moodMatchWeight}%</span>
                          </div>
                          <p className="text-sm text-emerald-600 mb-3">
                            How much weight to give to mood similarity in matches
                          </p>
                          <Slider
                            id="mood-weight"
                            min={10}
                            max={80}
                            step={5}
                            value={[moodMatchWeight]}
                            onValueChange={(values) => handleWeightChange('mood', values[0])}
                            className="[&>span]:bg-emerald-600"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label htmlFor="activity-weight" className="text-base font-medium text-emerald-800">Activity Similarity</Label>
                            <span className="text-sm font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">{activityMatchWeight}%</span>
                          </div>
                          <p className="text-sm text-emerald-600 mb-3">
                            How much weight to give to activity similarity in matches
                          </p>
                          <Slider
                            id="activity-weight"
                            min={10}
                            max={80}
                            step={5}
                            value={[activityMatchWeight]}
                            onValueChange={(values) => handleWeightChange('activity', values[0])}
                            className="[&>span]:bg-emerald-600"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label htmlFor="context-weight" className="text-base font-medium text-emerald-800">Context Similarity</Label>
                            <span className="text-sm font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">{contextMatchWeight}%</span>
                          </div>
                          <p className="text-sm text-emerald-600 mb-3">
                            How much weight to give to context/interests similarity in matches
                          </p>
                          <Slider
                            id="context-weight"
                            min={10}
                            max={80}
                            step={5}
                            value={[contextMatchWeight]}
                            onValueChange={(values) => handleWeightChange('context', values[0])}
                            className="[&>span]:bg-emerald-600"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
                      <p className="text-sm font-medium text-emerald-800 mb-3">Matching Weights Distribution</p>
                      <div className="h-6 bg-white rounded-full overflow-hidden border border-emerald-100">
                        <div className="flex h-full">
                          <div 
                            className="bg-emerald-600 transition-all duration-500 ease-in-out" 
                            style={{ width: `${moodMatchWeight}%` }}
                            title="Mood Similarity"
                          />
                          <div 
                            className="bg-emerald-400 transition-all duration-500 ease-in-out" 
                            style={{ width: `${activityMatchWeight}%` }}
                            title="Activity Similarity"
                          />
                          <div 
                            className="bg-emerald-300 transition-all duration-500 ease-in-out" 
                            style={{ width: `${contextMatchWeight}%` }}
                            title="Context Similarity"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between mt-3 text-xs text-emerald-700">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                          <span>Mood ({moodMatchWeight}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                          <span>Activity ({activityMatchWeight}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-emerald-300 rounded-full"></div>
                          <span>Context ({contextMatchWeight}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-emerald-100 shadow-sm bg-white">
                <CardHeader className="bg-emerald-50 border-b border-emerald-100 rounded-t-lg">
                  <CardTitle className="text-emerald-800">Public Profile</CardTitle>
                  <CardDescription className="text-emerald-600">
                    Information visible to other users when they connect with you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label htmlFor="display-name" className="text-emerald-800 font-medium">Display Name</Label>
                        <Input
                          id="display-name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your display name"
                          className="border-emerald-200 focus-visible:ring-emerald-600"
                        />
                      </div>
                      
                      <div className="space-y-3 md:row-span-2">
                        <Label htmlFor="bio" className="text-emerald-800 font-medium">Bio</Label>
                        <textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell others a bit about yourself..."
                          className="w-full min-h-[160px] px-3 py-2 text-sm rounded-md border border-emerald-200 bg-background focus-visible:ring-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                          maxLength={250}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-emerald-600">
                            Share your interests, hobbies, or a brief introduction
                          </p>
                          <span className={`text-xs font-medium ${bio.length > 200 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {bio.length}/250
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-8">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 