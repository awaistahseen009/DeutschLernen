import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '1';

    const learnedRes = await query('SELECT vocab_id FROM vocab_progress WHERE user_id = $1 AND learned = TRUE', [userId]);
    const favsRes = await query('SELECT vocab_id, note FROM favorites WHERE user_id = $1', [userId]);

    return NextResponse.json({
      learnedIds: learnedRes.rows.map(r => r.vocab_id),
      favorites: favsRes.rows.reduce((acc: Record<string, string>, r) => {
        acc[r.vocab_id] = r.note || '';
        return acc;
      }, {})
    });
  } catch (err: any) {
    console.error('Fetch vocab progress error:', err);
    return NextResponse.json({ learnedIds: [], favorites: {} });
  }
}

export async function POST(request: Request) {
  try {
    const { userId = 1, vocabId, learned, favorite, note } = await request.json();

    if (vocabId && typeof learned === 'boolean') {
      await query(`
        INSERT INTO vocab_progress (user_id, vocab_id, learned, times_reviewed)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, vocab_id)
        DO UPDATE SET learned = $3, times_reviewed = vocab_progress.times_reviewed + 1, updated_at = CURRENT_TIMESTAMP;
      `, [userId, vocabId, learned]);
    }

    if (vocabId && typeof favorite === 'boolean') {
      if (favorite) {
        await query(`
          INSERT INTO favorites (user_id, vocab_id, note)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, vocab_id)
          DO UPDATE SET note = $3;
        `, [userId, vocabId, note || '']);
      } else {
        await query(`DELETE FROM favorites WHERE user_id = $1 AND vocab_id = $2`, [userId, vocabId]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update vocab progress error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
