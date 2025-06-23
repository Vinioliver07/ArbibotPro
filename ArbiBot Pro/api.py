from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI()

# Permitir acesso do frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class ArbitrageOpportunityModel(BaseModel):
    token_pair: str
    dex_buy: str
    dex_sell: str
    price_buy: float
    price_sell: float
    spread_percentage: float
    potential_profit: float
    loan_amount: float
    gas_cost: float
    net_profit: float
    status: str
    execution_window: float
    confidence_score: float
    id: Optional[str] = None

class MonitoringConfigModel(BaseModel):
    token_symbol: str
    token_address: str
    min_spread: float
    min_profit: float
    max_loan_amount: float
    enabled_dexs: List[str]
    is_active: bool
    id: Optional[str] = None

# Dados simulados (poderia ser lido dos scripts ou banco de dados)
arbitrage_opportunities = []
monitoring_configs = []

@app.get("/arbitrage-opportunities", response_model=List[ArbitrageOpportunityModel])
def get_arbitrage_opportunities():
    from ..ArbitrageOpportunity import make_api_request
    return make_api_request(f'apps/68597fa25ab57f03a564a78b/entities/ArbitrageOpportunity')

@app.get("/monitoring-configs", response_model=List[MonitoringConfigModel])
def get_monitoring_configs():
    from ..MonitoringConfig import make_api_request
    return make_api_request(f'apps/68597fa25ab57f03a564a78b/entities/MonitoringConfig')

# Inicialização local
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)