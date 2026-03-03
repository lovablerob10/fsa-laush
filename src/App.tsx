import { useState, useEffect } from 'react';
import { Rocket, Loader2 } from 'lucide-react';
import { LoginPage } from '@/components/auth/LoginPage';
import { LandingPage } from '@/components/landing/LandingPage';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Timeline7Weeks } from '@/components/timeline/Timeline7Weeks';
import { MiniCRM } from '@/components/crm/MiniCRM';
import { WhatsAppManager } from '@/components/whatsapp/WhatsAppManager';
import { RAGManager } from '@/components/rag/RAGManager';
import { SalesRecovery } from '@/components/recovery/SalesRecovery';
import { ExpertBriefing } from '@/components/briefing/ExpertBriefing';
import { ActionCalendar } from '@/components/actions/ActionCalendar';
import { FrameworkManager } from '@/components/frameworks/FrameworkManager';
import { AIAgents } from '@/components/ai-agents/AIAgents';
import { useUIStore, useAuthStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import './App.css';

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-6 neon-glow">
          <span className="text-3xl">🚀</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-slate-400 max-w-md">
          Esta funcionalidade está sendo desenvolvida. Em breve você terá acesso completo.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 relative overflow-hidden">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 neon-glow">
        <Rocket className="w-8 h-8 text-white" />
      </div>
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      <p className="text-muted-foreground text-sm tracking-wide">Carregando Launch Lab Pro...</p>
    </div>
  );
}

function AppContent() {
  const { sidebarOpen, currentPage } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'briefing': return <ExpertBriefing />;
      case 'timeline': return <Timeline7Weeks />;
      case 'actions': return <ActionCalendar />;
      case 'crm': return <MiniCRM />;
      case 'whatsapp': return <WhatsAppManager />;
      case 'rag': return <RAGManager />;
      case 'frameworks': return <FrameworkManager />;
      case 'recovery': return <SalesRecovery />;
      case 'ai-agents': return <AIAgents />;
      case 'templates': return <ComingSoon title="Templates de Mensagem" />;
      case 'analytics': return <ComingSoon title="Analytics Avançado" />;
      case 'settings': return <ComingSoon title="Configurações" />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="bg-orb bg-orb-1 opacity-20 dark:opacity-10" />
      <div className="bg-orb bg-orb-2 opacity-20 dark:opacity-10" />
      <div className="bg-orb bg-orb-3 opacity-20 dark:opacity-10" />

      <Sidebar />
      <main className={cn(
        'transition-all duration-300 min-h-screen relative z-10',
        isMobile ? 'ml-0 pt-14' : (sidebarOpen ? 'ml-64' : 'ml-16')
      )}>
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  const { loading } = useAuth();
  const { isAuthenticated } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <AppContent />;

  // Not authenticated: show landing or login
  if (showLogin) return <LoginPage />;
  return <LandingPage onEnterApp={() => setShowLogin(true)} />;
}

export default App;
