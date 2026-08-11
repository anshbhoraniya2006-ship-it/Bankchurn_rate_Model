import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SinglePredictor from './components/SinglePredictor';
import BatchPredictor from './components/BatchPredictor';
import WhatIfSimulator from './components/WhatIfSimulator';
import ModelDashboard from './components/ModelDashboard';
import { fetchHealth } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('single');
  const [healthStatus, setHealthStatus] = useState(null);

  const checkHealth = async () => {
    const status = await fetchHealth();
    setHealthStatus(status);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {healthStatus && (!healthStatus.model_loaded || !healthStatus.artifacts_loaded) && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '10px 24px',
          textAlign: 'center',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          ⚠️ Fast API Backend is not connected or model artifacts are missing. Make sure to run 
          <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>
            python -m uvicorn backend.main:app --reload --port 8000
          </code>
        </div>
      )}

      <main style={{ flex: 1 }}>
        {activeTab === 'single' && <SinglePredictor />}
        {activeTab === 'batch' && <BatchPredictor />}
        {activeTab === 'whatif' && <WhatIfSimulator />}
        {activeTab === 'model' && <ModelDashboard />}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        background: 'rgba(7, 9, 14, 0.9)',
        marginTop: '40px'
      }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            ApexBank ML Studio &bull; Powered by Keras ANN v3 & FastAPI
          </div>
          <div>
            Optimal F1 Classification Threshold &bull; SMOTE Oversampling & 5-Fold Stratified CV
          </div>
        </div>
      </footer>
    </div>
  );
}
