import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Calendar, MessageCircle, FileText, ShoppingCart,
  Settings, ChevronLeft, ChevronRight, ChevronDown, Brain, BarChart3, ClipboardList,
  Target, BookOpen, Sparkles, LogOut, Bot, Menu, X, Wand2, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/store';
import { ClientSwitcher } from '@/components/clients/ClientSwitcher';
import { LaunchSwitcher } from '@/components/launches/LaunchSwitcher';

import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNotifications } from '@/hooks/useNotifications';
import { format, isToday, parseISO } from 'date-fns';

interface NavItem { id: string; label: string; icon: React.ElementType; badge?: number; section?: string; }

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'core' },
  { id: 'onboarding', label: 'Onboarding Expert', icon: Wand2, section: 'core' },
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

// Only these sections have a collapsible toggle (core = Lançamento is always open)
const COLLAPSIBLE_SECTIONS = ['sales', 'ai', 'tools'];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentPage, setCurrentPage, setPendingOpenTaskId } = useUIStore();
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const { notifications, count, overdueCount } = useNotifications();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sales: true,
    ai: true,
    tools: false,
  });

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on page change
  const handleNavClick = (pageId: string) => {
    setCurrentPage(pageId);
    if (isMobile) setMobileOpen(false);
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Auto-expand section when navigating to a page inside a collapsed section
  useEffect(() => {
    const activeItem = navItems.find(i => i.id === currentPage);
    if (activeItem?.section && COLLAPSIBLE_SECTIONS.includes(activeItem.section)) {
      setOpenSections(prev => ({ ...prev, [activeItem.section!]: true }));
    }
  }, [currentPage]);

  const sections = ['core', 'sales', 'ai', 'tools'];
  const showLabels = isMobile ? true : sidebarOpen;

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-[60] w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-screen transition-all duration-300 flex flex-col',
        'bg-sidebar border-r border-sidebar-border shadow-xl shadow-slate-900/5',
        isMobile
          ? cn('w-72 z-[60]', mobileOpen ? 'translate-x-0' : '-translate-x-full')
          : cn('z-50', sidebarOpen ? 'w-64' : 'w-[68px]')
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
          {showLabels ? (
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
          {isMobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/60 transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={toggleSidebar}
              className={cn('p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/60 transition-colors text-muted-foreground hover:text-foreground', !sidebarOpen && 'hidden')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle collapsed (desktop only) */}
        {!isMobile && !sidebarOpen && (
          <button onClick={toggleSidebar}
            className="absolute -right-3 top-20 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30 hover:bg-violet-500 transition-colors">
            <ChevronRight className="w-3 h-3 text-white" />
          </button>
        )}

        {/* Client Switcher */}
        {showLabels && (
          <div className="flex-shrink-0 border-b border-slate-800/60">
            <div className="py-2">
              <ClientSwitcher />
            </div>
            <LaunchSwitcher />
          </div>
        )}


        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {sections.map(section => {
            const items = navItems.filter(i => i.section === section);
            const isCollapsible = COLLAPSIBLE_SECTIONS.includes(section);
            const isSectionOpen = !isCollapsible || openSections[section];
            const hasActiveItem = items.some(i => i.id === currentPage);

            return (
              <div key={section} className="mb-1">
                {showLabels && (
                  isCollapsible ? (
                    /* Clickable collapsible header */
                    <button
                      onClick={() => toggleSection(section)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 pt-3 pb-1.5 group transition-colors',
                        hasActiveItem && !isSectionOpen
                          ? 'text-violet-400'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                        {sectionLabels[section]}
                        {hasActiveItem && !isSectionOpen && (
                          <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-violet-400 rounded-full align-middle" />
                        )}
                      </span>
                      <ChevronDown className={cn(
                        'w-3 h-3 transition-transform duration-200 opacity-40 group-hover:opacity-100',
                        isSectionOpen ? 'rotate-0' : '-rotate-90'
                      )} />
                    </button>
                  ) : (
                    /* Static label for Lançamento */
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                      {sectionLabels[section]}
                    </p>
                  )
                )}

                {/* Animated items container */}
                <div className={cn(
                  'overflow-hidden transition-all duration-200',
                  isSectionOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                )}>
                  <div className={cn('space-y-0.5', showLabels ? 'px-2' : 'px-1.5')}>
                    {items.map(item => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      const isHovered = hoveredItem === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative group',
                            isActive
                              ? 'bg-violet-600/10 text-violet-700 dark:bg-violet-600/15 dark:text-violet-300 border border-violet-500/20'
                              : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-foreground border border-transparent',
                            !showLabels && 'justify-center px-2'
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-violet-500 rounded-r-full" />
                          )}
                          <Icon className={cn('w-[18px] h-[18px] flex-shrink-0 transition-colors', isActive && 'text-violet-600 dark:text-violet-400')} />
                          {showLabels && <span className="text-[13px] font-medium truncate">{item.label}</span>}
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={cn('bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center', !showLabels && 'absolute -top-1 -right-1')}>
                              {item.badge}
                            </span>
                          )}
                          {!showLabels && isHovered && (
                            <div className="absolute left-full ml-3 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg whitespace-nowrap z-50 shadow-xl border border-border">
                              {item.label}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User & Settings */}
        <div className={cn('flex-shrink-0 border-t border-sidebar-border', showLabels ? 'p-3' : 'p-2')}>
          <div className={cn('flex items-center gap-2 mb-2', !showLabels && 'justify-center flex-col')}>
            <ThemeToggle isCollapsed={!showLabels} className={!showLabels ? 'w-full flex justify-center' : ''} />
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  'relative p-2 rounded-xl transition-colors',
                  count > 0 ? 'text-amber-500 hover:bg-amber-50' : 'text-muted-foreground hover:bg-slate-100'
                )}
                title={`${count} tarefa${count !== 1 ? 's' : ''} pendente${count !== 1 ? 's' : ''}`}
              >
                <Bell className="w-4 h-4" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && count > 0 && (
                <div
                  className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
                  onMouseLeave={() => setShowNotifications(false)}
                >
                  <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      🔔 {overdueCount > 0 ? `${overdueCount} vencida${overdueCount > 1 ? 's' : ''}` : ''}
                      {overdueCount > 0 && notifications.some(n => !n.overdue) ? ' · ' : ''}
                      {notifications.filter(n => !n.overdue).length > 0 ? `${notifications.filter(n => !n.overdue).length} hoje` : ''}
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setPendingOpenTaskId(n.id);
                          setCurrentPage('timeline');
                          setShowNotifications(false);
                        }}
                      >
                        <span className="text-lg flex-shrink-0 mt-0.5">{n.overdue ? '🔴' : '🟡'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{n.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {n.overdue ? 'Vencida em ' : 'Vence '}
                            {format(parseISO(n.due_date), "dd/MM")}
                            {n.phase_name && ` · ${n.phase_name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showNotifications && count === 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-[100] text-center">
                  <p className="text-2xl mb-1">✅</p>
                  <p className="text-xs font-semibold text-slate-700">Tudo em dia!</p>
                  <p className="text-xs text-slate-400">Sem tarefas vencendo hoje</p>
                </div>
              )}
            </div>
          </div>

          {user && (
            <div className={cn('flex items-center', showLabels ? 'gap-3' : 'justify-center')}>
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow shadow-emerald-500/20">
                <span className="text-white text-xs font-bold">{user.name?.charAt(0).toUpperCase()}</span>
              </div>
              {showLabels && (
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
    </>
  );
}
