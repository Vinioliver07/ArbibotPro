from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class ArbitrageOpportunityModel(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    token_pair: str = Field(..., description="Par de tokens (ex: ETH/USDT)")
    dex_buy: str = Field(..., description="DEX para compra")
    dex_sell: str = Field(..., description="DEX para venda")
    price_buy: float = Field(..., description="Preço de compra")
    price_sell: float = Field(..., description="Preço de venda")
    spread_percentage: float = Field(..., description="Percentual de spread")
    potential_profit: float = Field(..., description="Lucro potencial")
    loan_amount: float = Field(..., description="Valor do empréstimo")
    gas_cost: float = Field(..., description="Custo de gás")
    net_profit: float = Field(..., description="Lucro líquido")
    status: str = Field(default="active", description="Status da oportunidade")
    execution_window: float = Field(..., description="Janela de execução em segundos")
    confidence_score: float = Field(..., description="Score de confiança (0-100)")
    created_date: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ArbitrageOpportunity:
    @staticmethod
    def generate_mock_data(count: int = 15) -> list[ArbitrageOpportunityModel]:
        """Gera dados mockados para desenvolvimento"""
        import random
        from datetime import datetime, timedelta
        
        tokens = ['ETH/USDT', 'BTC/USDT', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT', 'AAVE/USDT']
        dexs = ['Uniswap', 'SushiSwap', 'PancakeSwap', 'QuickSwap', '1inch', 'Balancer']
        statuses = ['active', 'executed', 'expired', 'insufficient']
        
        opportunities = []
        
        for i in range(count):
            token = random.choice(tokens)
            buy_dex = random.choice(dexs)
            sell_dex = random.choice([d for d in dexs if d != buy_dex])
            
            price_buy = round(1000 + random.random() * 500, 2)
            spread = round(0.5 + random.random() * 3, 2)
            price_sell = round(price_buy * (1 + spread / 100), 2)
            loan_amount = round(10000 + random.random() * 40000, 0)
            gas_cost = round(50 + random.random() * 200, 0)
            potential_profit = round(loan_amount * spread / 100, 2)
            net_profit = round(potential_profit - gas_cost, 2)
            
            opportunity = ArbitrageOpportunityModel(
                id=f"opp_{i + 1}",
                token_pair=token,
                dex_buy=buy_dex,
                dex_sell=sell_dex,
                price_buy=price_buy,
                price_sell=price_sell,
                spread_percentage=spread,
                potential_profit=potential_profit,
                loan_amount=loan_amount,
                gas_cost=gas_cost,
                net_profit=net_profit,
                status='active' if i < 8 else random.choice(statuses),
                execution_window=round(30 + random.random() * 120, 0),
                confidence_score=round(60 + random.random() * 40, 1),
                created_date=datetime.now() - timedelta(minutes=i * 5)
            )
            opportunities.append(opportunity)
        
        return opportunities