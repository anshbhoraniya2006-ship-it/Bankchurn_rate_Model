import React, { useState, useEffect } from 'react';
import { predictSingle } from '../api';
import { Sliders, TrendingDown, TrendingUp, RotateCcw } from 'lucide-react';

const INITIAL_BASE = {
  CreditScore: 580,
  Geography: 'Germany',
  Gender: 'Female',
  Age: 46,
  Tenure: 3,
  Balance: 110000.0,
  NumOfProducts: 1,
  HasCrCard: 1,
  IsActiveMember: 0,
  EstimatedSalary: 75000.0,
};

export default function WhatIfSimulator() {
  const [baseCustomer, setBaseCustomer] = useState(INITIAL_BASE);
  const [simCustomer, setSimCustomer] = useState(INITIAL_BASE);
  const [activePreset, setActivePreset] = useState('none');
  
  const [baseResult, setBaseResult] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const evaluateScenarios = async (base = baseCustomer, sim = simCustomer) => {
    setLoading(true);
    setError(null);
    try {
      const [resBase, resSim] = await Promise.all([
        predictSingle(base),
        predictSingle(sim)
      ]);
      setBaseResult(resBase);
      setSimResult(resSim);
    } catch (err) {
      console.error("Simulation failed:", err);
      setError(err.message || "Failed to evaluate simulation scenarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically evaluate initial scenario on mount
    evaluateScenarios(INITIAL_BASE, INITIAL_BASE);
  }, []);

  const handleSimChange = (field, value) => {
    const updatedSim = { ...simCustomer, [field]: value };
    setSimCustomer(updatedSim);
    setActivePreset('custom');
    evaluateScenarios(baseCustomer, updatedSim);
  };

  const applyActionPreset = (actionType) => {
    if (actionType === 'none' || activePreset === actionType) {
      // Toggle off back to baseline
      const resetSim = { ...baseCustomer };
      setSimCustomer(resetSim);
      setActivePreset('none');
      evaluateScenarios(baseCustomer, resetSim);
      return;
    }

    let updatedSim = { ...baseCustomer };
    if (actionType === 'activate') {
      updatedSim.IsActiveMember = 1;
    } else if (actionType === 'add_product') {
      updatedSim.NumOfProducts = baseCustomer.NumOfProducts === 1 ? 2 : Math.min(4, baseCustomer.NumOfProducts + 1);
    } else if (actionType === 'both') {
      updatedSim.IsActiveMember = 1;
      updatedSim.NumOfProducts = Math.max(2, baseCustomer.NumOfProducts);
    } else if (actionType === 'credit') {
      updatedSim.CreditScore = Math.min(900, baseCustomer.CreditScore + 120);
    }

    setSimCustomer(updatedSim);
    setActivePreset(actionType);
    evaluateScenarios(baseCustomer, updatedSim);
  };

  const delta = (baseResult && simResult) 
    ? ((simResult.churn_probability - baseResult.churn_probability) * 100).toFixed(1)
    : 0;

  const isRiskReduced = delta < 0;

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders color="var(--accent-indigo)" /> What-If Scenario Simulator
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Simulate bank retention interventions (e.g. membership activation, product cross-selling) and observe exact churn risk deltas.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          marginBottom: '24px',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Action Presets */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Quick Intervention Presets
          </div>
          {activePreset !== 'none' && (
            <span className="badge badge-low" style={{ fontSize: '0.75rem' }}>
              Active Preset: {activePreset.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => applyActionPreset('activate')}
            className={activePreset === 'activate' ? 'btn-primary' : 'btn-secondary'}
          >
            ⚡ Activate Member Status
          </button>

          <button
            type="button"
            onClick={() => applyActionPreset('add_product')}
            className={activePreset === 'add_product' ? 'btn-primary' : 'btn-secondary'}
          >
            📦 Cross-Sell 2nd Bank Product
          </button>

          <button
            type="button"
            onClick={() => applyActionPreset('both')}
            className={activePreset === 'both' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
          >
            🚀 Full Retention Combo (Active + Product 2)
          </button>

          <button
            type="button"
            onClick={() => applyActionPreset('credit')}
            className={activePreset === 'credit' ? 'btn-primary' : 'btn-secondary'}
          >
            📈 Credit Score Boost (+120 Pts)
          </button>

          {activePreset !== 'none' && (
            <button
              type="button"
              onClick={() => applyActionPreset('none')}
              className="btn-secondary"
              style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}
            >
              <RotateCcw size={14} /> Reset Baseline
            </button>
          )}
        </div>
      </div>

      {/* Side by Side Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '28px' }}>

        {/* Left: Base Scenario */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Original Base Customer
            </h3>
            <span className="badge badge-high">Current Baseline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Geography / Gender:</span>
              <span style={{ fontWeight: 600 }}>{baseCustomer.Geography}, {baseCustomer.Gender}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Age:</span>
              <span style={{ fontWeight: 600 }}>{baseCustomer.Age} yrs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Credit Score:</span>
              <span style={{ fontWeight: 600 }}>{baseCustomer.CreditScore}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Account Balance:</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>€{baseCustomer.Balance.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Products Held:</span>
              <span style={{ fontWeight: 600 }}>{baseCustomer.NumOfProducts} Product</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Status:</span>
              <span style={{ fontWeight: 600, color: baseCustomer.IsActiveMember ? '#34d399' : '#f87171' }}>
                {baseCustomer.IsActiveMember ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Base Result Box */}
          {baseResult && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-color)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Baseline Risk Score
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '4px', color: baseResult.will_churn ? '#ef4444' : '#10b981', fontFamily: 'var(--font-heading)' }}>
                {(baseResult.churn_probability * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Classification: <strong>{baseResult.will_churn ? 'WILL CHURN' : 'RETAINED'}</strong> ({baseResult.risk_level})
              </div>
            </div>
          )}
        </div>

        {/* Right: Intervention Simulator */}
        <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border-glow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>
              Simulated Intervention State
            </h3>
            <span className="badge badge-low">{loading ? 'Evaluating...' : 'Interactive'}</span>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Member Activity Status
              </label>
              <div className="segmented-control">
                <button
                  type="button"
                  onClick={() => handleSimChange('IsActiveMember', 1)}
                  className={`segmented-option ${simCustomer.IsActiveMember === 1 ? 'active' : ''}`}
                >
                  🟢 Active Member
                </button>
                <button
                  type="button"
                  onClick={() => handleSimChange('IsActiveMember', 0)}
                  className={`segmented-option ${simCustomer.IsActiveMember === 0 ? 'active' : ''}`}
                >
                  ⚪ Inactive Member
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Number of Products
              </label>
              <div className="segmented-control">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSimChange('NumOfProducts', num)}
                    className={`segmented-option ${simCustomer.NumOfProducts === num ? 'active' : ''}`}
                  >
                    {num} {num === 1 ? 'Prod' : 'Prods'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Simulated Credit Score</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{simCustomer.CreditScore}</span>
              </div>
              <input
                type="range"
                min="300"
                max="900"
                value={simCustomer.CreditScore}
                onChange={(e) => handleSimChange('CreditScore', parseInt(e.target.value))}
              />
            </div>

          </div>

          {/* Simulated Result Box */}
          {simResult && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              textAlign: 'center',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s ease'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Simulated Risk Score
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '4px', color: simResult.will_churn ? '#ef4444' : '#10b981', fontFamily: 'var(--font-heading)' }}>
                {(simResult.churn_probability * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Classification: <strong>{simResult.will_churn ? 'WILL CHURN' : 'RETAINED'}</strong> ({simResult.risk_level})
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Delta Impact Callout Card */}
      {baseResult && simResult && (
        <div className="glass-card animate-fade-in" style={{
          marginTop: '28px',
          padding: '24px',
          background: isRiskReduced ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isRiskReduced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: isRiskReduced ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isRiskReduced ? <TrendingDown size={28} color="#34d399" /> : <TrendingUp size={28} color="#f87171" />}
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Risk Impact Delta: <span style={{ color: isRiskReduced ? '#34d399' : '#f87171' }}>{delta > 0 ? `+${delta}%` : `${delta}%`}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isRiskReduced ? (
                  baseResult.will_churn && !simResult.will_churn ? (
                    '🎉 Success! This intervention successfully flips the customer from CHURN to RETAINED.'
                  ) : (
                    'Intervention reduces churn risk significantly.'
                  )
                ) : (
                  'Warning: Selected changes increase overall customer churn risk.'
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>F1 Threshold: {baseResult.threshold_used}</span>
          </div>
        </div>
      )}

    </div>
  );
}
