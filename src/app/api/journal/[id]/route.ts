import { NextResponse } from 'next/server';

// Temporary mock data until we integrate Supabase
const journals = [
  {
    id: 1,
    date: '2024-01-26',
    mood: '😊 Happy',
    entry: 'Had a great day! Went for a walk at the beach and collected some sea shells. The scenery was beautiful and I enjoyed listening to the sounds of nature around me.',
  },
  {
    id: 2,
    date: '2024-01-25',
    mood: '😐 Neutral',
    entry: 'Regular work day. Nothing special happened, but that\'s okay too.',
  },
  {
    id: 3,
    date: '2024-01-24',
    mood: '😢 Sad',
    entry: 'Feeling a bit down today. Missing family and friends back home.',
  },
  {
    id: 4,
    date: '2024-01-23',
    mood: '😊 Happy',
    entry: 'Achieved a major milestone at work! Celebrated with the team.',
  },
];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const journal = journals.find(j => j.id === parseInt(params.id));
  
  if (!journal) {
    return NextResponse.json(
      { error: 'Journal not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(journal);
}