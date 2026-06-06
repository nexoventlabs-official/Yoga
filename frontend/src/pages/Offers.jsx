import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import api from '../api';

const blank = { name: '', description: '', depositAmount: '', balanceAmount: '', balanceDueDays: 30, active: true };

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/offers'); setOffers(data.offers); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(blank); setEditingId(null); setShowForm(true); };
  const openEdit = (o) => {
    setForm({ name: o.name, description: o.description || '', depositAmount: o.depositAmount, balanceAmount: o.balanceAmount, balanceDueDays: o.balanceDueDays, active: o.active });
    setEditingId(o._id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('Name required');
    setSaving(true);
    try {
      if (editingId) await api.put(`/offers/${editingId}`, form);
      else await api.post('/offers', form);
      setShowForm(false);
      await load();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this offer?')) return;
    await api.delete(`/offers/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Payment Offers</h1>
          <p className="text-sm text-gray-600">Payment plan offers shown on W2 Day 25 to undecided leads.</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Offer</button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : offers.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <Tag className="mx-auto mb-3 text-gray-300" size={40} />
          No offers yet.
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o._id} className="card p-4 flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{o.name}</div>
                  <span className={`pill ${o.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{o.active ? 'Active' : 'Inactive'}</span>
                </div>
                {o.description && <p className="text-sm text-gray-600 mt-1">{o.description}</p>}
                <div className="text-xs text-gray-500 mt-1">
                  Deposit: ₹{(o.depositAmount || 0).toLocaleString('en-IN')} · Balance: ₹{(o.balanceAmount || 0).toLocaleString('en-IN')} due {o.balanceDueDays} days before course
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(o)} className="btn-secondary !py-1.5 !px-3 !text-xs"><Pencil size={13} /></button>
                <button onClick={() => remove(o._id)} className="btn-danger !py-1.5 !px-3 !text-xs"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-brand-800">{editingId ? 'Edit Offer' : 'New Offer'}</div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Offer Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 3-Installment Plan" required />
              </div>
              <div>
                <label className="label">Description (shown in WhatsApp message)</label>
                <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Pay ₹15,000 now, balance 30 days before course" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Deposit Amount (₹)</label>
                  <input type="number" className="input" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Balance Amount (₹)</label>
                  <input type="number" className="input" value={form.balanceAmount} onChange={(e) => setForm({ ...form, balanceAmount: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Balance due (days before course start)</label>
                <input type="number" className="input" value={form.balanceDueDays} onChange={(e) => setForm({ ...form, balanceDueDays: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active (shown in W2 Day 25 message)
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
