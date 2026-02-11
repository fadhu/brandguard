import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, X, Save, Palette, Type, Shield, ImageIcon, MessageCircle, LayoutGrid } from 'lucide-react';
import api from '../utils/api';

const CATEGORIES = [
  { id: 'color', label: 'Color Palette', icon: Palette, gradient: 'linear-gradient(135deg, #2B5CE6, #1A9A6B)' },
  { id: 'typography', label: 'Typography', icon: Type, gradient: '#1A1A1F' },
  { id: 'logo', label: 'Logo Usage', icon: Shield, gradient: 'var(--accent-light)', iconColor: 'var(--accent)' },
  { id: 'imagery', label: 'Imagery', icon: ImageIcon, gradient: 'var(--warning-bg)', iconColor: 'var(--warning)' },
  { id: 'voice', label: 'Voice & Tone', icon: MessageCircle, gradient: 'var(--success-bg)', iconColor: 'var(--success)' },
  { id: 'layout', label: 'Layout & Spacing', icon: LayoutGrid, gradient: 'var(--error-bg)', iconColor: 'var(--error)' },
];

function GuidelineModal({ guideline, onSave, onClose }) {
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

  const loadGuidelines = async () => {
    try {
      const data = await api.getGuidelines(selectedCategory);
      setGuidelines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGuidelines(); }, [selectedCategory]);

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
          <span className="card-title">
            {selectedCategory
              ? CATEGORIES.find(c => c.id === selectedCategory)?.label
              : 'All Guidelines'
            }
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
            <p>No guidelines defined yet. Add your first guideline to start scanning.</p>
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

      {/* Modal */}
      {showModal && (
        <GuidelineModal
          guideline={editingGuideline}
          onSave={() => { setShowModal(false); loadGuidelines(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
