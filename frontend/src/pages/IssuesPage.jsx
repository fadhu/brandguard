import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Filter, ChevronDown } from 'lucide-react';
import api from '../utils/api';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', severity: '', category: '' });

  const loadData = async () => {
    try {
      const [issueData, statsData] = await Promise.all([
        api.getIssues(filter),
        api.getIssueStats(),
      ]);
      setIssues(issueData.issues || []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filter]);

  const handleResolve = async (id) => {
    try {
      await api.resolveIssue(id);
      loadData();
    } catch (err) {
      alert('Failed to resolve: ' + err.message);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateIssue(id, { status });
      loadData();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  const statCards = stats ? [
    { label: 'Open', count: stats.by_status?.open || 0, color: 'var(--error)', bg: 'var(--error-bg)' },
    { label: 'In Progress', count: stats.by_status?.in_progress || 0, color: 'var(--warning)', bg: 'var(--warning-bg)' },
    { label: 'Resolved', count: stats.by_status?.resolved || 0, color: 'var(--success)', bg: 'var(--success-bg)' },
    { label: 'Dismissed', count: stats.by_status?.dismissed || 0, color: 'var(--text-light)', bg: 'var(--bg)' },
  ] : [];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26 }}>Issues</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Track and resolve brand compliance issues
        </p>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {statCards.map(({ label, count, color, bg }) => (
            <div key={label} className="card" style={{ padding: '16px 20px', cursor: 'pointer' }}
              onClick={() => setFilter(prev => ({
                ...prev,
                status: label.toLowerCase().replace(' ', '_') === prev.status ? '' : label.toLowerCase().replace(' ', '_'),
              }))}>
              <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, color }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <Filter size={16} style={{ color: 'var(--text-light)' }} />
        {['severity', 'category'].map(key => (
          <select key={key} className="input" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
            value={filter[key]}
            onChange={e => setFilter(prev => ({ ...prev, [key]: e.target.value }))}>
            <option value="">All {key === 'severity' ? 'severities' : 'categories'}</option>
            {key === 'severity'
              ? ['high', 'medium', 'low'].map(v => <option key={v} value={v}>{v}</option>)
              : ['color', 'typography', 'logo', 'imagery', 'voice', 'layout'].map(v => <option key={v} value={v}>{v}</option>)
            }
          </select>
        ))}
        {(filter.status || filter.severity || filter.category) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ status: '', severity: '', category: '' })}>
            Clear filters
          </button>
        )}
      </div>

      {/* Issues List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {filter.status || filter.severity || filter.category ? 'Filtered Issues' : 'All Issues'}
          </span>
          <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            {issues.length} issues
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto', borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : issues.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={32} style={{ color: 'var(--success)' }} />
            <p style={{ marginTop: 8 }}>No issues found. Everything looks compliant!</p>
          </div>
        ) : (
          <div>
            {issues.map(issue => (
              <div key={issue.id} style={{
                padding: '20px 24px', borderBottom: '1px solid var(--border-light)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(246,245,241,0.5)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div className={`severity-dot severity-${issue.severity}`} />
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{issue.title}</span>
                  <span className="badge" style={{
                    background: 'var(--bg)', color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 10,
                  }}>{issue.category}</span>
                  <span className={`badge ${
                    issue.status === 'open' ? 'badge-error' :
                    issue.status === 'in_progress' ? 'badge-warning' :
                    issue.status === 'resolved' ? 'badge-success' : ''
                  }`}>{issue.status.replace('_', ' ')}</span>
                </div>

                {/* Source file */}
                {issue.scan_filename && (
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 8 }}>
                    From: {issue.scan_filename}
                  </div>
                )}

                {/* Description */}
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                  {issue.description}
                </div>

                {/* Suggested Fix */}
                {issue.suggested_fix && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 8,
                    fontSize: 12, color: 'var(--success)', lineHeight: 1.5, marginBottom: 12,
                  }}>
                    <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span><strong>Suggested fix:</strong> {issue.suggested_fix}</span>
                  </div>
                )}

                {/* Actions */}
                {issue.status !== 'resolved' && issue.status !== 'dismissed' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {issue.status === 'open' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateStatus(issue.id, 'in_progress')}>
                        <Clock size={12} /> Mark In Progress
                      </button>
                    )}
                    <button className="btn btn-sm" style={{ background: 'var(--success)', color: 'white' }}
                      onClick={() => handleResolve(issue.id)}>
                      <CheckCircle size={12} /> Resolve
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-light)' }}
                      onClick={() => handleUpdateStatus(issue.id, 'dismissed')}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
