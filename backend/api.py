from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json
import os
import subprocess
import signal
from ArbitrageOpportunity import make_api_request as make_arb_api_request
from MonitoringConfig import make_api_request as make_config_api_request

bot_process = None

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

bot_status = {"active": False}

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

# Utilitários de persistência

def load_json(filename, default):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return default
    with open(path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return default

def save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.get("/arbitrage-opportunities", response_model=List[ArbitrageOpportunityModel])
def get_arbitrage_opportunities():
    return make_arb_api_request(f'apps/68597fa25ab57f03a564a78b/entities/ArbitrageOpportunity')

# @app.get("/monitoring-configs", response_model=List[MonitoringConfigModel])
# def get_monitoring_configs():
#     return make_config_api_request(f'apps/68597fa25ab57f03a564a78b/entities/MonitoringConfig')

@app.get("/bot-status")
def get_bot_status():
    global bot_process
    running = bool(bot_process and bot_process.poll() is None)
    bot_status["active"] = running
    return bot_status

@app.post("/bot-status")
def set_bot_status(status: dict):
    if "active" in status:
        bot_status["active"] = bool(status["active"])
        return {"success": True, "active": bot_status["active"]}
    raise HTTPException(status_code=400, detail="Missing 'active' field")

# Logs
@app.get("/bot-logs")
def get_bot_logs():
    return load_json('bot_logs.json', [])

@app.post("/bot-logs")
def add_bot_log(log: dict):
    logs = load_json('bot_logs.json', [])
    logs.insert(0, log)  # mais recente primeiro
    logs = logs[:100]    # manter só os 100 últimos
    save_json('bot_logs.json', logs)
    return {"success": True}

# Execuções
@app.get("/executions")
def get_executions():
    return load_json('executions.json', [])

@app.post("/executions")
def add_execution(exec_data: dict):
    executions = load_json('executions.json', [])
    executions.insert(0, exec_data)
    executions = executions[:100]
    save_json('executions.json', executions)
    return {"success": True}

# Configs
@app.get("/monitoring-configs")
def get_monitoring_configs():
    return load_json('monitoring_configs.json', [])

@app.post("/monitoring-configs")
def set_monitoring_configs(configs: list):
    save_json('monitoring_configs.json', configs)
    return {"success": True}

# Inicialização local
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

@app.post("/start-bot")
def start_bot():
    global bot_process
    if bot_process and bot_process.poll() is None:
        return {"success": False, "message": "Bot já está rodando."}
    try:
        bot_process = subprocess.Popen([
            "node", "../scripts/monitor-arbitrage.js"
        ], cwd=DATA_DIR)
        return {"success": True, "message": "Bot iniciado."}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/stop-bot")
def stop_bot():
    global bot_process
    if bot_process and bot_process.poll() is None:
        bot_process.send_signal(signal.SIGINT)
        bot_process.wait(timeout=10)
        return {"success": True, "message": "Bot parado."}
    else:
        return {"success": False, "message": "Bot não estava rodando."}