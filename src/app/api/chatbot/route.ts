import { NextResponse } from 'next/server';
import { chatWithBot } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { userMessage, selectedWord } = await request.json();

    if (!userMessage && !selectedWord) {
      return NextResponse.json({ error: 'Message or word required' }, { status: 400 });
    }

    const responseText = await chatWithBot(userMessage || `Erkläre mir bitte das Wort "${selectedWord}".`, selectedWord);
    return NextResponse.json({ response: responseText });
  } catch (err: any) {
    console.error('Chatbot error:', err);
    return NextResponse.json({ response: 'Entschuldigung, der KI-Tutor ist momentan beschäftigt. Versuche es bitte gleich noch einmal!' });
  }
}
