import { NextResponse } from 'next/server';
import { chatWithBot } from '@/lib/gemini';
import { storeMemoryInPinecone, queryMemoriesFromPinecone } from '@/lib/pinecone';

export async function POST(request: Request) {
  try {
    const { userMessage, messageHistory = [], userId = '1' } = await request.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'User message required' }, { status: 400 });
    }

    // Query past memories from Pinecone
    const pastMemories = await queryMemoriesFromPinecone(userId, userMessage);
    const memoryContext = pastMemories.length > 0 
      ? `[Gelerntes Langzeitgedächtnis aus vergangenen Gesprächen: ${pastMemories.join(' | ')}]`
      : '';

    // Prompt Gemini with memory context
    const fullPrompt = `${memoryContext}\nUser spricht am Telefon: "${userMessage}". Antworte wie in einem natürlichen Telefongespräch auf Deutsch. Behalte deine Antworten prägnant, natürlich und sprichklar.`;
    const responseText = await chatWithBot(fullPrompt);

    // If history length exceeds 30 messages, trigger Pinecone memory storage
    let memorySaved = false;
    if (messageHistory.length >= 30) {
      const summaryText = messageHistory.slice(-30).map((m: any) => `${m.sender}: ${m.text}`).join('\n');
      memorySaved = await storeMemoryInPinecone(userId, summaryText, messageHistory.length);
    }

    return NextResponse.json({
      response: responseText,
      memorySaved,
      memoriesUsed: pastMemories.length
    });
  } catch (err: any) {
    console.error('Call API error:', err);
    return NextResponse.json({ response: 'Hallo! Schön, dass du anrufst. Wie geht es dir heute?' });
  }
}
