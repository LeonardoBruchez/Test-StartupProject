# Global Innovators

### Plataforma em desenvolvimento

Aplicacao para gerar material de estudo a partir de PDF:
- Resumo
- Perguntas de multipla escolha
- Dificuldade configuravel
- Fallback para modo mock quando necessario

## Tecnologias

- Frontend: React + Vite
- Backend: Express
- Upload de PDF: Multer
- Extracao de texto: pdf-parse-fork
- IA: Gemini

## 1. Configurar variaveis de ambiente

Crie o arquivo `.env` em `server/.env` (recomendado) com:

```env
GEMINI_API_KEY=sua_chave_gemini
GEMINI_MODEL=gemini-3-flash-preview
AI_FORCE_MOCK=false
PORT=8787
```

Observacoes:
- O servidor tenta carregar `.env` padrao e, se necessario, faz fallback para `server/.env`.
- Nunca commite seu `.env` com chave real.

## 2. Instalar dependencias

```bash
npm install
```

## 3. Rodar frontend + backend juntos

```bash
npm run dev
```

Isso sobe:
- Frontend (Vite)
- API em `http://localhost:8787`

## 4. Fluxo de uso

1. Envie um PDF.
2. Escolha formato de estudo: resumo ou perguntas.
3. Ajuste dificuldade e quantidade de questoes.
4. Clique em gerar.

## Endpoints da API

- `POST /api/study-material`
  - Tipo: `multipart/form-data`
  - Campos esperados:
    - `file` (PDF)
    - `studyType` (`summary` ou `questions`)
    - `summaryMode` (`quick` ou `deep`, quando `studyType=summary`)
    - `difficulty` (`beginner`, `intermediate`, `expert`)
    - `questionCount` (numero, quando `studyType=questions`)
    - `questionMode` (`practice` ou `simulation`)
    - `additionalInfo` (texto opcional)

## Observacoes importantes

- Se `AI_FORCE_MOCK=true`, a API retorna conteudo mock sem chamar Gemini.
- Se a cota da Gemini estourar, a API tambem retorna mock para manter o fluxo de testes.
- PDFs escaneados (imagem) podem precisar de OCR para melhor extracao de texto.

## Aviso sobre uso de IA

Algumas partes deste projeto foram desenvolvidas com apoio de IA devido a limitacoes de conhecimento tecnico no momento do desenvolvimento.

Todo o conteudo foi revisado com responsabilidade pelos autores, que assumem integralmente as decisoes de implementacao e os resultados obtidos.

Este projeto tem finalidade exclusivamente academica.
