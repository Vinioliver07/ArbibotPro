@echo off
REM Caminho absoluto para as pastas do projeto
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

REM Inicia o backend em uma janela separada
start cmd /k "cd /d %BACKEND_DIR% && python api.py"

REM Aguarda 3 segundos para garantir que o backend subiu
timeout /t 3 >nul

REM Inicia o frontend React em outra janela
start cmd /k "cd /d %FRONTEND_DIR% && npm install && npm start"

REM Aguarda 5 segundos para garantir que o frontend subiu
timeout /t 5 >nul

REM Abre o navegador padrão na página do frontend
start http://localhost:3000

echo Backend, Frontend e navegador iniciados!
pause       

   start_all.bat