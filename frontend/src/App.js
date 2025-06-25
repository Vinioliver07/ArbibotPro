import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Components/Layout';
import Dashboard from './Pages/Dashboard';
import Config from './Pages/Config';
import BotControl from './Pages/BotControl';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/config" element={<Config />} />
          <Route path="/control" element={<BotControl />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 