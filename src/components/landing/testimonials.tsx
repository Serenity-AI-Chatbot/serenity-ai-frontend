"use client"

import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'

const testimonials: { quote: string; name: string; title: string; }[] = [
  {
    quote: 'Serenity AI  has been a game-changer for my mental health. The personalized recommendations and exercises have helped me manage stress so much better.',
    name: 'Sarah L.',
    title: 'Yoga Instructor',
  },
  {
    quote: 'I was skeptical at first, but the emotionally intelligent conversations with the AI have been surprisingly helpful. It\'s like having a supportive friend available 24/7.',
    name: 'Mark T',
    title: 'Software Engineer',
  },
  {
    quote: 'The gamified wellness features keep me motivated to maintain good mental health habits. It\'s made a huge difference in my daily life.',
    name: 'Emily R.',
    title: 'Student',
  },
  {
    quote: 'As a busy entrepreneur, Serenity AI  has been invaluable in helping me manage stress and maintain work-life balance.',
    name: 'David K.',
    title: 'Entrepreneur',
  },
  {
    quote: 'The daily check-ins and personalized exercises have significantly improved my emotional well-being. I recommend Serenity AI  to all my colleagues.',
    name: 'Lisa M.',
    title: 'Teacher',
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="container mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
          What Our Users Say
        </h2>
        <InfiniteMovingCards
          items={testimonials}
          direction="right"
          speed="slow"
        />
      </div>
    </section>
  )
}
