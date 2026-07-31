import { NextResponse } from 'next/server';
import { gradeWritingSubmission } from '@/lib/gemini';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { promptEnglish, userGermanText, userId = 1 } = await request.json();

    if (!userGermanText) {
      return NextResponse.json({ error: 'German text required' }, { status: 400 });
    }

    const result = await gradeWritingSubmission(promptEnglish, userGermanText);

    try {
      await query(
        `INSERT INTO writing_submissions (user_id, prompt_english, user_german_text, score, feedback_json)
         VALUES ($1, $2, $3, $4, $5);`,
        [userId, promptEnglish, userGermanText, result.score, JSON.stringify(result)]
      );
    } catch (e) {
      console.warn('DB save writing submission skipped:', e);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Grade writing submission error:', err);
    return NextResponse.json({ error: 'Failed to grade writing' }, { status: 500 });
  }
}
