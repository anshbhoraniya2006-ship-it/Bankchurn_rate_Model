import React, { useState } from 'react';
import { predictBatch } from '../api';
import { 
  Upload, Download, Users, AlertCircle, BarChart2, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';

const SAMPLE_BATCH = [
  { CreditScore: 619, Geography: 'France', Gender: 'Female', Age: 42, Tenure: 2, Balance: 0.0, NumOfProducts: 1, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 101348.88 },
  { CreditScore: 608, Geography: 'Spain', Gender: 'Female', Age: 41, Tenure: 1, Balance: 83807.86, NumOfProducts: 1, HasCrCard: 0, IsActiveMember: 1, EstimatedSalary: 112542.58 },
  { CreditScore: 502, Geography: 'France', Gender: 'Female', Age: 42, Tenure: 8, Balance: 159660.8, NumOfProducts: 3, HasCrCard: 1, IsActiveMember: 0, EstimatedSalary: 113931.57 },
  { CreditScore: 699, Geography: 'France', Gender: 'Female', Age: 39, Tenure: 1, Balance: 0.0, NumOfProducts: 2, HasCrCard: 0, IsActiveMember: 0, EstimatedSalary: 93826.63 },
  { CreditScore: 850, Geography: 'Spain', Gender: 'Female', Age: 43, Tenure: 2, Balance: 125510.82, NumOfProducts: 1, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 79084.1 },
  { CreditScore: 645, Geography: 'Spain', Gender: 'Male', Age: 44, Tenure: 8, Balance: 113755.78, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 0, EstimatedSalary: 149756.71 },
  { CreditScore: 822, Geography: 'France', Gender: 'Male', Age: 50, Tenure: 7, Balance: 0.0, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 10062.8 },
  { CreditScore: 376, Geography: 'Germany', Gender: 'Female', Age: 29, Tenure: 4, Balance: 115046.74, NumOfProducts: 4, HasCrCard: 1, IsActiveMember: 0, EstimatedSalary: 119346.88 },
  { CreditScore: 501, Geography: 'France', Gender: 'Male', Age: 44, Tenure: 4, Balance: 142051.07, NumOfProducts: 2, HasCrCard: 0, IsActiveMember: 1, EstimatedSalary: 74940.5 },
  { CreditScore: 684, Geography: 'France', Gender: 'Male', Age: 27, Tenure: 2, Balance: 134603.21, NumOfProducts: 1, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 71725.73 },
  { CreditScore: 528, Geography: 'France', Gender: 'Male', Age: 31, Tenure: 6, Balance: 102016.72, NumOfProducts: 2, HasCrCard: 0, IsActiveMember: 0, EstimatedSalary: 80181.12 },
  { CreditScore: 497, Geography: 'Spain', Gender: 'Male', Age: 24, Tenure: 3, Balance: 0.0, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 0, EstimatedSalary: 76390.01 },
  { CreditScore: 475, Geography: 'France', Gender: 'Female', Age: 34, Tenure: 10, Balance: 0.0, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 0, EstimatedSalary: 26260.98 },
  { CreditScore: 549, Geography: 'France', Gender: 'Female', Age: 25, Tenure: 5, Balance: 0.0, NumOfProducts: 2, HasCrCard: 0, IsActiveMember: 0, EstimatedSalary: 190857.79 },
  { CreditScore: 635, Geography: 'Spain', Gender: 'Female', Age: 35, Tenure: 7, Balance: 0.0, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 65951.65 },
  { CreditScore: 616, Geography: 'Germany', Gender: 'Male', Age: 45, Tenure: 3, Balance: 143129.41, NumOfProducts: 2, HasCrCard: 0, IsActiveMember: 1, EstimatedSalary: 64327.26 },
  { CreditScore: 653, Geography: 'Germany', Gender: 'Male', Age: 58, Tenure: 1, Balance: 132602.88, NumOfProducts: 1, HasCrCard: 1, IsActiveMember: 0, EstimatedSalary: 5097.67 },
  { CreditScore: 549, Geography: 'Spain', Gender: 'Female', Age: 24, Tenure: 9, Balance: 0.0, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 14406.41 },
  { CreditScore: 587, Geography: 'Spain', Gender: 'Male', Age: 45, Tenure: 6, Balance: 0.0, NumOfProducts: 1, HasCrCard: 0, IsActiveMember: 0, EstimatedSalary: 158684.81 },
  { CreditScore: 726, Geography: 'France', Gender: 'Female', Age: 24, Tenure: 6, Balance: 0.0, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 54741.94 },
];

export default function BatchPredictor() {
  const [customers, setCustomers] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [riskFilter, setRiskFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const runBatchPrediction = async (inputCustomers) => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictBatch(inputCustomers);
      setCustomers(inputCustomers);
      setResults(res);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Batch prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) throw new Error("CSV file is empty or missing headers.");

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const parsed = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (row.length < headers.length) continue;
          
          const obj = {};
          headers.forEach((h, idx) => {
            let val = row[idx];
            if (['CreditScore', 'Age', 'Tenure', 'NumOfProducts', 'HasCrCard', 'IsActiveMember'].includes(h)) {
              obj[h] = parseInt(val, 10) || 0;
            } else if (['Balance', 'EstimatedSalary'].includes(h)) {
              obj[h] = parseFloat(val) || 0.0;
            } else if (h === 'Geography') {
              const cleanVal = (val || '').toString().toLowerCase().trim();
              if (cleanVal.includes('germany')) obj[h] = 'Germany';
              else if (cleanVal.includes('spain')) obj[h] = 'Spain';
              else obj[h] = 'France';
            } else if (h === 'Gender') {
              const cleanVal = (val || '').toString().toLowerCase().trim();
              if (cleanVal.startsWith('m')) obj[h] = 'Male';
              else obj[h] = 'Female';
            } else {
              obj[h] = val;
            }
          });
          parsed.push(obj);
        }

        if (parsed.length === 0) throw new Error("No valid customer records found in CSV.");
        runBatchPrediction(parsed.slice(0, 100)); // Cap at 100
      } catch (err) {
        setError(`CSV Parsing Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const headers = ["CreditScore","Geography","Gender","Age","Tenure","Balance","NumOfProducts","HasCrCard","IsActiveMember","EstimatedSalary"];
    const csvContent = [
      headers.join(','),
      ...SAMPLE_BATCH.map(c => Object.values(c).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank_churn_sample_customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadResultsCSV = () => {
    if (!results || !customers) return;
    const headers = [
      "CreditScore","Geography","Gender","Age","Tenure","Balance","NumOfProducts","HasCrCard","IsActiveMember","EstimatedSalary",
      "ChurnProbability","WillChurn","RiskLevel","Confidence"
    ];

    const rows = customers.map((c, i) => {
      const r = results.predictions[i];
      return [
        c.CreditScore, c.Geography, c.Gender, c.Age, c.Tenure, c.Balance, c.NumOfProducts, c.HasCrCard, c.IsActiveMember, c.EstimatedSalary,
        r.churn_probability, r.will_churn ? "YES" : "NO", r.risk_level, r.confidence
      ].join(',');
    });

    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `churn_predictions_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered rows for table
  const combinedRows = (results && customers) ? customers.map((c, idx) => ({
    ...c,
    prediction: results.predictions[idx],
    id: idx + 1
  })) : [];

  const filteredRows = combinedRows.filter(row => {
    if (riskFilter === 'All') return true;
    return row.prediction.risk_level === riskFilter;
  });

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Recharts Data Aggregation
  const riskCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  let totalBalanceAtRisk = 0;

  combinedRows.forEach(r => {
    riskCounts[r.prediction.risk_level] = (riskCounts[r.prediction.risk_level] || 0) + 1;
    if (r.prediction.will_churn) {
      totalBalanceAtRisk += r.Balance;
    }
  });

  const pieData = [
    { name: 'Low Risk', value: riskCounts.Low, color: '#10b981' },
    { name: 'Medium Risk', value: riskCounts.Medium, color: '#f59e0b' },
    { name: 'High Risk', value: riskCounts.High, color: '#f97316' },
    { name: 'Critical Risk', value: riskCounts.Critical, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ padding: '30px 24px', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>
            Portfolio Batch Analytics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Upload customer CSV batches (up to 100 per request) to run parallel ANN predictions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={downloadSampleCSV} className="btn-secondary">
            <Download size={16} /> Sample CSV Template
          </button>
          <button onClick={() => runBatchPrediction(SAMPLE_BATCH)} className="btn-primary">
            <Users size={16} /> Load Demo Portfolio (20 Customers)
          </button>
        </div>
      </div>

      {/* CSV Drag & Drop / Upload Area */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', borderStyle: 'dashed' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Upload size={24} color="var(--accent-indigo)" />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', margin: 0 }}>Upload Customer CSV File</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Must contain columns: CreditScore, Geography, Gender, Age, Tenure, Balance, NumOfProducts, HasCrCard, IsActiveMember, EstimatedSalary
            </p>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="btn-secondary" style={{ cursor: 'pointer', marginLeft: 'auto' }}>
            Browse CSV File
          </label>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {loading && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
            Processing Neural Network Batch Predictions...
          </div>
          <p style={{ fontSize: '0.85rem' }}>Scaling vectors and evaluating classification threshold...</p>
        </div>
      )}

      {/* Results Dashboard */}
      {results && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Portfolio Size
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
                {results.total}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Customer records evaluated
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Predicted Churn Rate
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: '#f87171', fontFamily: 'var(--font-heading)' }}>
                {(results.churn_rate * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {results.churners} of {results.total} predicted to exit
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                At-Risk Account Balance
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#fb923c', fontFamily: 'var(--font-heading)' }}>
                €{totalBalanceAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Total capital in high-churn segment
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Classification Threshold
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: 'var(--accent-indigo)', fontFamily: 'var(--font-heading)' }}>
                {results.predictions[0]?.threshold_used ?? 0.78}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                F1-Optimised Cutoff Value
              </div>
            </div>

          </div>

          {/* Visualization Row: Pie Chart & Risk Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            
            <div className="glass-card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="var(--accent-cyan)" /> Risk Tier Breakdown
              </h4>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Tier Counts */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>
                Segment Severity Counts
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { level: 'Critical (>75%)', count: riskCounts.Critical, cls: 'badge-critical' },
                  { level: 'High (50-75%)', count: riskCounts.High, cls: 'badge-high' },
                  { level: 'Medium (25-50%)', count: riskCounts.Medium, cls: 'badge-medium' },
                  { level: 'Low (<25%)', count: riskCounts.Low, cls: 'badge-low' },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)',
                  }}>
                    <span className={`badge ${item.cls}`}>{item.level}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
                      {item.count} customers
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Prediction Data Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', margin: 0 }}>Detailed Prediction Ledger</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Showing {filteredRows.length} customer records
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Risk Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <Filter size={14} color="var(--text-muted)" />
                  <select
                    value={riskFilter}
                    onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    <option value="All">All Risk Tiers</option>
                    <option value="Critical">Critical Risk</option>
                    <option value="High">High Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="Low">Low Risk</option>
                  </select>
                </div>

                <button onClick={downloadResultsCSV} className="btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  <Download size={14} /> Export Predictions CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Geography</th>
                    <th>Gender / Age</th>
                    <th>Tenure</th>
                    <th>Products</th>
                    <th>Balance</th>
                    <th>Active</th>
                    <th>Churn Prob</th>
                    <th>Risk Tier</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.Geography}</td>
                        <td>{row.Gender}, {row.Age}y</td>
                        <td>{row.Tenure} yrs</td>
                        <td>{row.NumOfProducts}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>€{row.Balance.toLocaleString()}</td>
                        <td>{row.IsActiveMember ? '🟢 Yes' : '⚪ No'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: row.prediction.will_churn ? '#f87171' : '#34d399' }}>
                          {(row.prediction.churn_probability * 100).toFixed(1)}%
                        </td>
                        <td>
                          <span className={`badge badge-${row.prediction.risk_level.toLowerCase()}`}>
                            {row.prediction.risk_level}
                          </span>
                        </td>
                        <td>
                          {row.prediction.will_churn ? (
                            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>CHURN</span>
                          ) : (
                            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>RETAIN</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No records match the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{ padding: '6px 12px' }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{ padding: '6px 12px' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
