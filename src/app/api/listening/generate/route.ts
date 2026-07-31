import { NextResponse } from 'next/server';
import { generateListeningDialogueAndQuiz } from '@/lib/gemini';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { topic = 'Alltag & Reise', action = 'generate', userId = 1, dialogueTitle, score, totalQuestions = 15 } = await request.json();

    if (action === 'save_score') {
      try {
        await query(
          `INSERT INTO listening_results (user_id, dialogue_title, score, total_questions)
           VALUES ($1, $2, $3, $4);`,
          [userId, dialogueTitle || 'Hörverstehen', score, totalQuestions]
        );
      } catch (e) {
        console.warn('DB save listening result skipped:', e);
      }
      return NextResponse.json({ success: true });
    }

    const data = await generateListeningDialogueAndQuiz(topic);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Listening API error:', err);
    return NextResponse.json({ error: 'Failed listening request' }, { status: 500 });
  }
}
