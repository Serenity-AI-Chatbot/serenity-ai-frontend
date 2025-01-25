"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Header() {

  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Serenity AI
        </Link>
        <nav className="hidden md:flex space-x-8">
          <Link href="#features" className="text-gray-600 hover:text-blue-600">
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-gray-600 hover:text-blue-600"
          >
            How It Works
          </Link>
          <Link
            href="#testimonials"
            className="text-gray-600 hover:text-blue-600"
          >
            Testimonials
          </Link>
        </nav>
        <div className="space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
