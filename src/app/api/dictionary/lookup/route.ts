import { NextResponse } from 'next/server';
import { lookupWordContext } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { word, contextSentence } = await request.json();

    if (!word) {
      return NextResponse.json({ error: 'Word required' }, { status: 400 });
    }

    const result = await lookupWordContext(word, contextSentence);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Dictionary lookup error:', err);
    return NextResponse.json({
      word: request.headers.get('word') || 'Wort',
      englishTranslation: 'Translation service unavailable',
      germanDefinition: 'Bedeutung im Kontext',
      grammarNote: 'Grammatik-Hinweis',
      exampleSentence: 'Ein deutscher Beispielsatz.'
    });
  }
}
