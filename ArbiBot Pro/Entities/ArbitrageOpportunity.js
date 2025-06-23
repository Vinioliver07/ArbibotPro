// Schema de ArbitrageOpportunity para uso no frontend
const ArbitrageOpportunity = {
  name: "ArbitrageOpportunity",
  type: "object",
  properties: {
    token_pair: {
      type: "string",
      description: "Par de tokens (ex: ETH/USDC)"
    },
    dex_buy: {
      type: "string",
      description: "DEX para comprar"
    },
    dex_sell: {
      type: "string",
      description: "DEX para vender"
    },
    price_buy: {
      type: "number",
      description: "Preço de compra"
    },
    price_sell: {
      type: "number",
      description: "Preço de venda"
    },
    spread_percentage: {
      type: "number",
      description: "Percentual de spread"
    },
    potential_profit: {
      type: "number",
      description: "Lucro potencial em USD"
    },
    loan_amount: {
      type: "number",
      description: "Valor do flash loan necessário"
    },
    gas_cost: {
      type: "number",
      description: "Custo estimado de gás"
    },
    net_profit: {
      type: "number",
      description: "Lucro líquido após taxas"
    },
    status: {
      type: "string",
      enum: [
        "active",
        "executed",
        "expired",
        "insufficient"
      ],
      default: "active"
    },
    execution_window: {
      type: "number",
      description: "Janela de execução em segundos"
    },
    confidence_score: {
      type: "number",
      description: "Score de confiança da oportunidade (0-100)"
    }
  },
  required: [
    "token_pair",
    "dex_buy",
    "dex_sell",
    "price_buy",
    "price_sell"
  ]
};

export default ArbitrageOpportunity; 