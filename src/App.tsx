import { useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import './App.css';

// Componente placeholder para páginas em desenvolvimento
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

function App() {
  const { sidebarOpen, currentPage } = useUIStore();
  const { setUser, setTenant } = useAuthStore();

  useEffect(() => {
    // Inicializa com usuário mockado para demonstração
    setUser({
      id: '1',
      email: 'admin@launchlab.pro',
      name: 'Administrador',
      tenant_id: '1',
      role: 'admin',
      created_at: new Date().toISOString(),
    });

    setTenant({
      id: '1',
      name: 'Launch Lab Pro',
      slug: 'launch-lab-pro',
      settings: {},
      created_at: new Date().toISOString(),
    });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'briefing':
        return <ExpertBriefing />;
      case 'timeline':
        return <Timeline7Weeks />;
      case 'actions':
        return <ActionCalendar />;
      case 'crm':
        return <MiniCRM />;
      case 'whatsapp':
        return <WhatsAppManager />;
      case 'rag':
        return <RAGManager />;
      case 'frameworks':
        return <FrameworkManager />;
      case 'recovery':
        return <SalesRecovery />;
      case 'templates':
        return <ComingSoon title="Templates de Mensagem" />;
      case 'analytics':
        return <ComingSoon title="Analytics Avançado" />;
      case 'settings':
        return <ComingSoon title="Configurações" />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main 
        className={cn(
          'transition-all duration-300 min-h-screen',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
