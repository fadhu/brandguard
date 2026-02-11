import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Image, Film, CheckCircle, XCircle, Loader, Trash2, RefreshCw } from 'lucide-react';
import api from '../utils/api';

export default function UploadPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [department, setDepartment] = useState('');
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const loadScans = useCallback(async () => {
    try {
      const data = await api.getScans(null, 50);
      setScans(data.scans || []);
    } catch (err) {
      console.error('Failed to load scans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScans();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadScans]);

  // Poll for pending/scanning scans
  useEffect(() => {
    const hasPending = scans.some(s => s.status === 'pending' || s.status === 'scanning');
    if (hasPending) {
      pollRef.current = setInterval(loadScans, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [scans, loadScans]);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await api.uploadAndScan(file, department);
      }
      await loadScans();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scan and all its issues?')) return;
    try {
      await api.deleteScan(id);
      setScans(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const statusConfig = {
    pending: { icon: Loader, color: 'var(--text-light)', label: 'Pending', badge: 'badge-warning' },
    scanning: { icon: RefreshCw, color: 'var(--accent)', label: 'Scanning...', badge: 'badge-accent' },
    completed: { icon: CheckCircle, color: 'var(--success)', label: 'Complete', badge: 'badge-success' },
    failed: { icon: XCircle, color: 'var(--error)', label: 'Failed', badge: 'badge-error' },
  };

  const fileIcons = {
    'application/pdf': { icon: FileText, color: '#D43B3B', bg: '#FDE8E8' },
    'image/png': { icon: Image, color: '#2B5CE6', bg: '#E8EDFB' },
    'image/jpeg': { icon: Image, color: '#2B5CE6', bg: '#E8EDFB' },
    'image/svg+xml': { icon: Image, color: '#7C3AED', bg: '#F3E8FD' },
    'video/mp4': { icon: Film, color: '#D4850A', bg: '#FDF3E3' },
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26 }}>Upload & Scan</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Upload assets to check them against your brand guidelines
        </p>
      </div>

      {/* Upload Zone */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Department (optional)</label>
              <input
                className="input"
                placeholder="e.g. Marketing, Product, Social..."
                value={department}
                onChange={e => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.3s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.svg,.webp,.gif,.html,.css,.txt"
              style={{ display: 'none' }}
              onChange={e => handleUpload(e.target.files)}
            />

            {uploading ? (
              <>
                <div className="spinner" style={{ margin: '0 auto 14px', borderColor: 'var(--border)', borderTopColor: 'var(--accent)', width: 32, height: 32 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>Uploading & analyzing...</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Claude is reviewing your assets</div>
              </>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, margin: '0 auto 14px', background: 'var(--accent-light)',
                  borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                }}>
                  <Upload size={26} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {dragOver ? 'Drop files here' : 'Drag & drop files to scan'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-light)' }}>or click to browse — PDF, PNG, JPG, SVG, HTML, CSS</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scan History */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Scan History</span>
          <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            {scans.length} scans
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto', borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : scans.length === 0 ? (
          <div className="empty-state">
            <Upload size={32} style={{ color: 'var(--text-light)' }} />
            <p>No scans yet. Upload a file to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  {['File', 'Department', 'Status', 'Score', 'Issues', 'Date', ''].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => {
                  const st = statusConfig[scan.status] || statusConfig.pending;
                  const fi = fileIcons[scan.file_type] || { icon: FileText, color: 'var(--text-light)', bg: 'var(--bg)' };
                  const StatusIcon = st.icon;
                  const FileIcon = fi.icon;
                  const scoreClass = scan.overall_score >= 80 ? 'score-high' : scan.overall_score >= 60 ? 'score-mid' : 'score-low';

                  return (
                    <tr key={scan.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 6, background: fi.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FileIcon size={16} color={fi.color} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {scan.filename}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{formatSize(scan.file_size)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {scan.department || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${st.badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <StatusIcon size={12} style={scan.status === 'scanning' ? { animation: 'spin 1s linear infinite' } : {}} />
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {scan.status === 'completed' ? (
                          <span className={scoreClass} style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500 }}>
                            {scan.overall_score}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {scan.status === 'completed' ? (scan.category_scores ? Object.keys(scan.category_scores).length : '—') : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-light)', fontSize: 12 }}>
                        {new Date(scan.created_at + 'Z').toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(scan.id)}
                          style={{ color: 'var(--text-light)' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
