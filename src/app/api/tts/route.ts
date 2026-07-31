import { NextResponse } from 'next/server';

// Ultra high quality Google Cloud / Vertex AI TTS Voices Endpoint
export async function POST(request: Request) {
  try {
    const { text, voiceName = 'de-DE-Journey-F', rate = 1.0 } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Call Google Cloud Text-to-Speech REST API using Neural2 / Journey AI voices
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const requestBody = {
      input: { text },
      voice: {
        languageCode: 'de-DE',
        name: voiceName.includes('de-DE') ? voiceName : 'de-DE-Neural2-C',
        ssmlGender: voiceName.includes('-F') || voiceName.includes('-C') ? 'FEMALE' : 'MALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Math.max(0.25, Math.min(2.0, rate)),
        pitch: 0
      }
    };

    const res = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioContent) {
        return NextResponse.json({ audioContent: data.audioContent });
      }
    }

    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 });
  } catch (err: any) {
    console.error('API TTS route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
