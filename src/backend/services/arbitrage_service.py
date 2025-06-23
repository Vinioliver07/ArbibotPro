from typing import List, Optional, Dict, Any
from models.arbitrage_opportunity import ArbitrageOpportunityModel
from models.monitoring_config import MonitoringConfigModel
from models.database import get_db
import asyncio

class ArbitrageService:
    def __init__(self):
        self.db = None
    
    async def _get_db(self):
        if not self.db:
            self.db = await get_db()
        return self.db
    
    async def get_opportunities(
        self, 
        order: str = "-created_date", 
        limit: int = 50, 
        status: Optional[str] = None
    ) -> List[ArbitrageOpportunityModel]:
        """Recupera oportunidades de arbitragem"""
        db = await self._get_db()
        
        filters = {}
        if status and status != "all":
            filters["status"] = status
        
        opportunities = await db.get("opportunities", filters)
        
        # Ordenação simples
        if order.startswith("-"):
            field = order[1:]
            opportunities.sort(key=lambda x: getattr(x, field, 0), reverse=True)
        else:
            opportunities.sort(key=lambda x: getattr(x, order, 0))
        
        return opportunities[:limit]
    
    async def execute_opportunity(self, opportunity_id: str) -> bool:
        """Executa uma oportunidade de arbitragem"""
        db = await self._get_db()
        
        # Simula execução da arbitragem
        await asyncio.sleep(0.1)  # Simula delay de execução
        
        result = await db.update("opportunities", opportunity_id, {"status": "executed"})
        
        if result:
            # Atualizar estatísticas
            stats = await db.get("stats")
            if stats:
                stats["total_executed"] += 1
                stats["total_profit"] += getattr(result, "net_profit", 0)
        
        return result is not None
    
    async def get_configs(self) -> List[MonitoringConfigModel]:
        """Recupera configurações de monitoramento"""
        db = await self._get_db()
        return await db.get("configs")
    
    async def create_config(self, config: MonitoringConfigModel) -> MonitoringConfigModel:
        """Cria nova configuração"""
        db = await self._get_db()
        return await db.insert("configs", config)
    
    async def get_stats(self) -> Dict[str, Any]:
        """Recupera estatísticas do sistema"""
        db = await self._get_db()
        opportunities = await db.get("opportunities")
        configs = await db.get("configs")
        
        active_opportunities = [opp for opp in opportunities if opp.status == "active"]
        total_potential_profit = sum(opp.net_profit for opp in active_opportunities)
        
        return {
            "active_opportunities": len(active_opportunities),
            "total_opportunities": len(opportunities),
            "total_potential_profit": total_potential_profit,
            "active_configs": len([c for c in configs if c.is_active]),
            "system_status": "online"
        }