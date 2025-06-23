# ArbiBot Pro

Um sistema completo de monitoramento e execução de arbitragem DeFi em tempo real, com interface web moderna e API REST.

## 🚀 Funcionalidades

- **Monitoramento em Tempo Real**: Acompanhe oportunidades de arbitragem entre diferentes DEXs
- **Interface Web Moderna**: Dashboard responsivo com gráficos e estatísticas
- **Configuração Flexível**: Configure tokens, spreads mínimos e DEXs habilitadas
- **API REST**: Backend Python com FastAPI para integração
- **Análise de Lucro**: Cálculo automático de lucro líquido considerando taxas de gás

## 🛠️ Tecnologias

### Frontend
- React 18
- React Router DOM
- Lucide React (ícones)
- Framer Motion (animações)
- Recharts (gráficos)
- Tailwind CSS (estilização)

### Backend
- Python 3.9+
- FastAPI
- Uvicorn
- Pydantic
- Requests

## 📦 Instalação

### Pré-requisitos
- Node.js 16+
- Python 3.9+
- npm ou yarn

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/ArbiBot-Pro.git
cd ArbiBot-Pro
```

### 2. Instale as dependências do Frontend
```bash
cd "ArbiBot Pro"
npm install
```

### 3. Instale as dependências do Backend
```bash
pip install -r requirements.txt
```

## 🚀 Como Usar

### 1. Inicie o Backend (API REST)
```bash
python api.py
```
A API estará disponível em: http://localhost:8000

### 2. Inicie o Frontend
```bash
cd "ArbiBot Pro"
npm start
```
O frontend estará disponível em: http://localhost:3000

## 📁 Estrutura do Projeto

```
ArbiBot Pro/
├── api.py                    # API REST FastAPI
├── requirements.txt          # Dependências Python
├── package.json             # Dependências Node.js
├── README.md               # Documentação
├── .gitignore              # Arquivos ignorados pelo Git
├── ArbitrageOpportunity.py # Script de consulta de oportunidades
├── MonitoringConfig.py     # Script de configurações
├── Layout.js               # Layout principal da aplicação
├── Entities/               # Schemas e funções de API
│   ├── index.js           # Funções de acesso à API
│   ├── ArbitrageOpportunity.jsx
│   └── MonitoringConfig.jsx
├── Pages/                  # Páginas da aplicação
│   ├── Dashboard.html     # Dashboard principal
│   └── Config.html        # Página de configurações
└── Components/            # Componentes reutilizáveis
    └── dashboard/
        ├── OpportunityCard.html
        ├── PriceChart.html
        └── StatsOverview.html
```

## 🔧 Configuração

### Configurações de Monitoramento
- **Token Symbol**: Símbolo do token (ETH, BTC, etc.)
- **Token Address**: Endereço do contrato do token
- **Spread Mínimo**: Percentual mínimo de spread para alertar
- **Lucro Mínimo**: Lucro mínimo em USD
- **Valor Máximo de Flash Loan**: Limite para empréstimos
- **DEXs Habilitadas**: Lista de DEXs para monitoramento

### Status das Oportunidades
- **Ativa**: Oportunidade disponível para execução
- **Executada**: Arbitragem já foi realizada
- **Expirada**: Janela de execução expirou
- **Insuficiente**: Lucro não compensa os custos

## 📊 Dashboard

O dashboard exibe:
- **Estatísticas Gerais**: Oportunidades ativas, lucro potencial, spread médio
- **Lista de Oportunidades**: Cards com detalhes de cada arbitragem
- **Gráfico de Preços**: Histórico de spreads nas últimas 24h
- **Filtros**: Por status e busca por token/DEX

## 🔌 API Endpoints

### ArbitrageOpportunity
- `GET /arbitrage-opportunities` - Lista todas as oportunidades

### MonitoringConfig
- `GET /monitoring-configs` - Lista todas as configurações

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## ⚠️ Disclaimer

Este software é apenas para fins educacionais e de demonstração. Não use para investimentos reais sem entender completamente os riscos envolvidos em arbitragem DeFi.

## 📞 Suporte

Para dúvidas ou suporte, abra uma issue no GitHub ou entre em contato através do email: seu-email@exemplo.com 