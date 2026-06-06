import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Layers } from 'lucide-react';
import api from '../api';

const TYPE_COLORS = {
  ttc: 'bg-blue-100 text-blue-700',
  practice: 'bg-green-100 text-green-700',
  retreat: 'bg-amber-100 text-amber-700',
};

const blank = { programId: '', name: '', startDate: '', endDate: '', sessionTiming: '', spotsTotal: 20, price: '', earlyBirdPrice: '', earlyBirdDeadline: '', active: true };

function toDateInput(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.get('/batches', { params: filterType ? { type: filterType } : {} }),
        api.get('/programs'),
      ]);
      setBatches(bRes.data.batches);
      setPrograms(pRes.data.programs);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType]);

  const openCreate = () => { setForm(blank); setEditingId(null); setShowForm(true); };
  const openEdit = (b) => {
    setForm({ programId: b.programId?._id || b.programId || '', name: b.name, startDate: toDateInput(b.startDate), endDate: toDateInput(b.endDate), sessionTiming: b.sessionTiming || '', spotsTotal: b.spotsTotal, price: b.price || '', earlyBirdPrice: b.earlyBirdPrice || '', earlyBirdDeadline: toDateInput(b.earlyBirdDeadline), active: b.active });
    setEditingId(b._id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.programId || !form.name || !form.startDate || !form.endDate) return alert('Program, name, start & end dates are required');
    setSaving(true);
    try {
      const payload = { ...form, spotsTotal: Number(form.spotsTotal) || 20, price: Number(form.price) || 0, earlyBirdPrice: Number(form.earlyBirdPrice) || 0 };
      if (editingId) await api.put(`/batches/${editingId}`, payload);
      else await api.post('/batches', payload);
      setShowForm(false);
      await load();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this batch?')) return;
    await api.delete(`/batches/${id}`);
    load();
  };

  const programsByType = (type) => programs.filter((p) => p.type === type && p.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Batches & Sessions</h1>
          <p className="text-sm text-gray-600">Schedule batches for TTC courses, practice sessions & retreat dates.</p>
        </div>
        <div className="flex gap-2">
          <select className="input !py-1.5 !w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="ttc">TTC</option>
            <option value="practice">Practice</option>
            <option value="retreat">Retreat</option>
          </select>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Batch</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : batches.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <Layers className="mx-auto mb-3 text-gray-300" size={40} />
          No batches yet. Click <strong>New Batch</strong> to schedule one.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Batch Name</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-left">Dates / Timing</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Spots</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((b) => {
                  const spotsLeft = Math.max(0, b.spotsTotal - b.spotsBooked);
                  return (
                    <tr key={b._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3">
                        <span className={`pill ${TYPE_COLORS[b.programType] || 'bg-gray-100 text-gray-600'}`}>
                          {b.programId?.name || b.programType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(b.startDate).toLocaleDateString('en-IN')} – {new Date(b.endDate).toLocaleDateString('en-IN')}
                        {b.sessionTiming && <div className="text-gray-400">{b.sessionTiming}</div>}
                      </td>
                      <td className="px-4 py-3">₹{(b.price || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={spotsLeft === 0 ? 'text-red-600 font-semibold' : spotsLeft <= 3 ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                          {spotsLeft}/{b.spotsTotal}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`pill ${b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {b.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex gap-2 justify-end">
                        <button onClick={() => openEdit(b)} className="btn-secondary !py-1 !px-2 !text-xs"><Pencil size={13} /></button>
                        <button onClick={() => remove(b._id)} className="btn-danger !py-1 !px-2 !text-xs"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-brand-800">{editingId ? 'Edit Batch' : 'New Batch'}</div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Program *</label>
                <select className="input" value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })} required>
                  <option value="">Select a program</option>
                  {['ttc', 'practice', 'retreat'].map((t) => {
                    const progs = programsByType(t);
                    if (!progs.length) return null;
                    return (
                      <optgroup key={t} label={t === 'ttc' ? '🎓 TTC' : t === 'practice' ? '🧘 Practice' : '🏕️ Retreat'}>
                        {progs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="label">Batch Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 200hr TTC — Nov 2026" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date *</label>
                  <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Session Timing (for practice sessions)</label>
                <input className="input" value={form.sessionTiming} onChange={(e) => setForm({ ...form, sessionTiming: e.target.value })} placeholder="e.g. 6:00am – 7:30am" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (₹)</label>
                  <input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Overrides program price" />
                </div>
                <div>
                  <label className="label">Total Spots</label>
                  <input type="number" className="input" value={form.spotsTotal} onChange={(e) => setForm({ ...form, spotsTotal: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Early Bird Price (₹)</label>
                  <input type="number" className="input" value={form.earlyBirdPrice} onChange={(e) => setForm({ ...form, earlyBirdPrice: e.target.value })} />
                </div>
                <div>
                  <label className="label">Early Bird Deadline</label>
                  <input type="date" className="input" value={form.earlyBirdDeadline} onChange={(e) => setForm({ ...form, earlyBirdDeadline: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Show this batch in the WhatsApp flow
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
