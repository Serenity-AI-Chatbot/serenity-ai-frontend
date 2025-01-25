"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: "Physical", completed: 12 },
  { name: "Mental", completed: 18 },
  { name: "Social", completed: 8 },
]

export function ActivityStats() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="completed" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

