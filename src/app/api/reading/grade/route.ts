import { NextResponse } from 'next/server';
import { gradeReadingPassage } from '@/lib/gemini';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { passageId, passageContent, questions, userAnswers, userId = 1 } = await request.json();

    const grading = await gradeReadingPassage(passageContent, questions, userAnswers);

    // Save result to Neon PostgreSQL database
    try {
      await query(
        `INSERT INTO reading_results (user_id, passage_id, user_answers_json, score, feedback_json)
         VALUES ($1, $2, $3, $4, $5);`,
        [userId, passageId || null, JSON.stringify(userAnswers), grading.scorePercent, JSON.stringify(grading)]
      );
    } catch (e) {
      console.warn('DB save reading result skipped:', e);
    }

    return NextResponse.json(grading);
  } catch (err: any) {
    console.error('Grade reading passage error:', err);
    return NextResponse.json({ error: 'Failed to grade passage' }, { status: 500 });
  }
}
