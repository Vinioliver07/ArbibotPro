# Script PowerShell para iniciar ArbiBot Pro
Write-Host "🚀 Iniciando ArbiBot Pro em modo desenvolvimento..." -ForegroundColor Green

# Verificar dependências
Write-Host "📋 Verificando dependências..." -ForegroundColor Blue

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale Node.js 18+ primeiro." -ForegroundColor Red
    exit 1
}

# Verificar Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python não encontrado. Instale Python 3.8+ primeiro." -ForegroundColor Red
    exit 1
}

# Instalar dependências do frontend
Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Blue
Set-Location "src\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do frontend" -ForegroundColor Red
    exit 1
}

# Instalar dependências do backend
Write-Host "🐍 Instalando dependências do backend..." -ForegroundColor Blue
Set-Location "..\backend"

# Criar virtual environment se não existir
if (-not (Test-Path "venv")) {
    python -m venv venv
}

# Ativar virtual environment
.\venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do backend" -ForegroundColor Red
    exit 1
}

Set-Location "..\.."

Write-Host "✅ Todas as dependências instaladas com sucesso!" -ForegroundColor Green
Write-Host "🎯 Iniciando serviços..." -ForegroundColor Blue

# Função para limpeza
function Cleanup {
    Write-Host "`n🛑 Encerrando serviços..." -ForegroundColor Yellow
    if ($backendJob) { Stop-Job $backendJob; Remove-Job $backendJob }
    if ($frontendJob) { Stop-Job $frontendJob; Remove-Job $frontendJob }
    exit
}

# Registrar função de limpeza
Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# Iniciar backend
Write-Host "🔧 Iniciando backend (Python/FastAPI)..." -ForegroundColor Blue
Set-Location "src\backend"
.\venv\Scripts\Activate.ps1
$backendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    .\venv\Scripts\Activate.ps1
    python main.py 
}

# Aguardar backend inicializar
Start-Sleep -Seconds 3

# Iniciar frontend
Write-Host "⚛️ Iniciando frontend (React)..." -ForegroundColor Blue
Set-Location "..\frontend"
$frontendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    npm start 
}

Write-Host ""
Write-Host "🎉 ArbiBot Pro iniciado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs disponíveis:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "💡 Pressione Ctrl+C para parar todos os serviços" -ForegroundColor Yellow
Write-Host ""

# Aguardar jobs
try {
    Wait-Job $backendJob, $frontendJob
} catch {
    Cleanup
} 