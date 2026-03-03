import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  FileText,
  BookOpen,
  MessageSquare,
  Mail,
  Globe,
  Trash2,
  AlertCircle,
  Plus,
  Save,
  Building2,
  Lock,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

interface Framework {
  id: string;
  tenant_id: string | null;
  name: string;
  type: 'page' | 'email' | 'whatsapp' | 'general' | 'script';
  description: string;
  content: string;
  is_global: boolean;
  created_at: string;
}

const FRAMEWORK_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  page: { label: 'Página de Vendas', icon: Globe, color: 'bg-violet-100 text-violet-600' },
  email: { label: 'E-mail', icon: Mail, color: 'bg-blue-100 text-blue-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-600' },
  general: { label: 'Geral', icon: BookOpen, color: 'bg-slate-100 text-slate-600' },
  script: { label: 'Script', icon: FileText, color: 'bg-orange-100 text-orange-600' },
};

export function FrameworkManager() {
  const { tenant } = useAuthStore();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newFramework, setNewFramework] = useState<Partial<Framework>>({
    type: 'page',
    name: '',
    description: '',
    content: '',
    is_global: false,
  });

  // ---- Load frameworks from Supabase ----
  const loadFrameworks = useCallback(async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('frameworks')
        .select('*')
        .or(`tenant_id.eq.${tenant.id},is_global.eq.true`)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setFrameworks(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar frameworks:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  // ---- Save new framework ----
  const handleSaveFramework = async () => {
    if (!newFramework.name || !newFramework.content || !tenant?.id) return;
    setIsSaving(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('frameworks')
        .insert({
          tenant_id: tenant.id,
          name: newFramework.name,
          type: newFramework.type || 'general',
          content: newFramework.content,
          description: newFramework.description || '',
          is_global: false,
        } as any)
        .select()
        .single();

      if (err) throw err;
      const record = data as any;

      setFrameworks(prev => [record, ...prev]);
      setShowNewDialog(false);
      setNewFramework({ type: 'page', name: '', description: '', content: '', is_global: false });
      setSuccess(`Framework "${data.name}" criado com sucesso!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Delete framework ----
  const handleDeleteFramework = async (id: string) => {
    const framework = frameworks.find(f => f.id === id);
    if (framework?.is_global) {
      alert('Frameworks globais não podem ser excluídos');
      return;
    }
    if (!confirm('Excluir este framework?')) return;

    try {
      const { error: err } = await supabase.from('frameworks').delete().eq('id', id);
      if (err) throw err;
      setFrameworks(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---- Upload file as framework ----
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenant?.id) return;

    try {
      const text = await file.text();

      const { data, error: err } = await supabase
        .from('frameworks')
        .insert({
          tenant_id: tenant.id,
          name: file.name.replace(/\.\w+$/, ''),
          type: 'general',
          content: text,
          description: `Importado do arquivo ${file.name}`,
          is_global: false,
        } as any)
        .select()
        .single();

      if (err) throw err;
      const record = data as any;

      setFrameworks(prev => [record, ...prev]);
      setShowUploadDialog(false);
      setSuccess(`Framework importado de "${file.name}"`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Separate
  const globalFrameworks = frameworks.filter(f => f.is_global);
  const tenantFrameworks = frameworks.filter(f => !f.is_global && f.tenant_id === tenant?.id);

  // ---- Render framework card ----
  const renderFrameworkCard = (framework: Framework) => {
    const typeConfig = FRAMEWORK_TYPES[framework.type] || FRAMEWORK_TYPES.general;
    const Icon = typeConfig.icon;
    const isGlobal = framework.is_global;

    return (
      <Card key={framework.id} className={cn('hover:shadow-lg transition-shadow', isGlobal && 'border-amber-200')}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeConfig.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex gap-1">
              {isGlobal && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <Lock className="w-3 h-3 mr-1" />
                  Padrão
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
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">{framework.description}</p>

          <Badge className={typeConfig.color}>
            {typeConfig.label}
          </Badge>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Frameworks & IAs</h1>
          <p className="text-sm text-slate-500">Documentos para treinar os agentes de IA</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          {tenant && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-lg">
              <Building2 className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">{tenant.name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Carregar</span> Documento
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-700 flex-1 sm:flex-none" onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo</span> Framework
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

      {/* Success */}
      {success && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">{success}</span>
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

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
          <p className="text-slate-500">Carregando frameworks...</p>
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="w-full overflow-x-auto flex">
            <TabsTrigger value="all" className="text-xs sm:text-sm">Todos ({frameworks.length})</TabsTrigger>
            <TabsTrigger value="page" className="text-xs sm:text-sm">Páginas</TabsTrigger>
            <TabsTrigger value="email" className="text-xs sm:text-sm">E-mails</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs sm:text-sm">WhatsApp</TabsTrigger>
            <TabsTrigger value="general" className="text-xs sm:text-sm">Geral</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {/* Global Frameworks */}
            {globalFrameworks.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Frameworks Padrão da Agência
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {globalFrameworks.map(renderFrameworkCard)}
                </div>
              </div>
            )}

            {/* Tenant Frameworks */}
            {tenantFrameworks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Frameworks Exclusivos de {tenant?.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tenantFrameworks.map(renderFrameworkCard)}
                </div>
              </div>
            )}

            {frameworks.length === 0 && (
              <Card className="bg-slate-50">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum framework encontrado</p>
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

          {['page', 'email', 'whatsapp', 'general'].map((type) => {
            const filtered = frameworks.filter(f => f.type === type);
            return (
              <TabsContent key={type} value={type} className="mt-6">
                {filtered.length === 0 ? (
                  <Card className="bg-slate-50">
                    <CardContent className="p-8 text-center">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Nenhum framework do tipo "{FRAMEWORK_TYPES[type]?.label}" encontrado</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setNewFramework(prev => ({ ...prev, type: type as Framework['type'] }));
                          setShowNewDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Framework
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {filtered.map(renderFrameworkCard)}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

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
                {Object.entries(FRAMEWORK_TYPES).filter(([k]) => k !== 'script').map(([key, config]) => {
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
                placeholder={`## ESTRUTURA\n\n### 1. SEÇÃO INICIAL\n- O que deve conter\n- Exemplo: "Use uma headline que..."\n\n### 2. SEÇÃO SEGUINTE\n...`}
                value={newFramework.content}
                onChange={(e) => setNewFramework({ ...newFramework, content: e.target.value })}
                rows={15}
              />
            </div>

            <Button
              className="w-full bg-violet-600 hover:bg-violet-700"
              onClick={handleSaveFramework}
              disabled={!newFramework.name || !newFramework.content || !tenant?.id || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
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
                accept=".pdf,.doc,.docx,.txt,.md"
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
                <li>• O conteúdo é salvo como framework no Supabase</li>
                <li>• Fica vinculado apenas a este cliente</li>
                <li>• Os agentes de IA usam como referência</li>
                <li>• Você pode excluir depois se necessário</li>
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
                    (FRAMEWORK_TYPES[selectedFramework.type] || FRAMEWORK_TYPES.general).color
                  )}>
                    {(() => {
                      const Icon = (FRAMEWORK_TYPES[selectedFramework.type] || FRAMEWORK_TYPES.general).icon;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle>{selectedFramework.name}</DialogTitle>
                    <p className="text-sm text-slate-500">{selectedFramework.description}</p>
                  </div>
                  {selectedFramework.is_global && (
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
