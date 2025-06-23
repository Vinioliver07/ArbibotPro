# 🚀 ArbiBot Pro

**Sistema avançado de monitoramento e execução de arbitragem DeFi**

## ✨ Características

- 📊 **Dashboard em tempo real** - Monitore oportunidades de arbitragem instantaneamente
- 🎯 **Interface responsiva** - Perfeito para desktop, tablet e mobile
- ⚡ **Performance otimizada** - Construído com React e FastAPI
- 🔐 **Seguro e confiável** - Flash loans e execução automatizada
- 📈 **Análise avançada** - Gráficos e estatísticas detalhadas

## 🏗️ Arquitetura

```
src/
├── frontend/          # React App (Tailwind CSS)
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   │   ├── ui/           # Componentes base (Button, Card, etc)
│   │   │   └── dashboard/    # Componentes específicos
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── entities/      # Modelos de dados
│   │   └── utils/         # Utilitários
└── backend/           # FastAPI Server
    ├── api/              # Rotas da API
    ├── models/           # Modelos de dados
    └── services/         # Lógica de negócio
```

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 18+ 
- **Python** 3.8+
- **npm** ou **yarn**

### Instalação e Execução

```bash
# Clone o repositório
git clone <repository>
cd arbibotpro

# Execute o script de desenvolvimento
./start_dev.sh
```

O script automaticamente:
- ✅ Instala todas as dependências
- 🚀 Inicia frontend (React) na porta 3000
- 🔧 Inicia backend (FastAPI) na porta 8000
- 📚 Disponibiliza documentação da API

### URLs Disponíveis

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000  
- **Documentação API**: http://localhost:8000/docs

## 📱 Responsividade

A interface foi desenvolvida com **mobile-first design**:

- 📱 **Mobile** (320px+) - Interface otimizada para celulares
- 📱 **Tablet** (768px+) - Layout adaptado para tablets
- 💻 **Desktop** (1024px+) - Experiência completa para desktop
- 🖥️ **Large Desktop** (1600px+) - Layout expandido

## ⚡ Performance

### Frontend
- **React 18** com Concurrent Features
- **Tailwind CSS** para CSS otimizado
- **Framer Motion** para animações performáticas
- **Debounce/Throttle** em buscas e eventos
- **Lazy Loading** de componentes
- **Code Splitting** automático

### Backend
- **FastAPI** com async/await nativo
- **Pydantic** para validação de dados
- **GZip compression** middleware
- **CORS otimizado** com cache
- **Connection pooling** para banco de dados

## 🛠️ Tecnologias

### Frontend
- ⚛️ **React 18** - Biblioteca de UI
- 🎨 **Tailwind CSS** - Framework de CSS
- 🎭 **Framer Motion** - Animações
- 📊 **Recharts** - Gráficos e visualizações
- 🧭 **React Router** - Roteamento
- 🎯 **Lucide Icons** - Ícones

### Backend  
- 🐍 **FastAPI** - Framework web Python
- 📊 **Pydantic** - Validação de dados
- 🔄 **Uvicorn** - Servidor ASGI
- 🗄️ **SQLite/PostgreSQL** - Banco de dados
- 🌐 **Web3.py** - Integração blockchain

## 📂 Estrutura de Pastas

```
ArbiBot Pro/
├── src/
│   ├── frontend/              # Aplicação React
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/           # Componentes base (Button, Card, etc)
│   │   │   │   └── dashboard/    # Componentes específicos
│   │   │   ├── pages/            # Páginas da aplicação
│   │   │   ├── entities/         # Modelos de dados
│   │   │   └── utils/            # Funções utilitárias
│   │   ├── public/               # Arquivos públicos
│   │   └── package.json          # Dependências frontend
│   └── backend/               # API FastAPI
│       ├── api/                  # Rotas da API
│       ├── models/               # Modelos Pydantic
│       ├── services/             # Lógica de negócio
│       ├── main.py              # Entrada da aplicação
│       └── requirements.txt      # Dependências backend
├── start_dev.sh              # Script de desenvolvimento
└── README.md                 # Este arquivo
```

## 🔧 Comandos Úteis

```bash
# Instalar dependências manualmente
cd src/frontend && npm install
cd src/backend && pip install -r requirements.txt

# Executar apenas frontend
cd src/frontend && npm start

# Executar apenas backend  
cd src/backend && python main.py

# Build para produção
cd src/frontend && npm run build
```

## 🧪 Desenvolvimento

### Adicionar Nova Funcionalidade

1. **Frontend**: Criar componente em `src/frontend/src/components/`
2. **Backend**: Adicionar rota em `src/backend/api/routes.py`
3. **Modelo**: Definir em `src/backend/models/`
4. **Serviço**: Implementar lógica em `src/backend/services/`

### Padrões de Código

- **React**: Componentes funcionais com hooks
- **Python**: Type hints obrigatórios
- **CSS**: Tailwind classes utilitárias
- **Nomes**: camelCase (JS) e snake_case (Python)

## 📄 Licença

MIT License - Livre para uso pessoal e comercial.

---

**ArbiBot Pro** - Maximize seus lucros DeFi com arbitragem automatizada! 🚀

