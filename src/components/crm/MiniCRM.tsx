import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  MessageCircle,
  MoreHorizontal,
  Tag,
  Clock,
  User,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeadsStore } from '@/store';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Lead, Interaction } from '@/types';

const STAGES = [
  { id: 'lead', name: 'Lead', color: 'bg-slate-500' },
  { id: 'qualified', name: 'Qualificado', color: 'bg-blue-500' },
  { id: 'opportunity', name: 'Oportunidade', color: 'bg-violet-500' },
  { id: 'proposal', name: 'Proposta', color: 'bg-amber-500' },
  { id: 'customer', name: 'Cliente', color: 'bg-emerald-500' },
  { id: 'upsell', name: 'Upsell', color: 'bg-rose-500' },
];

const TAGS = [
  { id: '1', name: 'carrinho_abandonado', color: 'bg-red-100 text-red-700' },
  { id: '2', name: 'comprador', color: 'bg-emerald-100 text-emerald-700' },
  { id: '3', name: 'vip', color: 'bg-violet-100 text-violet-700' },
  { id: '4', name: 'indicacao', color: 'bg-blue-100 text-blue-700' },
  { id: '5', name: 'reembolsado', color: 'bg-amber-100 text-amber-700' },
  { id: '6', name: 'chargeback', color: 'bg-rose-100 text-rose-700' },
];

const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    tenant_id: '1',
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '5511999999999',
    source: 'paid',
    status: 'active',
    stage: 'qualified',
    tags: ['carrinho_abandonado'],
    score: 75,
    interactions: [],
    custom_fields: {},
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    tenant_id: '1',
    name: 'Carlos Santos',
    email: 'carlos@email.com',
    phone: '5511888888888',
    source: 'organic',
    status: 'active',
    stage: 'opportunity',
    tags: ['comprador', 'vip'],
    score: 92,
    interactions: [],
    custom_fields: {},
    created_at: '2024-01-14T15:30:00Z',
    updated_at: '2024-01-14T15:30:00Z',
  },
  {
    id: '3',
    tenant_id: '1',
    name: 'Maria Oliveira',
    email: 'maria@email.com',
    phone: '5511777777777',
    source: 'referral',
    status: 'active',
    stage: 'customer',
    tags: ['comprador'],
    score: 88,
    interactions: [],
    custom_fields: {},
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-10T09:00:00Z',
  },
  {
    id: '4',
    tenant_id: '1',
    name: 'João Pereira',
    email: 'joao@email.com',
    phone: '5511666666666',
    source: 'paid',
    status: 'active',
    stage: 'proposal',
    tags: [],
    score: 65,
    interactions: [],
    custom_fields: {},
    created_at: '2024-01-13T14:00:00Z',
    updated_at: '2024-01-13T14:00:00Z',
  },
  {
    id: '5',
    tenant_id: '1',
    name: 'Fernanda Lima',
    email: 'fernanda@email.com',
    phone: '5511555555555',
    source: 'organic',
    status: 'active',
    stage: 'lead',
    tags: [],
    score: 45,
    interactions: [],
    custom_fields: {},
    created_at: '2024-01-16T11:00:00Z',
    updated_at: '2024-01-16T11:00:00Z',
  },
];

const MOCK_INTERACTIONS: Interaction[] = [
  {
    id: '1',
    lead_id: '1',
    type: 'whatsapp',
    direction: 'inbound',
    content: 'Olá! Tenho interesse no produto, mas gostaria de saber mais sobre o método de pagamento.',
    created_at: '2024-01-15T14:30:00Z',
  },
  {
    id: '2',
    lead_id: '1',
    type: 'whatsapp',
    direction: 'outbound',
    content: 'Oi Ana! Fico feliz pelo seu interesse. Temos parcelamento em até 12x no cartão. Posso te enviar mais detalhes?',
    created_at: '2024-01-15T14:35:00Z',
  },
  {
    id: '3',
    lead_id: '2',
    type: 'automation',
    direction: 'outbound',
    content: 'Compra aprovada: Curso Completo - R$ 1.997,00',
    created_at: '2024-01-14T16:00:00Z',
  },
];

export function MiniCRM() {
  const { leads, selectedLead, setLeads, selectLead } = useLeadsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Carrega leads mockados para demonstração
    setLeads(MOCK_LEADS);
  }, []);

  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.phone.includes(searchQuery);
    
    const matchesStage = activeTab === 'all' || lead.stage === activeTab;
    
    return matchesSearch && matchesStage;
  });

  const getStageBadge = (stage: string) => {
    const stageConfig = STAGES.find(s => s.id === stage);
    return (
      <Badge className={cn('text-white', stageConfig?.color || 'bg-slate-500')}>
        {stageConfig?.name || stage}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-slate-500';
  };

  const getInteractionsForLead = (leadId: string) => {
    return MOCK_INTERACTIONS.filter(i => i.lead_id === leadId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mini CRM</h1>
          <p className="text-slate-500">{filteredLeads.length} leads encontrados</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {STAGES.map((stage) => {
          const count = leads.filter((l: Lead) => l.stage === stage.id).length;
          return (
            <Card key={stage.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stage.name}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          {STAGES.map((stage) => (
            <TabsTrigger key={stage.id} value={stage.id}>
              {stage.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leads List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredLeads.map((lead: Lead) => (
                <Card 
                  key={lead.id}
                  className={cn(
                    'cursor-pointer hover:shadow-md transition-all',
                    selectedLead?.id === lead.id && 'ring-2 ring-violet-500'
                  )}
                  onClick={() => selectLead(lead)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-violet-100 text-violet-600">
                          {lead.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900">{lead.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold', getScoreColor(lead.score))}>
                              {lead.score}
                            </span>
                            <Star className="w-4 h-4 text-amber-400" />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          {getStageBadge(lead.stage)}
                          {lead.tags.map((tag: string) => {
                            const tagConfig = TAGS.find(t => t.name === tag);
                            return (
                              <Badge key={tag} variant="secondary" className={tagConfig?.color}>
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Enviar mensagem</DropdownMenuItem>
                          <DropdownMenuItem>Mudar estágio</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Arquivar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Lead Details */}
            <div>
              {selectedLead ? (
                <Card className="sticky top-6">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-14 h-14">
                        <AvatarFallback className="bg-violet-100 text-violet-600 text-lg">
                          {selectedLead.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{selectedLead.name}</CardTitle>
                        <p className="text-sm text-slate-500">
                          Desde {format(new Date(selectedLead.created_at), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Contact Info */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-slate-900">Contato</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {selectedLead.phone}
                        </div>
                        {selectedLead.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4" />
                            {selectedLead.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-slate-900">Score</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              'h-full rounded-full',
                              selectedLead.score >= 80 ? 'bg-emerald-500' :
                              selectedLead.score >= 60 ? 'bg-amber-500' : 'bg-slate-500'
                            )}
                            style={{ width: `${selectedLead.score}%` }}
                          />
                        </div>
                        <span className="font-bold">{selectedLead.score}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-slate-900">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedLead.tags.map((tag: string) => {
                          const tagConfig = TAGS.find(t => t.name === tag);
                          return (
                            <Badge key={tag} variant="secondary" className={tagConfig?.color}>
                              {tag}
                            </Badge>
                          );
                        })}
                        <Button variant="outline" size="sm" className="h-6">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Mail className="w-4 h-4 mr-2" />
                        E-mail
                      </Button>
                    </div>

                    {/* Interactions */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-slate-900">Histórico</h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {getInteractionsForLead(selectedLead.id).map((interaction: Interaction) => (
                          <div key={interaction.id} className="flex gap-3 text-sm">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                              interaction.direction === 'inbound' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-violet-100 text-violet-600'
                            )}>
                              {interaction.type === 'whatsapp' ? (
                                <MessageCircle className="w-4 h-4" />
                              ) : interaction.type === 'email' ? (
                                <Mail className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-700">{interaction.content}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {format(new Date(interaction.created_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="sticky top-6">
                  <CardContent className="p-8 text-center">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Selecione um lead para ver os detalhes</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
