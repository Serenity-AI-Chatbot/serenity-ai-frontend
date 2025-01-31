import { create } from 'zustand'

interface MoodData {
  journalTrends: Array<{
    week: string
    journalCount: number
    moodDistribution: Record<string, number>
    keywordDistribution: Record<string, number>
  }>
  activityTrends: Array<{
    week: string
    completedActivities: number
    avgActivityDifficulty: number
    activityTypes: {
      physical: number
      mental: number
      social: number
    }
  }>
  summaryInsights: {
    totalJournals: number
    totalActivities: number
    mostCommonMoods: Record<string, number>
  }
}

interface MoodStore {
  moodData: MoodData | null
  loading: boolean
  error: string | null
  fetchMoodTrends: (daysBack?: number) => Promise<void>
}

export const useMoodStore = create<MoodStore>((set) => ({
  moodData: null,
  loading: true,
  error: null,
  fetchMoodTrends: async (daysBack = 30) => {
    try {
      set({ loading: true })
      const response = await fetch(`/api/dashboard-insights?daysBack=${daysBack}`)
      if (!response.ok) {
        throw new Error("Failed to fetch mood insights")
      }
      const data = await response.json()
      set({ moodData: data, error: null })
    } catch (err) {
      set({ error: "Error fetching mood insights" })
    } finally {
      set({ loading: false })
    }
  },
})) 