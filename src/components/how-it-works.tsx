"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, MessageSquare, BarChart, Heart } from 'lucide-react'
// import { AnimatedNumbers } from '@/components/ui/animated-numbers'

const steps = [
  {
    title: 'Sign Up',
    description: 'Create your account and set your preferences.',
    icon: UserPlus,
    number: 1,
  },
  {
    title: 'Start Chatting',
    description: 'Engage in conversations with our AI companion.',
    icon: MessageSquare,
    number: 2,
  },
  {
    title: 'Track Progress',
    description: 'Monitor your emotional well-being over time.',
    icon: BarChart,
    number: 3,
  },
  {
    title: 'Improve Well-being',
    description: 'Experience better mental health with consistent use.',
    icon: Heart,
    number: 4,
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="text-center bg-white dark:bg-gray-700">
              <CardHeader>
                <div className="mx-auto bg-blue-100 dark:bg-blue-900 rounded-full p-3 mb-4">
                  <step.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300">{step.description}</CardDescription>
                {/* <AnimatedNumbers number={step.number} className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-4" /> */}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
