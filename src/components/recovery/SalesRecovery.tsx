import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  MessageCircle, 
  Mail, 
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Users,
  Send,
  Settings
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAbandonedCartsStore } from '@/store';
import { cn } from '@/lib/utils';
import type { AbandonedCart } from '@/types';

const MOCK_CARTS: AbandonedCart[] = [
  {
    id: '1',
    tenant_id: '1',
    lead_id: '1',
    product_id: 'prod_1',
    product_name: 'Curso Completo XYZ',
    product_value: 1997,
    checkout_url: 'https://checkout.example.com/abc123',
    status: 'detected',
    recovery_attempts: [],
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
  {
    id: '2',
    tenant_id: '1',
    lead_id: '2',
    product_id: 'prod_2',
    product_name: 'Mentoria VIP',
    product_value: 4997,
    checkout_url: 'https://checkout.example.com/def456',
    status: 'contacted',
    recovery_attempts: [
      {
        id: '1',
        cart_id: '2',
        type: 'whatsapp',
        content: 'Oi! Vi que você se interessou pela Mentoria VIP...',
        sent_at: '2024-01-16T11:00:00Z',
      },
    ],
    created_at: '2024-01-15T15:30:00Z',
    updated_at: '2024-01-16T11:00:00Z',
  },
  {
    id: '3',
    tenant_id: '1',
    lead_id: '3',
    product_id: 'prod_1',
    product_name: 'Curso Completo XYZ',
    product_value: 1997,
    checkout_url: 'https://checkout.example.com/ghi789',
    status: 'recovered',
    recovery_attempts: [
      {
        id: '2',
        cart_id: '3',
        type: 'whatsapp',
        content: 'Oi! Posso te ajudar com alguma dúvida?',
        sent_at: '2024-01-14T10:00:00Z',
        opened_at: '2024-01-14T10:05:00Z',
        converted_at: '2024-01-14T14:00:00Z',
      },
    ],
    created_at: '2024-01-14T09:00:00Z',
    updated_at: '2024-01-14T14:00:00Z',
  },
  {
    id: '4',
    tenant_id: '1',
    lead_id: '4',
    product_id: 'prod_3',
    product_name: 'E-book Guia Prático',
    product_value: 97,
    checkout_url: 'https://checkout.example.com/jkl012',
    status: 'lost',
    recovery_attempts: [
      {
        id: '3',
        cart_id: '4',
        type: 'whatsapp',
        content: 'Oi! Não deixe de aproveitar...',
        sent_at: '2024-01-13T10:00:00Z',
      },
    ],
    created_at: '2024-01-13T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
  },
];

const MOCK_LEADS: Record<string, { name: string; phone: string }> = {
  '1': { name: 'Ana Silva', phone: '5511999999999' },
  '2': { name: 'Carlos Santos', phone: '5511888888888' },
  '3': { name: 'Maria Oliveira', phone: '5511777777777' },
  '4': { name: 'João Pereira', phone: '5511666666666' },
};

export function SalesRecovery() {
  const { carts, setCarts } = useAbandonedCartsStore();
  const [activeTab, setActiveTab] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState(30);

  useEffect(() => {
    setCarts(MOCK_CARTS);
  }, []);

  const filteredCarts = carts.filter((cart: AbandonedCart) => {
    if (activeTab === 'all') return true;
    return cart.status === activeTab;
  });

  const stats = {
    total: carts.length,
    detected: carts.filter((c: AbandonedCart) => c.status === 'detected').length,
    contacted: carts.filter((c: AbandonedCart) => c.status === 'contacted').length,
    recovered: carts.filter((c: AbandonedCart) => c.status === 'recovered').length,
    lost: carts.filter((c: AbandonedCart) => c.status === 'lost').length,
    recoveryRate: carts.length > 0 
      ? (carts.filter((c: AbandonedCart) => c.status === 'recovered').length / carts.length * 100).toFixed(1)
      : 0,
    totalValue: carts.reduce((sum: number, c: AbandonedCart) => sum + c.product_value, 0),
    recoveredValue: carts
      .filter((c: AbandonedCart) => c.status === 'recovered')
      .reduce((sum: number, c: AbandonedCart) => sum + c.product_value, 0),
  };

  const getStatusBadge = (status: AbandonedCart['status']) => {
    switch (status) {
      case 'detected':
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3 mr-1" />
            Detectado
          </Badge>
        );
      case 'contacted':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <MessageCircle className="w-3 h-3 mr-1" />
            Contactado
          </Badge>
        );
      case 'recovered':
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Recuperado
          </Badge>
        );
      case 'lost':
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Perdido
          </Badge>
        );
    }
  };

  const handleManualRecovery = (cart: AbandonedCart) => {
    // Simula envio de mensagem de recuperação
    alert(`Mensagem de recuperação enviada para ${MOCK_LEADS[cart.lead_id]?.name}!`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recuperação de Vendas</h1>
          <p className="text-slate-500">Automação inteligente de carrinhos abandonados</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch 
              checked={automationEnabled} 
              onCheckedChange={setAutomationEnabled}
            />
            <span className="text-sm text-slate-600">
              Automação {automationEnabled ? 'ativa' : 'pausada'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Taxa de Recuperação</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.recoveryRate}%</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Recuperado</p>
                <p className="text-2xl font-bold">
                  R$ {stats.recoveredValue.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Carrinhos Detectados</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Total em Aberto</p>
                <p className="text-2xl font-bold">
                  R$ {stats.totalValue.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Todos ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="detected">
            Detectados ({stats.detected})
          </TabsTrigger>
          <TabsTrigger value="contacted">
            Contactados ({stats.contacted})
          </TabsTrigger>
          <TabsTrigger value="recovered">
            Recuperados ({stats.recovered})
          </TabsTrigger>
          <TabsTrigger value="lost">
            Perdidos ({stats.lost})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-3">
            {filteredCarts.map((cart: AbandonedCart) => {
              const lead = MOCK_LEADS[cart.lead_id];
              return (
                <Card key={cart.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{cart.product_name}</h3>
                          <p className="text-sm text-slate-500">
                            {lead?.name} • {lead?.phone}
                          </p>
                          <p className="text-lg font-bold text-violet-600 mt-1">
                            R$ {cart.product_value.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {getStatusBadge(cart.status)}
                          <p className="text-xs text-slate-400 mt-1">
                            {cart.recovery_attempts.length} tentativa(s)
                          </p>
                        </div>

                        {cart.status === 'detected' && (
                          <Button 
                            size="sm"
                            onClick={() => handleManualRecovery(cart)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Recuperar
                          </Button>
                        )}

                        {cart.status === 'contacted' && (
                          <Button variant="outline" size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Ver conversa
                          </Button>
                        )}
                      </div>
                    </div>

                    {cart.recovery_attempts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">
                          Histórico de Tentativas
                        </h4>
                        <div className="space-y-2">
                          {cart.recovery_attempts.map((attempt) => (
                            <div 
                              key={attempt.id} 
                              className="flex items-center gap-3 text-sm"
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center',
                                attempt.type === 'whatsapp' 
                                  ? 'bg-emerald-100 text-emerald-600' 
                                  : 'bg-blue-100 text-blue-600'
                              )}>
                                {attempt.type === 'whatsapp' ? (
                                  <MessageCircle className="w-4 h-4" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-600">{attempt.content}</p>
                                <p className="text-xs text-slate-400">
                                  Enviado em {new Date(attempt.sent_at).toLocaleString('pt-BR')}
                                </p>
                              </div>
                              {attempt.converted_at && (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Convertido
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de Recuperação</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-medium">Automação</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">Recuperação automática</p>
                  <p className="text-xs text-slate-500">
                    Enviar mensagem automaticamente quando detectar abandono
                  </p>
                </div>
                <Switch 
                  checked={automationEnabled} 
                  onCheckedChange={setAutomationEnabled}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Tempo de Espera</h4>
              <p className="text-sm text-slate-500">
                Aguardar {delayMinutes} minutos antes de enviar a primeira mensagem
              </p>
              <input
                type="range"
                min="5"
                max="120"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>5 min</span>
                <span>120 min</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Canais</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">WhatsApp</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">E-mail</span>
                  <Switch />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
