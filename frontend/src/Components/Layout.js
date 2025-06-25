import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Settings, 
  Play,
  Pause,
  TrendingUp, 
  Zap,
  BarChart3,
  ArrowLeftRight,
  Menu,
  X
} from 'lucide-react';

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Activity,
    description: "Visão geral e estatísticas"
  },
  {
    title: "Controle do Bot",
    url: "/control",
    icon: Play,
    description: "Iniciar/parar e monitorar"
  },
  {
    title: "Configurações",
    url: "/config",
    icon: Settings,
    description: "Configurar parâmetros"
  }
];

export default function Layout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-secondary-bg border-r border-border-color transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-border-color">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden gradient-bg">
              <ArrowLeftRight className="w-6 h-6 text-white" />
              <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
            </div>
            <div>
              <h2 className="font-bold text-lg text-text-primary">
                ArbiBot Pro
              </h2>
              <p className="text-xs text-text-secondary">
                DeFi Arbitrage Monitor
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent-bg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-accent-bg group ${
                location.pathname === item.url 
                  ? 'bg-electric-blue text-white shadow-lg' 
                  : 'text-text-secondary hover:text-white'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <div className="flex-1">
                <span className="font-medium">{item.title}</span>
                <p className="text-xs opacity-75 mt-1">{item.description}</p>
              </div>
            </Link>
          ))}
        </nav>

        {/* Status do Sistema */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border-color">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse bg-profit-green"></div>
                <span className="text-text-secondary">Status</span>
              </div>
              <span className="font-medium text-profit-green">Ativo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Oportunidades</span>
              <span className="font-bold text-electric-blue">12</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Lucro 24h</span>
              <span className="font-bold text-profit-green">$2,847</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-secondary-bg border-b border-border-color px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-accent-bg transition-colors"
              >
                <Menu className="w-6 h-6 text-text-primary" />
              </button>
              <h1 className="text-xl font-bold text-text-primary">
                {navigationItems.find(item => item.url === location.pathname)?.title || 'ArbiBot Pro'}
              </h1>
            </div>
            
            {/* Status do Bot */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success-bg border border-profit-green">
                <div className="w-2 h-2 rounded-full bg-profit-green animate-pulse"></div>
                <span className="text-sm font-medium text-profit-green">Bot Ativo</span>
              </div>
              <div className="text-sm text-text-secondary">
                Última execução: 2 min atrás
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 