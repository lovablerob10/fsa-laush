import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Store de Autenticação e Tenant
export const useAuthStore = create(
  persist(
    (set: any, get: any) => ({
      user: null,
      tenant: null,          // tenant real do usuário logado
      activeTenant: null,    // tenant selecionado para trabalhar (pode ser diferente para admin FSA)
      activeLaunch: null,    // lançamento ativo dentro do tenant selecionado
      isAuthenticated: false,
      setUser: (user: any) => set({ user, isAuthenticated: !!user }),
      setTenant: (tenant: any) => set((state: any) => ({
        tenant,
        activeTenant: state.activeTenant ?? tenant,
      })),
      setActiveTenant: (activeTenant: any) => set({ activeTenant, activeLaunch: null }), // reset launch on tenant switch
      setActiveLaunch: (activeLaunch: any) => set({ activeLaunch }),
      logout: () => set({ user: null, tenant: null, activeTenant: null, activeLaunch: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);


// Store de Dashboard
export const useDashboardStore = create((set: any) => ({
  metrics: null,
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  },
  isLoading: false,
  setMetrics: (metrics: any) => set({ metrics }),
  setDateRange: (dateRange: any) => set({ dateRange }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Store de Leads (CRM)
export const useLeadsStore = create((set: any) => ({
  leads: [],
  selectedLead: null,
  tags: [],
  filters: {
    status: [],
    stage: [],
    tags: [],
    search: '',
  },
  isLoading: false,
  setLeads: (leads: any[]) => set({ leads }),
  addLead: (lead: any) => set((state: any) => ({ leads: [lead, ...state.leads] })),
  updateLead: (id: string, updates: any) => set((state: any) => ({
    leads: state.leads.map((l: any) => l.id === id ? { ...l, ...updates } : l),
  })),
  deleteLead: (id: string) => set((state: any) => ({
    leads: state.leads.filter((l: any) => l.id !== id),
  })),
  selectLead: (lead: any) => set({ selectedLead: lead }),
  setTags: (tags: any[]) => set({ tags }),
  setFilters: (filters: any) => set((state: any) => ({
    filters: { ...state.filters, ...filters }
  })),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Store de Documentos (RAG)
export const useDocumentsStore = create((set: any) => ({
  documents: [],
  selectedDocument: null,
  isUploading: false,
  uploadProgress: 0,
  setDocuments: (documents: any[]) => set({ documents }),
  addDocument: (document: any) => set((state: any) => ({
    documents: [document, ...state.documents]
  })),
  removeDocument: (id: string) => set((state: any) => ({
    documents: state.documents.filter((d: any) => d.id !== id)
  })),
  selectDocument: (document: any) => set({ selectedDocument: document }),
  setUploading: (isUploading: boolean) => set({ isUploading }),
  setUploadProgress: (uploadProgress: number) => set({ uploadProgress }),
}));

// Store de WhatsApp
export const useWhatsAppStore = create((set: any) => ({
  instances: [],
  selectedInstance: null,
  qrCode: null,
  isConnecting: false,
  connectionStatus: 'idle',
  setInstances: (instances: any[]) => set({ instances }),
  addInstance: (instance: any) => set((state: any) => ({
    instances: [instance, ...state.instances]
  })),
  updateInstance: (id: string, updates: any) => set((state: any) => ({
    instances: state.instances.map((i: any) => i.id === id ? { ...i, ...updates } : i),
  })),
  removeInstance: (id: string) => set((state: any) => ({
    instances: state.instances.filter((i: any) => i.id !== id),
  })),
  selectInstance: (instance: any) => set({ selectedInstance: instance }),
  setQrCode: (qrCode: string | null) => set({ qrCode }),
  setConnecting: (isConnecting: boolean) => set({ isConnecting }),
  setConnectionStatus: (connectionStatus: string) => set({ connectionStatus }),
}));

// Store de Lançamentos (Timeline)
export const useLaunchesStore = create((set: any) => ({
  launches: [],
  selectedLaunch: null,
  isLoading: false,
  setLaunches: (launches: any[]) => set({ launches }),
  addLaunch: (launch: any) => set((state: any) => ({
    launches: [launch, ...state.launches]
  })),
  updateLaunch: (id: string, updates: any) => set((state: any) => ({
    launches: state.launches.map((l: any) => l.id === id ? { ...l, ...updates } : l),
  })),
  deleteLaunch: (id: string) => set((state: any) => ({
    launches: state.launches.filter((l: any) => l.id !== id),
  })),
  selectLaunch: (launch: any) => set({ selectedLaunch: launch }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Store de Templates de Mensagem
export const useTemplatesStore = create((set: any) => ({
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  setTemplates: (templates: any[]) => set({ templates }),
  addTemplate: (template: any) => set((state: any) => ({
    templates: [template, ...state.templates]
  })),
  updateTemplate: (id: string, updates: any) => set((state: any) => ({
    templates: state.templates.map((t: any) => t.id === id ? { ...t, ...updates } : t),
  })),
  deleteTemplate: (id: string) => set((state: any) => ({
    templates: state.templates.filter((t: any) => t.id !== id),
  })),
  selectTemplate: (template: any) => set({ selectedTemplate: template }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Store de Carrinhos Abandonados
export const useAbandonedCartsStore = create((set: any) => ({
  carts: [],
  selectedCart: null,
  filters: {
    status: [],
    minValue: 0,
    maxValue: 10000,
  },
  isLoading: false,
  setCarts: (carts: any[]) => set({ carts }),
  addCart: (cart: any) => set((state: any) => ({ carts: [cart, ...state.carts] })),
  updateCart: (id: string, updates: any) => set((state: any) => ({
    carts: state.carts.map((c: any) => c.id === id ? { ...c, ...updates } : c),
  })),
  selectCart: (cart: any) => set({ selectedCart: cart }),
  setFilters: (filters: any) => set((state: any) => ({
    filters: { ...state.filters, ...filters }
  })),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Store de UI/Layout
export const useUIStore = create((set: any) => ({
  sidebarOpen: true,
  currentPage: 'dashboard',
  theme: 'light',
  notifications: [],
  pendingOpenTaskId: null as string | null, // used to auto-open a task in Timeline after navigation
  toggleSidebar: () => set((state: any) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentPage: (currentPage: string) => set({ currentPage }),
  setTheme: (theme: string) => set({ theme }),
  setPendingOpenTaskId: (id: string | null) => set({ pendingOpenTaskId: id }),
  addNotification: (notification: any) => set((state: any) => ({
    notifications: [
      { ...notification, id: Math.random().toString(36).substr(2, 9) },
      ...state.notifications,
    ].slice(0, 5),
  })),
  removeNotification: (id: string) => set((state: any) => ({
    notifications: state.notifications.filter((n: any) => n.id !== id),
  })),
}));
