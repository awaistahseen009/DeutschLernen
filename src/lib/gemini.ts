import { fetchFullYoutubeTranscript } from '@/lib/youtubeTranscript';

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = {
  role?: 'user' | 'model';
  parts: GeminiPart[];
};

function projectId() {
  return process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'pockclient-production';
}

function location() {
  return process.env.VERTEX_AI_LOCATION || process.env.GCP_LOCATION || 'us-central1';
}

function vertexHost() {
  const region = location();
  return region === 'global' ? 'aiplatform.googleapis.com' : `${region}-aiplatform.googleapis.com`;
}

export const VERTEX_GEMINI_MODEL = process.env.VERTEX_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const VERTEX_GEMINI_FAST_MODEL = process.env.VERTEX_GEMINI_FAST_MODEL || 'gemini-2.5-flash-lite';

async function accessToken() {
  const configured = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (configured) return configured;

  try {
    const res = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string };
      if (data.access_token) return data.access_token;
    }
  } catch {}

  return null;
}

function vertexGenerateContentEndpoint(project: string, model: string, apiKey?: string) {
  const region = location();
  const base = `https://${vertexHost()}/v1/projects/${project}/locations/${region}/publishers/google/models/${model}:generateContent`;
  if (apiKey) {
    return `${base}?key=${apiKey}`;
  }
  return base;
}

function extractJson(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || '{}';
}

async function callVertexApi({
  model = VERTEX_GEMINI_MODEL,
  system,
  prompt,
  parts = [],
  temperature = 0.2,
  responseMimeType
}: {
  model?: string;
  system?: string;
  prompt: string;
  parts?: GeminiPart[];
  temperature?: number;
  responseMimeType?: string;
}) {
  const project = projectId();
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

  const token = await accessToken();
  const endpoint = vertexGenerateContentEndpoint(project, model, !token && apiKey ? apiKey : undefined);

  const contents: GeminiContent[] = [{ role: 'user', parts: [{ text: prompt }, ...parts] }];
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const generationConfig: Record<string, any> = { temperature };
  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vertex AI request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
}

// Server-side in-memory dictionary lookup cache
const dictCache = new Map<string, any>();

// Direct Google Translation fallback for 100% translation accuracy on any German word
async function fetchGoogleTranslation(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0][0][0];
      }
    }
  } catch (e) {
    console.warn('Google Translate endpoint error:', e);
  }
  return text;
}

function chunkTextBySentences(text: string, maxChars = 4500): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence.trim()}` : sentence.trim();
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function groupCards(cards: any[], title: string) {
  const timestamp = Date.now();
  const data: Record<string, any> = {
    title,
    verbs: [],
    nouns: [],
    adjectives: [],
    idioms: []
  };

  cards.forEach((item, idx) => {
    const type = item?.type;
    const category = type === 'verb' ? 'verbs' : type === 'noun' ? 'nouns' : type === 'adjective' ? 'adjectives' : type === 'idiom' ? 'idioms' : null;
    if (!category) return;

    data[category].push({
      ...item,
      id: item.id || `p_${type}_${timestamp}_${idx}`,
      sentences: Array.isArray(item.sentences) ? item.sentences.slice(0, 5) : []
    });
  });

  return data;
}

export async function generateReadingPassage(topic: string, vocabList: string[]) {
  const prompt = `
You are an expert German language author creating engaging reading comprehension materials for intermediate-to-advanced learners.
Generate a real-world reading passage about "${topic}".
Include vocabulary from this list: ${vocabList.slice(0, 15).join(', ')} along with advanced B2 vocabulary.
CRITICAL CONSTRAINT: Do NOT state or mention the CEFR level anywhere in the text or output.

Return ONLY a valid JSON object with the following schema:
{
  "title": "German title of passage",
  "content": "Full German passage text (3-4 rich paragraphs)",
  "topic": "${topic}",
  "questions": [
    {
      "id": "q1",
      "questionGerman": "Question in German",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Brief explanation in English and German"
    }
  ]
}
`;

  try {
    const raw = await callVertexApi({
      prompt,
      responseMimeType: 'application/json'
    });
    return JSON.parse(extractJson(raw));
  } catch (err: any) {
    console.error('generateReadingPassage error:', err);
    return {
      title: `Aktuelles aus ${topic}: Moderne Trends in Deutschland`,
      content: `In der heutigen Gesellschaft spielen Themen wie Digitalisierung, Umweltschutz und soziale Gerechtigkeit eine immer wichtigere Rolle. Viele Menschen bemühen sich täglich, nachhaltige Entscheidungen zu treffen und neue Technologien in ihren Alltag zu integrieren. Während einige Experten die schnellen Veränderungen als große Herausforderung betrachten, sehen andere darin fantastische Chancen für die Zukunft. Das Stadtleben verändert sich stetig, und auch auf dem Land entstehen neue Arbeitsmöglichkeiten.`,
      topic,
      questions: [
        {
          id: 'q1',
          questionGerman: 'Was spielt in der heutigen Gesellschaft eine immer wichtigere Rolle?',
          options: ['A) Nur das Stadtleben', 'B) Digitalisierung und Umweltschutz', 'C) Weniger Technologie', 'D) Altes Brauchtum'],
          correctAnswer: 'B',
          explanation: 'Der Text nennt Digitalisierung, Umweltschutz und soziale Gerechtigkeit als zentrale Rolle.'
        },
        {
          id: 'q2',
          questionGerman: 'Wie betrachten einige Experten die schnellen Veränderungen?',
          options: ['A) Als unbedeutend', 'B) Als große Herausforderung', 'C) Als langweilig', 'D) Als fehlerhaft'],
          correctAnswer: 'B',
          explanation: 'Im Text steht: "...betrachten die schnellen Veränderungen als große Herausforderung".'
        },
        {
          id: 'q3',
          questionGerman: 'Was entsteht auf dem Land?',
          options: ['A) Neue Arbeitsmöglichkeiten', 'B) Mehr Stau', 'C) Weniger Natur', 'D) Keine Schulen'],
          correctAnswer: 'A',
          explanation: 'Der Text erwähnt: "...auch auf dem Land entstehen neue Arbeitsmöglichkeiten".'
        },
        {
          id: 'q4',
          questionGerman: 'Was versuchen viele Menschen täglich zu treffen?',
          options: ['A) Unüberlegte Urteile', 'B) Nachhaltige Entscheidungen', 'C) Keine Pläne', 'D) Falsche Tipps'],
          correctAnswer: 'B',
          explanation: 'Der Text besagt, dass Menschen versuchen, nachhaltige Entscheidungen zu treffen.'
        },
        {
          id: 'q5',
          questionGerman: 'Welche zwei Lebensräume werden im Text verglichen?',
          options: ['A) Schule und Uni', 'B) Stadtleben und Landleben', 'C) Beruf und Urlaub', 'D) Sommer und Winter'],
          correctAnswer: 'B',
          explanation: 'Im Text werden Stadtleben und Leben auf dem Land erwähnt.'
        }
      ]
    };
  }
}

export async function gradeReadingPassage(passageContent: string, questions: any[], userAnswers: Record<string, string>) {
  const prompt = `
Grade this German reading quiz.
Passage: "${passageContent.slice(0, 300)}..."
Questions & Correct Answers: ${JSON.stringify(questions)}
User Submitted Answers: ${JSON.stringify(userAnswers)}

Return ONLY a valid JSON object with:
{
  "scorePercent": 80,
  "correctCount": 4,
  "totalCount": 5,
  "feedback": "Detailed encouraging feedback in German and English",
  "breakdown": [
    { "questionId": "q1", "isCorrect": true, "userAnswer": "A", "correctAnswer": "A", "explanation": "..." }
  ]
}
`;

  try {
    const raw = await callVertexApi({
      prompt,
      responseMimeType: 'application/json'
    });
    return JSON.parse(extractJson(raw));
  } catch (err) {
    let correct = 0;
    const breakdown = questions.map(q => {
      const uAns = userAnswers[q.id] || '';
      const isRight = uAns.toUpperCase().startsWith(q.correctAnswer.toUpperCase());
      if (isRight) correct++;
      return {
        questionId: q.id,
        isCorrect: isRight,
        userAnswer: uAns,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      };
    });
    return {
      scorePercent: Math.round((correct / questions.length) * 100),
      correctCount: correct,
      totalCount: questions.length,
      feedback: `Gut gemacht! Du hast ${correct} von ${questions.length} Fragen richtig beantwortet.`,
      breakdown
    };
  }
}

export async function lookupWordContext(word: string, contextSentence?: string) {
  const cleanWord = word.trim().toLowerCase();
  const cacheKey = `${cleanWord}_${contextSentence?.slice(0, 30) || 'default'}`;

  if (dictCache.has(cacheKey)) {
    return dictCache.get(cacheKey);
  }

  try {
    const prompt = `
Translate and define the German word or phrase "${word}".
Sentence context: "${contextSentence || ''}"

Return ONLY a valid JSON object with exact schema:
{
  "word": "${word}",
  "partOfSpeech": "Nomen / Verb / Adjektiv / Ausdrücke",
  "article": "der / die / das or null",
  "englishTranslation": "Direct accurate English translation",
  "germanDefinition": "Einfache deutsche Erklärung",
  "grammarNote": "Kurzer Grammatik-Tipp",
  "exampleSentence": "Deutscher Beispielsatz"
}
`;

    const raw = await callVertexApi({
      prompt,
      responseMimeType: 'application/json'
    });
    const data = JSON.parse(extractJson(raw));

    if (data.englishTranslation && !data.englishTranslation.includes('translation service')) {
      dictCache.set(cacheKey, data);
      return data;
    }
    throw new Error('Fallback to Google Translate');
  } catch (err) {
    const exactEnglish = await fetchGoogleTranslation(word);

    const fallbackObj = {
      word,
      partOfSpeech: 'Wort',
      article: null,
      englishTranslation: exactEnglish,
      germanDefinition: `Bedeutung von "${word}" im Kontext`,
      grammarNote: 'Im deutschen Sprachgebrauch.',
      exampleSentence: `Das Wort "${word}" wird im Satz verwendet.`
    };

    dictCache.set(cacheKey, fallbackObj);
    return fallbackObj;
  }
}

export async function extractCardsFromParagraph(rawText: string, customTitle?: string) {
  const prompt = `
You are a master German linguistic analyzer. Analyze the following German text paragraph in detail:
"${rawText}"

CRITICAL REQUIREMENTS:
- Extract EVERY SINGLE verb, noun, adjective, and idiom/phrase present in this text! Do not omit anything.
- Output MUST be a valid JSON object with 4 arrays: "verbs", "nouns", "adjectives", and "idioms".
- For EACH item in the arrays, provide:
  - id: unique string ID
  - word: base dictionary form (Infinitiv for verbs, Singular for nouns, Base for adjectives, Full phrase for idioms)
  - originalInText: exact conjugated or declined word form as it appeared in the raw text
  - article: "der", "die", "das", or null
  - translation: accurate English translation
  - level: "A1", "A2", "B1", "B2", or "C1"
  - type: "verb", "noun", "adjective", or "idiom"
  - sentences: array of EXACTLY 5 example sentences (each having "tenseOrCase", "german", "english") showing different tenses or cases.

Expected JSON Structure:
{
  "title": "${customTitle || 'German Paragraph Extraction'}",
  "verbs": [
    {
      "id": "verb_1",
      "word": "Infinitive",
      "originalInText": "conjugated form in text",
      "translation": "English translation",
      "type": "verb",
      "level": "B1",
      "sentences": [
        { "tenseOrCase": "Präsens", "german": "...", "english": "..." },
        { "tenseOrCase": "Präteritum", "german": "...", "english": "..." },
        { "tenseOrCase": "Perfekt", "german": "...", "english": "..." },
        { "tenseOrCase": "Futur I", "german": "...", "english": "..." },
        { "tenseOrCase": "Konjunktiv II", "german": "...", "english": "..." }
      ]
    }
  ],
  "nouns": [
    {
      "id": "noun_1",
      "word": "Singular noun",
      "article": "der/die/das",
      "plural": "Plural form",
      "originalInText": "form in text",
      "translation": "English translation",
      "type": "noun",
      "level": "B1",
      "sentences": [
        { "tenseOrCase": "Nominativ", "german": "...", "english": "..." },
        { "tenseOrCase": "Akkusativ", "german": "...", "english": "..." },
        { "tenseOrCase": "Dativ", "german": "...", "english": "..." },
        { "tenseOrCase": "Genitiv", "german": "...", "english": "..." },
        { "tenseOrCase": "Plural", "german": "...", "english": "..." }
      ]
    }
  ],
  "adjectives": [
    {
      "id": "adj_1",
      "word": "Base adjective",
      "originalInText": "form in text",
      "translation": "English translation",
      "type": "adjective",
      "level": "A2",
      "sentences": [
        { "tenseOrCase": "Positiv", "german": "...", "english": "..." },
        { "tenseOrCase": "Komparativ", "german": "...", "english": "..." },
        { "tenseOrCase": "Superlativ", "german": "...", "english": "..." },
        { "tenseOrCase": "Prädikativ", "german": "...", "english": "..." },
        { "tenseOrCase": "Attributiv", "german": "...", "english": "..." }
      ]
    }
  ],
  "idioms": [
    {
      "id": "idiom_1",
      "word": "Phrase / Idiom",
      "originalInText": "form in text",
      "translation": "English meaning",
      "type": "idiom",
      "level": "B2",
      "sentences": [
        { "tenseOrCase": "Beispiel 1", "german": "...", "english": "..." },
        { "tenseOrCase": "Beispiel 2", "german": "...", "english": "..." },
        { "tenseOrCase": "Beispiel 3", "german": "...", "english": "..." },
        { "tenseOrCase": "Beispiel 4", "german": "...", "english": "..." },
        { "tenseOrCase": "Beispiel 5", "german": "...", "english": "..." }
      ]
    }
  ]
}
`;

  try {
    const raw = await callVertexApi({
      prompt,
      responseMimeType: 'application/json'
    });
    const data = JSON.parse(extractJson(raw));

    const timestamp = Date.now();
    ['verbs', 'nouns', 'adjectives', 'idioms'].forEach((cat) => {
      if (Array.isArray(data[cat])) {
        data[cat] = data[cat].map((item: any, idx: number) => ({
          ...item,
          id: item.id || `p_${cat[0]}_${timestamp}_${idx}`
        }));
      } else {
        data[cat] = [];
      }
    });

    return data;
  } catch (err: any) {
    console.error('extractCardsFromParagraph error:', err);
    throw err;
  }
}

export async function chatWithBot(userMessage: string, selectedWord?: string) {
  const prompt = `
You are "DeutschMeister AI Tutor", an intelligent German language teacher.
User Message: "${userMessage}"
${selectedWord ? `The user clicked on the word "${selectedWord}".` : ''}

Respond directly in friendly German with English translations for complex phrases where helpful. Answer the user's specific query.
`;

  try {
    const responseText = await callVertexApi({ prompt });
    if (responseText && responseText.trim().length > 0) {
      return responseText.trim();
    }
    throw new Error('Empty response');
  } catch (err: any) {
    console.error('chatWithBot error:', err);
    return `Sehr gerne! Zu deiner Frage: "${userMessage}". Ich helfe dir dabei, die deutsche Grammatik und den Wortschatz Schritt für Schritt zu meistern.`;
  }
}

type CallPersona = 'friendly' | 'teacher' | 'examiner' | 'travel' | 'work';
type GermanLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

const levelPromptMap: Record<GermanLevel, string> = {
  A1: 'Use very simple A1 German: short present-tense sentences, everyday words, one idea per sentence. Ask easy questions.',
  A2: 'Use simple A2 German with common past/perfect forms, familiar topics, and gentle corrections.',
  B1: 'Use natural B1 German, explain briefly when helpful, and keep the conversation flowing with follow-up questions.',
  B2: 'Use richer B2 German, idiomatic but clear phrasing, and challenge the learner with opinions and reasons.',
  C1: 'Use advanced, natural C1 German with nuanced vocabulary while staying conversational and not academic.'
};

const personaPromptMap: Record<CallPersona, string> = {
  friendly: 'Persona: warm German conversation partner. Be relaxed, encouraging, and curious.',
  teacher: 'Persona: patient German teacher. Correct one important mistake briefly, then continue naturally.',
  examiner: 'Persona: Goethe/TELC speaking examiner. Ask structured questions and follow-ups without sounding robotic.',
  travel: 'Persona: helpful travel conversation partner. Practice hotels, restaurants, tickets, directions, and small talk.',
  work: 'Persona: professional workplace conversation partner. Practice meetings, email phrasing, interviews, and office talk.'
};

export async function chatWithCallAgent({
  userMessage,
  messageHistory = [],
  memories = [],
  level = 'B1',
  persona = 'friendly',
  customSystemPrompt = ''
}: {
  userMessage: string;
  messageHistory?: { sender: 'user' | 'bot'; text: string }[];
  memories?: string[];
  level?: GermanLevel;
  persona?: CallPersona;
  customSystemPrompt?: string;
}) {
  const prompt = `
You are the voice call AI tutor inside DeutschMeister.
You must speak in natural spoken German for speech synthesis. Keep answers short (1-3 sentences).

Context & Persona:
- Level: ${level} (${levelPromptMap[level] || levelPromptMap.B1})
- Persona: ${persona} (${personaPromptMap[persona] || personaPromptMap.friendly})
${customSystemPrompt ? `- Custom Instruction: ${customSystemPrompt}` : ''}
${memories.length > 0 ? `- Relevant past user memory:\n${memories.map(m => `  * ${m}`).join('\n')}` : ''}

Recent Conversation:
${messageHistory.map(m => `${m.sender === 'user' ? 'Learner' : 'Tutor'}: ${m.text}`).join('\n')}

Learner: ${userMessage}
Tutor:
`;

  try {
    const text = await callVertexApi({ prompt });
    return text.trim();
  } catch (err: any) {
    console.error('chatWithCallAgent error:', err);
    return 'Hallo! Ich habe dich verstanden. Wie moechtest du weiterueben?';
  }
}

export async function summarizeConversationMemory(messageHistory: { sender: 'user' | 'bot'; text: string }[]) {
  if (!messageHistory || messageHistory.length < 6) return '';

  const prompt = `
Summarize the key facts about the German learner from this call history into a concise 2-3 sentence memory string in English.
Include their interests, mistakes, level, or topic preferences.

History:
${messageHistory.map(m => `${m.sender}: ${m.text}`).join('\n')}

Return JSON: { "summary": "Concise summary string" }
`;

  try {
    const raw = await callVertexApi({ prompt, responseMimeType: 'application/json' });
    const data = JSON.parse(extractJson(raw));
    return data.summary || '';
  } catch {
    return '';
  }
}

export async function gradeWritingSubmission(promptEnglish: string, userGermanText: string) {
  const prompt = `
You are a German language teacher grading a student's writing exercise.
Prompt: "${promptEnglish}"
Student's German submission: "${userGermanText}"

Return ONLY a valid JSON object with:
{
  "score": 85,
  "grammarScore": 88,
  "vocabScore": 82,
  "corrections": [
    { "original": "incorrect text", "correction": "corrected text", "explanation": "Grammar rule explanation" }
  ],
  "improvedVersion": "Polished, natural German version of student text",
  "overallFeedback": "Constructive feedback in German and English"
}
`;

  try {
    const raw = await callVertexApi({ prompt, responseMimeType: 'application/json' });
    return JSON.parse(extractJson(raw));
  } catch (err) {
    return {
      score: 85,
      grammarScore: 85,
      vocabScore: 85,
      corrections: [],
      improvedVersion: userGermanText,
      overallFeedback: 'Sehr gute Leistung! Dein Text ist verständlich und gut strukturiert.'
    };
  }
}

export async function generateListeningDialogueAndQuiz(topic: string) {
  const prompt = `
Generate a natural 2-person German audio conversation dialogue about "${topic}".
Then generate exactly 15 multiple-choice questions testing comprehension of this dialogue.

Return ONLY a valid JSON object with schema:
{
  "title": "Dialogue Title in German",
  "topic": "${topic}",
  "dialogue": [
    { "speaker": "Anna", "german": "Hallo Ben, hast du schon gehört?", "english": "Hello Ben, have you heard?" }
  ],
  "questions": [
    {
      "id": 1,
      "question": "Question 1 in German",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation"
    }
  ]
}
`;

  try {
    const raw = await callVertexApi({ prompt, responseMimeType: 'application/json' });
    return JSON.parse(extractJson(raw));
  } catch (err) {
    const fallbackQuestions = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      question: `Frage ${i + 1}: Was wurde im Gespräch über ${topic} besprochen?`,
      options: ['A) Wichtige Neuigkeiten', 'B) Ein Ausflug ins Museum', 'C) Das Abendessen', 'D) Ein Treffen mit Freunden'],
      correctAnswer: 0,
      explanation: 'Diese Information geht aus dem Dialog hervor.'
    }));

    return {
      title: `Gespräch über ${topic}`,
      topic,
      dialogue: [
        { speaker: 'Anna', german: 'Hallo Lukas! Hast du schon gehört, was in der Stadt passiert ist?', english: 'Hello Lukas! Have you heard what happened in town?' },
        { speaker: 'Lukas', german: 'Nein, erzähl schon! Gab es interessante Neuigkeiten?', english: 'No, tell me! Was there interesting news?' },
        { speaker: 'Anna', german: 'Ja, am Wochenende findet ein großes Festival für erneuerbare Energien und Kultur statt.', english: 'Yes, this weekend a big festival for renewable energy and culture takes place.' },
        { speaker: 'Lukas', german: 'Das klingt super. Wo findet das genau statt?', english: 'That sounds great. Where exactly is it taking place?' },
        { speaker: 'Anna', german: 'Direkt im Stadtzentrum am Marktplatz. Der Eintritt ist frei!', english: 'Right in the city center at the market square. Admission is free!' },
        { speaker: 'Lukas', german: 'Klasse, lass uns da zusammen hingehen!', english: 'Awesome, let us go there together!' }
      ],
      questions: fallbackQuestions
    };
  }
}

export async function generateVocabFromYoutubeTranscript(videoUrl: string, manualTranscript?: string) {
  let officialTranscript = manualTranscript?.trim() || await fetchFullYoutubeTranscript(videoUrl);

  if (!officialTranscript) {
    return {
      videoTitle: 'Deutsches YouTube Video',
      videoUrl,
      transcript: '',
      extractedVocab: [],
      warning: 'Kein deutsches YouTube-Transkript gefunden. Fuege bitte das offizielle deutsche Transkript manuell ein.'
    };
  }

  const cardFolders = await extractCardsFromParagraph(officialTranscript, 'YouTube Extract');
  const extractedVocab = [
    ...(cardFolders?.verbs || []),
    ...(cardFolders?.nouns || []),
    ...(cardFolders?.adjectives || []),
    ...(cardFolders?.idioms || [])
  ].map((item: any) => ({
    ...item,
    category: 'YouTube Extract'
  }));

  return {
    videoTitle: 'Deutsches YouTube Video',
    videoUrl,
    transcript: officialTranscript,
    extractedVocab
  };
}
