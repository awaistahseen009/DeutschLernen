// In-memory TTS Speech Caching Mechanism for zero latency
const utteranceCache = new Map<string, SpeechSynthesisUtterance>();
const audioCache = new Map<string, HTMLAudioElement>();

export async function speakTextWithCache(
  text: string, 
  rate: number = 1.0, 
  voiceURI?: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined') return;

  const cleanText = text.trim();
  if (!cleanText) return;

  const cacheKey = `${cleanText}_${rate}_${voiceURI || 'default'}`;

  // Check if Neural Vertex / Google Cloud Voice
  if (voiceURI && (voiceURI.includes('Journey') || voiceURI.includes('Neural') || voiceURI.includes('Wavenet') || voiceURI.includes('Studio'))) {
    if (audioCache.has(cacheKey)) {
      const cachedAudio = audioCache.get(cacheKey)!;
      cachedAudio.currentTime = 0;
      if (onStart) onStart();
      cachedAudio.play().catch(console.error);
      if (onEnd) cachedAudio.onended = onEnd;
      return;
    }

    try {
      if (onStart) onStart();
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voiceName: voiceURI, rate })
      });
      const data = await res.json();

      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audioCache.set(cacheKey, audio);
        audio.play().catch(console.error);
        if (onEnd) audio.onended = onEnd;
        return;
      }
    } catch (e) {
      console.warn('Vertex Neural TTS fallback to WebSpeech:', e);
    }
  }

  // WebSpeech API Fallback
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  let utterance: SpeechSynthesisUtterance;

  if (utteranceCache.has(cacheKey)) {
    utterance = utteranceCache.get(cacheKey)!;
  } else {
    utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'de-DE';
    utterance.rate = rate;

    if (voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const foundVoice = voices.find(v => v.voiceURI === voiceURI);
      if (foundVoice) utterance.voice = foundVoice;
    }

    utteranceCache.set(cacheKey, utterance);
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}
