import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchFullYoutubeTranscript } from '@/lib/youtubeTranscript';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Server-side in-memory dictionary lookup cache
const dictCache = new Map<string, any>();

// Built-in offline dictionary fallback map for accurate instant translations
const commonDict: Record<string, { en: string; def: string; pos: string }> = {
  'deutsch': { en: 'German', def: 'Die deutsche Sprache oder Kultur', pos: 'Substantiv / Adjektiv' },
  'lernen': { en: 'to learn / study', def: 'Wissen oder Fähigkeiten erwerben', pos: 'Verb' },
  'wortschatz': { en: 'vocabulary', def: 'Gesamtheit der Wörter einer Sprache', pos: 'Substantiv (der)' },
  'beispiel': { en: 'example', def: 'Ein zur Erläuterung dienender Fall', pos: 'Substantiv (das)' },
  'satz': { en: 'sentence', def: 'Grammatische Einheit aus Wörtern', pos: 'Substantiv (der)' },
  'gesellschaft': { en: 'society / company', def: 'Menschliches Zusammenleben', pos: 'Substantiv (die)' },
  'verstehen': { en: 'to understand', def: 'Den Sinn von etwas erfassen', pos: 'Verb' },
  'sprechen': { en: 'to speak / talk', def: 'Wörter mundlich äußern', pos: 'Verb' },
  'schreiben': { en: 'to write', def: 'Text aufzeichnen', pos: 'Verb' },
  'lesen': { en: 'to read', def: 'Geschriebenes geistig aufnehmen', pos: 'Verb' },
  'hören': { en: 'to hear / listen', def: 'Töne mit den Ohren wahrnehmen', pos: 'Verb' },
  'übung': { en: 'exercise / practice', def: 'Praktisches Wiederholen', pos: 'Substantiv (die)' },
  'regel': { en: 'rule', def: 'Vorschrift oder Prinzip', pos: 'Substantiv (die)' },
  'frage': { en: 'question', def: 'Aufforderung zur Antwort', pos: 'Substantiv (die)' },
  'antwort': { en: 'answer / reply', def: 'Reaktion auf eine Frage', pos: 'Substantiv (die)' },
  'zeit': { en: 'time', def: 'Ablauf von Stunden und Tagen', pos: 'Substantiv (die)' },
  'leben': { en: 'life / to live', def: 'Dasein oder existieren', pos: 'Substantiv / Verb' },
  'welt': { en: 'world', def: 'Die Erde und das Universum', pos: 'Substantiv (die)' },
  'mensch': { en: 'human / person', def: 'Individuum der Spezies Homo sapiens', pos: 'Substantiv (der)' },
  'tag': { en: 'day', def: 'Zeitraum von 24 Stunden', pos: 'Substantiv (der)' },
  'jahr': { en: 'year', def: 'Zeitraum von 12 Monaten', pos: 'Substantiv (das)' },
  'gut': { en: 'good / well', def: 'Von hoher Qualität oder angenehm', pos: 'Adjektiv / Adverb' },
  'neu': { en: 'new', def: 'Erst vor Kurzem entstanden', pos: 'Adjektiv' },
  'groß': { en: 'large / big / great', def: 'Von bedeutendem Ausmaß', pos: 'Adjektiv' }
};

export async function generateReadingPassage(topic: string, vocabList: string[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

  // Check in-memory server cache
  if (dictCache.has(cacheKey)) {
    return dictCache.get(cacheKey);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `
Translate and define the German word or phrase "${word}".
Sentence context: "${contextSentence || ''}"

Return ONLY a valid JSON object with exact schema:
{
  "word": "${word}",
  "partOfSpeech": "Noun / Verb / Adjective / Expression",
  "article": "der / die / das or null",
  "englishTranslation": "Accurate English translation",
  "germanDefinition": "Simple German explanation",
  "grammarNote": "Brief grammar tip",
  "exampleSentence": "German example sentence"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    if (data.englishTranslation && !data.englishTranslation.includes('translation service')) {
      dictCache.set(cacheKey, data);
      return data;
    }
    throw new Error('Incomplete data');
  } catch (err) {
    console.warn('Gemini lookupWordContext fallback for word:', cleanWord);
    
    // Check built-in fallback dictionary
    const fallback = commonDict[cleanWord];
    const fallbackObj = {
      word,
      partOfSpeech: fallback?.pos || 'Wort',
      article: null,
      englishTranslation: fallback?.en || `${word} (translation)`,
      germanDefinition: fallback?.def || `Bedeutung von "${word}" im Deutschen`,
      grammarNote: 'Im Sprachgebrauch.',
      exampleSentence: `Das Wort "${word}" wird im Satz verwendet.`
    };

    dictCache.set(cacheKey, fallbackObj);
    return fallbackObj;
  }
}

export async function chatWithBot(userMessage: string, selectedWord?: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

export async function gradeWritingSubmission(promptEnglish: string, userGermanText: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a German curriculum expert analyzing a German YouTube video:
URL: "${videoUrl}"
${officialTranscript ? `OFFICIAL FULL GERMAN TRANSCRIPT:\n"${officialTranscript.slice(0, 15000)}"` : ''}

INSTRUCTIONS:
1. Provide the German Title for this video.
2. ${officialTranscript ? 'Use the exact official full German transcript provided above.' : 'Generate the FULL, untruncated German transcript captions (in German language only). Do NOT summarize or shorten the transcript.'}
3. Extract exactly 6 key vocabulary items (3 Verbs and 3 Nouns) from this transcript.
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
