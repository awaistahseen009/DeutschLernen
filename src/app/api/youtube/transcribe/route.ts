import { NextResponse } from 'next/server';
import { generateVocabFromYoutubeTranscript } from '@/lib/gemini';
import { query, initDbSchema } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { videoUrl, videoTitle: customTitle, manualTranscript } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'YouTube URL ist erforderlich' }, { status: 400 });
    }

    // Authenticate user session
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    let userId = '9d14a5f6-2549-47e9-a5b2-66c8911d825f';

    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'deutschmeister_jwt_secret_key_2026');
        if (decoded.userId) userId = decoded.userId;
      } catch (e) {
        console.warn('JWT verify fallback to default admin UUID');
      }
    }

    // Generate official video transcript and flashcards using Gemini
    const result = await generateVocabFromYoutubeTranscript(videoUrl, manualTranscript);
    const finalTitle = customTitle || result.videoTitle || 'YouTube Video';

    // Ensure database table exists and save transcript + extracted vocab to Neon PostgreSQL
    await initDbSchema();
    await query(
      `INSERT INTO youtube_transcripts (user_id, video_url, video_title, transcript, vocab_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, videoUrl, finalTitle, result.transcript, JSON.stringify(result.extractedVocab)]
    );

    return NextResponse.json({
      ...result,
      videoTitle: finalTitle
    });
  } catch (err: any) {
    console.error('YouTube transcribe API error:', err);
    return NextResponse.json({ error: err.message || 'Transkription fehlgeschlagen' }, { status: 500 });
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
      `SELECT id, video_url, video_title, transcript, vocab_json, created_at 
       FROM youtube_transcripts 
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    return NextResponse.json({
      transcripts: res.rows.map(r => ({
        id: r.id,
        videoUrl: r.video_url,
        videoTitle: r.video_title,
        transcript: r.transcript,
        extractedVocab: typeof r.vocab_json === 'string' ? JSON.parse(r.vocab_json) : r.vocab_json,
        createdAt: r.created_at
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ transcripts: [] });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Video ID ist erforderlich' }, { status: 400 });
    }

    await initDbSchema();
    await query(`DELETE FROM youtube_transcripts WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete video error:', err);
    return NextResponse.json({ error: err.message || 'Löschen fehlgeschlagen' }, { status: 500 });
  }
}
