# DeutschMeister 🇩🇪 - High-Frequency German Learning Web Application

An German language learning web application built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Neon PostgreSQL**, **Prisma ORM**, **Pinecone Vector Database**, and **Google Gemini LLM**.

Designed with a **Cream (`#FAF7F2`) & Charcoal (`#18181B`) visual design**, featuring 4 main learning tabs, responsive dual sidebars, STT (Speech-To-Text) microphone recognition, real-time voice calls, and Pinecone long-term memory.

---

## Features

- **Cream & Charcoal Aesthetics**: Serif headings, gold accents, glassmorphic cards, custom soundwave animations.
- **Dual Sidebars**:
  - **Left Navigation**: Tab switching, CEFR level filter (`A1`, `A2`, `B1`, `B2`), German TTS voice dropdown selector.
  - **Right Sidebar**:
    - **Nomen Deklination Table** (Nominativ, Akkusativ, Dativ, Genitiv) for nouns.
    - **Verb Konjugation Table** (Präsens, Präteritum, Perfekt, Futur I, Imperativ, Partizip II) for verbs.
    - **KI Tutor Chatbot**: Left-clicking any word in reading passages auto-populates the prompt.
- **Tab 1: Wortschatz & Verben**: Flashcards with 5 example sentences per card, TTS speech play buttons, heart favorites, and an automatic 20-word milestone quiz.
- **Tab 2: KI Lesetexte**: Dynamic real-world reading passages (News, Sports, Entertainment, Politics, Tech), level anonymity, hover/underline floating dictionary, and 5-question AI grading.
- **Tab 3: Sprechen, Schreiben & Hören**: Microphone STT voice training, English-to-German writing exercise with LLM grading, and listening dialogues with a 15-question quiz.
- **Tab 4: Echtzeit KI Anruf**: Live voice call simulator with low latency, soundwave equalizer animations, voice speed controls (0.5x, 0.75x, 1.0x, 1.25x, 1.5x), and **Pinecone Vector Memory** (automatically stores context when history exceeds 30 messages).
- **Tab 5: Favoriten & Notizen**: Centralized hub for saved cards and study notes.

---

## Local Setup

### 1. Run Automated Setup Script

**On macOS / Linux**:
```bash
chmod +x setup.sh
./setup.sh
```

**On Windows (PowerShell)**:
```powershell
.\setup.ps1
```

### 2. Configure Environment Variables (`.env.local`)

Copy `.env.example` to `.env.local` and configure your credentials:

```env
# 1. NEON POSTGRESQL DATABASE URL
DATABASE_URL=postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require

# 2. GOOGLE GEMINI / VERTEX AI CREDENTIALS
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here
GCP_PROJECT_ID=your-google-cloud-project-id
GCP_LOCATION=us-central1

# 3. PINECONE VECTOR DATABASE
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=germanlang

# 4. AUTHENTICATION SECRET
JWT_SECRET=your_jwt_secret_here
```

### 3. Push Database Schema via Prisma

```bash
npx prisma db push
npx prisma generate
```

### 4. Create Initial Admin User via CMD

```bash
node scripts/setup-admin.js admin@domain.com myPassword123
```

### 5. Start Development Server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Vercel Deployment

Deploying DeutschMeister to Vercel is straightforward:

### Option A: Using Vercel CLI (Terminal)

1. Install Vercel CLI globally (if not installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to Vercel Preview:
   ```bash
   vercel
   ```

4. Deploy to Vercel Production:
   ```bash
   vercel --prod
   ```

### Option B: Using GitHub & Vercel Dashboard

1. Push your repository to GitHub.
2. Go to [https://vercel.com/new](https://vercel.com/new) and import your GitHub repository.
3. In **Environment Variables**, add:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME`
   - `JWT_SECRET`
4. Click **Deploy**. Vercel will build and host your production Next.js app automatically!
