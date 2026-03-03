import { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  BookOpen, 
  MessageSquare, 
  Mail, 
  Globe,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  Save,
  Building2,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';

interface Framework {
  id: string;
  tenant_id: string;
  name: string;
  type: 'page' | 'email' | 'whatsapp' | 'general';
  description: string;
  content: string;
  sections?: string[];
  isGlobal: boolean; // Se é um framework padrão da agência ou específico do cliente
  createdAt: string;
}

const INITIAL_FRAMEWORKS: Framework[] = [
  {
    id: '1',
    tenant_id: 'global',
    name: 'Framework Página de Vendas - Launch Lab',
    type: 'page',
    description: 'Estrutura comprovada para páginas de vendas de infoprodutos',
    content: `
## ESTRUTURA DA PÁGINA DE VENDAS

### 1. HEADLINE PRINCIPAL
- Promessa principal clara e específica
- Subheadline que complementa
- CTA acima da dobra

### 2. SEÇÃO DE PROBLEMA
- Identificar a dor do público
- Amplificar o problema
- Criar urgência

### 3. APRESENTAÇÃO DA SOLUÇÃO
- O que é o produto
- Como funciona
- Por que funciona

### 4. PROVA SOCIAL
- Depoimentos em vídeo
- Cases de resultados
- Antes/Depois

### 5. OFERTA
- O que está incluso
- Bônus
- Garantia

### 6. CTA FINAL
- Urgência
- Escassez
- Chamada para ação
    `.trim(),
    sections: ['Headline', 'Problema', 'Solução', 'Prova Social', 'Oferta', 'CTA'],
    isGlobal: true,
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    tenant_id: 'global',
    name: 'Sequência de E-mails - Aquecimento',
    type: 'email',
    description: '7 e-mails de aquecimento antes da abertura',
    content: `
## SEQUÊNCIA DE E-MAILS DE AQUECIMENTO

### E-MAIL 1: IDENTIFICAÇÃO DA DOR
Assunto: Você também sente isso?
Objetivo: Conectar com a dor do público

### E-MAIL 2: CONTEXTO DO PROBLEMA
Assunto: Por que isso acontece?
Objetivo: Educar sobre o problema

### E-MAIL 3: APRESENTAÇÃO DA SOLUÇÃO
Assunto: A solução que você procura
Objetivo: Introduzir o método

### E-MAIL 4: PROVA SOCIAL
Assunto: Veja o que conseguiram
Objetivo: Gerar credibilidade

### E-MAIL 5: OFERTA ANTECIPADA
Assunto: Uma oportunidade especial
Objetivo: Criar desejo

### E-MAIL 6: URGÊNCIA
Assunto: Últimas horas
Objetivo: Acelerar decisão

### E-MAIL 7: ÚLTIMA CHANCE
Assunto: Está acabando...
Objetivo: Fechar vendas
    `.trim(),
    sections: ['E-mail 1', 'E-mail 2', 'E-mail 3', 'E-mail 4', 'E-mail 5', 'E-mail 6', 'E-mail 7'],
    isGlobal: true,
    createdAt: '2024-01-01',
  },
];

const FRAMEWORK_TYPES = {
  page: { label: 'Página de Vendas', icon: Globe, color: 'bg-violet-100 text-violet-600' },
  email: { label: 'E-mail', icon: Mail, color: 'bg-blue-100 text-blue-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-600' },
  general: { label: 'Geral', icon: BookOpen, color: 'bg-slate-100 text-slate-600' },
};

export function FrameworkManager() {
  const { tenant } = useAuthStore();
  const [frameworks, setFrameworks] = useState<Framework[]>(INITIAL_FRAMEWORKS);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [newFramework, setNewFramework] = useState<Partial<Framework>>({
    type: 'page',
    name: '',
    description: '',
    content: '',
    isGlobal: false,
  });

  // Carrega frameworks do tenant atual
  useEffect(() => {
    if (tenant?.id) {
      loadFrameworks(tenant.id);
    }
  }, [tenant?.id]);

  const loadFrameworks = async (tenantId: string) => {
    // Simulação - em produção, buscaria do Supabase
    // const { data } = await supabase
    //   .from('frameworks')
    //   .select('*')
    //   .or(`tenant_id.eq.${tenantId},isGlobal.eq.true`);
    console.log(`Carregando frameworks para o tenant: ${tenantId}`);
    
    // Mostra frameworks globais + do tenant específico
    const tenantFrameworks = INITIAL_FRAMEWORKS.filter(
      f => f.tenant_id === 'global' || f.tenant_id === tenantId
    );
    setFrameworks(tenantFrameworks);
  };

  const handleSaveFramework = () => {
    if (!newFramework.name || !newFramework.content || !tenant?.id) return;
    
    const framework: Framework = {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id: tenant.id,
      name: newFramework.name,
      type: newFramework.type as Framework['type'],
      description: newFramework.description || '',
      content: newFramework.content,
      isGlobal: false, // Frameworks criados por clientes são sempre específicos
      createdAt: new Date().toISOString(),
    };
    
    setFrameworks([...frameworks, framework]);
    setShowNewDialog(false);
    setNewFramework({ type: 'page', name: '', description: '', content: '', isGlobal: false });
  };

  const handleDeleteFramework = (id: string) => {
    const framework = frameworks.find(f => f.id === id);
    if (framework?.isGlobal) {
      alert('Frameworks globais não podem ser excluídos');
      return;
    }
    setFrameworks(frameworks.filter(f => f.id !== id));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenant?.id) return;
    
    // Simula processamento do arquivo vinculado ao tenant
    alert(`Arquivo "${file.name}" carregado com sucesso para o cliente ${tenant.name}!`);
    setShowUploadDialog(false);
  };

  // Separa frameworks globais e do tenant
  const globalFrameworks = frameworks.filter(f => f.isGlobal || f.tenant_id === 'global');
  const tenantFrameworks = frameworks.filter(f => !f.isGlobal && f.tenant_id === tenant?.id);

  return (
    <div className="p-6 space-y-6">
      {/* Header com identificação do cliente */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Frameworks & IAs</h1>
          <p className="text-slate-500">Documentos para treinar os agentes de IA</p>
        </div>
        <div className="flex items-center gap-4">
          {tenant && (
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-lg">
              <Building2 className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">{tenant.name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Carregar Documento
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Framework
            </Button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Isolamento por Cliente</p>
              <p className="text-sm text-amber-700 mt-1">
                Cada cliente tem seus próprios frameworks isolados. Frameworks marcados com 
                <Lock className="w-3 h-3 inline mx-1" /> 
                são padrão da agência e não podem ser editados. Frameworks criados por você são 
                exclusivos deste cliente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Frameworks */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({frameworks.length})</TabsTrigger>
          <TabsTrigger value="page">Páginas</TabsTrigger>
          <TabsTrigger value="email">E-mails</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="general">Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {/* Frameworks Globais */}
          {globalFrameworks.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Frameworks Padrão da Agência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalFrameworks.map((framework) => {
                  const typeConfig = FRAMEWORK_TYPES[framework.type];
                  const Icon = typeConfig.icon;
                  
                  return (
                    <Card key={framework.id} className="border-amber-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeConfig.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <Lock className="w-3 h-3 mr-1" />
                              Padrão
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedFramework(framework)}
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-slate-900 mb-1">{framework.name}</h3>
                        <p className="text-sm text-slate-500 mb-3">{framework.description}</p>
                        
                        <Badge className={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Frameworks do Tenant */}
          {tenantFrameworks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Frameworks Exclusivos de {tenant?.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenantFrameworks.map((framework) => {
                  const typeConfig = FRAMEWORK_TYPES[framework.type];
                  const Icon = typeConfig.icon;
                  
                  return (
                    <Card key={framework.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeConfig.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedFramework(framework)}
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => handleDeleteFramework(framework.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-slate-900 mb-1">{framework.name}</h3>
                        <p className="text-sm text-slate-500 mb-3">{framework.description}</p>
                        
                        <Badge className={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {tenantFrameworks.length === 0 && (
            <Card className="bg-slate-50">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Este cliente ainda não tem frameworks personalizados</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowNewDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Framework
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {['page', 'email', 'whatsapp', 'general'].map((type) => (
          <TabsContent key={type} value={type} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworks
                .filter(f => f.type === type)
                .map((framework) => {
                  const typeConfig = FRAMEWORK_TYPES[framework.type];
                  const Icon = typeConfig.icon;
                  const isGlobal = framework.isGlobal || framework.tenant_id === 'global';
                  
                  return (
                    <Card key={framework.id} className={cn(isGlobal && 'border-amber-200')}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeConfig.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex gap-1">
                            {isGlobal && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                <Lock className="w-3 h-3 mr-1" />
                              </Badge>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedFramework(framework)}
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            {!isGlobal && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600"
                                onClick={() => handleDeleteFramework(framework.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-slate-900 mb-1">{framework.name}</h3>
                        <p className="text-sm text-slate-500 mb-3">{framework.description}</p>
                        
                        <Badge className={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* New Framework Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Framework - {tenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-violet-50 rounded-lg p-3">
              <p className="text-sm text-violet-700">
                Este framework será exclusivo do cliente <strong>{tenant?.name}</strong>
              </p>
            </div>

            <div>
              <Label>Tipo de Framework</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(FRAMEWORK_TYPES).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setNewFramework({ ...newFramework, type: key as Framework['type'] })}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all flex items-center gap-2',
                        newFramework.type === key
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-300'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <Label>Nome do Framework</Label>
              <Input 
                placeholder="Ex: Framework Página VSL"
                value={newFramework.name}
                onChange={(e) => setNewFramework({ ...newFramework, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Descrição</Label>
              <Input 
                placeholder="Breve descrição do que este framework faz"
                value={newFramework.description}
                onChange={(e) => setNewFramework({ ...newFramework, description: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Conteúdo do Framework</Label>
              <p className="text-xs text-slate-500 mb-2">
                Descreva a estrutura, seções, exemplos e diretrizes
              </p>
              <Textarea 
                placeholder={`## ESTRUTURA

### 1. SEÇÃO INICIAL
- O que deve conter
- Exemplo: "Use uma headline que..."

### 2. SEÇÃO SEGUINTE
...`}
                value={newFramework.content}
                onChange={(e) => setNewFramework({ ...newFramework, content: e.target.value })}
                rows={15}
              />
            </div>
            
            <Button 
              className="w-full bg-violet-600 hover:bg-violet-700"
              onClick={handleSaveFramework}
              disabled={!newFramework.name || !newFramework.content || !tenant?.id}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Framework para {tenant?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregar Documento - {tenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-violet-50 rounded-lg p-3">
              <p className="text-sm text-violet-700">
                Este documento será vinculado exclusivamente ao cliente <strong>{tenant?.name}</strong>
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-xs text-slate-400">
                PDF, DOC, DOCX ou TXT (máx. 10MB)
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="framework-upload"
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => document.getElementById('framework-upload')?.click()}
              >
                Selecionar Arquivo
              </Button>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">
                O que acontece depois do upload?
              </p>
              <ul className="text-sm text-slate-500 space-y-1">
                <li>• O documento é processado pela IA</li>
                <li>• Fica vinculado apenas a este cliente</li>
                <li>• Outros clientes não terão acesso</li>
                <li>• Você pode editar depois se necessário</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Framework Dialog */}
      <Dialog open={!!selectedFramework} onOpenChange={() => setSelectedFramework(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedFramework && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    FRAMEWORK_TYPES[selectedFramework.type].color
                  )}>
                    {(() => {
                      const Icon = FRAMEWORK_TYPES[selectedFramework.type].icon;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle>{selectedFramework.name}</DialogTitle>
                    <p className="text-sm text-slate-500">{selectedFramework.description}</p>
                  </div>
                  {(selectedFramework.isGlobal || selectedFramework.tenant_id === 'global') && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 ml-auto">
                      <Lock className="w-3 h-3 mr-1" />
                      Padrão da Agência
                    </Badge>
                  )}
                </div>
              </DialogHeader>
              
              <div className="mt-4">
                <div className="bg-slate-50 rounded-lg p-4 whitespace-pre-wrap font-mono text-sm">
                  {selectedFramework.content}
                </div>
              </div>
              
              {selectedFramework.sections && (
                <div className="mt-4">
                  <p className="font-medium text-sm mb-2">Seções:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFramework.sections.map((section, i) => (
                      <Badge key={i} variant="secondary">{section}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
