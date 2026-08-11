import React, { useState, useEffect } from 'react';
import { fetchModelInfo } from '../api';
import { Cpu, Layers, GitBranch, Target, CheckCircle2, Server, Database } from 'lucide-react';

export default function ModelDashboard() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const infoRes = await fetchModelInfo();
      setModelInfo(infoRes);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu color="var(--accent-cyan)" /> Model Architecture & Technical Specs
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Deep-dive into the Artificial Neural Network (v3), training methodology, and threshold calibration.
        </p>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading technical specifications...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-indigo)', marginBottom: '8px' }}>
                <Layers size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Model Name</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{modelInfo?.model_name || 'Bank Churn ANN v3'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Framework: {modelInfo?.framework || 'TensorFlow/Keras'}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                <Target size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>F1 Optimal Threshold</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {modelInfo?.threshold || 0.38}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Metric: {modelInfo?.threshold_metric || 'F1-optimised'}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-low)', marginBottom: '8px' }}>
                <GitBranch size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Resampling</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>SMOTE</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Class Imbalance Compensation
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '8px' }}>
                <Server size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Validation</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>5-Fold CV</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Stratified K-Fold Cross Validation
              </div>
            </div>

          </div>

          {/* Training Pipeline Notes */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--accent-cyan)" /> Pipeline Summary & Tuning Notes
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {modelInfo?.training_notes || 'ANN v3: Keras Tuner (Hyperband), SMOTE, StratifiedKFold CV, EarlyStopping + ReduceLROnPlateau.'}
            </p>
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}>
              💡 <strong>Why F1 optimal threshold ({modelInfo?.threshold ?? 0.78})?</strong> Standard 0.50 threshold is adjusted based on test-set F1-optimization. Finding the optimal F1 threshold maximizes recall for high-value churners while preserving precision.
            </div>
          </div>

          {/* Encoded Feature Vector Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--accent-indigo)" /> Preprocessed Input Feature Vector Schema ({modelInfo?.num_features || 11} Features)
            </h4>
            
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Index</th>
                    <th>Feature Column Name</th>
                    <th>Transformation Type</th>
                    <th>Source Field</th>
                  </tr>
                </thead>
                <tbody>
                  {(modelInfo?.features || [
                    "CreditScore", "Age", "Tenure", "Balance", "NumOfProducts", "HasCrCard", "IsActiveMember", "EstimatedSalary",
                    "Geography_Germany", "Geography_Spain", "Gender_Male"
                  ]).map((feat, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{idx}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{feat}</td>
                      <td>{feat.includes('_') ? 'One-Hot Encoded (drop_first=True)' : 'StandardScaler Normalized'}</td>
                      <td>{feat.split('_')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
