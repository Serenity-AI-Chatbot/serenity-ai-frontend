import { create } from 'zustand'

interface MoodData {
  chartData: Array<{
    date: string
    mood: number
  }>
  averageMood: number
  moodTrend: string
  totalEntries: number
  moodChange: string
}

interface MoodStore {
  moodData: MoodData | null
  loading: boolean
  error: string | null
  fetchMoodTrends: () => Promise<void>
}

export const useMoodStore = create<MoodStore>((set) => ({
  moodData: null,
  loading: true,
  error: null,
  fetchMoodTrends: async () => {
    try {
      set({ loading: true })
      const response = await fetch("/api/mood-trends")
      if (!response.ok) {
        throw new Error("Failed to fetch mood trends")
      }
      const data = await response.json()
      set({ moodData: data, error: null })
    } catch (err) {
      set({ error: "Error fetching mood data" })
    } finally {
      set({ loading: false })
    }
  },
})) 