import { NextResponse } from 'next/server';
import { generateReadingPassage } from '@/lib/gemini';
import { query } from '@/lib/db';
import { VOCAB_DATABASE } from '@/data/vocabData';

export async function POST(request: Request) {
  try {
    const { topic = 'Nachrichten', userId = 1 } = await request.json();

    // Select random words from vocab list to pass to Gemini
    const shuffled = [...VOCAB_DATABASE].sort(() => 0.5 - Math.random());
    const randomWords = shuffled.slice(0, 10).map(v => v.word);

    const passage = await generateReadingPassage(topic, randomWords);

    // Save to database
    let passageId = null;
    try {
      const dbRes = await query(
        `INSERT INTO reading_passages (user_id, title, content, questions_json, topic)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id;`,
        [userId, passage.title, passage.content, JSON.stringify(passage.questions), topic]
      );
      if (dbRes.rows.length > 0) passageId = dbRes.rows[0].id;
    } catch (e) {
      console.warn('DB save reading passage skipped:', e);
    }

    return NextResponse.json({ ...passage, id: passageId });
  } catch (err: any) {
    console.error('Generate reading passage error:', err);
    return NextResponse.json({ error: 'Failed to generate passage' }, { status: 500 });
  }
}
