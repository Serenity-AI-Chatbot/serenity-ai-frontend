"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, MessageCircle, Shield, Activity, Users, Award } from 'lucide-react'

const features = [
  {
    title: 'Sentiment Analysis',
    description: 'Analyze your emotions and receive targeted feedback.',
    icon: Brain,
  },
  {
    title: 'Personalized Recommendations',
    description: 'Get suggestions for activities and places to boost your mood.',
    icon: MessageCircle,
  },
  {
    title: 'Mental Health Exercises',
    description: 'Access guided exercises for mindfulness and relaxation.',
    icon: Activity,
  },
  {
    title: 'Emotionally Intelligent Conversations',
    description: 'Engage with an empathetic AI that understands and responds to your feelings.',
    icon: Users,
  },
  {
    title: 'Professional Help Referral',
    description: 'Connect with mental health professionals when needed.',
    icon: Shield,
  },
  {
    title: 'Gamified Wellness',
    description: 'Track your progress and earn rewards for consistent engagement.',
    icon: Award,
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="container mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Empowering Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-2" />
                <CardTitle className="text-gray-900 dark:text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
