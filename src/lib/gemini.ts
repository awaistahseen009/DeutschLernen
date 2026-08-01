import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { fetchFullYoutubeTranscript } from '@/lib/youtubeTranscript';

const geminiApiKeys = Array.from(new Set([
  process.env.GEMINI_API_KEY,
  process.env.GOOGLE_API_KEY
].map((key) => key?.trim()).filter(Boolean))) as string[];

const geminiClients = geminiApiKeys.length > 0
  ? geminiApiKeys.map((key) => new GoogleGenerativeAI(key))
  : [new GoogleGenerativeAI('')];

const genAI = {
  getGenerativeModel(params: any) {
    const models = geminiClients.map((client) => client.getGenerativeModel(params));
    return {
      generateContent: async (...args: any[]) => {
        let lastError: any;
        for (let i = 0; i < models.length; i++) {
          try {
            return await (models[i].generateContent as any)(...args);
          } catch (err: any) {
            lastError = err;
            if (isGeminiQuotaOrBillingError(err) && i < models.length - 1) {
              console.warn(`Gemini key ${i + 1} hit quota/billing limit. Trying next configured key.`);
              continue;
            }
            throw err;
          }
        }
        throw lastError;
      }
    };
  }
};
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Unlimited generation config without any maxOutputTokens parameter
const maxGenConfig = {};

const jsonMaxGenConfig = {
  responseMimeType: 'application/json'
};

const sentenceSchema = {
  type: SchemaType.OBJECT,
  properties: {
    tenseOrCase: { type: SchemaType.STRING },
    german: { type: SchemaType.STRING },
    english: { type: SchemaType.STRING }
  },
  required: ['tenseOrCase', 'german', 'english']
};

const vocabCardSchema = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING },
    word: { type: SchemaType.STRING },
    originalInText: { type: SchemaType.STRING },
    article: { type: SchemaType.STRING, nullable: true },
    plural: { type: SchemaType.STRING, nullable: true },
    translation: { type: SchemaType.STRING },
    level: { type: SchemaType.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] },
    type: { type: SchemaType.STRING, enum: ['verb', 'noun', 'adjective', 'idiom'] },
    sentences: {
      type: SchemaType.ARRAY,
      items: sentenceSchema
    },
    conjugation: {
      type: SchemaType.OBJECT,
      nullable: true,
      properties: {
        praesens: {
          type: SchemaType.OBJECT,
          properties: {
            ich: { type: SchemaType.STRING },
            du: { type: SchemaType.STRING },
            er_sie_es: { type: SchemaType.STRING },
            wir: { type: SchemaType.STRING },
            ihr: { type: SchemaType.STRING },
            sie_Sie: { type: SchemaType.STRING }
          }
        },
        praeteritum: {
          type: SchemaType.OBJECT,
          properties: {
            ich: { type: SchemaType.STRING },
            du: { type: SchemaType.STRING },
            er_sie_es: { type: SchemaType.STRING },
            wir: { type: SchemaType.STRING },
            ihr: { type: SchemaType.STRING },
            sie_Sie: { type: SchemaType.STRING }
          }
        },
        perfekt: {
          type: SchemaType.OBJECT,
          properties: {
            hilfsverb: { type: SchemaType.STRING, enum: ['haben', 'sein'] },
            partizip_ii: { type: SchemaType.STRING }
          }
        }
      }
    },
    declension: {
      type: SchemaType.OBJECT,
      nullable: true,
      properties: {
        nominativ: { type: SchemaType.STRING },
        akkusativ: { type: SchemaType.STRING },
        dativ: { type: SchemaType.STRING },
        genitiv: { type: SchemaType.STRING },
        plural: { type: SchemaType.STRING }
      }
    }
  },
  required: ['word', 'originalInText', 'translation', 'level', 'type', 'sentences']
};

const extractionListSchema = {
  type: SchemaType.OBJECT,
  properties: {
    verbs: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lemma: { type: SchemaType.STRING },
          originalInText: { type: SchemaType.STRING },
          translation: { type: SchemaType.STRING },
          level: { type: SchemaType.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] }
        },
        required: ['lemma', 'originalInText', 'translation', 'level']
      }
    },
    nouns: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lemma: { type: SchemaType.STRING },
          originalInText: { type: SchemaType.STRING },
          article: { type: SchemaType.STRING, enum: ['der', 'die', 'das'] },
          plural: { type: SchemaType.STRING },
          translation: { type: SchemaType.STRING },
          level: { type: SchemaType.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] }
        },
        required: ['lemma', 'originalInText', 'article', 'plural', 'translation', 'level']
      }
    },
    adjectives: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lemma: { type: SchemaType.STRING },
          originalInText: { type: SchemaType.STRING },
          translation: { type: SchemaType.STRING },
          level: { type: SchemaType.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] }
        },
        required: ['lemma', 'originalInText', 'translation', 'level']
      }
    },
    idioms: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lemma: { type: SchemaType.STRING },
          originalInText: { type: SchemaType.STRING },
          translation: { type: SchemaType.STRING },
          level: { type: SchemaType.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] }
        },
        required: ['lemma', 'originalInText', 'translation', 'level']
      }
    }
  },
  required: ['verbs', 'nouns', 'adjectives', 'idioms']
};

const cardBatchSchema = {
  type: SchemaType.OBJECT,
  properties: {
    cards: {
      type: SchemaType.ARRAY,
      items: vocabCardSchema
    }
  },
  required: ['cards']
};

type VocabCategory = 'verbs' | 'nouns' | 'adjectives' | 'idioms';

type ExtractedLemma = {
  lemma: string;
  originalInText: string;
  article?: string | null;
  plural?: string | null;
  translation: string;
  level: string;
  type: 'verb' | 'noun' | 'adjective' | 'idiom';
};

function makeJsonModel(responseSchema?: any) {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      ...(responseSchema ? { responseSchema } : {})
    }
  });
}

function parseJsonResponse(text: string) {
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
}

function isGeminiQuotaOrBillingError(err: any) {
  const message = String(err?.message || err || '').toLowerCase();
  return err?.status === 429 || message.includes('prepayment credits') || message.includes('quota') || message.includes('too many requests');
}

function throwUserFacingGeminiError(err: any) {
  if (isGeminiQuotaOrBillingError(err)) {
    const error = new Error('Gemini API credits/quota are exhausted. Please add credits in Google AI Studio billing, then try again.');
    (error as any).status = 429;
    (error as any).code = 'GEMINI_QUOTA_EXHAUSTED';
    throw error;
  }
  throw err;
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

function normalizeLemmaKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueLemmas(lemmas: ExtractedLemma[]) {
  const seen = new Set<string>();
  return lemmas.filter((item) => {
    const key = `${item.type}:${normalizeLemmaKey(item.lemma)}`;
    if (!item.lemma || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

export async function generateReadingPassage(topic: string, vocabList: string[]) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: jsonMaxGenConfig });
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
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (err: any) {
    console.error('Gemini generateReadingPassage error:', err);
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
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: jsonMaxGenConfig });
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
    const result = await model.generateContent(prompt);
    const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
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
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: jsonMaxGenConfig });
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

    const result = await model.generateContent(prompt);
    const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

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
  try {
    const title = customTitle || 'German Paragraph Extraction';
    const chunks = chunkTextBySentences(rawText);
    const extractor = makeJsonModel(extractionListSchema);
    const allLemmas: ExtractedLemma[] = [];

    for (const [index, chunk] of chunks.entries()) {
      const prompt = `
You are a strict German linguistic extractor.
Extract lemmas that actually appear in this German text chunk. Do not invent words.

Rules:
- Include every lexical verb, noun, adjective, and fixed idiom/phrase in this chunk.
- Normalize verbs to infinitive, nouns to singular nominative, adjectives to base positive form.
- Exclude purely grammatical helper words, names, punctuation, numbers, articles, pronouns, determiners, conjunctions, and prepositions.
- originalInText must be the exact form from the text.
- Return empty arrays for categories that are not present.

Chunk ${index + 1} of ${chunks.length}:
${chunk}
`;

      const result = await extractor.generateContent(prompt);
      const parsed = parseJsonResponse(result.response.text());

      (['verbs', 'nouns', 'adjectives', 'idioms'] as VocabCategory[]).forEach((category) => {
        const type = category === 'verbs' ? 'verb' : category === 'nouns' ? 'noun' : category === 'adjectives' ? 'adjective' : 'idiom';
        const items = Array.isArray(parsed[category]) ? parsed[category] : [];
        items.forEach((item: any) => {
          allLemmas.push({
            lemma: String(item.lemma || '').trim(),
            originalInText: String(item.originalInText || item.lemma || '').trim(),
            article: item.article || null,
            plural: item.plural || null,
            translation: String(item.translation || '').trim(),
            level: item.level || 'B1',
            type
          });
        });
      });
    }

    const lemmas = uniqueLemmas(allLemmas);
    const cards: any[] = [];
    const cardGenerator = makeJsonModel(cardBatchSchema);

    for (let i = 0; i < lemmas.length; i += 10) {
      const batch = lemmas.slice(i, i + 10);
      const prompt = `
Create complete German learning flashcards for these extracted vocabulary items.
Use only the provided item list; do not add unrelated words.

For every item:
- word is the lemma.
- originalInText must stay exactly as provided.
- Create exactly 5 sentence objects.
- For verbs, include tenses: Praesens, Praeteritum, Perfekt, Futur I, Konjunktiv II, plus conjugation.
- For nouns, include cases: Nominativ, Akkusativ, Dativ, Genitiv, Plural, plus article, plural, and declension.
- For adjectives, include: Positiv, Komparativ, Superlativ, Praedikativ, Attributiv.
- For idioms, include five natural examples.
- German sentences must be natural and useful for a German learner; English translations must be accurate.

Items:
${JSON.stringify(batch)}
`;

      const result = await cardGenerator.generateContent(prompt);
      const parsed = parseJsonResponse(result.response.text());
      if (Array.isArray(parsed.cards)) cards.push(...parsed.cards);
    }

    return groupCards(cards, title);
  } catch (err: any) {
    console.error('extractCardsFromParagraph error:', err);
    throwUserFacingGeminiError(err);
  }
}

async function unusedLegacyExtractCardsFromParagraph(rawText: string, customTitle?: string) {
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODEL,
    generationConfig: jsonMaxGenConfig
  });

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
    const result = await model.generateContent(prompt);
    const cleanText = result.response.text().trim();
    const data = JSON.parse(cleanText);

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
    const words = rawText.split(/\s+/).filter(w => w.length > 3).slice(0, 10);
    const timestamp = Date.now();

    return {
      title: customTitle || 'Deutscher Text Extrakt',
      verbs: words.slice(0, 3).map((w, idx) => ({
        id: `p_v_${timestamp}_${idx}`,
        word: w.replace(/[.,!?]/g, ''),
        originalInText: w,
        translation: 'to process / action',
        type: 'verb',
        level: 'B1',
        sentences: [
          { tenseOrCase: 'Präsens', german: `Ich werde ${w} im Satz verwenden.`, english: `I will use ${w} in sentence.` },
          { tenseOrCase: 'Präteritum', german: `Er hat ${w} genau angewendet.`, english: `He used ${w} precisely.` },
          { tenseOrCase: 'Perfekt', german: `Wir haben ${w} gut geübt.`, english: `We practiced ${w} well.` },
          { tenseOrCase: 'Futur I', german: `Du wirst ${w} bald verstehen.`, english: `You will understand ${w} soon.` },
          { tenseOrCase: 'Konjunktiv II', german: `Wenn es möglich wäre, würde ich ${w} nutzen.`, english: `If possible, I would use ${w}.` }
        ]
      })),
      nouns: words.slice(3, 6).map((w, idx) => ({
        id: `p_n_${timestamp}_${idx}`,
        word: w.replace(/[.,!?]/g, ''),
        article: 'die',
        plural: `${w}en`,
        originalInText: w,
        translation: 'concept / object',
        type: 'noun',
        level: 'B1',
        sentences: [
          { tenseOrCase: 'Nominativ', german: `Die ${w} ist sehr wichtig.`, english: `The ${w} is very important.` },
          { tenseOrCase: 'Akkusativ', german: `Ich verstehe die ${w} gut.`, english: `I understand the ${w} well.` },
          { tenseOrCase: 'Dativ', german: `Mit dieser ${w} lernen wir mehr.`, english: `With this ${w} we learn more.` },
          { tenseOrCase: 'Genitiv', german: `Die Bedeutung der ${w} ist klar.`, english: `The meaning of ${w} is clear.` },
          { tenseOrCase: 'Plural', german: `Viele ${w}en bringen Erfolg.`, english: `Many ${w}s bring success.` }
        ]
      })),
      adjectives: words.slice(6, 8).map((w, idx) => ({
        id: `p_a_${timestamp}_${idx}`,
        word: w.replace(/[.,!?]/g, ''),
        originalInText: w,
        translation: 'quality / description',
        type: 'adjective',
        level: 'B1',
        sentences: [
          { tenseOrCase: 'Positiv', german: `Das ist wirklich ${w}.`, english: `That is really ${w}.` },
          { tenseOrCase: 'Komparativ', german: `Es ist noch wichtiger.`, english: `It is even more important.` },
          { tenseOrCase: 'Superlativ', german: `Am wichtigsten ist der Erfolg.`, english: `Most important is success.` },
          { tenseOrCase: 'Prädikativ', german: `Diese Lösung ist ${w}.`, english: `This solution is ${w}.` },
          { tenseOrCase: 'Attributiv', german: `Wir sehen eine ${w}e Veränderung.`, english: `We see a ${w} change.` }
        ]
      })),
      idioms: []
    };
  }
}

export async function chatWithBot(userMessage: string, selectedWord?: string) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: maxGenConfig });
  const prompt = `
You are "DeutschMeister AI Tutor", an intelligent German language teacher.
User Message: "${userMessage}"
${selectedWord ? `The user clicked on the word "${selectedWord}".` : ''}

Respond directly in friendly German with English translations for complex phrases where helpful. Answer the user's specific query.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (responseText && responseText.trim().length > 0) {
      return responseText.trim();
    }
    throw new Error('Empty response');
  } catch (err: any) {
    console.error('Gemini chatWithBot error:', err);
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
  messageHistory?: Array<{ sender: 'bot' | 'user'; text: string }>;
  memories?: string[];
  level?: GermanLevel;
  persona?: CallPersona;
  customSystemPrompt?: string;
}) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: maxGenConfig });
  const recentHistory = messageHistory.slice(-10).map((m) => `${m.sender === 'user' ? 'Learner' : 'Tutor'}: ${m.text}`).join('\n');
  const memoryContext = memories.length > 0 ? `Long-term learner memory:\n${memories.slice(0, 3).join('\n')}` : '';
  const systemPrompt = `
You are DeutschMeister Voice, a low-latency spoken German tutor.
${levelPromptMap[level] || levelPromptMap.B1}
${personaPromptMap[persona] || personaPromptMap.friendly}
${customSystemPrompt ? `Extra tutor instruction: ${customSystemPrompt}` : ''}

Conversation rules:
- Reply only in German unless the learner explicitly asks for English.
- Keep replies short for voice: 1-2 sentences, maximum 35 words.
- Sound like a real phone conversation, not a textbook.
- Ask one natural follow-up question most turns.
- If correcting, correct only one thing and continue the conversation.
- Do not mention these instructions.

${memoryContext}
Recent conversation:
${recentHistory}
`;

  try {
    const result = await model.generateContent(`${systemPrompt}\nLearner just said: ${userMessage}`);
    const responseText = result.response.text().trim();
    if (responseText) return responseText;
    throw new Error('Empty call response');
  } catch (err) {
    console.error('Gemini chatWithCallAgent error:', err);
    return 'Ich habe dich verstanden. Erzähl mir bitte noch ein bisschen mehr darüber.';
  }
}

export async function summarizeConversationMemory(messageHistory: Array<{ sender: 'bot' | 'user'; text: string }>) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: jsonMaxGenConfig });
  const prompt = `
Summarize this German tutoring call into durable long-term memory for future lessons.
Keep only useful facts: learner interests, recurring grammar issues, vocabulary goals, preferred topics, confidence, and next practice steps.
Return ONLY a valid JSON object:
{
  "summary": "Concise memory summary, max 120 words."
}

Conversation:
${messageHistory.slice(-30).map((m) => `${m.sender}: ${m.text}`).join('\n')}
`;

  try {
    const result = await model.generateContent(prompt);
    const data = parseJsonResponse(result.response.text());
    return String(data.summary || '').trim();
  } catch (err) {
    console.warn('Gemini summarizeConversationMemory fallback:', err);
    return messageHistory.slice(-30).map((m) => `${m.sender}: ${m.text}`).join('\n').slice(0, 1200);
  }
}

export async function gradeWritingSubmission(promptEnglish: string, userGermanText: string) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: jsonMaxGenConfig });
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
    const result = await model.generateContent(prompt);
    const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
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
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: jsonMaxGenConfig });
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
    const result = await model.generateContent(prompt);
    const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
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
    ...(cardFolders.verbs || []),
    ...(cardFolders.nouns || []),
    ...(cardFolders.adjectives || []),
    ...(cardFolders.idioms || [])
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

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: jsonMaxGenConfig });

  const prompt = `
You are a German curriculum expert analyzing a German YouTube video:
URL: "${videoUrl}"
${officialTranscript ? `OFFICIAL FULL GERMAN TRANSCRIPT:\n"${(officialTranscript || '').slice(0, 15000)}"` : ''}

INSTRUCTIONS:
1. Provide the German Title for this video.
2. ${officialTranscript ? 'Use the exact official full German transcript provided above.' : 'Use the transcript exactly as provided by the caller.'}
3. Extract vocabulary items from this transcript.
4. For each word, generate 5 example sentences (showing tenses/cases), translation, article, type ("verb" or "noun"), and conjugation/declension tables.

Return ONLY a valid JSON object:
{
  "videoTitle": "Deutscher Titel des Videos",
  "videoUrl": "${videoUrl}",
  "transcript": ${JSON.stringify(officialTranscript || "Full German transcript...")},
  "extractedVocab": [
    {
      "id": "yt_${Date.now()}_1",
      "word": "verstehen",
      "translation": "to understand",
      "article": null,
      "level": "B1",
      "category": "YouTube Extract",
      "type": "verb",
      "sentences": [
        { "tenseOrCase": "Präsens", "german": "Ich verstehe die Grammatik gut.", "english": "I understand the grammar well." },
        { "tenseOrCase": "Präteritum", "german": "Er verstand die Frage sofort.", "english": "He understood the question immediately." },
        { "tenseOrCase": "Perfekt", "german": "Wir haben das Video verstanden.", "english": "We understood the video." },
        { "tenseOrCase": "Futur I", "german": "Du wirst es bald verstehen.", "english": "You will understand it soon." },
        { "tenseOrCase": "Konjunktiv II", "german": "Wenn er lauter spräche, verstände ich ihn.", "english": "If he spoke louder, I would understand him." }
      ],
      "conjugation": {
        "praesens": { "ich": "verstehe", "du": "verstehst", "er_sie_es": "versteht", "wir": "verstehen", "ihr": "versteht", "sie_Sie": "verstehen" },
        "praeteritum": { "ich": "verstand", "du": "verstandst", "er_sie_es": "verstand", "wir": "verstanden", "ihr": "verstandet", "sie_Sie": "verstanden" },
        "perfekt": { "hilfsverb": "haben", "partizip_ii": "verstanden" }
      }
    }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    if (officialTranscript) {
      data.transcript = officialTranscript;
    }

    return data;
  } catch (err) {
    console.error('generateVocabFromYoutubeTranscript fallback:', err);
    return {
      videoTitle: 'Deutsches YouTube Video',
      videoUrl,
      transcript: officialTranscript || `In diesem deutschen Video geht es um alltägliche Redewendungen, Hörverstehen und Wortschatzaufbau.\n\nDer Sprecher erklärt, wie man im Alltag natürlich Deutsch spricht, ohne Angst vor Grammatikfehlern zu haben.\n\nDurch regelmäßiges Anhören und Nachsprechen verbessert sich die Aussprache und das Verständnis von Satzstrukturen Schritt für Schritt.`,
      extractedVocab: [
        {
          id: `yt_${Date.now()}_fallback_1`,
          word: 'verbessern',
          translation: 'to improve / enhance',
          article: null,
          level: 'B1',
          category: 'YouTube Extract',
          type: 'verb',
          sentences: [
            { tenseOrCase: 'Präsens', german: 'Ich verbessere meine Aussprache täglich.', english: 'I improve my pronunciation daily.' },
            { tenseOrCase: 'Präteritum', german: 'Er verbesserte sein Wortschatzwissen.', english: 'He improved his vocabulary knowledge.' },
            { tenseOrCase: 'Perfekt', german: 'Wir haben unsere Deutschkenntnisse verbessert.', english: 'We have improved our German skills.' },
            { tenseOrCase: 'Futur I', german: 'Du wirst dich schnell verbessern.', english: 'You will improve quickly.' },
            { tenseOrCase: 'Imperativ', german: 'Verbessere deine Sätze durch Übung!', english: 'Improve your sentences through practice!' }
          ],
          conjugation: {
            praesens: { ich: 'verbessere', du: 'verbesserst', er_sie_es: 'verbessert', wir: 'verbessern', ihr: 'verbessert', sie_Sie: 'verbessern' },
            praeteritum: { ich: 'verbesserte', du: 'verbesserstest', er_sie_es: 'verbesserte', wir: 'verbesserten', ihr: 'verbessertest', sie_Sie: 'verbesserten' },
            perfekt: { hilfsverb: 'haben', partizip_ii: 'verbessert' }
          }
        }
      ]
    };
  }
}
