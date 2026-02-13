import { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, X, Save, Palette, Type, Shield, ImageIcon, MessageCircle, LayoutGrid, Upload, Loader, ChevronDown, FileText } from 'lucide-react';
import api from '../utils/api';

const CATEGORIES = [
  { id: 'color', label: 'Color Palette', icon: Palette, gradient: 'linear-gradient(135deg, #2B5CE6, #1A9A6B)' },
  { id: 'typography', label: 'Typography', icon: Type, gradient: '#1A1A1F' },
  { id: 'logo', label: 'Logo Usage', icon: Shield, gradient: 'var(--accent-light)', iconColor: 'var(--accent)' },
  { id: 'imagery', label: 'Imagery', icon: ImageIcon, gradient: 'var(--warning-bg)', iconColor: 'var(--warning)' },
  { id: 'voice', label: 'Voice & Tone', icon: MessageCircle, gradient: 'var(--success-bg)', iconColor: 'var(--success)' },
  { id: 'layout', label: 'Layout & Spacing', icon: LayoutGrid, gradient: 'var(--error-bg)', iconColor: 'var(--error)' },
];

function BrandKitUploadModal({ onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadBrandKit(file, name);
      onUploadComplete();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,26,31,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="card" style={{ width: 520, maxHeight: '80vh', overflow: 'auto', animation: 'fadeIn 0.2s ease' }}
        onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">Upload Brand Kit</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="input-label">Name (optional)</label>
            <input className="input" placeholder="e.g. Company Brand Guidelines 2025"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Brand Kit File</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12, padding: '32px 24px',
                textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--accent-light)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])} />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <FileText size={20} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={24} style={{ color: 'var(--text-light)', marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Drop a file here or click to browse
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                    PDF, PNG, JPG, WEBP
                  </div>
                </div>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-light)', margin: 0 }}>
            AI will extract brand rules from this document automatically.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <div className="spinner" /> : <Upload size={14} />}
              Upload & Extract
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewRuleSetModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createRuleSet({ name: name.trim(), description: description.trim() });
      onCreated();
    } catch (err) {
      alert('Failed to create rule set: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,26,31,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="card" style={{ width: 460, animation: 'fadeIn 0.2s ease' }}
        onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">New Rule Set</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="input-label">Name</label>
            <input className="input" placeholder="e.g. Social Media Rules"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Description (optional)</label>
            <input className="input" placeholder="Brief description..."
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving ? <div className="spinner" /> : <Plus size={14} />}
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuidelineModal({ guideline, onSave, onClose, ruleSetId }) {
  const [form, setForm] = useState({
    category: guideline?.category || 'color',
    title: guideline?.title || '',
    description: guideline?.description || '',
    rules: guideline?.rules?.join('\n') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        rules: form.rules.split('\n').filter(r => r.trim()),
        examples: [],
        rule_set_id: ruleSetId,
      };
      if (guideline?.id) {
        await api.updateGuideline(guideline.id, data);
      } else {
        await api.createGuideline(data);
      }
      onSave();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,26,31,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="card" style={{ width: 560, maxHeight: '80vh', overflow: 'auto', animation: 'fadeIn 0.2s ease' }}
        onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <span className="card-title">{guideline?.id ? 'Edit Guideline' : 'New Guideline'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="input-label">Category</label>
            <select className="input" value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Title</label>
            <input className="input" placeholder="e.g. Primary Color Palette"
              value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea className="input" rows={3} placeholder="Describe this guideline..."
              style={{ resize: 'vertical' }}
              value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Rules (one per line)</label>
            <textarea className="input" rows={6} placeholder="Primary Blue: #2B5CE6 — for CTAs&#10;Never use pure black (#000000)&#10;..."
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
              value={form.rules} onChange={e => setForm(prev => ({ ...prev, rules: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <div className="spinner" /> : <Save size={14} />}
              {guideline?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuidelinesPage() {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingGuideline, setEditingGuideline] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewRuleSetModal, setShowNewRuleSetModal] = useState(false);

  // Rule sets
  const [ruleSets, setRuleSets] = useState([]);
  const [activeRuleSetId, setActiveRuleSetId] = useState(null);

  const loadRuleSets = async () => {
    try {
      const data = await api.getRuleSets();
      setRuleSets(data);
      const active = data.find(rs => rs.is_active);
      if (active && !activeRuleSetId) {
        setActiveRuleSetId(active.id);
      }
    } catch (err) {
      console.error('Failed to load rule sets:', err);
    }
  };

  const loadGuidelines = async () => {
    try {
      const data = await api.getGuidelines(selectedCategory, activeRuleSetId);
      setGuidelines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRuleSets(); }, []);
  useEffect(() => { if (activeRuleSetId) loadGuidelines(); }, [selectedCategory, activeRuleSetId]);

  // Poll while any rule set is processing
  useEffect(() => {
    const hasProcessing = ruleSets.some(rs => rs.status === 'processing');
    if (hasProcessing) {
      const interval = setInterval(() => {
        loadRuleSets();
        if (activeRuleSetId) loadGuidelines();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [ruleSets, activeRuleSetId]);

  const handleActivate = async (id) => {
    try {
      await api.activateRuleSet(id);
      setActiveRuleSetId(id);
      setLoading(true);
      await loadRuleSets();
    } catch (err) {
      alert('Failed to activate: ' + err.message);
    }
  };

  const handleDeleteRuleSet = async (id) => {
    const rs = ruleSets.find(r => r.id === id);
    if (!confirm(`Delete rule set "${rs?.name}" and all its guidelines?`)) return;
    try {
      await api.deleteRuleSet(id);
      await loadRuleSets();
      // If we deleted the active one, switch to first available
      if (id === activeRuleSetId) {
        const remaining = ruleSets.filter(r => r.id !== id);
        if (remaining.length > 0) {
          await handleActivate(remaining[0].id);
        } else {
          setActiveRuleSetId(null);
          setGuidelines([]);
        }
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this guideline?')) return;
    try {
      await api.deleteGuideline(id);
      loadGuidelines();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const categoryCounts = {};
  guidelines.forEach(g => {
    categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
  });

  const selectedRuleSet = ruleSets.find(rs => rs.id === activeRuleSetId);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>Brand Guidelines</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Define the rules your assets will be checked against
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingGuideline(null); setShowModal(true); }}>
          <Plus size={16} /> Add Guideline
        </button>
      </div>

      {/* Rule Set Selector */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="input-label" style={{ marginBottom: 6, display: 'block' }}>Active Rule Set</label>
              <select
                className="input"
                value={activeRuleSetId || ''}
                onChange={e => handleActivate(parseInt(e.target.value))}
                style={{ width: '100%' }}
              >
                {ruleSets.map(rs => (
                  <option key={rs.id} value={rs.id} disabled={rs.status !== 'ready'}>
                    {rs.name}
                    {rs.source_type === 'upload' ? ' (uploaded)' : ''}
                    {rs.status === 'processing' ? ' — extracting...' : ''}
                    {rs.status === 'failed' ? ' — failed' : ''}
                    {rs.status === 'ready' ? ` (${rs.guideline_count} rules)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
              <Upload size={14} /> Upload Brand Kit
            </button>
            <button className="btn btn-secondary" onClick={() => setShowNewRuleSetModal(true)}>
              <Plus size={14} /> New Rule Set
            </button>
            {ruleSets.length > 1 && selectedRuleSet && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--error)' }}
                onClick={() => handleDeleteRuleSet(activeRuleSetId)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Processing indicator */}
          {selectedRuleSet?.status === 'processing' && (
            <div style={{
              marginTop: 12, padding: '10px 14px', background: 'var(--warning-bg)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: 'var(--warning)',
            }}>
              <Loader size={14} style={{ animation: 'spin 0.6s linear infinite' }} />
              AI is extracting rules from your brand kit... This may take a minute.
            </div>
          )}

          {selectedRuleSet?.status === 'failed' && (
            <div style={{
              marginTop: 12, padding: '10px 14px', background: 'var(--error-bg)',
              borderRadius: 8, fontSize: 13, color: 'var(--error)',
            }}>
              Extraction failed: {selectedRuleSet.error_message || 'Unknown error'}
            </div>
          )}

          {/* Source info for uploaded rule sets */}
          {selectedRuleSet?.source_type === 'upload' && selectedRuleSet?.status === 'ready' && (
            <div style={{
              marginTop: 12, padding: '8px 14px', background: 'var(--bg)',
              borderRadius: 8, fontSize: 12, color: 'var(--text-light)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FileText size={12} />
              Extracted from: {selectedRuleSet.source_filename}
            </div>
          )}
        </div>
      </div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border-light)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;
          return (
            <div key={cat.id}
              onClick={() => setSelectedCategory(isActive ? null : cat.id)}
              style={{
                padding: '20px 22px', background: isActive ? 'var(--accent-light)' : 'var(--bg-card)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-card)'; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: cat.gradient, marginBottom: 12,
              }}>
                <Icon size={18} color={cat.iconColor || 'white'} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                {count} {count === 1 ? 'guideline' : 'guidelines'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guidelines List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedCategory
              ? CATEGORIES.find(c => c.id === selectedCategory)?.label
              : 'All Guidelines'
            }
            {selectedRuleSet && (
              <span className="badge" style={{
                background: selectedRuleSet.source_type === 'upload' ? 'var(--warning-bg)' : 'var(--accent-light)',
                color: selectedRuleSet.source_type === 'upload' ? 'var(--warning)' : 'var(--accent)',
                fontSize: 10,
              }}>
                {selectedRuleSet.source_type === 'upload' ? 'AI Extracted' : 'Manual'}
              </span>
            )}
          </span>
          {selectedCategory && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCategory(null)}>
              Show all
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto', borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : guidelines.length === 0 ? (
          <div className="empty-state">
            <p>
              {selectedRuleSet?.status === 'processing'
                ? 'Rules are being extracted from your brand kit...'
                : 'No guidelines defined yet. Add your first guideline to start scanning.'
              }
            </p>
          </div>
        ) : (
          <div>
            {guidelines.map(g => (
              <div key={g.id} style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{g.title}</span>
                      <span className="badge" style={{
                        background: 'var(--bg)', color: 'var(--text-secondary)',
                        textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.3,
                      }}>{g.category}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {g.description}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingGuideline(g); setShowModal(true); }}>
                      <Edit3 size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(g.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Rules */}
                {g.rules && g.rules.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      Rules ({g.rules.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {g.rules.map((rule, i) => (
                        <div key={i} style={{
                          fontSize: 12, color: 'var(--text-secondary)', padding: '6px 10px',
                          background: 'var(--bg)', borderRadius: 6, lineHeight: 1.5,
                        }}>
                          {rule}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <GuidelineModal
          guideline={editingGuideline}
          ruleSetId={activeRuleSetId}
          onSave={() => { setShowModal(false); loadGuidelines(); }}
          onClose={() => setShowModal(false)}
        />
      )}

      {showUploadModal && (
        <BrandKitUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => { setShowUploadModal(false); loadRuleSets(); }}
        />
      )}

      {showNewRuleSetModal && (
        <NewRuleSetModal
          onClose={() => setShowNewRuleSetModal(false)}
          onCreated={() => { setShowNewRuleSetModal(false); loadRuleSets(); }}
        />
      )}
    </div>
  );
}
