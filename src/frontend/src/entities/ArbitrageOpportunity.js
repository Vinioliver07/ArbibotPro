class ArbitrageOpportunity {
  constructor(data = {}) {
    this.id = data.id || null;
    this.token_pair = data.token_pair || '';
    this.dex_buy = data.dex_buy || '';
    this.dex_sell = data.dex_sell || '';
    this.price_buy = data.price_buy || 0;
    this.price_sell = data.price_sell || 0;
    this.spread_percentage = data.spread_percentage || 0;
    this.potential_profit = data.potential_profit || 0;
    this.loan_amount = data.loan_amount || 0;
    this.gas_cost = data.gas_cost || 0;
    this.net_profit = data.net_profit || 0;
    this.status = data.status || 'inactive';
    this.execution_window = data.execution_window || 0;
    this.confidence_score = data.confidence_score || 0;
    this.created_date = data.created_date || new Date().toISOString();
  }

  static async list(orderBy = "-created_date", limit = 50) {
    try {
      const response = await fetch(`http://localhost:8000/arbitrage-opportunities?order=${orderBy}&limit=${limit}`);
      if (!response.ok) {
        // Se a API não estiver disponível, retorna dados mockados
        return ArbitrageOpportunity.getMockData();
      }
      const data = await response.json();
      return data.map(item => new ArbitrageOpportunity(item));
    } catch (error) {
      console.warn('API não disponível, usando dados mockados:', error);
      return ArbitrageOpportunity.getMockData();
    }
  }

  static getMockData() {
    const tokens = ['ETH/USDT', 'BTC/USDT', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT'];
    const dexs = ['Uniswap', 'SushiSwap', 'PancakeSwap', 'QuickSwap', '1inch'];
    const statuses = ['active', 'executed', 'expired', 'insufficient'];
    
    return Array.from({ length: 15 }, (_, i) => {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const buyDex = dexs[Math.floor(Math.random() * dexs.length)];
      let sellDex = dexs[Math.floor(Math.random() * dexs.length)];
      while (sellDex === buyDex) {
        sellDex = dexs[Math.floor(Math.random() * dexs.length)];
      }
      
      const priceBuy = 1000 + Math.random() * 500;
      const priceSpread = 0.5 + Math.random() * 3;
      const priceSell = priceBuy * (1 + priceSpread / 100);
      const loanAmount = 10000 + Math.random() * 40000;
      const gasCost = 50 + Math.random() * 200;
      const potentialProfit = (loanAmount * priceSpread / 100);
      const netProfit = potentialProfit - gasCost;
      
      return new ArbitrageOpportunity({
        id: `opp_${i + 1}`,
        token_pair: token,
        dex_buy: buyDex,
        dex_sell: sellDex,
        price_buy: priceBuy,
        price_sell: priceSell,
        spread_percentage: priceSpread,
        potential_profit: potentialProfit,
        loan_amount: loanAmount,
        gas_cost: gasCost,
        net_profit: netProfit,
        status: i < 5 ? 'active' : statuses[Math.floor(Math.random() * statuses.length)],
        execution_window: 30 + Math.random() * 120,
        confidence_score: 60 + Math.random() * 40,
        created_date: new Date(Date.now() - i * 60000).toISOString()
      });
    });
  }

  async execute() {
    try {
      const response = await fetch(`http://localhost:8000/arbitrage-opportunities/${this.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        this.status = 'executed';
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao executar arbitragem:', error);
      return false;
    }
  }

  isValid() {
    return this.net_profit > 0 && this.confidence_score > 50 && this.status === 'active';
  }

  getFormattedSpread() {
    return `${this.spread_percentage.toFixed(2)}%`;
  }

  getFormattedProfit() {
    return `$${this.net_profit.toFixed(0)}`;
  }
}

export { ArbitrageOpportunity };