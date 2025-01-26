import { JournalDetail } from '@/components/journal/journal-detail';
import { notFound } from 'next/navigation';

async function getJournal(id: string) {
  const res = await fetch(`http://localhost:3000/api/journal/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export default async function JournalPage({
  params,
}: {
  params: { id: string };
}) {
  const journal = await getJournal(params.id);
  
  if (!journal) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Mental Wellness Journal
        </h1>
        <JournalDetail journal={journal} />
      </div>
    </div>
  );
}