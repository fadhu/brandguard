import { useState, useEffect } from 'react';
import { Upload, Download } from 'lucide-react';
import api from '../utils/api';

function ScoreCard({ label, value, suffix, color, change, delay }) {
  return (
    <div className="card" style={{
      padding: '22px 24px',
      animation: `fadeIn 0.5s ease ${delay}s both`,
      transition: 'all 0.25s ease',
      cursor: 'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{
        fontSize: 12, color: 'var(--text-light)', textTransform: 'uppercase',
        letterSpacing: 0.8, fontWeight: 600, marginBottom: 10,
      }}>{label}</div>
      <div style={{
        fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 500,
        letterSpacing: -1, lineHeight: 1, marginBottom: 8, color,
      }}>
        {value}
        {suffix && <span style={{ fontSize: 20, color: 'var(--text-light)' }}>{suffix}</span>}
      </div>
      {change && (
        <span className={`badge ${change.type === 'up' ? 'badge-success' : change.type === 'down' ? 'badge-error' : 'badge-warning'}`}>
          {change.text}
        </span>
      )}
    </div>
  );
}

function ComplianceRing({ score, breakdown }) {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px' }}>
      <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 20 }}>
        <svg viewBox="0 0 140 140" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border-light)" strokeWidth="10" />
          <circle cx="70" cy="70" r="60" fill="none" stroke="var(--accent)" strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 500, letterSpacing: -1, lineHeight: 1 }}>
            {Math.round(score)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
            Score
          </span>
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(breakdown).map(([cat, val]) => {
          const color = val >= 80 ? 'var(--success)' : val >= 60 ? 'var(--warning)' : 'var(--error)';
          return (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 90 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ textTransform: 'capitalize' }}>{cat}</span>
              </div>
              <div style={{ flex: 1, margin: '0 12px', height: 4, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: color, width: `${val}%`, transition: 'width 1s ease' }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 12, minWidth: 32, textAlign: 'right', color }}>{val}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentScan({ scan, onClick }) {
  const icons = { 'application/pdf': '📄', 'image/png': '🖼', 'image/jpeg': '🖼', 'image/svg+xml': '🎨', 'video/mp4': '🎬' };
  const bgColors = { 'application/pdf': '#FDE8E8', 'image/png': '#E8EDFB', 'image/jpeg': '#E8EDFB', 'image/svg+xml': '#F3E8FD', 'video/mp4': '#FDF3E3' };
  const icon = icons[scan.file_type] || '📁';
  const bg = bgColors[scan.file_type] || '#FDF3E3';
  const scoreClass = scan.overall_score >= 80 ? 'score-high' : scan.overall_score >= 60 ? 'score-mid' : 'score-low';

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr + 'Z').getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px',
      cursor: 'pointer', transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 8, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {scan.filename}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
          {timeAgo(scan.completed_at || scan.created_at)} · {scan.department || 'General'}
        </div>
      </div>
      <div className={scoreClass} style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, flexShrink: 0 }}>
        {scan.status === 'completed' ? scan.overall_score : scan.status === 'scanning' ? '...' : '—'}
      </div>
    </div>
  );
}

function IssueItem({ issue }) {
  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div className={`severity-dot severity-${issue.severity}`} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{issue.title}</span>
        <span className="badge" style={{
          background: 'var(--bg)', color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 10,
        }}>{issue.category}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
        {issue.description}
      </div>
      {issue.suggested_fix && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 12px', background: 'var(--success-bg)', borderRadius: 8,
          fontSize: 12, color: 'var(--success)', lineHeight: 1.5,
        }}>
          <span>✓</span>
          <span><strong>Fix:</strong> {issue.suggested_fix}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [scans, setScans] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getScans(null, 5),
      api.getIssues({ status: 'open' }),
    ])
      .then(([dashData, scanData, issueData]) => {
        setStats(dashData);
        setScans(scanData.scans || []);
        setIssues((issueData.issues || []).slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  const totalAssets = stats?.total_assets || 0;
  const compliantAssets = stats?.compliant_assets || 0;
  const overallScore = stats?.overall_score || 0;
  const openIssues = stats?.open_issues || 0;
  const avgRes = stats?.avg_resolution_days || 0;
  const trend = stats?.score_trend || 0;
  const catScores = stats?.category_scores || {};

  return (
    <div>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>Compliance Dashboard</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {totalAssets} assets reviewed
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary"><Download size={16} /> Export Report</button>
          <button className="btn btn-primary" onClick={() => onNavigate('upload')}><Upload size={16} /> New Scan</button>
        </div>
      </div>

      {/* Score Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <ScoreCard
          label="Overall Score" value={Math.round(overallScore)} suffix="/100" color="var(--accent)"
          change={trend !== 0 ? { type: trend > 0 ? 'up' : 'down', text: `${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)}% vs last week` } : { type: 'neutral', text: '— stable' }}
          delay={0.1}
        />
        <ScoreCard
          label="Assets Compliant" value={compliantAssets} suffix={`/${totalAssets}`} color="var(--success)"
          change={{ type: 'up', text: `${Math.round(totalAssets ? (compliantAssets/totalAssets)*100 : 0)}% pass rate` }}
          delay={0.2}
        />
        <ScoreCard
          label="Open Issues" value={openIssues} color="var(--error)"
          change={openIssues > 0 ? { type: 'down', text: `${openIssues} need attention` } : { type: 'up', text: 'All clear!' }}
          delay={0.3}
        />
        <ScoreCard
          label="Avg. Resolution" value={avgRes} suffix=" days" color="var(--text-primary)"
          change={{ type: 'neutral', text: 'team average' }}
          delay={0.4}
        />
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Left Column */}
        <div>
          {/* Upload Zone */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Upload & Scan</span>
              <span className="badge badge-accent">AI-Powered</span>
            </div>
            <div style={{ padding: 24 }}>
              <div
                onClick={() => onNavigate('upload')}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 12, padding: '40px 24px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 48, height: 48, margin: '0 auto 14px', background: 'var(--accent-light)',
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                }}>
                  <Upload size={22} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop files to scan for compliance</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>or click to browse your files</div>
                <div style={{ marginTop: 14, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['PDF', 'PNG', 'JPG', 'SVG', 'HTML', 'CSS'].map(fmt => (
                    <span key={fmt} style={{
                      fontSize: 10, padding: '3px 10px', background: 'var(--bg)', borderRadius: 20,
                      color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{fmt}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scans */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Scans</span>
              <span style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => onNavigate('upload')}>View all →</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {scans.length === 0 ? (
                <div className="empty-state"><p>No scans yet. Upload a file to get started.</p></div>
              ) : (
                scans.map(scan => <RecentScan key={scan.id} scan={scan} onClick={() => onNavigate('upload')} />)
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Issues + Ring */}
        <div className="card" style={{ gridRow: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">Compliance Overview</span>
            <span className="badge badge-error">{openIssues} open</span>
          </div>

          <ComplianceRing score={overallScore} breakdown={catScores} />

          <div style={{ borderTop: '1px solid var(--border-light)' }}>
            <div style={{ padding: '12px 24px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Recent Issues</span>
              <span style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => onNavigate('issues')}>View all →</span>
            </div>
            {issues.length === 0 ? (
              <div className="empty-state"><p>No open issues.</p></div>
            ) : (
              issues.map(issue => <IssueItem key={issue.id} issue={issue} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
