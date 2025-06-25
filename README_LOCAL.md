# 🚀 ArbiBot Pro - Versão Local Otimizada

Bot de arbitragem **local** ultra-otimizado para execução direta nos contratos, sem interface web. Focado em **máximo desempenho** e **mínima latência**.

## ⚡ **Características Principais**

- ✅ **Execução 100% Local** - Sem dependências web
- ⚡ **Ultra Performance** - Otimizado para velocidade máxima
- 🛡️ **Proteção MEV** - Flashbots e randomização de gas
- 🔄 **Reconexão Automática** - Múltiplos providers com fallback
- 📊 **Monitoramento Avançado** - Logs detalhados e métricas
- 💾 **Cache Inteligente** - Redução de latência
- 🔧 **Configuração Flexível** - Ajustes via arquivo .env

## 🎯 **Por que Local?**

- **Latência Mínima** - Sem overhead de interface web
- **Recursos Otimizados** - Foco total na arbitragem
- **Controle Total** - Configuração direta e monitoramento
- **Segurança** - Execução isolada sem exposição web
- **Performance** - 3-5x mais rápido que versão web

## 📋 **Pré-requisitos**

- Node.js 18+ 
- NPM ou Yarn
- Wallet com MATIC para gas
- RPC URL do Polygon (Alchemy, QuickNode, etc.)

## 🚀 **Instalação Rápida**

### 1. **Configurar Ambiente**
```bash
# Clonar e instalar
git clone <seu-repo>
cd ArbiBot-Pro
npm install

# Configurar variáveis
cp env.local.example .env
```

### 2. **Editar Configuração**
```bash
# Editar .env com suas configurações
nano .env
```

**Configurações obrigatórias:**
```env
PRIVATE_KEY=sua_chave_privada_aqui
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRAGE_BOT_ADDRESS=0x0000000000000000000000000000000000000000
```

### 3. **Compilar Contratos**
```bash
npm run compile
```

### 4. **Deploy do Contrato**
```bash
npm run deploy:polygon
```

## 🎮 **Como Executar**

### **Execução Básica**
```bash
npm run start:local
```

### **Execução Otimizada (Produção)**
```bash
npm run start:local:fast
```

### **Execução com Debug**
```bash
npm run start:local:debug
```

### **Teste de Performance**
```bash
npm run performance:test
```

## ⚙️ **Configurações Avançadas**

### **Performance**
```env
# Lucro mínimo em ETH
MIN_PROFIT_ETH=0.001

# Intervalo de verificação (ms)
CHECK_INTERVAL=5000

# Gas price máximo (Gwei)
MAX_GAS_PRICE=50
```

### **Segurança**
```env
# Proteção MEV
USE_FLASHBOTS=false

# Slippage máximo (%)
MAX_SLIPPAGE=0.5

# Randomização de gas
GAS_RANDOMIZATION=true
```

### **Rede**
```env
# RPC URLs de backup
QUICKNODE_RPC_URL=
ALCHEMY_RPC_URL=

# Timeout do RPC (ms)
RPC_TIMEOUT=10000
```

## 📊 **Monitoramento**

### **Logs em Tempo Real**
```bash
# Logs gerais
npm run logs:local

# Logs de erro
npm run logs:local:errors
```

### **Verificar Saúde**
```bash
npm run health:check
```

### **Backup de Dados**
```bash
npm run backup:local
```

## 🔧 **Comandos Úteis**

| Comando | Descrição |
|---------|-----------|
| `npm run start:local` | Iniciar bot local |
| `npm run start:local:fast` | Iniciar com otimizações |
| `npm run performance:test` | Teste de performance |
| `npm run check:local` | Verificar configuração |
| `npm run logs:local` | Ver logs em tempo real |
| `npm run clean:local` | Limpar logs e cache |
| `npm run backup:local` | Backup de dados |

## 📈 **Métricas de Performance**

### **Alvos de Performance**
- **Operações/segundo**: 10+ ops/s
- **Latência**: <100ms
- **Memória**: <500MB
- **Taxa de sucesso**: >95%

### **Otimizações Implementadas**
- ✅ Cache de preços (5s)
- ✅ Cache de gas price (15s)
- ✅ Reconexão automática
- ✅ Randomização de gas
- ✅ Múltiplos providers
- ✅ Health checks
- ✅ Logs estruturados

## 🛡️ **Segurança**

### **Proteções Implementadas**
- 🔒 Validação rigorosa de parâmetros
- 🛡️ Proteção contra MEV (Flashbots)
- ⚡ Randomização de gas price
- 🔄 Timeouts configuráveis
- 📊 Logs de auditoria
- 🚨 Alertas de erro

### **Boas Práticas**
- ✅ Use RPC privado (Alchemy/QuickNode)
- ✅ Configure gas price máximo
- ✅ Monitore logs regularmente
- ✅ Faça backup dos dados
- ✅ Teste em testnet primeiro

## 🔍 **Troubleshooting**

### **Erro: "PRIVATE_KEY não configurada"**
```bash
# Verificar arquivo .env
cat .env | grep PRIVATE_KEY
```

### **Erro: "Contrato não compilado"**
```bash
npm run compile
```

### **Erro: "Provider não conectado"**
```bash
# Verificar RPC URL
npm run network:test
```

### **Performance Baixa**
```bash
# Executar teste de performance
npm run performance:test

# Verificar configurações
npm run check:local
```

## 📊 **Estrutura de Arquivos**

```
ArbiBot-Pro/
├── scripts/
│   ├── local-arbitrage-bot.js    # Bot principal
│   ├── start-local-bot.js        # Script de inicialização
│   └── test-performance.js       # Teste de performance
├── contracts/
│   └── ArbitrageBotV2.sol        # Contrato otimizado
├── logs/                         # Logs do sistema
├── cache/                        # Cache de performance
├── reports/                      # Relatórios de teste
├── .env                          # Configurações
└── package.json                  # Dependências
```

## 🎯 **Próximos Passos**

1. **Configure o .env** com suas credenciais
2. **Compile os contratos** com `npm run compile`
3. **Deploy o contrato** com `npm run deploy:polygon`
4. **Teste a performance** com `npm run performance:test`
5. **Inicie o bot** com `npm run start:local:fast`
6. **Monitore os logs** com `npm run logs:local`

## ⚠️ **Avisos Importantes**

- 🔒 **Nunca compartilhe sua PRIVATE_KEY**
- 💰 **Teste com pequenas quantias primeiro**
- 📊 **Monitore o desempenho regularmente**
- 🔄 **Mantenha o sistema atualizado**
- 🛡️ **Use RPC privado para produção**

## 🆘 **Suporte**

Para dúvidas ou problemas:
1. Verifique os logs: `npm run logs:local:errors`
2. Execute o teste: `npm run performance:test`
3. Verifique a saúde: `npm run health:check`

---

**🚀 ArbiBot Pro Local - Máximo Desempenho, Mínima Latência!** 