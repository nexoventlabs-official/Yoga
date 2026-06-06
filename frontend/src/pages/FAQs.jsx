import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, HelpCircle } from 'lucide-react';
import api from '../api';

const blank = { question: '', answer: '', language: 'EN', sortOrder: 0, active: true };

export default function FAQs() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState('EN');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/faqs', { params: { language: langFilter } }); setFaqs(data.faqs); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [langFilter]);

  const openCreate = () => { setForm({ ...blank, language: langFilter }); setEditingId(null); setShowForm(true); };
  const openEdit = (f) => {
    setForm({ question: f.question, answer: f.answer, language: f.language, sortOrder: f.sortOrder, active: f.active });
    setEditingId(f._id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.question || !form.answer) return alert('Question and answer required');
    setSaving(true);
    try {
      if (editingId) await api.put(`/faqs/${editingId}`, form);
      else await api.post('/faqs', form);
      setShowForm(false);
      await load();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this FAQ?')) return;
    await api.delete(`/faqs/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">FAQ Content</h1>
          <p className="text-sm text-gray-600">FAQ items shown in the W2 Day 12 WhatsApp message.</p>
        </div>
        <div className="flex gap-2">
          <select className="input !py-1.5 !w-auto" value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
            {['EN', 'HI', 'DE', 'ES', 'FR', 'JP'].map((l) => <option key={l}>{l}</option>)}
          </select>
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New FAQ</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : faqs.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <HelpCircle className="mx-auto mb-3 text-gray-300" size={40} />
          No FAQs yet for {langFilter}.
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f._id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-brand-900">{f.question}</div>
                    <span className={`pill ${f.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{f.active ? 'Active' : 'Off'}</span>
                    <span className="pill bg-blue-100 text-blue-700">{f.language}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{f.answer}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(f)} className="btn-secondary !py-1.5 !px-3 !text-xs"><Pencil size={13} /></button>
                  <button onClick={() => remove(f._id)} className="btn-danger !py-1.5 !px-3 !text-xs"><Trash2 size={13} /></button>
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
              <div className="font-semibold text-brand-800">{editingId ? 'Edit FAQ' : 'New FAQ'}</div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Question *</label>
                <input className="input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="e.g. Is it safe for beginners?" required />
              </div>
              <div>
                <label className="label">Answer *</label>
                <textarea rows={4} className="input" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    {['EN', 'HI', 'DE', 'ES', 'FR', 'JP'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Sort Order</label>
                  <input type="number" className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active
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
