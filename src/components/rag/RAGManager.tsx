import { useState, useRef } from 'react';
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
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentsStore, useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Document, AIResponse } from '@/types';

const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    tenant_id: '1',
    name: 'Dossiê do Expert - Método XYZ.pdf',
    type: 'pdf',
    content: 'Conteúdo completo do método...',
    chunks: [],
    metadata: {
      author: 'João Expert',
      pages: 45,
      word_count: 12500,
      description: 'Documento principal com todo o conhecimento do expert',
    },
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  {
    id: '2',
    tenant_id: '1',
    name: 'Scripts de Vendas.docx',
    type: 'docx',
    content: 'Scripts para calls de vendas...',
    chunks: [],
    metadata: {
      pages: 12,
      word_count: 3500,
    },
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
  },
  {
    id: '3',
    tenant_id: '1',
    name: 'FAQ - Perguntas Frequentes.txt',
    type: 'txt',
    content: 'Perguntas e respostas mais comuns...',
    chunks: [],
    metadata: {
      word_count: 2800,
    },
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
];

export function RAGManager() {
  const { 
    documents, 
    isUploading, 
    uploadProgress,
    setDocuments, 
    addDocument, 
    removeDocument
  } = useDocumentsStore();
  const { tenant } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AIResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  // Inicializa com documentos mockados
  if (documents.length === 0) {
    setDocuments(MOCK_DOCUMENTS);
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenant?.id) return;

    // Simula progresso de upload
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Processa documento
    const newDoc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id: tenant.id,
      name: file.name,
      type: file.name.split('.').pop()?.toLowerCase() as 'pdf' | 'doc' | 'docx' | 'txt',
      content: `[Conteúdo processado de ${file.name}]`,
      chunks: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addDocument(newDoc);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSearchResult({
      content: `Baseado no dossiê do expert, aqui está a resposta para sua pergunta sobre "${query}":\n\nO método desenvolvido pelo expert é baseado em 3 pilares fundamentais: estratégia, execução e escala. Cada etapa foi cuidadosamente desenhada para maximizar resultados e minimizar erros comuns.\n\nPrincipais pontos abordados:\n• Planejamento estratégico detalhado\n• Execução com métricas claras\n• Escala sustentável do negócio`,
      sources: ['Dossiê do Expert - Método XYZ.pdf'],
      confidence: 0.92,
      tokens_used: 450,
    });
    
    setIsSearching(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    setIsSearching(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setChatHistory(prev => [...prev, { 
      role: 'assistant', 
      content: `Baseado no dossiê do expert: O método enfatiza a importância de um planejamento estruturado antes de qualquer ação. Conforme documentado, os alunos que seguem o passo a passo têm 3x mais chances de sucesso.` 
    }]);
    
    setIsSearching(false);
  };

  const handleGenerateCopy = async (type: 'ad' | 'caption' | 'email' | 'sales_page') => {
    setIsGeneratingCopy(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const copies = {
      ad: `🚀 Descubra o método que já transformou a vida de mais de 1.000 pessoas!\n\nVocê sente que está estagnado e não sabe como avançar? O Método XYZ foi desenvolvido para quem quer resultados reais, sem enrolação.\n\n✅ Estratégia comprovada\n✅ Acompanhamento personalizado  \n✅ Garantia de 7 dias\n\n👉 Link na bio para saber mais!`,
      caption: `O segredo do sucesso não é sorte, é método. 🎯\n\nHoje quero compartilhar com vocês um pouco da jornada que me trouxe até aqui. Foram anos de testes, erros e aprendizados que me permitiram criar um sistema replicável.\n\nSe você também quer acelerar seus resultados, comenta "MÉTODO" que te envio mais informações! 👇`,
      email: `Assunto: Sua vaga está reservada (por pouco tempo)\n\nOlá [NOME],\n\nVocê demonstrou interesse no Método XYZ e reservei uma vaga especial para você.\n\nMas preciso ser honesto: as vagas são limitadas porque oferecemos acompanhamento personalizado, e não consigo atender todo mundo.\n\nSe você quer:\n• Resultados em 90 dias\n• Método validado por 1.000+ alunos\n• Garantia incondicional\n\nClique aqui para garantir sua vaga: [LINK]\n\nAbraço,\n[EXPERT]`,
      sales_page: `## Finalmente Revelado: O Método Que Estava Faltando Para Você Alcançar Seus Objetivos\n\nDepois de 5 anos testando diferentes estratégias, desenvolvi um sistema único que já ajudou mais de 1.000 pessoas a transformarem seus resultados.\n\n### O Que Você Vai Receber:\n\n✓ Acesso completo ao método passo a passo\n✓ 12 módulos com videoaulas\n✓ Material complementar em PDF\n✓ Grupo exclusivo de alunos\n✓ 3 meses de acompanhamento\n\n### Garantia Incondicional de 7 Dias\n\nSe em 7 dias você não sentir que o método é para você, devolvo 100% do seu investimento. Sem perguntas, sem burocracia.`,
    };

    setSearchResult({
      content: copies[type],
      sources: ['Dossiê do Expert'],
      confidence: 0.95,
      tokens_used: 650,
    });
    
    setIsGeneratingCopy(false);
  };

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dossiê IA</h1>
          <p className="text-slate-500">{documents.length} documentos na base de conhecimento</p>
        </div>
        <Button 
          className="bg-violet-600 hover:bg-violet-700"
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
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Processando documento...</span>
              <span className="text-sm text-slate-500">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="search">Busca Inteligente</TabsTrigger>
          <TabsTrigger value="chat">Chat com IA</TabsTrigger>
          <TabsTrigger value="copy">Gerar Copy</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc: Document) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getFileIcon(doc.type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{doc.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <span className="uppercase">{doc.type}</span>
                      </div>
                      {doc.metadata?.pages && (
                        <p className="text-xs text-slate-400 mt-1">
                          {doc.metadata.pages} páginas • {doc.metadata.word_count?.toLocaleString()} palavras
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600"
                      onClick={() => removeDocument(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                    <Badge variant="secondary" className="ml-auto">
                      Confiança: {(searchResult.confidence * 100).toFixed(0)}%
                    </Badge>
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
                    <Button variant="outline" size="sm">
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
          <Card className="h-[600px] flex flex-col">
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
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isSearching && (
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
                  disabled={isSearching || !chatInput.trim()}
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
                <p className="text-slate-500">Crie textos persuasivos baseados no tom de voz do expert</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                  <p className="text-slate-500">Gerando copy persuasiva...</p>
                </div>
              )}

              {searchResult && !isGeneratingCopy && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Copy Gerada</span>
                    <Button variant="outline" size="sm">
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-slate-700 whitespace-pre-line">{searchResult.content}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
