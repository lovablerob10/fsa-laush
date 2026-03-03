import { useState } from 'react';
import {
  LayoutDashboard, Users, Calendar, MessageCircle, FileText, ShoppingCart,
  Settings, ChevronLeft, ChevronRight, Brain, BarChart3, ClipboardList,
  Target, BookOpen, Sparkles, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/store';
import { ClientSwitcher } from '@/components/clients/ClientSwitcher';
import { useAuth } from '@/hooks/useAuth';

interface NavItem { id: string; label: string; icon: React.ElementType; badge?: number; }

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'briefing', label: 'Briefing do Expert', icon: ClipboardList },
  { id: 'timeline', label: 'Timeline 7 Semanas', icon: Calendar },
  { id: 'actions', label: 'Calendário de Ações', icon: Target },
  { id: 'crm', label: 'Mini CRM', icon: Users },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'rag', label: 'Dossiê IA', icon: Brain },
  { id: 'frameworks', label: 'Frameworks & IAs', icon: BookOpen },
  { id: 'recovery', label: 'Recuperação', icon: ShoppingCart, badge: 0 },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentPage, setCurrentPage } = useUIStore();
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-slate-900 text-white transition-all duration-300 z-50 flex flex-col',
      sidebarOpen ? 'w-64' : 'w-16'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 flex-shrink-0">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Launch Lab Pro</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center mx-auto">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn('p-1 rounded-lg hover:bg-slate-800 transition-colors', !sidebarOpen && 'hidden')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Toggle quando collapsed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <ChevronRight className="w-3 h-3 text-white" />
        </button>
      )}

      {/* Client Switcher — só aparece quando sidebar aberta */}
      {sidebarOpen && (
        <div className="flex-shrink-0 py-2 border-b border-slate-800">
          <ClientSwitcher />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative',
                isActive ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                !sidebarOpen && 'justify-center px-2'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-white')} />
              {sidebarOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={cn('bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full', !sidebarOpen && 'absolute -top-1 -right-1')}>
                  {item.badge}
                </span>
              )}
              {!sidebarOpen && isHovered && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User info + Logout */}
      {sidebarOpen && user && (
        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <button onClick={signOut} title="Sair" className="text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
