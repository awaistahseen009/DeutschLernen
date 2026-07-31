// In-memory TTS Speech Caching Mechanism for zero latency
const utteranceCache = new Map<string, SpeechSynthesisUtterance>();

export function speakTextWithCache(
  text: string, 
  rate: number = 1.0, 
  voiceURI?: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cacheKey = `${text}_${rate}_${voiceURI || 'default'}`;

  let utterance: SpeechSynthesisUtterance;

  if (utteranceCache.has(cacheKey)) {
    // Instant playback from cache!
    utterance = utteranceCache.get(cacheKey)!;
  } else {
    // Create & cache new utterance
    utterance = new SpeechSynthesisUtterance(text);
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
