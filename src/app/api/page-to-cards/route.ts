import { NextResponse } from 'next/server';
import { extractCardsFromParagraph } from '@/lib/gemini';
import { query, initDbSchema } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function countExtractedCards(result: any) {
  if (!result) return 0;
  return ['verbs', 'nouns', 'adjectives', 'idioms'].reduce((total, key) => {
    return total + (Array.isArray(result[key]) ? result[key].length : 0);
  }, 0);
}

export async function POST(request: Request) {
  try {
    const { rawText, customTitle } = await request.json();

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: 'Text ist erforderlich' }, { status: 400 });
    }

    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    let userId = '9d14a5f6-2549-47e9-a5b2-66c8911d825f';

    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'deutschmeister_jwt_secret_key_2026');
        if (decoded.userId) userId = decoded.userId;
      } catch (e) {}
    }

    // Call Gemini to extract verbs, nouns, adjectives, and idioms
    const result = await extractCardsFromParagraph(rawText, customTitle);

    if (!result || countExtractedCards(result) === 0) {
      return NextResponse.json(
        { error: 'Gemini did not return any extractable cards. No project was saved.' },
        { status: 422 }
      );
    }

    const projectTitle = result?.title || customTitle || 'German Extraction';

    // Ensure PostgreSQL table exists and save text project
    await initDbSchema();
    const dbRes = await query(
      `INSERT INTO text_projects (user_id, title, raw_text, result_json)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, projectTitle, rawText, JSON.stringify(result)]
    );

    return NextResponse.json({
      id: dbRes.rows[0]?.id,
      title: projectTitle,
      rawText,
      result,
      createdAt: dbRes.rows[0]?.created_at
    });
  } catch (err: any) {
    console.error('Page to cards API POST error:', err);
    const status = err.status === 429 ? 429 : 500;
    return NextResponse.json({ error: err.message || 'Verarbeitung fehlgeschlagen', code: err.code }, { status });
  }
}

export async function GET() {
  try {
    await initDbSchema();
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    let userId = '9d14a5f6-2549-47e9-a5b2-66c8911d825f';

    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'deutschmeister_jwt_secret_key_2026');
        if (decoded.userId) userId = decoded.userId;
      } catch (e) {}
    }

    const res = await query(
      `SELECT id, title, raw_text, result_json, created_at 
       FROM text_projects 
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    return NextResponse.json({
      projects: res.rows.map(r => ({
        id: r.id,
        title: r.title,
        rawText: r.raw_text,
        result: typeof r.result_json === 'string' ? JSON.parse(r.result_json) : r.result_json,
        createdAt: r.created_at
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ projects: [] });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID ist erforderlich' }, { status: 400 });

    await initDbSchema();
    await query(`DELETE FROM text_projects WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
