import React, { useState, useEffect } from 'react';
import { predictSingle } from '../api';
import { 
  AlertTriangle, CheckCircle, Zap, User, Sparkles, TrendingUp
} from 'lucide-react';

const DEFAULT_CUSTOMER = {
  CreditScore: 650,
  Geography: 'France',
  Gender: 'Female',
  Age: 40,
  Tenure: 5,
  Balance: 75000.0,
  NumOfProducts: 2,
  HasCrCard: 1,
  IsActiveMember: 1,
  EstimatedSalary: 90000.0,
};

const PRESETS = {
  highRisk: {
    name: '🚨 High Churn Risk',
    data: {
      CreditScore: 480,
      Geography: 'Germany',
      Gender: 'Female',
      Age: 52,
      Tenure: 2,
      Balance: 125000.0,
      NumOfProducts: 1,
      HasCrCard: 0,
      IsActiveMember: 0,
      EstimatedSalary: 62000.0,
    }
  },
  lowRisk: {
    name: '🟢 Loyal Low Risk',
    data: {
      CreditScore: 740,
      Geography: 'France',
      Gender: 'Male',
      Age: 31,
      Tenure: 7,
      Balance: 45000.0,
      NumOfProducts: 2,
      HasCrCard: 1,
      IsActiveMember: 1,
      EstimatedSalary: 110000.0,
    }
  },
  borderline: {
    name: '⚖️ Borderline Case',
    data: {
      CreditScore: 610,
      Geography: 'Spain',
      Gender: 'Female',
      Age: 44,
      Tenure: 4,
      Balance: 98000.0,
      NumOfProducts: 1,
      HasCrCard: 1,
      IsActiveMember: 0,
      EstimatedSalary: 85000.0,
    }
  }
};

export default function SinglePredictor() {
  const [formData, setFormData] = useState(DEFAULT_CUSTOMER);
  const [evaluatedCustomer, setEvaluatedCustomer] = useState(DEFAULT_CUSTOMER);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePredict = async (dataToPredict = formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictSingle(dataToPredict);
      setResult(res);
      setEvaluatedCustomer(dataToPredict);
    } catch (err) {
      setError(err.message || 'Failed to predict churn risk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlePredict(DEFAULT_CUSTOMER);
  }, []);

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
  };

  const applyPreset = (presetKey) => {
    const presetData = PRESETS[presetKey].data;
    setFormData(presetData);
    handlePredict(presetData);
  };

  // Helper to determine risk driver factors
  const getRiskDrivers = (cust, res) => {
    if (!res) return [];
    const drivers = [];
    if (cust.Age > 42) {
      drivers.push({ text: `Higher Age (${cust.Age} yrs)`, impact: 'High Risk Factor', severity: 'high' });
    }
    if (cust.Geography === 'Germany') {
      drivers.push({ text: 'German Branch Demographic', impact: '+18% Baseline Risk', severity: 'medium' });
    }
    if (cust.NumOfProducts === 1) {
      drivers.push({ text: 'Single Product Holder', impact: 'Low Stickiness', severity: 'high' });
    } else if (cust.NumOfProducts >= 3) {
      drivers.push({ text: 'Multiple Products (3+)', impact: 'High Attrition Risk', severity: 'high' });
    }
    if (cust.IsActiveMember === 0) {
      drivers.push({ text: 'Inactive Bank Membership', impact: 'Low Engagement', severity: 'medium' });
    }
    if (cust.Balance > 100000 && cust.NumOfProducts === 1) {
      drivers.push({ text: 'High Balance (€' + cust.Balance.toLocaleString() + ') at Risk', impact: 'High Financial Value', severity: 'critical' });
    }
    if (cust.CreditScore < 500) {
      drivers.push({ text: `Low Credit Score (${cust.CreditScore})`, impact: 'Credit Risk', severity: 'medium' });
    }
    return drivers;
  };

  // Helper for retention strategy
  const getRetentionActions = (cust, res) => {
    if (!res) return [];
    const actions = [];
    if (res.will_churn) {
      actions.push({
        title: 'VIP Financial Advisory Outreach',
        desc: 'Schedule immediate 1-on-1 call with a Senior Relationship Manager to offer personalized wealth planning.',
        tag: 'Priority 1'
      });
      if (cust.NumOfProducts === 1) {
        actions.push({
          title: 'Cross-Sell Bundle Offer',
          desc: 'Waive fees for 1 year on Credit Card or Investment Account to increase product sticky factor.',
          tag: 'Retention Offer'
        });
      }
      if (cust.IsActiveMember === 0) {
        actions.push({
          title: 'Digital Banking Re-activation Campaign',
          desc: 'Send targeted cashback incentives for mobile banking transfers and active card usage.',
          tag: 'Engagement'
        });
      }
    } else {
      actions.push({
        title: 'Standard Loyalty Nurturing',
        desc: 'Customer is healthy. Continue automated monthly statements and seasonal reward perks.',
        tag: 'Maintenance'
      });
    }
    return actions;
  };

  const getRiskBadgeClass = (riskLevel) => {
    switch (riskLevel) {
      case 'Low': return 'badge-low';
      case 'Medium': return 'badge-medium';
      case 'High': return 'badge-high';
      case 'Critical': return 'badge-critical';
      default: return 'badge-low';
    }
  };

  const probPercent = result ? (result.churn_probability * 100).toFixed(1) : 0;

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Top Banner & Presets */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>
            Customer Churn Assessment
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Adjust parameters to calculate real-time churn probability using ANN v3 ML pipeline.
          </p>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
            Presets:
          </span>
          {Object.keys(PRESETS).map((key) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            >
              {PRESETS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form Left (60%), Output Right (40%) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '28px',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: Input Form */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={20} color="var(--accent-cyan)" /> Customer Demographic & Banking Profile
            </h3>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handlePredict(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              {/* Credit Score */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Credit Score
                  </label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {formData.CreditScore}
                  </span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="900"
                  value={formData.CreditScore}
                  onChange={(e) => handleChange('CreditScore', parseInt(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>300 (Poor)</span>
                  <span>650 (Good)</span>
                  <span>900 (Excellent)</span>
                </div>
              </div>

              {/* Geography */}
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Geography
                </label>
                <div className="segmented-control">
                  {['France', 'Germany', 'Spain'].map((geo) => (
                    <button
                      key={geo}
                      type="button"
                      onClick={() => handleChange('Geography', geo)}
                      className={`segmented-option ${formData.Geography === geo ? 'active' : ''}`}
                    >
                      {geo === 'France' ? '🇫🇷' : geo === 'Germany' ? '🇩🇪' : '🇪🇸'} {geo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Gender
                </label>
                <div className="segmented-control">
                  {['Female', 'Male'].map((gen) => (
                    <button
                      key={gen}
                      type="button"
                      onClick={() => handleChange('Gender', gen)}
                      className={`segmented-option ${formData.Gender === gen ? 'active' : ''}`}
                    >
                      {gen === 'Female' ? '👩 Female' : '👨 Male'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Age (Years)
                  </label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                    {formData.Age} yrs
                  </span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="100"
                  value={formData.Age}
                  onChange={(e) => handleChange('Age', parseInt(e.target.value))}
                />
              </div>

              {/* Tenure */}
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Tenure (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.Tenure}
                  onChange={(e) => handleChange('Tenure', parseInt(e.target.value) || 0)}
                />
              </div>

              {/* Num Of Products */}
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Products Held
                </label>
                <select
                  value={formData.NumOfProducts}
                  onChange={(e) => handleChange('NumOfProducts', parseInt(e.target.value))}
                >
                  <option value={1}>1 Product</option>
                  <option value={2}>2 Products (Optimal)</option>
                  <option value={3}>3 Products</option>
                  <option value={4}>4 Products</option>
                </select>
              </div>

              {/* Account Balance */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Account Balance (€)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.Balance}
                    onChange={(e) => handleChange('Balance', parseFloat(e.target.value) || 0)}
                  />
                  <button type="button" onClick={() => handleChange('Balance', 0)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>€0</button>
                  <button type="button" onClick={() => handleChange('Balance', 75000)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>€75k</button>
                  <button type="button" onClick={() => handleChange('Balance', 150000)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>€150k</button>
                </div>
              </div>

              {/* Estimated Salary */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Estimated Annual Salary (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={formData.EstimatedSalary}
                  onChange={(e) => handleChange('EstimatedSalary', parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Has Credit Card Toggle */}
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Credit Card Holder
                </label>
                <div className="segmented-control">
                  <button
                    type="button"
                    onClick={() => handleChange('HasCrCard', 1)}
                    className={`segmented-option ${formData.HasCrCard === 1 ? 'active' : ''}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('HasCrCard', 0)}
                    className={`segmented-option ${formData.HasCrCard === 0 ? 'active' : ''}`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Active Member Toggle */}
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Active Member Status
                </label>
                <div className="segmented-control">
                  <button
                    type="button"
                    onClick={() => handleChange('IsActiveMember', 1)}
                    className={`segmented-option ${formData.IsActiveMember === 1 ? 'active' : ''}`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('IsActiveMember', 0)}
                    className={`segmented-option ${formData.IsActiveMember === 0 ? 'active' : ''}`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

            </div>

            {/* Calculate Button */}
            <div style={{ marginTop: '28px' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              >
                {loading ? 'Evaluating Model...' : <><Zap size={18} /> Calculate Churn Risk</>}
              </button>
            </div>
          </form>
        </div>


        {/* RIGHT COLUMN: Prediction Results & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Main Score Card */}
          <div className="glass-card animate-fade-in" style={{ padding: '28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            
            {/* Background Glow based on Risk */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '250px',
              height: '250px',
              borderRadius: '50%',
              background: result?.will_churn
                ? 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {error ? (
              <div style={{ padding: '20px', color: '#f87171' }}>
                <AlertTriangle size={36} style={{ marginBottom: '12px' }} />
                <p style={{ fontWeight: 600 }}>{error}</p>
                <p style={{ fontSize: '0.85rem', marginTop: '8px', color: 'var(--text-secondary)' }}>
                  Make sure FastAPI is running on port 8000.
                </p>
              </div>
            ) : result ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    ML Risk Analysis
                  </span>
                  <span className={`badge ${getRiskBadgeClass(result.risk_level)}`}>
                    {result.risk_level} Risk Tier
                  </span>
                </div>

                {/* SVG Semi-Circle Gauge */}
                <div style={{ position: 'relative', width: '220px', height: '125px', margin: '0 auto' }}>
                  <svg width="220" height="120" viewBox="0 0 220 120">
                    <path
                      d="M 20 110 A 90 90 0 0 1 200 110"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="18"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 110 A 90 90 0 0 1 200 110"
                      fill="none"
                      stroke={
                        result.churn_probability > 0.75 ? '#ef4444' :
                        result.churn_probability > 0.50 ? '#f97316' :
                        result.churn_probability > 0.25 ? '#f59e0b' : '#10b981'
                      }
                      strokeWidth="18"
                      strokeLinecap="round"
                      strokeDasharray="282.7"
                      strokeDashoffset={282.7 * (1 - result.churn_probability)}
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>

                  <div style={{ position: 'absolute', bottom: '0', left: 0, right: 0 }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                      {probPercent}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Churn Probability
                    </div>
                  </div>
                </div>

                {/* Status Callout Box */}
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: result.will_churn ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  border: `1px solid ${result.will_churn ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    {result.will_churn ? (
                      <AlertTriangle size={24} color="#f87171" />
                    ) : (
                      <CheckCircle size={24} color="#34d399" />
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: result.will_churn ? '#f87171' : '#34d399' }}>
                        {result.will_churn ? 'Predicted to Churn' : 'Customer Retained'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Using F1-Optimal Threshold: {result.threshold_used}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Confidence</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px', color: 'var(--text-muted)' }}>Loading model response...</div>
            )}
          </div>

          {/* Key Risk Drivers */}
          {result && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--accent-indigo)" /> Identified Risk Drivers
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {getRiskDrivers(evaluatedCustomer, result).map((driver, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {driver.text}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: driver.severity === 'critical' ? '#ef4444' : driver.severity === 'high' ? '#f97316' : '#f59e0b'
                    }}>
                      {driver.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Retention Strategies */}
          {result && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--accent-cyan)" /> Recommended Action Plan
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {getRetentionActions(evaluatedCustomer, result).map((action, idx) => (
                  <div key={idx} style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {action.title}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(6, 182, 212, 0.2)',
                        color: 'var(--accent-cyan)'
                      }}>
                        {action.tag}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {action.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
