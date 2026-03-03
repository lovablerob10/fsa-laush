import { useState } from 'react';
import {
  LayoutDashboard, Users, Calendar, MessageCircle, FileText, ShoppingCart,
  Settings, ChevronLeft, ChevronRight, Brain, BarChart3, ClipboardList,
  Target, BookOpen, Sparkles, LogOut, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/store';
import { ClientSwitcher } from '@/components/clients/ClientSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavItem { id: string; label: string; icon: React.ElementType; badge?: number; section?: string; }

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'core' },
  { id: 'briefing', label: 'Briefing do Expert', icon: ClipboardList, section: 'core' },
  { id: 'timeline', label: 'Timeline 7 Semanas', icon: Calendar, section: 'core' },
  { id: 'actions', label: 'Calendário de Ações', icon: Target, section: 'core' },
  { id: 'crm', label: 'Mini CRM', icon: Users, section: 'sales' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, section: 'sales' },
  { id: 'recovery', label: 'Recuperação', icon: ShoppingCart, section: 'sales', badge: 0 },
  { id: 'rag', label: 'Dossiê IA', icon: Brain, section: 'ai' },
  { id: 'frameworks', label: 'Frameworks & IAs', icon: BookOpen, section: 'ai' },
  { id: 'ai-agents', label: 'Equipe IA', icon: Bot, section: 'ai' },
  { id: 'templates', label: 'Templates', icon: FileText, section: 'tools' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'tools' },
  { id: 'settings', label: 'Configurações', icon: Settings, section: 'tools' },
];

const sectionLabels: Record<string, string> = {
  core: 'Lançamento',
  sales: 'Vendas',
  ai: 'Inteligência',
  tools: 'Ferramentas',
};

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentPage, setCurrentPage } = useUIStore();
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const sections = ['core', 'sales', 'ai', 'tools'];

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen transition-all duration-300 z-50 flex flex-col',
      'bg-sidebar border-r border-sidebar-border shadow-xl shadow-slate-900/5',
      sidebarOpen ? 'w-64' : 'w-[68px]'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 neon-glow">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground tracking-tight">Launch Lab</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-600 dark:text-violet-300 font-semibold">PRO</span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20 neon-glow">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn('p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/60 transition-colors text-muted-foreground hover:text-foreground', !sidebarOpen && 'hidden')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Toggle collapsed */}
      {!sidebarOpen && (
        <button onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30 hover:bg-violet-500 transition-colors">
          <ChevronRight className="w-3 h-3 text-white" />
        </button>
      )}

      {/* Client Switcher */}
      {sidebarOpen && (
        <div className="flex-shrink-0 py-2 border-b border-slate-800/60">
          <ClientSwitcher />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {sections.map(section => {
          const items = navItems.filter(i => i.section === section);
          return (
            <div key={section} className="mb-2">
              {sidebarOpen && (
                <p className="px-4 pt-2 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                  {sectionLabels[section]}
                </p>
              )}
              <div className={cn('space-y-0.5', sidebarOpen ? 'px-2' : 'px-1.5')}>
                {items.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  const isHovered = hoveredItem === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative group',
                        isActive
                          ? 'bg-violet-600/10 text-violet-700 dark:bg-violet-600/15 dark:text-violet-300 border border-violet-500/20'
                          : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-foreground border border-transparent',
                        !sidebarOpen && 'justify-center px-2'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-violet-500 rounded-r-full" />
                      )}
                      <Icon className={cn('w-[18px] h-[18px] flex-shrink-0 transition-colors', isActive && 'text-violet-600 dark:text-violet-400')} />
                      {sidebarOpen && <span className="text-[13px] font-medium truncate">{item.label}</span>}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={cn('bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center', !sidebarOpen && 'absolute -top-1 -right-1')}>
                          {item.badge}
                        </span>
                      )}
                      {!sidebarOpen && isHovered && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg whitespace-nowrap z-50 shadow-xl border border-border">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User & Settings */}
      <div className={cn('flex-shrink-0 border-t border-sidebar-border', sidebarOpen ? 'p-3' : 'p-2')}>
        <div className={cn('flex items-center gap-2 mb-2', !sidebarOpen && 'justify-center')}>
          <ThemeToggle isCollapsed={!sidebarOpen} className={!sidebarOpen ? 'w-full flex justify-center' : ''} />
        </div>

        {user && (
          <div className={cn('flex items-center', sidebarOpen ? 'gap-3' : 'justify-center')}>
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow shadow-emerald-500/20">
              <span className="text-white text-xs font-bold">{user.name?.charAt(0).toUpperCase()}</span>
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <button onClick={signOut} title="Sair" className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
