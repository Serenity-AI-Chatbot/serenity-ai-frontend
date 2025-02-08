import { JournalDetail } from '@/components/journal/journal-detail';
import { notFound } from 'next/navigation';

async function getJournal(id: string) {
  try {
    // Determine the base URL with proper protocol
    let baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      // If VERCEL_URL is available, use it with https protocol
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }

    // Ensure baseUrl doesn't end with a slash
    baseUrl = baseUrl.replace(/\/$/, '');

    const url = `${baseUrl}/api/journal/${id}`;
    
    console.log("================================================");
    console.log("Fetching from URL:", url);
    console.log("================================================");

    const res = await fetch(url, {
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching journal:', error);
    return null;
  }
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function JournalPage({ params }: Props) {
  const { id } = await params;
  const journal = await getJournal(id);
  
  if (!journal) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          {journal.title || 'Mental Wellness Journal'}
        </h1>
        <JournalDetail journal={journal} />
      </div>
    </div>
  );
}