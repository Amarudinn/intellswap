import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import PredictionPage from './pages/PredictionPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import StakingPage from './pages/StakingPage.jsx'
import DocsPage from './pages/DocsPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/staking" element={<StakingPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
