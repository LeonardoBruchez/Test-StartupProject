import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8787;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
      return;
    }
    cb(new Error('Apenas arquivos PDF sao permitidos.'));
  },
});

app.use(cors());
app.use(express.json());

const difficultyLabels = {
  beginner: 'INICIANTE',
  intermediate: 'INTERMEDIARIO',
  expert: 'AVANCADO',
};

const summaryModeLabels = {
  quick: 'RAPIDO',
  deep: 'APROFUNDADO',
};

const questionModeLabels = {
  practice: 'TREINO',
  simulation: 'SIMULADO',
};

function limitText(text, maxChars = 70000) {
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[TEXTO TRUNCADO]` : text;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getAiProcessingDelayMs() {
  const delay = Number(process.env.AI_PROCESSING_DELAY_MS);
  if (Number.isNaN(delay) || delay < 0) return 0;
  return Math.min(delay, 60000);
}

function buildMockSummary({ baseName, difficulty, summaryMode, additionalInfo, sourceText }) {
  return {
    type: 'summary',
    title: `Resumo: ${baseName}`,
    content: [
      'Resumo gerado em modo mock (sem chave de IA configurada).',
      '',
      `NIVEL: ${difficultyLabels[difficulty]} | MODO: ${summaryModeLabels[summaryMode]}`,
      '',
      'Principais pontos identificados no PDF:',
      `1. Introducao ao tema central de ${baseName}.`,
      '2. Conceitos e definicoes importantes para revisao.',
      '3. Aplicacoes praticas e exemplos comuns em prova.',
      '4. Fechamento com foco em revisao rapida.',
      '',
      additionalInfo ? `Contexto adicional considerado: ${additionalInfo}` : 'Sem contexto adicional informado.',
      '',
      `Trecho detectado no PDF: ${sourceText.slice(0, 300) || 'Nao foi possivel extrair texto.'}`,
    ].join('\n'),
  };
}

function buildMockQuestions({ baseName, difficulty, questionMode, questionCount, additionalInfo }) {
  const topics = [
    'conceitos basicos',
    'analise de caso',
    'aplicacao pratica',
    'revisao teorica',
    'interpretacao',
  ];

  const questions = Array.from({ length: questionCount }, (_, index) => {
    const topic = topics[index % topics.length];
    return {
      id: index + 1,
      statement: `No contexto de ${baseName}, qual alternativa melhor responde sobre ${topic}?`,
      options: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
      answer: ['A', 'B', 'C', 'D'][index % 4],
      explanation: `Explicacao de treino para ${topic} no nivel ${difficultyLabels[difficulty].toLowerCase()}.`,
    };
  });

  return {
    type: 'questions',
    title: `${questionMode === 'practice' ? 'Treino' : 'Simulado'}: ${baseName}`,
    mode: questionModeLabels[questionMode],
    questionMode,
    questions,
    additionalInfo,
  };
}

function normalizeGeminiModelName(modelName) {
  if (!modelName) return 'gemini-2.0-flash';
  return modelName.startsWith('models/') ? modelName.replace('models/', '') : modelName;
}

function getDeepSeekApiKey() {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  const maybeDeepSeekKey = process.env.GEMINI_API_KEY || '';
  return maybeDeepSeekKey.startsWith('sk-') ? maybeDeepSeekKey : '';
}

function resolveAiProvider() {
  const explicitProvider = (process.env.AI_PROVIDER || '').toLowerCase();
  if (explicitProvider === 'deepseek' || explicitProvider === 'gemini') {
    return explicitProvider;
  }

  if (getDeepSeekApiKey()) {
    return 'deepseek';
  }

  return 'gemini';
}

function getAiKeyForProvider(provider) {
  if (provider === 'deepseek') {
    return getDeepSeekApiKey();
  }
  return process.env.GEMINI_API_KEY || '';
}

function isTemporaryAiError(message) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('429')
    || normalized.includes('quota')
    || normalized.includes('rate limit')
    || normalized.includes('not found')
    || normalized.includes('too many requests')
    || normalized.includes('insufficient_quota')
    || normalized.includes('generatecontent')
  );
}

function buildOutputShape(studyType) {
  return studyType === 'summary'
    ? `{
  "type": "summary",
  "title": "Resumo: ...",
  "content": "texto completo"
}`
    : `{
  "type": "questions",
  "title": "Treino: ... ou Simulado: ...",
  "mode": "TREINO ou SIMULADO",
  "questionMode": "practice ou simulation",
  "questions": [
    {
      "id": 1,
      "statement": "...",
      "options": ["A...", "B...", "C...", "D..."],
      "answer": "A",
      "explanation": "..."
    }
  ]
}`;
}

function buildUserPrompt({
  studyType,
  summaryMode,
  questionMode,
  questionCount,
  difficulty,
  additionalInfo,
  baseName,
  sourceText,
}) {
  return [
    `Arquivo base: ${baseName}`,
    `Tipo de estudo: ${studyType}`,
    `Dificuldade: ${difficulty} (${difficultyLabels[difficulty]})`,
    studyType === 'summary'
      ? `Modo de resumo: ${summaryMode} (${summaryModeLabels[summaryMode]})`
      : `Modo de questoes: ${questionMode} (${questionModeLabels[questionMode]}) com ${questionCount} questoes`,
    `Informacoes adicionais do usuario: ${additionalInfo || 'nenhuma'}`,
    'Texto extraido do PDF:',
    sourceText,
    '',
    'Retorne neste formato JSON exatamente com os campos esperados:',
    buildOutputShape(studyType),
  ].join('\n');
}

function parseGeneratedJson(raw, { studyType, baseName, questionMode }) {
  if (!raw) {
    throw new Error('A IA nao retornou conteudo.');
  }

  const parsed = JSON.parse(raw);

  if (studyType === 'summary') {
    return {
      type: 'summary',
      title: parsed.title || `Resumo: ${baseName}`,
      content: parsed.content || 'Nao foi possivel montar o resumo.',
    };
  }

  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  return {
    type: 'questions',
    title: parsed.title || `${questionMode === 'practice' ? 'Treino' : 'Simulado'}: ${baseName}`,
    mode: parsed.mode || questionModeLabels[questionMode],
    questionMode: parsed.questionMode || questionMode,
    questions: questions.map((question, index) => ({
      id: Number(question.id) || index + 1,
      statement: question.statement || `Questao ${index + 1}`,
      options: Array.isArray(question.options) && question.options.length === 4
        ? question.options
        : ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
      answer: question.answer || 'A',
      explanation: question.explanation || 'Sem explicacao fornecida.',
    })),
  };
}

async function generateWithGemini({
  studyType,
  summaryMode,
  questionMode,
  questionCount,
  difficulty,
  additionalInfo,
  baseName,
  sourceText,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave do Gemini nao configurada.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: normalizeGeminiModelName(process.env.GEMINI_MODEL),
    systemInstruction: [
      'Voce e um especialista educacional em criacao de materiais para estudo.',
      'Responda SOMENTE em JSON valido.',
      'Nao use markdown e nao inclua texto fora do JSON.',
      'Idioma: portugues do Brasil.',
    ].join(' '),
  });
  const userPrompt = buildUserPrompt({
    studyType,
    summaryMode,
    questionMode,
    questionCount,
    difficulty,
    additionalInfo,
    baseName,
    sourceText,
  });

  const completion = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  });

  const raw = completion.response.text();
  return parseGeneratedJson(raw, { studyType, baseName, questionMode });
}

async function generateWithDeepSeek({
  studyType,
  summaryMode,
  questionMode,
  questionCount,
  difficulty,
  additionalInfo,
  baseName,
  sourceText,
}) {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    throw new Error('Chave do DeepSeek nao configurada.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  });

  const userPrompt = buildUserPrompt({
    studyType,
    summaryMode,
    questionMode,
    questionCount,
    difficulty,
    additionalInfo,
    baseName,
    sourceText,
  });

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'Voce e um especialista educacional em criacao de materiais para estudo.',
          'Responda SOMENTE em JSON valido.',
          'Nao use markdown e nao inclua texto fora do JSON.',
          'Idioma: portugues do Brasil.',
        ].join(' '),
      },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || '';
  return parseGeneratedJson(raw, { studyType, baseName, questionMode });
}

app.get('/api/health', (_req, res) => {
  const aiProvider = resolveAiProvider();
  const aiProcessingDelayMs = getAiProcessingDelayMs();
  res.json({
    ok: true,
    aiProvider,
    hasAiKey: Boolean(getAiKeyForProvider(aiProvider)),
    aiProcessingDelayMs,
  });
});

app.post('/api/study-material', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF foi enviado.' });
    }

    const studyType = req.body.studyType === 'questions' ? 'questions' : 'summary';
    const summaryMode = req.body.summaryMode === 'deep' ? 'deep' : 'quick';
    const questionMode = req.body.questionMode === 'simulation' ? 'simulation' : 'practice';
    const questionCount = Number(req.body.questionCount) || 10;
    const difficulty = ['beginner', 'intermediate', 'expert'].includes(req.body.difficulty)
      ? req.body.difficulty
      : 'intermediate';
    const additionalInfo = (req.body.additionalInfo || '').trim();

    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    const sourceText = limitText((pdfData.text || '').replace(/\s{2,}/g, ' ').trim());
    const baseName = req.file.originalname.replace(/\.pdf$/i, '');

    const materialInput = {
      studyType,
      summaryMode,
      questionMode,
      questionCount,
      difficulty,
      additionalInfo,
      baseName,
      sourceText,
    };

    let generated;
    let aiWarning = '';
    const aiProvider = resolveAiProvider();
    const aiKey = getAiKeyForProvider(aiProvider);
    const aiProcessingDelayMs = getAiProcessingDelayMs();

    console.log('Diagnostico IA:');
    console.log(`   provider: ${aiProvider}`);
    console.log(`   chave presente: ${Boolean(aiKey)}`);
    if (aiProvider === 'deepseek') {
      console.log(`   modelo: ${process.env.DEEPSEEK_MODEL || 'deepseek-chat'}`);
    } else {
      console.log(`   modelo: ${process.env.GEMINI_MODEL}`);
    }
    console.log(`   Tipo de estudo: ${studyType}`);
    console.log(`   atraso pre-IA: ${aiProcessingDelayMs}ms`);

    if (!aiKey) {
      console.log('   Chave nao configurada - usando mock');
      generated = studyType === 'summary'
        ? buildMockSummary(materialInput)
        : buildMockQuestions(materialInput);
      aiWarning = `Sem chave de IA configurada para provider ${aiProvider}. Material gerado em modo mock.`;
    } else {
      try {
        if (aiProcessingDelayMs > 0) {
          console.log(`   Aguardando ${aiProcessingDelayMs}ms antes de chamar a IA...`);
          await sleep(aiProcessingDelayMs);
        }

        console.log(`   Tentando chamar ${aiProvider}...`);
        generated = aiProvider === 'deepseek'
          ? await generateWithDeepSeek(materialInput)
          : await generateWithGemini(materialInput);
        console.log(`   ${aiProvider} respondeu com sucesso.`);
      } catch (aiError) {
        const aiMessage = aiError instanceof Error ? aiError.message : 'Erro desconhecido na IA.';
        console.log(`   Erro em ${aiProvider}: ${aiMessage}`);
        if (!isTemporaryAiError(aiMessage)) {
          console.log('   Erro nao-temporario - relancando');
          throw aiError;
        }

        console.log('   Erro temporario - usando mock');
        generated = studyType === 'summary'
          ? buildMockSummary(materialInput)
          : buildMockQuestions(materialInput);
        aiWarning = `Falha temporaria no provider ${aiProvider} (${aiMessage}). Material gerado em modo mock.`;
      }
    }

    const responsePayload = {
      ...generated,
      difficulty: difficultyLabels[difficulty],
      additionalInfo,
      timestamp: new Date().toLocaleString('pt-BR'),
      aiWarning,
    };

    return res.json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno ao processar o arquivo.';
    return res.status(500).json({ error: message });
  }
});

app.use((error, _req, res) => {
  const message = error instanceof Error ? error.message : 'Erro inesperado.';
  res.status(400).json({ error: message });
});

app.listen(port, () => {
  console.log(`API de estudo rodando em http://localhost:${port}`);
});
