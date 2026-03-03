import { Rocket, Loader2 } from 'lucide-react';
import { LoginPage } from '@/components/auth/LoginPage';
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
import { useUIStore, useAuthStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import './App.css';

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-20 h-20 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🚀</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-500 max-w-md">
          Esta funcionalidade está sendo desenvolvida. Em breve você terá acesso completo.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
        <Rocket className="w-7 h-7 text-white" />
      </div>
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      <p className="text-slate-500 text-sm">Carregando FSA Launch Lab...</p>
    </div>
  );
}

function AppContent() {
  const { sidebarOpen, currentPage } = useUIStore();

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
      case 'templates': return <ComingSoon title="Templates de Mensagem" />;
      case 'analytics': return <ComingSoon title="Analytics Avançado" />;
      case 'settings': return <ComingSoon title="Configurações" />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className={cn(
        'transition-all duration-300 min-h-screen',
        sidebarOpen ? 'ml-64' : 'ml-16'
      )}>
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  const { loading } = useAuth();
  const { isAuthenticated } = useAuthStore();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginPage />;
  return <AppContent />;
}

export default App;
