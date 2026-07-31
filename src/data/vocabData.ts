export interface SentenceExample {
  german: string;
  english: string;
  tenseOrCase: 'Präsens' | 'Präteritum' | 'Perfekt' | 'Futur I' | 'Konjunktiv' | 'Nominativ' | 'Akkusativ' | 'Dativ' | 'Genitiv';
}

export interface VerbConjugation {
  praesens: { ich: string; du: string; er_sie_es: string; wir: string; ihr: string; sie_Sie: string };
  praeteritum: { ich: string; du: string; er_sie_es: string; wir: string; ihr: string; sie_Sie: string };
  perfekt: { hilfsverb: 'haben' | 'sein'; partizip_ii: string; example: string };
  futur_i: string;
  imperativ: string;
}

export interface NounDeclension {
  nominativ: string; // z.B. der Klimawandel / die Frau / das Haus
  akkusativ: string; // z.B. den Klimawandel / die Frau / das Haus
  dativ: string;     // z.B. dem Klimawandel / der Frau / dem Haus
  genitiv: string;   // z.B. des Klimawandels / der Frau / des Hauses
}

export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  category: string;
  type: 'verb' | 'noun' | 'adjective' | 'connector';
  article?: 'der' | 'die' | 'das';
  plural?: string;
  declension?: NounDeclension;
  conjugation?: VerbConjugation;
  sentences: SentenceExample[];
}

export const VOCAB_DATABASE: VocabItem[] = [
  // --- MIXED VERBS AND NOUNS (RANDOMIZED MIX) ---
  
  // 1. NOUN (B1 Environment)
  {
    id: 'klimawandel',
    word: 'Klimawandel',
    translation: 'climate change',
    level: 'B1',
    category: 'Environment & Climate',
    type: 'noun',
    article: 'der',
    plural: 'kein Plural',
    declension: {
      nominativ: 'der Klimawandel',
      akkusativ: 'den Klimawandel',
      dativ: 'dem Klimawandel',
      genitiv: 'des Klimawandels'
    },
    sentences: [
      { tenseOrCase: 'Nominativ', german: 'Der Klimawandel bedroht viele Ökosysteme weltweit.', english: 'Climate change threatens many ecosystems worldwide.' },
      { tenseOrCase: 'Akkusativ', german: 'Wir müssen den Klimawandel ernsthaft bekämpfen.', english: 'We must seriously combat climate change.' },
      { tenseOrCase: 'Dativ', german: 'Wissenschaftler forschen seit Jahren an dem Klimawandel.', english: 'Scientists have been researching climate change for years.' },
      { tenseOrCase: 'Genitiv', german: 'Die Folgen des Klimawandels sind spürbar.', english: 'The consequences of climate change are noticeable.' },
      { tenseOrCase: 'Konjunktiv', german: 'Wenn wir mehr Solarenergie nutzten, könnten wir den Klimawandel verlangsamen.', english: 'If we used more solar energy, we could slow down climate change.' }
    ]
  },

  // 2. VERB (B1 Essential from OCR)
  {
    id: 'abholen',
    word: 'abholen',
    translation: 'to pick up / collect',
    level: 'B1',
    category: 'Essential Verbs',
    type: 'verb',
    conjugation: {
      praesens: { ich: 'hole ab', du: 'holst ab', er_sie_es: 'holt ab', wir: 'holen ab', ihr: 'holt ab', sie_Sie: 'holen ab' },
      praeteritum: { ich: 'holte ab', du: 'holtest ab', er_sie_es: 'holte ab', wir: 'holten ab', ihr: 'holtet ab', sie_Sie: 'holten ab' },
      perfekt: { hilfsverb: 'haben', partizip_ii: 'abgeholt', example: 'Ich habe mein Paket abgeholt.' },
      futur_i: 'Ich werde dich pünktlich abholen.',
      imperativ: 'Hol mich am Bahnhof ab!'
    },
    sentences: [
      { tenseOrCase: 'Präsens', german: 'Ich hole meine Schwester jeden Tag von der Schule ab.', english: 'I pick up my sister from school every day.' },
      { tenseOrCase: 'Präteritum', german: 'Gestern holte der Taxifahrer die Gäste pünktlich ab.', english: 'Yesterday the taxi driver picked up the guests on time.' },
      { tenseOrCase: 'Perfekt', german: 'Hast du das Paket schon von der Post abgeholt?', english: 'Have you already collected the package from the post office?' },
      { tenseOrCase: 'Futur I', german: 'Wir werden Sie morgen direkt am Flughafen abholen.', english: 'We will pick you up directly at the airport tomorrow.' },
      { tenseOrCase: 'Konjunktiv', german: 'Wenn ich ein Auto hätte, würde ich dich sofort abholen.', english: 'If I had a car, I would pick you up immediately.' }
    ]
  },

  // 3. NOUN (B1 Personality)
  {
    id: 'zuverlaessigkeit',
    word: 'Zuverlässigkeit',
    translation: 'reliability / dependability',
    level: 'B1',
    category: 'Character & Personality',
    type: 'noun',
    article: 'die',
    plural: 'kein Plural',
    declension: {
      nominativ: 'die Zuverlässigkeit',
      akkusativ: 'die Zuverlässigkeit',
      dativ: 'der Zuverlässigkeit',
      genitiv: 'der Zuverlässigkeit'
    },
    sentences: [
      { tenseOrCase: 'Nominativ', german: 'Die Zuverlässigkeit ist eine wichtige Eigenschaft im Beruf.', english: 'Reliability is an important quality in professional life.' },
      { tenseOrCase: 'Akkusativ', german: 'Wir schätzen deine Zuverlässigkeit sehr.', english: 'We value your reliability very much.' },
      { tenseOrCase: 'Dativ', german: 'Mit hoher Zuverlässigkeit erfüllt er alle Aufgaben.', english: 'With high reliability he fulfills all tasks.' },
      { tenseOrCase: 'Genitiv', german: 'Aufgrund der Zuverlässigkeit des Teams war das Projekt erfolgreich.', english: 'Due to the reliability of the team, the project was successful.' },
      { tenseOrCase: 'Konjunktiv', german: 'Ohne ihre Zuverlässigkeit gäbe es viele Probleme.', english: 'Without her reliability, there would be many problems.' }
    ]
  },

  // 4. VERB (B1 OCR)
  {
    id: 'absagen',
    word: 'absagen',
    translation: 'to cancel / call off',
    level: 'B1',
    category: 'Essential Verbs',
    type: 'verb',
    conjugation: {
      praesens: { ich: 'sage ab', du: 'sagst ab', er_sie_es: 'sagt ab', wir: 'sagen ab', ihr: 'sagt ab', sie_Sie: 'sagen ab' },
      praeteritum: { ich: 'sagte ab', du: 'sagtest ab', er_sie_es: 'sagte ab', wir: 'sagten ab', ihr: 'sagtet ab', sie_Sie: 'sagten ab' },
      perfekt: { hilfsverb: 'haben', partizip_ii: 'abgesagt', example: 'Er hat den Arzttermin abgesagt.' },
      futur_i: 'Wir werden das Meeting absagen müssen.',
      imperativ: 'Sag den Termin sofort ab!'
    },
    sentences: [
      { tenseOrCase: 'Präsens', german: 'Leider sage ich das Treffen für heute Abend ab.', english: 'Unfortunately, I am cancelling tonight’s meeting.' },
      { tenseOrCase: 'Präteritum', german: 'Der Veranstalter sagte das Konzert wegen Regens ab.', english: 'The organizer cancelled the concert due to rain.' },
      { tenseOrCase: 'Perfekt', german: 'Sie haben ihren Flug kurzfristig abgesagt.', english: 'They cancelled their flight on short notice.' },
      { tenseOrCase: 'Futur I', german: 'Wir werden die Konferenz absagen, wenn der Redner krank ist.', english: 'We will cancel the conference if the speaker is ill.' },
      { tenseOrCase: 'Konjunktiv', german: 'Es wäre schade, wenn wir die Feier absagen müssten.', english: 'It would be a pity if we had to cancel the celebration.' }
    ]
  },

  // 5. NOUN (B1 Work & Office)
  {
    id: 'arbeitsplatz',
    word: 'Arbeitsplatz',
    translation: 'workplace / job',
    level: 'B1',
    category: 'Work & Office Life',
    type: 'noun',
    article: 'der',
    plural: 'die Arbeitsplätze',
    declension: {
      nominativ: 'der Arbeitsplatz',
      akkusativ: 'den Arbeitsplatz',
      dativ: 'dem Arbeitsplatz',
      genitiv: 'des Arbeitsplatzes'
    },
    sentences: [
      { tenseOrCase: 'Nominativ', german: 'Der Arbeitsplatz ist modern und ergonomisch gestaltet.', english: 'The workplace is designed modern and ergonomically.' },
      { tenseOrCase: 'Akkusativ', german: 'Ich säubere jeden Abend meinen Arbeitsplatz.', english: 'I clean my workplace every evening.' },
      { tenseOrCase: 'Dativ', german: 'An meinem Arbeitsplatz fühle ich mich sehr wohl.', english: 'At my workplace I feel very comfortable.' },
      { tenseOrCase: 'Genitiv', german: 'Die Gestaltung des Arbeitsplatzes beeinflusst die Motivation.', english: 'The design of the workplace influences motivation.' },
      { tenseOrCase: 'Konjunktiv', german: 'Wenn der Arbeitsplatz ruhiger wäre, könnte ich konzentrierter arbeiten.', english: 'If the workplace were quieter, I could work with more focus.' }
    ]
  },

  // 6. VERB (B1 OCR)
  {
    id: 'anbieten',
    word: 'anbieten',
    translation: 'to offer',
    level: 'B1',
    category: 'Essential Verbs',
    type: 'verb',
    conjugation: {
      praesens: { ich: 'biete an', du: 'bietest an', er_sie_es: 'bietet an', wir: 'bieten an', ihr: 'bietet an', sie_Sie: 'bieten an' },
      praeteritum: { ich: 'bot an', du: 'botest an', er_sie_es: 'bot an', wir: 'boten an', ihr: 'botet an', sie_Sie: 'boten an' },
      perfekt: { hilfsverb: 'haben', partizip_ii: 'angeboten', example: 'Sie hat mir Kaffee angeboten.' },
      futur_i: 'Die Firma wird neue Stellen anbieten.',
      imperativ: 'Biete den Gästen ein Getränk an!'
    },
    sentences: [
      { tenseOrCase: 'Präsens', german: 'Die Sprachschule bietet Abendkurse an.', english: 'The language school offers evening courses.' },
      { tenseOrCase: 'Präteritum', german: 'Der Chef bot ihm eine Gehaltserhöhung an.', english: 'The boss offered him a pay raise.' },
      { tenseOrCase: 'Perfekt', german: 'Meine Nachbarin hat mir Hilfe angeboten.', english: 'My neighbor offered me help.' },
      { tenseOrCase: 'Futur I', german: 'Das Hotel wird nächstes Jahr einen Pool anbieten.', english: 'The hotel will offer a pool next year.' },
      { tenseOrCase: 'Konjunktiv', german: 'Wenn ich Zeit hätte, würde ich öfter Hilfe anbieten.', english: 'If I had time, I would offer help more often.' }
    ]
  },

  // 7. NOUN (B2 Advanced)
  {
    id: 'herausforderung',
    word: 'Herausforderung',
    translation: 'challenge',
    level: 'B2',
    category: 'Work & Ambitions',
    type: 'noun',
    article: 'die',
    plural: 'die Herausforderungen',
    declension: {
      nominativ: 'die Herausforderung',
      akkusativ: 'die Herausforderung',
      dativ: 'der Herausforderung',
      genitiv: 'der Herausforderung'
    },
    sentences: [
      { tenseOrCase: 'Nominativ', german: 'Die neue Aufgabe ist eine große Herausforderung.', english: 'The new task is a major challenge.' },
      { tenseOrCase: 'Akkusativ', german: 'Wir nehmen diese Herausforderung gerne an.', english: 'We gladly accept this challenge.' },
      { tenseOrCase: 'Dativ', german: 'Er stellt sich jeder beruflichen Herausforderung.', english: 'He faces every professional challenge.' },
      { tenseOrCase: 'Genitiv', german: 'Trotz der Herausforderung des Projekts haben wir gesiegt.', english: 'Despite the challenge of the project, we succeeded.' },
      { tenseOrCase: 'Konjunktiv', german: 'Ohne Herausforderungen würde das Leben langweilig werden.', english: 'Without challenges, life would become boring.' }
    ]
  },

  // 8. VERB (A1 Foundation)
  {
    id: 'lernen',
    word: 'lernen',
    translation: 'to learn / study',
    level: 'A1',
    category: 'Education & Daily Life',
    type: 'verb',
    conjugation: {
      praesens: { ich: 'lerne', du: 'lernst', er_sie_es: 'lernt', wir: 'lernen', ihr: 'lernt', sie_Sie: 'lernen' },
      praeteritum: { ich: 'lernte', du: 'lerntest', er_sie_es: 'lernte', wir: 'lernten', ihr: 'lerntet', sie_Sie: 'lernten' },
      perfekt: { hilfsverb: 'haben', partizip_ii: 'gelernt', example: 'Ich habe Deutsch gelernt.' },
      futur_i: 'Du wirst fließend Deutsch lernen.',
      imperativ: 'Lern jeden Tag 15 Minuten!'
    },
    sentences: [
      { tenseOrCase: 'Präsens', german: 'Ich lerne jeden Tag neue Vokabeln.', english: 'I learn new vocabulary every day.' },
      { tenseOrCase: 'Präteritum', german: 'Er lernte früher sehr fleißig in der Schule.', english: 'He used to study very diligently at school.' },
      { tenseOrCase: 'Perfekt', german: 'Hast du schon für die Prüfung gelernt?', english: 'Have you studied for the exam yet?' },
      { tenseOrCase: 'Futur I', german: 'Wir werden bald fließend Deutsch sprechen lernen.', english: 'We will soon learn to speak German fluently.' },
      { tenseOrCase: 'Konjunktiv', german: 'Wenn ich mehr Zeit hätte, würde ich noch eine Sprache lernen.', english: 'If I had more time, I would learn another language.' }
    ]
  },

  // 9. NOUN (B1 Education)
  {
    id: 'ausbildung',
    word: 'Ausbildung',
    translation: 'vocational training / education',
    level: 'B1',
    category: 'Education & Training',
    type: 'noun',
    article: 'die',
    plural: 'die Ausbildungen',
    declension: {
      nominativ: 'die Ausbildung',
      akkusativ: 'die Ausbildung',
      dativ: 'der Ausbildung',
      genitiv: 'der Ausbildung'
    },
    sentences: [
      { tenseOrCase: 'Nominativ', german: 'Die zweijährige Ausbildung beginnt im September.', english: 'The two-year vocational training begins in September.' },
      { tenseOrCase: 'Akkusativ', german: 'Er hat seine Ausbildung erfolgreich abgeschlossen.', english: 'He successfully completed his apprenticeship.' },
      { tenseOrCase: 'Dativ', german: 'Nach der Ausbildung möchte sie im Ausland arbeiten.', english: 'After her training she wants to work abroad.' },
      { tenseOrCase: 'Genitiv', german: 'Während der Ausbildung sammelt man viel Praxiserfahrung.', english: 'During training, one gathers a lot of practical experience.' },
      { tenseOrCase: 'Konjunktiv', german: 'Wenn ich diese Ausbildung machen würde, hätte ich gute Berufschancen.', english: 'If I did this apprenticeship, I would have good career prospects.' }
    ]
  },

  // 10. VERB (B1 OCR)
  {
    id: 'entscheiden',
    word: 'sich entscheiden',
    translation: 'to decide',
    level: 'B1',
    category: 'Essential Verbs',
    type: 'verb',
    conjugation: {
      praesens: { ich: 'entscheide mich', du: 'entscheidest dich', er_sie_es: 'entscheidet sich', wir: 'entscheiden uns', ihr: 'entscheidet euch', sie_Sie: 'entscheiden sich' },
      praeteritum: { ich: 'entschied mich', du: 'entschiedest dich', er_sie_es: 'entschied sich', wir: 'entschieden uns', ihr: 'entschiedet euch', sie_Sie: 'entschieden sich' },
      perfekt: { hilfsverb: 'haben', partizip_ii: 'entschieden', example: 'Ich habe mich für das Studium entschieden.' },
      futur_i: 'Wir werden uns morgen entscheiden.',
      imperativ: 'Entscheide dich jetzt!'
    },
    sentences: [
      { tenseOrCase: 'Präsens', german: 'Ich entscheide mich immer sehr sorgfältig.', english: 'I always decide very carefully.' },
      { tenseOrCase: 'Präteritum', german: 'Nach langem Überlegen entschied sich Anna für die Reise.', english: 'After long consideration, Anna decided on the trip.' },
      { tenseOrCase: 'Perfekt', german: 'Wir haben uns für eine Wohnung in Berlin entschieden.', english: 'We decided on an apartment in Berlin.' },
      { tenseOrCase: 'Futur I', german: 'Das Gericht wird nächste Woche entscheiden.', english: 'The court will decide next week.' },
      { tenseOrCase: 'Konjunktiv', german: 'An deiner Stelle würde ich mich für die zweite Option entscheiden.', english: 'In your place, I would choose the second option.' }
    ]
  }
];
