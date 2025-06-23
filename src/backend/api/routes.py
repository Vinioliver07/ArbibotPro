from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import asyncio
from datetime import datetime

from models.arbitrage_opportunity import ArbitrageOpportunity, ArbitrageOpportunityModel
from models.monitoring_config import MonitoringConfig, MonitoringConfigModel
from services.arbitrage_service import ArbitrageService

router = APIRouter()
arbitrage_service = ArbitrageService()

@router.get("/arbitrage-opportunities", response_model=List[ArbitrageOpportunityModel])
async def get_arbitrage_opportunities(
    order: str = Query("-created_date", description="Campo para ordenação"),
    limit: int = Query(50, description="Limite de resultados"),
    status: Optional[str] = Query(None, description="Filtrar por status")
):
    """
    Retorna lista de oportunidades de arbitragem
    """
    try:
        opportunities = await arbitrage_service.get_opportunities(order, limit, status)
        return opportunities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/arbitrage-opportunities/{opportunity_id}/execute")
async def execute_arbitrage(opportunity_id: str):
    """
    Executa uma oportunidade de arbitragem
    """
    try:
        result = await arbitrage_service.execute_opportunity(opportunity_id)
        if result:
            return {"success": True, "message": "Arbitragem executada com sucesso"}
        else:
            raise HTTPException(status_code=400, detail="Falha ao executar arbitragem")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monitoring-configs", response_model=List[MonitoringConfigModel])
async def get_monitoring_configs():
    """
    Retorna configurações de monitoramento
    """
    try:
        configs = await arbitrage_service.get_configs()
        return configs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/monitoring-configs", response_model=MonitoringConfigModel)
async def create_monitoring_config(config: MonitoringConfigModel):
    """
    Cria nova configuração de monitoramento
    """
    try:
        result = await arbitrage_service.create_config(config)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats():
    """
    Retorna estatísticas gerais do sistema
    """
    try:
        stats = await arbitrage_service.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))