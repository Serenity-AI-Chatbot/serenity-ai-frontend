"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render theme toggle after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm fixed w-full z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          MindfulAI
        </Link>
        <nav className="hidden md:flex space-x-8">
          <Link href="#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Features</Link>
          <Link href="#how-it-works" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">How It Works</Link>
          <Link href="#testimonials" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Testimonials</Link>
        </nav>
        <div className="flex items-center space-x-4">
          <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {mounted ? (
              theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
            ) : null}
          </Button>
          <Button>Get Started</Button>
        </div>
      </div>
    </header>
  )
}
