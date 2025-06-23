// Funções para consumir a API REST Python (FastAPI)

export const API_URL = "http://localhost:8000";

export const ArbitrageOpportunity = {
  list: async () => {
    const res = await fetch(`${API_URL}/arbitrage-opportunities`);
    if (!res.ok) throw new Error("Erro ao buscar oportunidades");
    return res.json();
  }
};

export const MonitoringConfig = {
  list: async () => {
    const res = await fetch(`${API_URL}/monitoring-configs`);
    if (!res.ok) throw new Error("Erro ao buscar configs");
    return res.json();
  }
}; 