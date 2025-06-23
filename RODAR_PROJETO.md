# 🚀 Como Rodar o ArbiBot Pro

## ✅ Pré-requisitos Verificados
- ✅ Node.js 18.17.0 instalado
- ✅ Python 3.13 instalado
- ✅ Estrutura do projeto organizada

## 🎯 Métodos para Rodar

### **Método 1: Script Automático (Recomendado)**

```powershell
# No PowerShell, execute:
.\start_dev.ps1
```

### **Método 2: Manual (Passo a Passo)**

#### **Passo 1: Instalar dependências do Frontend**
```powershell
cd src\frontend
npm install
```

#### **Passo 2: Instalar dependências do Backend**
```powershell
cd ..\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### **Passo 3: Iniciar Backend**
```powershell
# Em um terminal:
cd src\backend
.\venv\Scripts\Activate.ps1
python main.py
```

#### **Passo 4: Iniciar Frontend**
```powershell
# Em outro terminal:
cd src\frontend
npm start
```

## 🌐 URLs Disponíveis

Após iniciar, acesse:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔧 Solução de Problemas

### Se o script não executar:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Se der erro de dependências:
```powershell
# Limpar cache do npm
npm cache clean --force

# Reinstalar dependências
cd src\frontend
rm -rf node_modules package-lock.json
npm install
```

### Se der erro no Python:
```powershell
# Recriar virtual environment
cd src\backend
rm -rf venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 📱 Teste de Funcionamento

1. Abra http://localhost:3000 no navegador
2. Você deve ver a interface do ArbiBot Pro
3. Teste a responsividade redimensionando a janela
4. Verifique se as APIs estão funcionando em http://localhost:8000/docs

## 🛑 Para Parar

Pressione `Ctrl+C` em cada terminal ou feche as janelas. 