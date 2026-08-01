import { NextResponse } from 'next/server';
import { chatWithCallAgent, summarizeConversationMemory } from '@/lib/gemini';
import { storeMemoryInPinecone, queryMemoriesFromPinecone } from '@/lib/pinecone';
import { initDbSchema, query } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const DEFAULT_USER_ID = '9d14a5f6-2549-47e9-a5b2-66c8911d825f';

const defaultSettings = {
  level: 'B1',
  persona: 'friendly',
  customSystemPrompt: '',
  voiceUri: '',
  speechRate: 1,
  memoryEnabled: true
};

function getUserIdFromCookie() {
  const token = cookies().get('token')?.value;
  if (!token) return DEFAULT_USER_ID;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'deutschmeister_jwt_secret_key_2026');
    return decoded.userId || DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

async function loadCallSettings(userId: string) {
  await initDbSchema();
  const res = await query(
    `SELECT level, persona, custom_system_prompt, voice_uri, speech_rate, memory_enabled
     FROM call_settings
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  const row = res.rows[0];
  if (!row) return defaultSettings;

  return {
    level: row.level || defaultSettings.level,
    persona: row.persona || defaultSettings.persona,
    customSystemPrompt: row.custom_system_prompt || '',
    voiceUri: row.voice_uri || '',
    speechRate: Number(row.speech_rate || 1),
    memoryEnabled: row.memory_enabled !== false
  };
}

export async function GET() {
  try {
    const userId = getUserIdFromCookie();
    const settings = await loadCallSettings(userId);
    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error('Call settings GET error:', err);
    return NextResponse.json({ settings: defaultSettings });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = getUserIdFromCookie();
    const settings = { ...defaultSettings, ...(await request.json()) };
    await initDbSchema();

    await query(
      `INSERT INTO call_settings (user_id, level, persona, custom_system_prompt, voice_uri, speech_rate, memory_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET
         level = $2,
         persona = $3,
         custom_system_prompt = $4,
         voice_uri = $5,
         speech_rate = $6,
         memory_enabled = $7,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        settings.level,
        settings.persona,
        settings.customSystemPrompt || '',
        settings.voiceUri || '',
        Number(settings.speechRate || 1),
        settings.memoryEnabled !== false
      ]
    );

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error('Call settings PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserIdFromCookie();
    const { userMessage, messageHistory = [], settings: requestSettings = {} } = await request.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'User message required' }, { status: 400 });
    }

    const savedSettings = await loadCallSettings(userId);
    const settings = { ...savedSettings, ...requestSettings };

    let pastMemories: string[] = [];
    if (settings.memoryEnabled !== false) {
      const memoryPromise = queryMemoriesFromPinecone(userId, userMessage);
      const timeoutPromise = new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 700));
      try {
        pastMemories = await Promise.race([memoryPromise, timeoutPromise]);
      } catch {
        pastMemories = [];
      }
    }

    const responseText = await chatWithCallAgent({
      userMessage,
      messageHistory: messageHistory.slice(-12),
      memories: pastMemories,
      level: settings.level,
      persona: settings.persona,
      customSystemPrompt: settings.customSystemPrompt
    });

    const shouldStoreMemory = settings.memoryEnabled !== false && messageHistory.length >= 30 && messageHistory.length % 30 === 0;
    if (shouldStoreMemory) {
      summarizeConversationMemory(messageHistory)
        .then(async (summaryText) => {
          if (!summaryText) return;
          const stored = await storeMemoryInPinecone(userId, summaryText, messageHistory.length);
          await query(
            `INSERT INTO call_memory_summaries (user_id, summary, message_count, pinecone_stored)
             VALUES ($1, $2, $3, $4)`,
            [userId, summaryText, messageHistory.length, stored]
          );
        })
        .catch(console.error);
    }

    return NextResponse.json({
      response: responseText,
      memoriesUsed: pastMemories.length,
      settings
    });
  } catch (err: any) {
    console.error('Call API error:', err);
    return NextResponse.json({ response: 'Hallo! Ich habe dich verstanden. Wie moechtest du weiterueben?' });
  }
}
