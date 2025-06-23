import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/config" element={<div className="p-8"><h1 className="text-2xl font-bold text-primary-text">Configurações em desenvolvimento</h1></div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;