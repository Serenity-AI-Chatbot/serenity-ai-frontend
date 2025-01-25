"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "2023-06-01", mood: 6 },
  { date: "2023-06-02", mood: 7 },
  { date: "2023-06-03", mood: 5 },
  { date: "2023-06-04", mood: 8 },
  { date: "2023-06-05", mood: 6 },
  { date: "2023-06-06", mood: 7 },
  { date: "2023-06-07", mood: 9 },
]

export function MoodTrends() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Line type="monotone" dataKey="mood" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

