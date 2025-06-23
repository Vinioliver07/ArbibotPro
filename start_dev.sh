#!/bin/bash

echo "🚀 Iniciando ArbiBot Pro em modo desenvolvimento..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependências
echo -e "${BLUE}📋 Verificando dependências...${NC}"

if ! command_exists node; then
    echo -e "${YELLOW}⚠️  Node.js não encontrado. Instale Node.js 18+ primeiro.${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${YELLOW}⚠️  Python3 não encontrado. Instale Python 3.8+ primeiro.${NC}"
    exit 1
fi

# Instalar dependências do frontend
echo -e "${BLUE}📦 Instalando dependências do frontend...${NC}"
cd src/frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ Erro ao instalar dependências do frontend${NC}"
    exit 1
fi

# Instalar dependências do backend
echo -e "${BLUE}🐍 Instalando dependências do backend...${NC}"
cd ../backend

# Criar virtual environment se não existir
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Ativar virtual environment
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ Erro ao instalar dependências do backend${NC}"
    exit 1
fi

cd ../../

echo -e "${GREEN}✅ Todas as dependências instaladas com sucesso!${NC}"
echo -e "${BLUE}🎯 Iniciando serviços...${NC}"

# Função para kill processes on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Encerrando serviços...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

# Iniciar backend
echo -e "${BLUE}🔧 Iniciando backend (Python/FastAPI)...${NC}"
cd src/backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Aguardar backend inicializar
sleep 3

# Iniciar frontend
echo -e "${BLUE}⚛️  Iniciando frontend (React)...${NC}"
cd ../frontend
npm start &
FRONTEND_PID=$!

echo -e "${GREEN}"
echo "🎉 ArbiBot Pro iniciado com sucesso!"
echo ""
echo "📍 URLs disponíveis:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "💡 Pressione Ctrl+C para parar todos os serviços"
echo -e "${NC}"

# Aguardar processos
wait