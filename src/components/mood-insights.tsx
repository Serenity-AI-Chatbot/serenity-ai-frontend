"use client"

import React, { useEffect, useState, useMemo } from "react";
import { Bar, BarChart, Label, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Cell } from "recharts";
import { TagCloud } from "react-tagcloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useMoodStore } from "@/store/mood-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoodFeedback } from "@/components/mood-feedback";

// Custom tag interface for TagCloud
interface MoodTag {
  value: string; // emoji
  text: string;  // mood name
  count: number; // frequency
}

const TIME_PERIODS = [
  { value: "15", label: "15 Days" },
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
  { value: "90", label: "90 Days" },
  { value: "180", label: "6 Months" },
  { value: "365", label: "1 Year" },
] as const;

// Comprehensive mood to emoji mapping
const moodEmojis: Record<string, string> = {
  // Positive emotions
  joyful: "😊",
  happy: "😃",
  excited: "🤩",
  proud: "🥲",
  confident: "😎",
  content: "😌",
  grateful: "🥰",
  hopeful: "🤞",
  peaceful: "😇",
  creative: "🎨",
  inspired: "✨",
  energetic: "⚡",
  strong: "💪",
  brave: "🦁",
  motivated: "🎯",
  resilient: "🌱",
  healing: "🌟",
  mindful: "🧘",
  centered: "⭐",
  connected: "🤝",
  relieved: "😮‍💨",

  // Negative emotions
  sad: "😢",
  lonely: "😔",
  anxious: "😰",
  annoyed: "😤",
  disappointed: "😞",
  vulnerable: "🥺",

  // Other states
  curious: "🤔",
  determined: "💫",
  anticipating: "👀",
  impressed: "🤯",
  nostalgic: "📷",
  sentimental: "💭",
  prepared: "📝",
  
  // Unknown state
  unknown: "❓",
};

// Function to generate a random color
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-2 border border-border rounded shadow-md">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.fill }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom component for tag cloud rendering with better styling
const CustomTagRenderer = ({ tag, size, color }: any) => {
  // Handle the case where tag is the value directly (string)
  const value = typeof tag === 'string' ? tag : tag?.value || '';
  const text = typeof tag === 'string' ? tag : tag?.text || value || '';
  const count = tag?.count || 0;
  
  // Generate a unique key using text and count
  const uniqueKey = `${text}-${count}-${Math.random().toString(36).substring(2, 9)}`;
  
  return (
    <TooltipProvider key={uniqueKey}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="px-3 py-2.5 m-2 rounded-full transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md flex items-center justify-center"
            style={{ 
              fontSize: `${size}px`, 
              backgroundColor: color || '#f3f4f6',
              color: getContrastColor(color || '#f3f4f6')
            }}
          >
            <span className="capitalize font-medium whitespace-nowrap">{text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-background/90 backdrop-blur-sm border border-border p-3 shadow-lg rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">{moodEmojis[text] || "😶"}</span>
            <div>
              <p className="font-bold capitalize">{text}</p>
              <p className="text-sm text-muted-foreground">{count} entries</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Helper function to determine text color based on background for contrast
function getContrastColor(hexColor: string) {
  // If it's an HSL color, extract the lightness
  if (hexColor.startsWith('hsl')) {
    const match = hexColor.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
    if (match && match[1]) {
      const lightness = parseInt(match[1], 10);
      return lightness > 60 ? '#000000' : '#ffffff';
    }
  }
  
  // Default to white for unknown colors
  return '#ffffff';
}

export function MoodInsights() {
  const { moodData, loading, error, fetchMoodTrends } = useMoodStore();
  const [selectedDays, setSelectedDays] = useState<string>("30");

  useEffect(() => {
    fetchMoodTrends(Number(selectedDays));
    console.log("====================================");
    console.log("moodData:", moodData);
    console.log("====================================");
  }, [fetchMoodTrends, selectedDays]);

  const colorMap = useMemo(() => new Map<string, string>(), []);

  // Function to get or generate a color for a given key
  const getColor = (key: string) => {
    if (!colorMap.has(key)) {
      colorMap.set(key, getRandomColor());
    }
    return colorMap.get(key)!;
  };

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-muted-foreground">Loading mood insights...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (!moodData) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-muted-foreground">No mood data available</div>
      </div>
    );
  }

  console.log("====================================");
  console.log("Raw moodData structure:", JSON.stringify(moodData, null, 2));
  console.log("====================================");

  const journalTrends = moodData.journalTrends;

  console.log("====================================");
  console.log("journalTrends:", journalTrends);
  console.log("First few journal trends with mood data:");
  journalTrends.filter(week => Object.keys(week.moodDistribution || {}).length > 0)
    .slice(0, 3)
    .forEach(week => {
      console.log(`Week ${week.week}:`, week.moodDistribution);
    });
  console.log("====================================");

  // Aggregate all moods across weeks
  const moodTotals = journalTrends.reduce((acc, week) => {
    // Check if moodDistribution exists and is not empty
    if (week.moodDistribution && Object.keys(week.moodDistribution).length > 0) {
      Object.entries(week.moodDistribution).forEach(([mood, count]) => {
        acc[mood] = (acc[mood] || 0) + count;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  console.log("====================================");
  console.log("moodTotals:", moodTotals);
  console.log("moodTotals empty?", Object.keys(moodTotals).length === 0);
  console.log("journalTrends length:", journalTrends.length);
  console.log("====================================");

  // Get the most dominant mood
  const dominantMood =
    Object.entries(moodTotals).length > 0
      ? Object.entries(moodTotals).sort(([, a], [, b]) => b - a)[0]?.[0]
      : "unknown";

  // Get the latest mood from the most recent week with data
  const latestWeekWithMoods = journalTrends
    .slice()
    .reverse()
    .find((week) => Object.keys(week.moodDistribution || {}).length > 0);

  const latestMood = latestWeekWithMoods && Object.keys(latestWeekWithMoods.moodDistribution).length > 0
    ? Object.entries(latestWeekWithMoods.moodDistribution).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0]
    : "unknown";

  // Prepare data for word cloud
  const wordCloudData = Object.entries(moodTotals)
    .map(([mood, count]) => ({
      value: mood.charAt(0).toUpperCase() + mood.slice(1), // Capitalize first letter
      count,
    }))
    .sort((a, b) => b.count - a.count);
    
  const moodChartData = Object.entries(moodTotals)
    .map(([mood, count]) => ({
      mood,
      value: count,
      fill: getColor(mood),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12); // Limit to top 12 moods for better visibility

  const totalMoods = moodChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Aggregate all keywords across weeks
  const keywordTotals = journalTrends.reduce(
    (acc, week) => {
      if (week.keywordDistribution && Object.keys(week.keywordDistribution).length > 0) {
        Object.entries(week.keywordDistribution).forEach(([keyword, count]) => {
          try {
            if (typeof keyword === 'string') {
              keyword.split("\n").forEach((kw) => {
                const cleanKeyword = kw.replace(/^-\s*/, "").trim();
                if (cleanKeyword) {
                  acc[cleanKeyword] = (acc[cleanKeyword] || 0) + (typeof count === 'number' ? count : 1);
                }
              });
            } else {
              // Handle case where keyword is directly a string
              const keywordStr = String(keyword || '');
              if (keywordStr.trim()) {
                acc[keywordStr] = (acc[keywordStr] || 0) + (typeof count === 'number' ? count : 1);
              }
            }
          } catch (error) {
            console.error("Error processing keyword:", keyword, error);
          }
        });
      }
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("====================================");
  console.log("keywordTotals:", keywordTotals);
  console.log("keywordTotals empty?", Object.keys(keywordTotals).length === 0);
  console.log("====================================");

  const keywordChartData = Object.entries(keywordTotals)
    .map(([keyword, count]) => ({
      keyword,
      value: count,
      fill: getColor(keyword),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12); // Limit to top 12 keywords

  const totalKeywords = keywordChartData.reduce((acc, curr) => acc + curr.value, 0);

  const moodConfig = Object.fromEntries(
    moodChartData.map((item) => [
      item.mood,
      {
        label: item.mood.charAt(0).toUpperCase() + item.mood.slice(1),
        color: item.fill,
      },
    ]),
  );

  const keywordConfig = {
    keywordCount: {
      label: "Keywords",
      color: getColor("keywordCount"),
    },
    ...Object.fromEntries(
      keywordChartData.map((item) => [
        item.keyword,
        {
          label: item.keyword,
          color: item.fill,
        },
      ]),
    ),
  };

  const journalConfig = {
    journalCount: {
      label: "Journal Entries",
      color: getColor("journalCount"),
    },
  };

  console.log("====================================");
  console.log(wordCloudData);
  console.log("====================================");

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-center">
        <ToggleGroup
          type="single"
          value={selectedDays}
          onValueChange={(value) => {
            if (value) setSelectedDays(value);
          }}
        >
          {TIME_PERIODS.map((period) => (
            <ToggleGroupItem
              key={period.value}
              value={period.value}
              aria-label={`Show data for ${period.label}`}
              className="px-4"
            >
              {period.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-center">Most Dominant Mood</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-2">
            <div className="text-8xl" title={dominantMood}>
              {moodEmojis[dominantMood] || "😶"}
            </div>
            <span className="text-lg font-medium capitalize">
              {dominantMood}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-center">Latest Mood</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-2">
            <div className="text-8xl" title={latestMood}>
              {moodEmojis[latestMood] || "😶"}
            </div>
            <span className="text-lg font-medium capitalize">{latestMood}</span>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Journal Entries per Week</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={journalConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={journalTrends}>
                <XAxis
                  dataKey="week"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <ChartTooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="journalCount"
                  fill={journalConfig.journalCount.color}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Mood Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {wordCloudData.length > 0 ? (
            <div className="flex justify-center p-4 h-[400px] overflow-auto bg-gradient-to-b from-white to-slate-50 rounded-lg">
              <TagCloud
                minSize={16}
                maxSize={42}
                tags={wordCloudData}
                className="flex flex-wrap justify-center items-center gap-2 w-full max-w-4xl mx-auto"
                colorOptions={{
                  luminosity: 'dark',
                  hue: 'random',
                  format: 'rgba',
                  alpha: 0.9
                }}
                onClick={(tag: any) => console.log('Tag clicked:', tag)}
              />
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <div className="text-muted-foreground">No mood data available for the selected time period</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {keywordChartData.length > 0 ? (
            <ChartContainer config={keywordConfig} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={keywordChartData}
                    dataKey="value"
                    nameKey="keyword"
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                  >
                    {keywordChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {totalKeywords.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Total Keywords
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                  <ChartLegend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <div className="text-muted-foreground">No keyword data available for the selected time period</div>
            </div>
          )}
        </CardContent>
      </Card>
      <MoodFeedback moodTag={dominantMood} />
    </div>
  );
}

export default MoodInsights;
