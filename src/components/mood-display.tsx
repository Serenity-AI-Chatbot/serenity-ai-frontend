interface MoodDisplayProps {
  mood: number
}

export function MoodDisplay({ mood }: MoodDisplayProps) {
  const emoji = mood >= 7 ? "😊" : mood >= 4 ? "😐" : "😔"

  return (
    <div className="flex items-center justify-center space-x-2 text-lg">
      <span>Feeling: {emoji}</span>
      <span>({mood}/10)</span>
    </div>
  )
}

