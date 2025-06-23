import asyncio
from typing import Dict, Any

# Simulação de banco de dados em memória para desenvolvimento
class Database:
    def __init__(self):
        self.data: Dict[str, Any] = {
            "opportunities": [],
            "configs": [],
            "stats": {
                "total_executed": 0,
                "total_profit": 0.0,
                "active_monitors": 0
            }
        }
    
    async def get(self, table: str, filters: Dict[str, Any] = None):
        """Recupera dados da tabela"""
        if table not in self.data:
            return []
        
        data = self.data[table]
        if filters:
            # Implementação básica de filtros
            filtered_data = []
            for item in data:
                match = True
                for key, value in filters.items():
                    if hasattr(item, key) and getattr(item, key) != value:
                        match = False
                        break
                if match:
                    filtered_data.append(item)
            return filtered_data
        
        return data
    
    async def insert(self, table: str, data: Any):
        """Insere dados na tabela"""
        if table not in self.data:
            self.data[table] = []
        
        self.data[table].append(data)
        return data
    
    async def update(self, table: str, id: str, data: Dict[str, Any]):
        """Atualiza dados na tabela"""
        if table not in self.data:
            return None
        
        for i, item in enumerate(self.data[table]):
            if hasattr(item, 'id') and item.id == id:
                for key, value in data.items():
                    setattr(item, key, value)
                return item
        
        return None

# Instância global do banco
db = Database()

async def init_db():
    """Inicializa o banco de dados"""
    print("🗄️  Inicializando banco de dados...")
    
    # Carregar dados iniciais se necessário
    from models.arbitrage_opportunity import ArbitrageOpportunity
    from models.monitoring_config import MonitoringConfig
    
    # Gerar dados mockados para desenvolvimento
    mock_opportunities = ArbitrageOpportunity.generate_mock_data(15)
    for opp in mock_opportunities:
        await db.insert("opportunities", opp)
    
    default_configs = MonitoringConfig.get_default_configs()
    for config in default_configs:
        await db.insert("configs", config)
    
    print(f"✅ Banco inicializado com {len(mock_opportunities)} oportunidades e {len(default_configs)} configurações")

async def get_db():
    """Dependency para obter instância do banco"""
    return db