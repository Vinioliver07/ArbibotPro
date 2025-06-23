from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

class MonitoringConfigModel(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    token_symbol: str = Field(..., description="Símbolo do token")
    token_address: str = Field(..., description="Endereço do contrato do token")
    min_spread: float = Field(..., description="Spread mínimo para alertas")
    min_profit: float = Field(..., description="Lucro mínimo para execução")
    max_loan_amount: float = Field(..., description="Valor máximo do empréstimo")
    enabled_dexs: List[str] = Field(..., description="DEXs habilitadas para monitoramento")
    is_active: bool = Field(default=True, description="Se o monitoramento está ativo")

class MonitoringConfig:
    @staticmethod
    def get_default_configs() -> list[MonitoringConfigModel]:
        """Retorna configurações padrão"""
        return [
            MonitoringConfigModel(
                id="config_1",
                token_symbol="ETH",
                token_address="0x...",
                min_spread=0.5,
                min_profit=100.0,
                max_loan_amount=50000.0,
                enabled_dexs=["Uniswap", "SushiSwap", "1inch"],
                is_active=True
            ),
            MonitoringConfigModel(
                id="config_2",
                token_symbol="USDT",
                token_address="0x...",
                min_spread=0.3,
                min_profit=50.0,
                max_loan_amount=100000.0,
                enabled_dexs=["Uniswap", "PancakeSwap", "QuickSwap"],
                is_active=True
            )
        ]