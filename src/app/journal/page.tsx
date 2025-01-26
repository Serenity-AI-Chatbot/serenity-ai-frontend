import { MainContent } from '@/components/journal/journal-page';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Mental Wellness Journal
        </h1>
        <MainContent />
      </div>
    </div>
  );
}