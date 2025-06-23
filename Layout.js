import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Activity, 
  Settings, 
  TrendingUp, 
  Zap,
  BarChart3,
  ArrowLeftRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            --primary-bg: #0a0a0f;
            --secondary-bg: #121218;
            --accent-bg: #1a1a24;
            --electric-blue: #00D4FF;
            --profit-green: #00FF88;
            --loss-red: #FF4757;
            --text-primary: #ffffff;
            --text-secondary: #a0a0b8;
            --border-color: #2a2a35;
          }
          
          body {
            background: var(--primary-bg);
            color: var(--text-primary);
          }
        `}
      </style>
      <div className="min-h-screen flex w-full" style={{background: 'var(--primary-bg)'}}>
        <Sidebar className="border-r" style={{borderColor: 'var(--border-color)', background: 'var(--secondary-bg)'}}>
          <SidebarHeader className="border-b p-6" style={{borderColor: 'var(--border-color)'}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden" 
                   style={{background: 'linear-gradient(135deg, var(--electric-blue), var(--profit-green))'}}>
                <ArrowLeftRight className="w-6 h-6 text-white" />
                <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>
                  ArbiBot_Pro
                </h2>
                <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  DeFi Arbitrage Monitor
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider px-3 py-2" 
                                style={{color: 'var(--text-secondary)'}}>
                Navegação
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-opacity-20 transition-all duration-300 rounded-xl mb-1 ${
                          location.pathname === item.url 
                            ? 'text-white shadow-lg' 
                            : 'hover:text-white'
                        }`}
                        style={{
                          backgroundColor: location.pathname === item.url 
                            ? 'var(--electric-blue)' 
                            : 'transparent',
                          color: location.pathname === item.url 
                            ? '#ffffff' 
                            : 'var(--text-secondary)'
                        }}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider px-3 py-2" 
                                style={{color: 'var(--text-secondary)'}}>
                Status do Sistema
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{background: 'var(--profit-green)'}}></div>
                      <span style={{color: 'var(--text-secondary)'}}>Monitoramento</span>
                    </div>
                    <span className="font-medium" style={{color: 'var(--profit-green)'}}>Ativo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{color: 'var(--text-secondary)'}}>Oportunidades</span>
                    <span className="font-bold" style={{color: 'var(--electric-blue)'}}>12</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{color: 'var(--text-secondary)'}}>Lucro 24h</span>
                    <span className="font-bold" style={{color: 'var(--profit-green)'}}>$2,847</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col" style={{background: 'var(--primary-bg)'}}>
          <header className="border-b px-6 py-4 md:hidden" style={{borderColor: 'var(--border-color)', background: 'var(--secondary-bg)'}}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-opacity-20 p-2 rounded-lg transition-colors duration-200" 
                              style={{color: 'var(--text-primary)'}} />
              <h1 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                ArbiBot_Pro
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}