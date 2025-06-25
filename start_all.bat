@echo off

echo Iniciando ArbiBot Pro...
echo.

echo Iniciando Backend API...
start "Backend API" cmd /k "cd /d "C:\Users\User\Desktop\ArbiBot Pro\backend" && python api.py"

echo Aguardando 3 segundos...
timeout /t 3 /nobreak > nul

echo Preparando Frontend React (instalando dependências e build limpo)...
cd /d "C:\Users\User\Desktop\ArbiBot Pro\frontend"
call npm install
call npm run build
cd /d "C:\Users\User\Desktop\ArbiBot Pro"

echo Iniciando Frontend React...
start "Frontend React" cmd /k "cd /d "C:\Users\User\Desktop\ArbiBot Pro\frontend" && npm start"

timeout /t 5 /nobreak > nul
echo Abrindo navegador...
start http://localhost:3000

echo.
echo ArbiBot Pro iniciado!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause

   start_all.bat