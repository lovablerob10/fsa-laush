# Launch Lab Pro - Sistema de Gestão de Lançamentos

Sistema completo para agências de lançamentos gerenciarem múltiplos clientes com isolamento total de dados (multi-tenancy).

## 🚀 Deploy

**URL do Sistema:** https://fib2dqxzvprzm.ok.kimi.link

## 📁 Estrutura do Projeto

```
app/
├── src/
│   ├── components/
│   │   ├── actions/           # Calendário de Ações
│   │   │   └── ActionCalendar.tsx
│   │   ├── auth/              # Autenticação
│   │   ├── briefing/          # Briefing do Expert
│   │   │   └── ExpertBriefing.tsx
│   │   ├── crm/               # Mini CRM
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── frameworks/        # Frameworks & IAs
│   │   │   └── FrameworkManager.tsx
│   │   ├── layout/            # Layout (Sidebar)
│   │   ├── rag/               # Dossiê IA (RAG)
│   │   ├── recovery/          # Recuperação de Vendas
│   │   ├── timeline/          # Timeline 7 Semanas
│   │   ├── ui/                # Componentes UI (shadcn)
│   │   └── whatsapp/          # WhatsApp Manager
│   ├── lib/
│   │   └── supabase/          # Cliente Supabase
│   ├── store/
│   │   └── index.ts           # Zustand Stores
│   ├── App.tsx                # Roteamento principal
│   └── main.tsx               # Entry point
├── dist/                      # Build de produção
└── package.json
```

## 🏢 Modelo Multi-Tenant (Agência)

O sistema foi projetado para funcionar como uma **agência** que gerencia múltiplos clientes de lançamento:

### Isolamento por Cliente

Cada cliente tem:
- ✅ **Conta separada** com `tenant_id` único
- ✅ **Briefings isolados** - cada cliente preenche seu próprio briefing
- ✅ **Frameworks exclusivos** - frameworks personalizados por cliente
- ✅ **Dados isolados** - leads, vendas, métricas separadas
- ✅ **Calendário próprio** - ações específicas do lançamento

### Componentes com Multi-Tenancy

| Componente | Isolamento | Identificação Visual |
|------------|------------|---------------------|
| Dashboard | ✅ | Seletor de cliente no header |
| ExpertBriefing | ✅ | Badge com nome do cliente |
| FrameworkManager | ✅ | Separação Global vs Cliente |
| ActionCalendar | ✅ | Dados por tenant |
| MiniCRM | ✅ | Leads por tenant |
| Timeline | ✅ | Lançamentos por tenant |

## 🔄 Fluxo de Uso

### 1. Selecionar Cliente
No Dashboard, use o dropdown "Selecionar Cliente" para trocar entre clientes:
- Launch Lab Pro (padrão)
- Cliente A - Fitness
- Cliente B - Marketing
- Cliente C - Finanças

### 2. Preencher Briefing
Acesse "Briefing do Expert" e preencha:
- **Dados do Expert** (nome, bio, credenciais)
- **Dados do Produto** (nome, preço, bônus)
- **Público-Alvo** (dores, desejos, objeções)
- **Proposta de Valor** (promessa, benefício)
- **Tom de Voz** (estilo de comunicação)
- **Frameworks** (escolher estrutura)

### 3. Gerenciar Frameworks
Na aba "Frameworks & IAs":
- **Frameworks Padrão** (🔒) - Da agência, readonly
- **Frameworks Exclusivos** - Criados para cada cliente
- Upload de documentos para treinar a IA

### 4. Calendário de Ações
Na aba "Calendário de Ações":
- Visualize o que fazer em cada dia
- 7 semanas de planejamento
- Ações por canal (Instagram, Email, WhatsApp, etc)
- Marque ações como concluídas

## 🛠️ Tecnologias

- **Frontend:** React + TypeScript + Vite
- **Estilização:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Gráficos:** Recharts
- **Ícones:** Lucide React

## 📦 Instalação Local

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Fazer build
npm run build
```

## 🔧 Configuração Supabase

O sistema está preparado para conectar com Supabase. Configure as variáveis:

```env
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
```

### Tabelas Necessárias

```sql
-- Tenants (Clientes)
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  settings jsonb default '{}',
  created_at timestamp default now()
);

-- Briefings
create table briefings (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id),
  expert_name text,
  product_name text,
  data jsonb,
  created_at timestamp default now()
);

-- Frameworks
create table frameworks (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id),
  name text not null,
  type text,
  content text,
  is_global boolean default false,
  created_at timestamp default now()
);

-- Leads (CRM)
create table leads (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id),
  name text,
  email text,
  phone text,
  status text,
  created_at timestamp default now()
);
```

## 🎯 Próximos Passos

1. **Conectar Supabase** - Configurar variáveis de ambiente
2. **Implementar RLS** - Row Level Security para isolamento
3. **Edge Functions** - Funções serverless para processamento
4. **Integração OpenAI** - Geração de conteúdo com IA
5. **WhatsApp API** - Integração com Uazapi/Meta

## 📞 Suporte

Para dúvidas ou sugestões, entre em contato com a equipe de desenvolvimento.

---

**Launch Lab Pro** - Sistema de Gestão de Lançamentos Multi-Tenant
