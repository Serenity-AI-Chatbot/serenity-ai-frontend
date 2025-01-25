"use client";

import { Button } from "@/components/ui/button";
import { SparklesCore } from "@/components/ui/sparkles";
import Link from "next/link";

export default function CallToAction() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 dark:bg-blue-800 text-white relative overflow-hidden">
      <SparklesCore
        id="tsparticles"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={100}
        className="absolute inset-0 z-0"
        particleColor="#ffffff"
      />
      <div className="container mx-auto text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          Ready to Transform Your Mental Well-being?
        </h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Join thousands of users who have already improved their mental health
          with Serenity AI . Start your journey today!
        </p>
        <Link href={"/dashboard"}>
          {" "}
          <Button
            size="lg"
            variant="secondary"
            className="text-blue-600 dark:text-blue-800 bg-white hover:bg-gray-100"
          >
            Get Started Now
          </Button>
        </Link>
      </div>
    </section>
  );
}
