import { useAuthStore } from '@/store';
import {
  TrendingUp, TrendingDown, Users, DollarSign, Target,
  MessageCircle, ShoppingCart, BarChart3, Sparkles, ArrowUpRight,
  Clock, Zap, Bot
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

// Mock data
const revenueData = Array.from({ length: 14 }, (_, i) => ({
  date: format(subDays(new Date(), 13 - i), 'dd/MM'),
  revenue: Math.floor(Math.random() * 40000) + 20000,
  leads: Math.floor(Math.random() * 100) + 30,
}));

const stats = [
  { label: 'Receita Total', value: 'R$ 127.480', change: '+12.5%', up: true, icon: DollarSign, color: 'from-emerald-500 to-teal-500', shadowColor: 'shadow-emerald-500/20' },
  { label: 'Leads Captados', value: '2.340', change: '+8.2%', up: true, icon: Users, color: 'from-violet-500 to-indigo-500', shadowColor: 'shadow-violet-500/20' },
  { label: 'Taxa de Conversão', value: '4.8%', change: '+0.3%', up: true, icon: Target, color: 'from-amber-500 to-orange-500', shadowColor: 'shadow-amber-500/20' },
  { label: 'CPL Médio', value: 'R$ 3,42', change: '-5.1%', up: false, icon: ShoppingCart, color: 'from-cyan-500 to-blue-500', shadowColor: 'shadow-cyan-500/20' },
];

const quickActions = [
  { label: 'Criar Briefing', icon: Sparkles, desc: 'Novo expert', page: 'briefing' },
  { label: 'Mini CRM', icon: Users, desc: 'Leads e oportunidades', page: 'crm' },
  { label: 'WhatsApp', icon: MessageCircle, desc: 'Disparos e mensagens', page: 'whatsapp' },
  { label: 'Equipe IA', icon: Bot, desc: '16 agentes trabalhando', page: 'ai-agents' },
];

const agentActivities = [
  { agent: 'Emilio', task: 'Escrevendo 12 emails de lançamento', time: '3 min atrás', status: 'working' },
  { agent: 'Picasso', task: 'Analisou 8 Reels top do nicho', time: '15 min atrás', status: 'done' },
  { agent: 'Pluto', task: 'Pesquisando 5 prospects LinkedIn', time: 'Agora', status: 'working' },
  { agent: 'Cicero', task: 'Gerou 4 posts multi-plataforma', time: '1h atrás', status: 'done' },
];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 !border-slate-700/60">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name === 'revenue' ? `R$ ${(p.value / 1000).toFixed(1)}k` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function Dashboard() {
  const { activeTenant } = useAuthStore() as any;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Visão geral — <span className="text-violet-400 font-medium">{activeTenant?.name || 'Selecione um cliente'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">4 agentes ativos</span>
          </div>
        </div>
      </div>

      {/* Bento Grid: Stat Cards */}
      <div className="bento-grid">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card group cursor-pointer hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', stat.color, stat.shadowColor)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={cn(stat.up ? 'metric-up' : 'metric-down')}>
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Bento Grid: Charts + Actions */}
      <div className="bento-grid">
        {/* Revenue Chart — 3 cols */}
        <div className="glass-card p-5 span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                Receita & Leads (14 dias)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Receita</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Leads</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(258, 90%, 66%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(258, 90%, 66%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-leads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 28%, 12%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 40%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 20%, 40%)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(258, 90%, 66%)" fill="url(#grad-revenue)" strokeWidth={2} />
              <Area type="monotone" dataKey="leads" stroke="hsl(160, 84%, 39%)" fill="url(#grad-leads)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions — 1 col */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Ações Rápidas
          </h3>
          <div className="space-y-2">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button key={i}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-violet-500/30 hover:bg-violet-600/5 transition-all group text-left">
                  <div className="w-9 h-9 rounded-lg bg-slate-800/80 flex items-center justify-center group-hover:bg-violet-600/20 transition-colors">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-300 font-medium truncate">{action.label}</p>
                    <p className="text-[11px] text-slate-600 truncate">{action.desc}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-violet-400 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bento Grid: AI Activity + Metrics */}
      <div className="bento-grid">
        {/* AI Agent Activity — 2 cols */}
        <div className="glass-card p-5 span-2">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-400" />
            Atividade da Equipe IA
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-semibold">LIVE</span>
          </h3>
          <div className="space-y-3">
            {agentActivities.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-800/40">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                  activity.status === 'working' ? 'bg-violet-600/20 text-violet-400' : 'bg-emerald-600/20 text-emerald-400'
                )}>
                  {activity.agent.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-300 font-medium truncate">
                    <span className="text-white font-semibold">{activity.agent}</span> — {activity.task}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span className="text-[11px] text-slate-600">{activity.time}</span>
                    {activity.status === 'working' && (
                      <span className="flex items-center gap-1 text-[10px] text-violet-400">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                        Trabalhando...
                      </span>
                    )}
                    {activity.status === 'done' && (
                      <span className="text-[10px] text-emerald-500">✓ Concluído</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Launch Progress — 2 cols */}
        <div className="glass-card p-5 span-2">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Progresso do Lançamento
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Briefing do Expert', progress: 100, color: 'bg-emerald-500' },
              { label: 'Página de Vendas', progress: 75, color: 'bg-violet-500' },
              { label: 'Sequência de Emails', progress: 40, color: 'bg-amber-500' },
              { label: 'Anúncios Criativos', progress: 20, color: 'bg-cyan-500' },
              { label: 'Semana de Lançamento', progress: 0, color: 'bg-slate-600' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-slate-400">{item.label}</span>
                  <span className="text-[12px] text-slate-500 font-medium">{item.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden">
                  <div className={cn('h-2 rounded-full transition-all duration-1000', item.color)}
                    style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
