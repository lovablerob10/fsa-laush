import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Target,
  MessageCircle,
  Percent,
  Building2,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useDashboardStore, useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

// Dados mockados para demonstração
const mockRevenueData = Array.from({ length: 30 }, (_, i) => ({
  date: format(subDays(new Date(), 29 - i), 'dd/MM'),
  revenue: Math.floor(Math.random() * 50000) + 20000,
  target: 40000,
}));

const mockFunnelData = [
  { stage: 'Leads', value: 1000, color: '#8b5cf6' },
  { stage: 'Qualificados', value: 650, color: '#a78bfa' },
  { stage: 'Oportunidades', value: 320, color: '#c4b5fd' },
  { stage: 'Propostas', value: 180, color: '#ddd6fe' },
  { stage: 'Clientes', value: 85, color: '#10b981' },
];

const mockSourceData = [
  { name: 'Orgânico', value: 35, color: '#8b5cf6' },
  { name: 'Pago', value: 45, color: '#f59e0b' },
  { name: 'Indicação', value: 20, color: '#10b981' },
];

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, change, icon: Icon, trend }: MetricCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : null}
              <span className={cn(
                'text-sm font-medium',
                trend === 'up' ? 'text-emerald-500' : 
                trend === 'down' ? 'text-red-500' : 'text-slate-500'
              )}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              <span className="text-sm text-slate-400">vs mês anterior</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-violet-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mock de clientes para demonstração
const MOCK_CLIENTS = [
  { id: '1', name: 'Launch Lab Pro' },
  { id: '2', name: 'Cliente A - Fitness' },
  { id: '3', name: 'Cliente B - Marketing' },
  { id: '4', name: 'Cliente C - Finanças' },
];

export function Dashboard() {
  const { metrics, setMetrics, dateRange } = useDashboardStore();
  const { tenant, setTenant } = useAuthStore();
  const [activeLaunch, setActiveLaunch] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  async function loadDashboardData() {
    try {
      // Busca lançamento ativo
      const { data: launch } = await supabase
        .from('launches')
        .select('*')
        .eq('tenant_id', tenant?.id)
        .eq('status', 'active')
        .single();

      setActiveLaunch(launch);

      // Calcula métricas (simulado - em produção viría da função RPC)
      const mockMetrics = {
        revenue: {
          current: 1250000,
          target: 2000000,
          previous_period: 980000,
        },
        leads: {
          total: 3456,
          new: 234,
          qualified: 1890,
        },
        conversion: {
          rate: 4.8,
          funnel: {
            lead: 3456,
            qualified: 1890,
            opportunity: 567,
            proposal: 234,
            customer: 167,
          },
        },
        cpl: 45.50,
        roi: 285,
        recovery: {
          sent: 234,
          recovered: 67,
          revenue: 125000,
        },
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    }
  }

  const revenueProgress = metrics ? 
    (metrics.revenue.current / metrics.revenue.target) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            {format(dateRange.start, 'dd/MM/yyyy')} - {format(dateRange.end, 'dd/MM/yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Seletor de Cliente */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Building2 className="w-4 h-4" />
                {tenant?.name || 'Selecionar Cliente'}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {MOCK_CLIENTS.map((client) => (
                <DropdownMenuItem 
                  key={client.id}
                  onClick={() => setTenant({ 
                    id: client.id, 
                    name: client.name, 
                    slug: client.name.toLowerCase().replace(/\s+/g, '-'),
                    settings: {},
                    created_at: new Date().toISOString()
                  })}
                  className={tenant?.id === client.id ? 'bg-violet-50' : ''}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  {client.name}
                  {tenant?.id === client.id && (
                    <Badge variant="secondary" className="ml-auto bg-violet-100 text-violet-700">
                      Ativo
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeLaunch && (
            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
              {activeLaunch.name} - Semana {activeLaunch.current_week}/7
            </Badge>
          )}
          <Button variant="outline" size="sm">
            Últimos 30 dias
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita Total"
          value={metrics ? `R$ ${(metrics.revenue.current / 1000).toFixed(1)}k` : 'R$ 0'}
          change={metrics ? ((metrics.revenue.current - metrics.revenue.previous_period) / metrics.revenue.previous_period * 100) : 0}
          icon={DollarSign}
          trend="up"
        />
        <MetricCard
          title="Leads"
          value={metrics?.leads.total.toString() || '0'}
          change={12.5}
          icon={Users}
          trend="up"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics?.conversion.rate || 0}%`}
          change={0.8}
          icon={Percent}
          trend="up"
        />
        <MetricCard
          title="CPL"
          value={`R$ ${metrics?.cpl.toFixed(2) || '0'}`}
          change={-5.2}
          icon={Target}
          trend="down"
        />
      </div>

      {/* Revenue Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progresso da Meta de Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  R$ {(metrics?.revenue.current || 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-slate-500">
                  Meta: R$ {(metrics?.revenue.target || 0).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-violet-600">
                  {revenueProgress.toFixed(1)}%
                </p>
                <p className="text-sm text-slate-500">alcançado</p>
              </div>
            </div>
            <Progress value={revenueProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#e2e8f0" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockFunnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis 
                  dataKey="stage" 
                  type="category" 
                  stroke="#64748b"
                  fontSize={12}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {mockFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-semibold">Recuperação de Carrinho</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mensagens enviadas</span>
                <span className="font-semibold">{metrics?.recovery.sent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Carrinhos recuperados</span>
                <span className="font-semibold text-emerald-600">
                  {metrics?.recovery.recovered || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Receita recuperada</span>
                <span className="font-semibold text-emerald-600">
                  R$ {(metrics?.recovery.revenue || 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Taxa de recuperação</span>
                  <span className="font-bold text-violet-600">
                    {metrics ? ((metrics.recovery.recovered / metrics.recovery.sent) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Origem dos Leads</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mockSourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                >
                  {mockSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {mockSourceData.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold">WhatsApp</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Instâncias ativas</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  3/3
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mensagens hoje</span>
                <span className="font-semibold">1,234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Taxa de entrega</span>
                <span className="font-semibold text-emerald-600">98.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Grupos ativos</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Templates aprovados</span>
                  <span className="font-bold text-violet-600">8/10</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
