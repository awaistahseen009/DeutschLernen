import { NextResponse } from 'next/server';
import { chatWithBot } from '@/lib/gemini';
import { storeMemoryInPinecone, queryMemoriesFromPinecone } from '@/lib/pinecone';

export async function POST(request: Request) {
  try {
    const { userMessage, messageHistory = [], userId = '1' } = await request.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'User message required' }, { status: 400 });
    }

    // Low latency Pinecone memory lookup with 1.2s timeout fallback
    let pastMemories: string[] = [];
    try {
      const memoryPromise = queryMemoriesFromPinecone(userId, userMessage);
      const timeoutPromise = new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 1200));
      pastMemories = await Promise.race([memoryPromise, timeoutPromise]);
    } catch (e) {
      pastMemories = [];
    }

    const memoryContext = pastMemories.length > 0 
      ? `[Gelerntes Langzeitgedächtnis aus vergangenen Gesprächen: ${pastMemories.join(' | ')}]`
      : '';

    // Prompt Gemini with memory context for low-latency call response
    const fullPrompt = `${memoryContext}\nUser spricht am Telefon: "${userMessage}". Antworte wie in einem natürlichen Telefongespräch auf Deutsch. Behalte deine Antworten sehr prägnant (1-2 kurze Sätze), natürlich und sprichklar.`;
    const responseText = await chatWithBot(fullPrompt);

    // Asynchronously store long-term memory in Pinecone when history >= 30
    if (messageHistory.length >= 30) {
      const summaryText = messageHistory.slice(-30).map((m: any) => `${m.sender}: ${m.text}`).join('\n');
      storeMemoryInPinecone(userId, summaryText, messageHistory.length).catch(console.error);
    }

    return NextResponse.json({
      response: responseText,
      memoriesUsed: pastMemories.length
    });
  } catch (err: any) {
    console.error('Call API error:', err);
    return NextResponse.json({ response: 'Hallo! Schön, dass du anrufst. Wie geht es dir heute?' });
  }
}
