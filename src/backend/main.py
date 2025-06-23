from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import uvicorn
import asyncio

from api.routes import router
from models.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("📊 ArbiBot Pro Backend iniciado!")
    print("🚀 API disponível em: http://localhost:8000")
    print("📚 Documentação em: http://localhost:8000/docs")
    yield
    # Shutdown
    print("🔄 Encerrando ArbiBot Pro Backend...")

app = FastAPI(
    title="ArbiBot Pro API",
    description="API para monitoramento de arbitragem DeFi",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware de compressão para melhor performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS otimizado
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=600,  # Cache preflight por 10 minutos
)

# Incluir rotas
app.include_router(router, prefix="/api/v1")

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ArbiBot Pro API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )