import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Brain,
  Search,
  MessageSquare,
  Copy,
  Loader2,
  Sparkles,
  Send,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

interface DocumentRow {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  content: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface AIResponse {
  content: string;
  sources: string[];
  confidence: number;
  tokens_used: number;
}

// ---- Gemini helper ----
async function callGemini(prompt: string, temperature = 0.7): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 8192, topP: 0.95 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Erro Gemini: ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem conteúdo gerado';
}

export function RAGManager() {
  const { tenant, activeTenant } = useAuthStore() as any;
  // Use activeTenant (the selected client) — falls back to tenant (logged-in user) if not set
  const currentTenant = activeTenant ?? tenant;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Documents state
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AIResponse | null>(null);

  // Chat state
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Copy state
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // ---- Load documents from Supabase ----
  const loadDocuments = useCallback(async () => {
    if (!currentTenant?.id) return;
    setIsLoading(true);
    // Clear documents immediately when switching tenants
    setDocuments([]);
    try {
      const { data, error: err } = await supabase
        .from('documents')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar documentos:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ---- Build RAG context from documents ----
  const buildRAGContext = useCallback((): string => {
    if (documents.length === 0) return '';
    return documents
      .map(doc => {
        const content = doc.content?.substring(0, 3000) || '';
        return `📄 ${doc.name}:\n${content}`;
      })
      .join('\n\n---\n\n');
  }, [documents]);

  // ---- Upload file ----
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTenant?.id) return;

    setIsUploading(true);
    setUploadProgress(10);
    setError(null);
    setUploadSuccess(null);

    try {
      // Read file content as text
      const rawText = await file.text();
      // Sanitize: remove control characters (except \n \t \r) that break JSON serialization
      const text = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
      setUploadProgress(40);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      setUploadProgress(60);

      // Call Edge Function to process & save
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            tenantId: currentTenant.id,
            fileName: file.name,
            fileType: file.name.split('.').pop()?.toLowerCase() || 'txt',
            fileContent: text,
          }),
        }
      );

      setUploadProgress(85);

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setUploadProgress(100);
      setUploadSuccess(`"${file.name}" processado com ${data.chunksCreated} chunks para RAG`);

      // Reload documents
      await loadDocuments();

      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError(err.message || 'Erro ao processar documento');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---- Delete document ----
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Excluir este documento e todos os chunks?')) return;
    try {
      // Delete chunks first
      await supabase.from('document_chunks').delete().eq('document_id', docId);
      // Delete document
      const { error: err } = await supabase.from('documents').delete().eq('id', docId);
      if (err) throw err;
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---- Smart Search ----
  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    setError(null);

    try {
      const ragContext = buildRAGContext();
      if (!ragContext) throw new Error('Nenhum documento no dossiê. Faça upload primeiro.');

      const prompt = `Você é um assistente de IA especializado em análise de documentos de marketing digital.

DOCUMENTOS DO DOSSIÊ:
${ragContext}

PERGUNTA DO USUÁRIO:
${query}

Responda de forma completa e detalhada, baseando-se EXCLUSIVAMENTE nos documentos acima. Se a informação não estiver nos documentos, diga claramente.`;

      const answer = await callGemini(prompt, 0.5);
      const sources = documents.map(d => d.name);

      setSearchResult({
        content: answer,
        sources,
        confidence: 0.9,
        tokens_used: answer.length,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // ---- Chat ----
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);

    try {
      const ragContext = buildRAGContext();
      const historyText = chatHistory
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n');

      const prompt = `Você é um assistente especialista em marketing digital e lançamentos. Responda sempre em português brasileiro.

${ragContext ? `DOCUMENTOS DO DOSSIÊ:\n${ragContext}\n\n` : ''}${historyText ? `HISTÓRICO DA CONVERSA:\n${historyText}\n\n` : ''}NOVA MENSAGEM DO USUÁRIO:
${userMessage}

Responda de forma útil e prática, baseando-se nos documentos quando relevante.`;

      const answer = await callGemini(prompt, 0.7);
      setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  // ---- Generate Copy ----
  const handleGenerateCopy = async (type: 'ad' | 'caption' | 'email' | 'sales_page') => {
    setIsGeneratingCopy(true);
    setGeneratedCopy(null);
    setError(null);

    try {
      const ragContext = buildRAGContext();

      // Also load briefing for context
      let briefingContext = '';
      if (tenant?.id) {
        const { data: briefing } = await supabase
          .from('briefings')
          .select('*')
          .eq('tenant_id', tenant.id)
          .single();

        if (briefing) {
          const b = briefing as any;
          briefingContext = `
BRIEFING DO EXPERT:
- Expert: ${b.expert_name || 'N/A'}
- Produto: ${b.product_name || 'N/A'}
- Descrição: ${b.product_description || 'N/A'}
- Público-alvo: ${b.target_audience || 'N/A'}
- Promessa: ${b.main_promise || 'N/A'}
- Diferencial: ${b.differentiation || 'N/A'}
- Tom de voz: ${b.voice_tones?.join(', ') || 'N/A'}
`;
        }
      }

      const typeLabels: Record<string, string> = {
        ad: 'um anúncio para redes sociais (Facebook/Instagram Ads)',
        caption: 'uma legenda para post no Instagram (com emojis e hashtags)',
        email: 'um email de vendas completo (com assunto, corpo e CTA)',
        sales_page: 'uma copy completa para página de vendas (com headline, subheadline, bullets, prova social, CTA)',
      };

      const prompt = `Você é um copywriter brasileiro expert em marketing digital e lançamentos.

${briefingContext}
${ragContext ? `\nDOCUMENTOS DO DOSSIÊ:\n${ragContext}\n` : ''}

Gere ${typeLabels[type]} baseando-se nas informações acima.

Regras:
- Use o tom de voz definido no briefing
- Seja persuasivo e direto
- Use gatilhos mentais adequados
- Adapte ao formato solicitado
- Escreva em português brasileiro`;

      const copy = await callGemini(prompt, 0.85);
      setGeneratedCopy(copy);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // ---- Copy to clipboard ----
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ---- File icon ----
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><span className="text-red-600 font-bold text-xs">PDF</span></div>;
      case 'doc':
      case 'docx':
        return <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><span className="text-blue-600 font-bold text-xs">DOC</span></div>;
      default:
        return <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-slate-600" /></div>;
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dossiê IA</h1>
          <p className="text-sm text-slate-500">
            {isLoading ? 'Carregando...' : `${documents.length} documento${documents.length !== 1 ? 's' : ''} na base de conhecimento`}
          </p>
        </div>
        <Button
          className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Documento
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Processando documento para RAG...</span>
              <span className="text-sm text-slate-500">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Success message */}
      {uploadSuccess && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">{uploadSuccess}</span>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="documents">
        <TabsList className="w-full overflow-x-auto flex">
          <TabsTrigger value="documents" className="text-xs sm:text-sm">Documentos</TabsTrigger>
          <TabsTrigger value="search" className="text-xs sm:text-sm">Busca Inteligente</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs sm:text-sm">Chat com IA</TabsTrigger>
          <TabsTrigger value="copy" className="text-xs sm:text-sm">Gerar Copy</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
              <p className="text-slate-500">Carregando documentos...</p>
            </div>
          ) : documents.length === 0 ? (
            <Card className="bg-slate-50">
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">Nenhum documento ainda</h3>
                <p className="text-slate-500 mb-4">Faça upload de documentos para criar a base de conhecimento do expert</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Primeiro Upload
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getFileIcon(doc.type)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">{doc.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                          <span className="uppercase">{doc.type}</span>
                        </div>
                        {doc.metadata?.word_count && (
                          <p className="text-xs text-slate-400 mt-1">
                            {doc.metadata.word_count.toLocaleString()} palavras
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Pergunte qualquer coisa sobre o dossiê do expert..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !query.trim()}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Buscar
                </Button>
              </div>

              {searchResult && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-violet-500" />
                    <span className="font-medium">Resposta da IA</span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-line">{searchResult.content}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Fontes:</span>
                    {searchResult.sources.map((source, i) => (
                      <Badge key={i} variant="outline">{source}</Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(searchResult.content)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <Card className="h-[70vh] sm:h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-500" />
                Conversar com o Dossiê
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chatHistory.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>Comece uma conversa com o assistente baseado no dossiê do expert</p>
                    <p className="text-sm mt-2 text-slate-400">
                      {documents.length > 0
                        ? `${documents.length} documento(s) disponíveis como contexto`
                        : 'Faça upload de documentos primeiro para melhores respostas'}
                    </p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Brain className="w-4 h-4 text-violet-600" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[80%] rounded-lg p-3',
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    )}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                    </div>
                    <div className="bg-slate-100 rounded-lg p-3">Pensando...</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Input
                  placeholder="Digite sua pergunta..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                />
                <Button
                  onClick={handleChatSubmit}
                  disabled={isChatting || !chatInput.trim()}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Copy Generation Tab */}
        <TabsContent value="copy" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Sparkles className="w-12 h-12 text-violet-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Gerar Copy com IA</h3>
                <p className="text-slate-500">Crie textos persuasivos baseados no dossiê + briefing do expert</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleGenerateCopy('ad')}
                  disabled={isGeneratingCopy}
                >
                  <span className="font-medium">Anúncio</span>
                  <span className="text-xs text-slate-500">Para redes sociais</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleGenerateCopy('caption')}
                  disabled={isGeneratingCopy}
                >
                  <span className="font-medium">Legenda</span>
                  <span className="text-xs text-slate-500">Para Instagram</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleGenerateCopy('email')}
                  disabled={isGeneratingCopy}
                >
                  <span className="font-medium">E-mail</span>
                  <span className="text-xs text-slate-500">Sequência de vendas</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleGenerateCopy('sales_page')}
                  disabled={isGeneratingCopy}
                >
                  <span className="font-medium">Página de Vendas</span>
                  <span className="text-xs text-slate-500">Copy completa</span>
                </Button>
              </div>

              {isGeneratingCopy && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
                  <p className="text-slate-500">Gerando copy com Gemini + RAG...</p>
                </div>
              )}

              {generatedCopy && !isGeneratingCopy && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Copy Gerada</span>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedCopy)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-slate-700 whitespace-pre-line">{generatedCopy}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
