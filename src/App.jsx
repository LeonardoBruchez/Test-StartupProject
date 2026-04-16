import React, { useState, useRef } from 'react';
import { Upload, Zap, Brain, Download, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [studyType, setStudyType] = useState('summary');
  const [summaryMode, setSummaryMode] = useState('quick');
  const [questionMode, setQuestionMode] = useState('practice');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Por favor, selecione um arquivo PDF.');
    }
  };

  const handleGenerate = async () => {
    if (!file) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studyType', studyType);
      formData.append('summaryMode', summaryMode);
      formData.append('questionMode', questionMode);
      formData.append('questionCount', String(questionCount));
      formData.append('difficulty', difficulty);
      formData.append('additionalInfo', additionalInfo.trim());

      const response = await fetch('/api/study-material', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao gerar material de estudo.');
      }

      setResult(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado na geracao do material.';
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setAdditionalInfo('');
  };

  return (
    <div className="container">
      <header>
        <h1>Global Innovators</h1>
        <p className="subtitle">Transforme seus planos de aula em resumos e provas inteligentes em segundos com o poder da IA.</p>
      </header>

      <main className="glass-card">
        {!result ? (
          <>
            <div className="upload-section">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                style={{ display: 'none' }}
              />
              <div
                className={`dropzone ${file ? 'active' : ''}`}
                onClick={() => fileInputRef.current.click()}
              >
                {file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <CheckCircle2 color="#8b5cf6" size={48} style={{ marginBottom: '1rem' }} />
                    <p style={{ fontWeight: 600 }}>{file.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Arquivo carregado com sucesso</p>
                  </div>
                ) : (
                  <>
                    <Upload className="dropzone-icon" color="var(--primary)" />
                    <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Arraste seu PDF aqui</p>
                    <p style={{ color: 'var(--text-muted)' }}>ou clique para procurar no seu computador</p>
                  </>
                )}
              </div>
            </div>

            <div className="controls">
              <div className="control-group">
                <label>Formato de Estudo</label>
                <div className="radio-group">
                  <button
                    className={`option-btn ${studyType === 'summary' ? 'selected' : ''}`}
                    onClick={() => setStudyType('summary')}
                  >
                    <Zap size={16} style={{ marginBottom: '4px' }} /><br />Resumo
                  </button>
                  <button
                    className={`option-btn ${studyType === 'questions' ? 'selected' : ''}`}
                    onClick={() => setStudyType('questions')}
                  >
                    <Brain size={16} style={{ marginBottom: '4px' }} /><br />Perguntas
                  </button>
                </div>
              </div>

              {studyType === 'summary' ? (
                <div className="control-group">
                  <label>Modo de Resumo</label>
                  <div className="radio-group">
                    <button
                      className={`option-btn ${summaryMode === 'quick' ? 'selected' : ''}`}
                      onClick={() => setSummaryMode('quick')}
                    >
                      Rapido
                    </button>
                    <button
                      className={`option-btn ${summaryMode === 'deep' ? 'selected' : ''}`}
                      onClick={() => setSummaryMode('deep')}
                    >
                      Profundo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="control-group">
                    <label>Tipo de Questao</label>
                    <div className="radio-group">
                      <button
                        className={`option-btn ${questionMode === 'practice' ? 'selected' : ''}`}
                        onClick={() => setQuestionMode('practice')}
                      >
                        Treino
                      </button>
                      <button
                        className={`option-btn ${questionMode === 'simulation' ? 'selected' : ''}`}
                        onClick={() => setQuestionMode('simulation')}
                      >
                        Simulado
                      </button>
                    </div>
                  </div>

                  <div className="control-group">
                    <label>Quantidade de Questoes</label>
                    <div className="radio-group">
                      {[5, 10, 15].map((count) => (
                        <button
                          key={count}
                          className={`option-btn ${questionCount === count ? 'selected' : ''}`}
                          onClick={() => setQuestionCount(count)}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="control-group">
                <label>Nível de Dificuldade</label>
                <div className="radio-group">
                  <button
                    className={`option-btn ${difficulty === 'beginner' ? 'selected' : ''}`}
                    onClick={() => setDifficulty('beginner')}
                  >
                    Iniciante
                  </button>
                  <button
                    className={`option-btn ${difficulty === 'intermediate' ? 'selected' : ''}`}
                    onClick={() => setDifficulty('intermediate')}
                  >
                    Interm.
                  </button>
                  <button
                    className={`option-btn ${difficulty === 'expert' ? 'selected' : ''}`}
                    onClick={() => setDifficulty('expert')}
                  >
                    Avançado
                  </button>
                </div>
              </div>
            </div>

            <div className="additional-info-group">
              <label htmlFor="additional-info">Informacoes adicionais (opcional)</label>
              <textarea
                id="additional-info"
                className="additional-info-input"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Ex.: foco nos topicos 2 e 4, prova da banca X, priorizar questoes com calculo, evitar questoes discursivas..."
                rows={4}
              />
            </div>

            <button
              className="generate-btn"
              disabled={!file || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <Sparkles size={20} /> {studyType === 'summary' ? 'Gerar Resumo' : 'Gerar Perguntas'}
                </>
              )}
            </button>
          </>
        ) : (
          <div className="result-section">
            <div className="result-header">
              <h2>{result.title}</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="download-btn" onClick={() => window.print()}>
                  <Download size={18} /> Baixar PDF
                </button>
                <button className="download-btn" style={{ background: 'transparent' }} onClick={reset}>
                  Novo Texto
                </button>
              </div>
            </div>
            <div className="content-preview">
              {result.type === 'summary' ? (
                <p style={{ whiteSpace: 'pre-wrap' }}>{result.content}</p>
              ) : (
                <>
                  {result.additionalInfo && (
                    <p className="questions-extra-info">Contexto adicional: {result.additionalInfo}</p>
                  )}
                  <p className="questions-meta">
                    Modo: {result.mode} | Dificuldade: {result.difficulty} | Total: {result.questions.length} questoes
                  </p>

                  <ol className="questions-list">
                    {result.questions.map((question) => (
                      <li key={question.id} className="question-card">
                        <p className="question-statement">{question.statement}</p>
                        <ul className="question-options">
                          {question.options.map((option, index) => (
                            <li key={option}>{String.fromCharCode(65 + index)}. {option}</li>
                          ))}
                        </ul>
                        {result.questionMode === 'practice' && (
                          <p className="question-answer">
                            Resposta: {question.answer} | {question.explanation}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>

                  {result.questionMode === 'simulation' && (
                    <div className="answer-key">
                      <h3>Gabarito</h3>
                      <p>
                        {result.questions.map((question) => `${question.id}) ${question.answer}`).join(' | ')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Gerado em {result.timestamp} • Global Innovators
            </p>
          </div>
        )}
      </main>

      <footer style={{ marginTop: 'auto', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        &copy; 2026 Global Innovators- Revolucionando o aprendizado acadêmico.
      </footer>
    </div>
  );
}

export default App;
