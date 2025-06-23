import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import { 
  Activity, 
  Settings, 
  TrendingUp, 
  Zap,
  BarChart3,
  ArrowLeftRight,
  Menu,
  X
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Activity,
  },
  {
    title: "Configurações",
    url: createPageUrl("Config"),
    icon: Settings,
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen flex w-full bg-primary-bg">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-secondary-bg border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Header */}
        <div className="border-b border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                   style={{background: 'linear-gradient(135deg, #00D4FF, #00FF88)'}}>
                <ArrowLeftRight className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-base lg:text-lg text-primary-text">
                  ArbiBot Pro
                </h2>
                <p className="text-xs text-secondary-text">
                  DeFi Arbitrage Monitor
                </p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1 rounded-lg hover:bg-accent-bg text-primary-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="p-3 lg:p-4">
          <div className="mb-6">
            <h3 className="text-xs font-medium uppercase tracking-wider px-3 py-2 text-secondary-text">
              Navegação
            </h3>
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300
                    ${location.pathname === item.url 
                      ? 'bg-electric text-white shadow-lg' 
                      : 'text-secondary-text hover:text-primary-text hover:bg-accent-bg'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* System Status */}
          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-medium uppercase tracking-wider px-3 py-2 text-secondary-text">
              Status do Sistema
            </h3>
            <div className="px-3 py-2 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse bg-profit" />
                  <span className="text-secondary-text">Monitoramento</span>
                </div>
                <span className="font-medium text-profit">Ativo</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-text">Oportunidades</span>
                <span className="font-bold text-electric">12</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-text">Lucro 24h</span>
                <span className="font-bold text-profit">$2,847</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden border-b border-border px-4 py-4 bg-secondary-bg">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-accent-bg text-primary-text transition-colors duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-primary-text">
              ArbiBot Pro
            </h1>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}