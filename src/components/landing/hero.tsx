"use client"

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { BackgroundGradient } from '@/components/ui/background-gradient'

export default function Hero() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 pt-32">
      <div className="container mx-auto flex flex-col lg:flex-row items-center">
        <div className="lg:w-1/2 lg:pr-10">
          <TextGenerateEffect words="Your AI-Powered Mental Health Companion" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6" />
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Experience personalized emotional support, guided exercises, and intelligent conversations to boost your mental well-being.
          </p>
          <Button size="lg" className="text-lg px-8 py-4">
            Start Your Journey
          </Button>
        </div>
        <div className="lg:w-1/2 mt-10 lg:mt-0">
          <BackgroundGradient className="rounded-[22px] p-4 sm:p-10 bg-white dark:bg-gray-900">
            <Image
              src="/placeholder.svg?height=400&width=600"
              alt="AI Mental Health Support"
              width={600}
              height={400}
              className="rounded-lg shadow-xl"
            />
          </BackgroundGradient>
        </div>
      </div>
    </section>
  )
}
