import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, BookOpen, ExternalLink } from 'lucide-react';
import api from '../api';

const TYPE_LABELS = { ttc: '🎓 Teacher Training', practice: '🧘 Practice', retreat: '🏕️ Retreat' };
const TYPE_COLORS = {
  ttc: 'bg-blue-100 text-blue-700',
  practice: 'bg-green-100 text-green-700',
  retreat: 'bg-amber-100 text-amber-700',
};

const blank = {
  type: 'ttc', name: '', description: '', price: '', durationDays: '',
  sortOrder: 0, active: true, logoFile: null, brochureFile: null,
  logoUrl: '', brochurePdfUrl: '',
};

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/programs', { params: filter ? { type: filter } : {} });
      setPrograms(data.programs);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const openCreate = () => { setForm(blank); setEditingId(null); setShowForm(true); };
  const openEdit = (p) => {
    setForm({ type: p.type, name: p.name, description: p.description || '', price: p.price || '', durationDays: p.durationDays || '', sortOrder: p.sortOrder || 0, active: p.active, logoFile: null, brochureFile: null, logoUrl: p.logoUrl || '', brochurePdfUrl: p.brochurePdfUrl || '' });
    setEditingId(p._id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Name is required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price', form.price);
      fd.append('durationDays', form.durationDays);
      fd.append('sortOrder', form.sortOrder);
      fd.append('active', String(form.active));
      if (form.logoFile) fd.append('logo', form.logoFile);
      if (form.brochureFile) fd.append('brochure', form.brochureFile);

      if (editingId) await api.put(`/programs/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/programs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setShowForm(false);
      await load();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this program? This cannot be undone.')) return;
    await api.delete(`/programs/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Programs</h1>
          <p className="text-sm text-gray-600">TTC courses, practice programs & retreats shown in the WhatsApp flow.</p>
        </div>
        <div className="flex gap-2">
          <select className="input !py-1.5 !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="ttc">TTC</option>
            <option value="practice">Practice</option>
            <option value="retreat">Retreat</option>
          </select>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Program</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : programs.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <BookOpen className="mx-auto mb-3 text-gray-300" size={40} />
          No programs yet. Click <strong>New Program</strong> to add one.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <div key={p._id} className="card overflow-hidden flex flex-col">
              <div className="aspect-square bg-gray-100 relative">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">
                    {p.type === 'ttc' ? '🎓' : p.type === 'practice' ? '🧘' : '🏕️'}
                  </div>
                )}
                <span className={`absolute top-2 left-2 pill ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {p.active ? 'Active' : 'Inactive'}
                </span>
                <span className={`absolute top-2 right-2 pill ${TYPE_COLORS[p.type]}`}>
                  {TYPE_LABELS[p.type]}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-semibold text-brand-900">{p.name}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {p.durationDays ? `${p.durationDays} days · ` : ''}
                  {p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : 'Price TBD'}
                </div>
                {p.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>}
                {p.brochurePdfUrl && (
                  <a href={p.brochurePdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline mt-2">
                    <ExternalLink size={12} /> View Brochure
                  </a>
                )}
                <div className="mt-auto pt-3 flex gap-2">
                  <button onClick={() => openEdit(p)} className="btn-secondary flex-1 !py-1.5"><Pencil size={14} /> Edit</button>
                  <button onClick={() => remove(p._id)} className="btn-danger !py-1.5"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-brand-800">{editingId ? 'Edit Program' : 'New Program'}</div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Type *</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="ttc">🎓 Become a Teacher (TTC)</option>
                  <option value="practice">🧘 Deepen Practice</option>
                  <option value="retreat">🏕️ Retreat / Short Program</option>
                </select>
              </div>
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 200hr Yoga Teacher Training" required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description shown in the flow" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (₹) *</label>
                  <input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="45000" />
                </div>
                <div>
                  <label className="label">Duration (days)</label>
                  <input type="number" className="input" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder="28" />
                </div>
              </div>
              <div>
                <label className="label">Logo Image (1:1 — shown in WhatsApp flow list)</label>
                {form.logoUrl && !form.logoFile && (
                  <img src={form.logoUrl} alt="" className="w-16 h-16 object-cover rounded-lg mb-2" />
                )}
                <input type="file" accept="image/*" className="input" onChange={(e) => setForm({ ...form, logoFile: e.target.files?.[0] || null })} />
                <p className="text-xs text-gray-500 mt-1">Square image recommended (200×200). Shown next to program name in WhatsApp.</p>
              </div>
              <div>
                <label className="label">Brochure PDF (sent to student after selection)</label>
                {form.brochurePdfUrl && !form.brochureFile && (
                  <a href={form.brochurePdfUrl} target="_blank" rel="noreferrer" className="block text-xs text-brand-700 hover:underline mb-1">Current brochure ↗</a>
                )}
                <input type="file" accept="application/pdf" className="input" onChange={(e) => setForm({ ...form, brochureFile: e.target.files?.[0] || null })} />
              </div>
              <div>
                <label className="label">Sort Order</label>
                <input type="number" className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Show this program in the WhatsApp flow
              </label>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
