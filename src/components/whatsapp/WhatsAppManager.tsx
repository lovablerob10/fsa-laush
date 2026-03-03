import { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Users, 
  MessageCircle, 
  Plus, 
  Power,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWhatsAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { WhatsAppInstance, WhatsAppGroup } from '@/types';

const MOCK_INSTANCES: WhatsAppInstance[] = [
  {
    id: '1',
    tenant_id: '1',
    name: 'Principal',
    number: '5511999999999',
    status: 'connected',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    tenant_id: '1',
    name: 'Suporte',
    number: '5511888888888',
    status: 'disconnected',
    is_default: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const MOCK_GROUPS: WhatsAppGroup[] = [
  {
    id: '1',
    tenant_id: '1',
    instance_id: '1',
    group_id: 'group_1',
    name: 'Turma Janeiro 2024',
    description: 'Grupo oficial dos alunos',
    participants_count: 156,
    max_participants: 1024,
    is_full: false,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    tenant_id: '1',
    instance_id: '1',
    group_id: 'group_2',
    name: 'Turma Fevereiro 2024',
    description: 'Grupo oficial dos alunos',
    participants_count: 89,
    max_participants: 1024,
    is_full: false,
    created_at: '2024-01-15T00:00:00Z',
  },
];

export function WhatsAppManager() {
  const { 
    instances, 
    qrCode, 
    isConnecting,
    setInstances, 
    setQrCode, 
    setConnecting
  } = useWhatsAppStore();
  const [showNewInstanceDialog, setShowNewInstanceDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceNumber, setNewInstanceNumber] = useState('');
  const [groups] = useState<WhatsAppGroup[]>(MOCK_GROUPS);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    setInstances(MOCK_INSTANCES);
  }, []);

  const handleCreateInstance = async () => {
    if (!newInstanceName || !newInstanceNumber) return;

    setConnecting(true);
    
    const newInstance: WhatsAppInstance = {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id: '1',
      name: newInstanceName,
      number: newInstanceNumber,
      status: 'connecting',
      is_default: instances.length === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setInstances([...instances, newInstance]);
    setShowNewInstanceDialog(false);
    setNewInstanceName('');
    setNewInstanceNumber('');
    setShowQrDialog(true);
    setQrCode('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
    setConnecting(false);
  };

  const handleDisconnect = async (instanceId: string) => {
    setInstances(instances.map((i: WhatsAppInstance) => 
      i.id === instanceId ? { ...i, status: 'disconnected' as const } : i
    ));
  };

  const handleSetDefault = (instanceId: string) => {
    setInstances(instances.map((i: WhatsAppInstance) => ({
      ...i,
      is_default: i.id === instanceId,
    })));
  };

  const handleSendGroupMessage = (groupId: string) => {
    if (!messageText.trim()) return;
    alert(`Mensagem enviada para o grupo!`);
    setMessageText('');
  };

  const getStatusBadge = (status: WhatsAppInstance['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3 mr-1" />
            Conectando
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Power className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Manager</h1>
          <p className="text-slate-500">{instances.length} instâncias configuradas</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowNewInstanceDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Instância
        </Button>
      </div>

      <Tabs defaultValue="instances">
        <TabsList>
          <TabsTrigger value="instances">Instâncias</TabsTrigger>
          <TabsTrigger value="groups">Grupos ({groups.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates HSM</TabsTrigger>
        </TabsList>

        {/* Instances Tab */}
        <TabsContent value="instances" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map((instance: WhatsAppInstance) => (
              <Card key={instance.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        instance.status === 'connected' 
                          ? 'bg-emerald-100' 
                          : 'bg-slate-100'
                      )}>
                        <Smartphone className={cn(
                          'w-6 h-6',
                          instance.status === 'connected' 
                            ? 'text-emerald-600' 
                            : 'text-slate-400'
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{instance.name}</h3>
                        <p className="text-sm text-slate-500">{instance.number}</p>
                      </div>
                    </div>
                    {instance.is_default && (
                      <Badge className="bg-violet-100 text-violet-700">Padrão</Badge>
                    )}
                  </div>

                  <div className="mt-4">{getStatusBadge(instance.status)}</div>

                  <div className="flex gap-2 mt-4">
                    {instance.status === 'disconnected' ? (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowQrDialog(true)}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Conectar
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleDisconnect(instance.id)}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    )}
                    
                    {!instance.is_default && instance.status === 'connected' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSetDefault(instance.id)}
                      >
                        Tornar padrão
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="sm" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.map((group: WhatsAppGroup) => (
              <Card key={group.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{group.name}</h3>
                        <p className="text-sm text-slate-500">{group.participants_count} participantes</p>
                      </div>
                    </div>
                    <Badge 
                      variant={group.is_full ? 'destructive' : 'secondary'}
                      className={cn(!group.is_full && 'bg-emerald-100 text-emerald-700')}
                    >
                      {group.is_full ? 'Lotado' : 'Aberto'}
                    </Badge>
                  </div>

                  {group.description && (
                    <p className="text-sm text-slate-500 mt-3">{group.description}</p>
                  )}

                  <div className="mt-4 space-y-3">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${(group.participants_count / group.max_participants) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      {group.participants_count} / {group.max_participants} participantes
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Input
                      placeholder="Digite uma mensagem..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      size="sm"
                      onClick={() => handleSendGroupMessage(group.group_id)}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">Templates HSM</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                Gerencie seus templates de mensagem aprovados pela Meta para envio em massa via API oficial.
              </p>
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Criar Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Instance Dialog */}
      <Dialog open={showNewInstanceDialog} onOpenChange={setShowNewInstanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nome</label>
              <Input
                placeholder="Ex: Principal, Suporte..."
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Número</label>
              <Input
                placeholder="5511999999999"
                value={newInstanceNumber}
                onChange={(e) => setNewInstanceNumber(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Formato: código do país + DDD + número (somente números)
              </p>
            </div>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateInstance}
              disabled={!newInstanceName || !newInstanceNumber || isConnecting}
            >
              {isConnecting ? (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4 mr-2" />
              )}
              Gerar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-slate-500">Escaneie o QR Code com seu WhatsApp para conectar</p>
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-slate-300">
              {qrCode ? (
                <img src={qrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
              ) : (
                <div className="w-64 h-64 mx-auto bg-slate-100 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>QR Code expira em 60 segundos</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowQrDialog(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
