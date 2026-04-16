# Global Innovators

### Plataforma em desenvolvimento

Aplicacao para gerar material de estudo a partir de PDF:
- Resumo (rapido/profundo)
- Perguntas (treino/simulado)
- Campo de informacoes adicionais para orientar a IA

## Tecnologias

- Frontend: React + Vite
- Backend: Express
- Upload de PDF: Multer
- Extracao de texto: pdf-parse
- IA: DeepSeek ou Gemini (com fallback mock sem chave)

## 1. Configurar variaveis de ambiente

1. Crie um arquivo `.env` na raiz com uma destas opcoes.
2. Preencha sua chave:

```env
# Opcao A (recomendada para sua chave atual)
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sua_chave_deepseek
DEEPSEEK_MODEL=deepseek-chat
AI_PROCESSING_DELAY_MS=4000

# Opcao B (Gemini)
# AI_PROVIDER=gemini
# GEMINI_API_KEY=sua_chave_gemini
# GEMINI_MODEL=gemini-2.0-flash

PORT=8787
```

Se a chave da IA nao for informada ou a cota estourar, o backend responde com modo mock (para voce testar o fluxo sem custo).
Voce pode ajustar `AI_PROCESSING_DELAY_MS` para aguardar alguns milissegundos antes da chamada da IA, por exemplo 4000 (4 segundos).

## 2. Instalar dependencias

```bash
npm install
```

## 3. Rodar frontend + backend juntos

```bash
npm run dev
```

Isso sobe:
- Vite (frontend)
- API em `http://localhost:8787`

## 4. Fluxo de uso

1. Envie um PDF.
2. Escolha formato de estudo: resumo ou perguntas.
3. Ajuste dificuldade e opcoes de modo.
4. Preencha informacoes adicionais (opcional).
5. Clique em gerar.

## Endpoints da API

- `GET /api/health`
	- Retorna status, provider de IA detectado e se existe chave configurada.

- `POST /api/study-material`
	- `multipart/form-data`
	- Campos esperados:
		- `file` (PDF)
		- `studyType` (`summary` ou `questions`)
		- `summaryMode` (`quick` ou `deep`)
		- `questionMode` (`practice` ou `simulation`)
		- `questionCount` (numero)
		- `difficulty` (`beginner`, `intermediate`, `expert`)
		- `additionalInfo` (texto opcional)

## Observacoes importantes

- A chave da IA fica apenas no backend.
- O frontend chama `\/api\/study-material` e o Vite faz proxy para a API local.
- PDFs escaneados (imagem) podem precisar de OCR para melhorar a extracao.
