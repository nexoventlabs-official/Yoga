import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Radio, Send } from 'lucide-react';
import api from '../api';

const TRIGGER_LABELS = {
  season_opening: '🎃 Season Opening',
  batch_launch: '🚀 New Batch Launch',
  new_year: '🏔️ New Year Retreat',
  milestone: '🎓 Batch Milestone',
  manual: '✋ Manual',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const blank = {
  name: '', triggerType: 'manual', scheduledAt: '', bodyText: '',
  footerText: 'Himalayan Yoga Academy', ctaLabel: 'Choose Service',
  headerType: 'text', headerUrl: '', language: 'EN',
  segments: ['all'], headerImageFile: null,
};

export default function Broadcasts() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/broadcasts'); setCampaigns(data.campaigns); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(blank); setEditingId(null); setShowForm(true); };
  const openEdit = (c) => {
    setForm({ name: c.name, triggerType: c.triggerType, scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : '', bodyText: c.bodyText, footerText: c.footerText, ctaLabel: c.ctaLabel, headerType: c.headerType, headerUrl: c.headerUrl, language: c.language, segments: c.segments || ['all'], headerImageFile: null });
    setEditingId(c._id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.bodyText) return alert('Name and body text required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'headerImageFile' || k === 'segments') return;
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      form.segments.forEach((s) => fd.append('segments', s));
      if (form.headerImageFile) fd.append('headerImage', form.headerImageFile);

      if (editingId) await api.put(`/broadcasts/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/broadcasts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setShowForm(false);
      await load();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const send = async (id) => {
    if (!confirm('Send this broadcast to all selected segments now?')) return;
    try {
      await api.post(`/broadcasts/${id}/send`);
      alert('Broadcast started! It will send in the background.');
      load();
    } catch (err) { alert(err.response?.data?.error || err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await api.delete(`/broadcasts/${id}`);
    load();
  };

  const toggleSegment = (seg) => {
    const segs = form.segments.includes(seg)
      ? form.segments.filter((s) => s !== seg)
      : [...form.segments, seg];
    setForm({ ...form, segments: segs });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Broadcast Campaigns (W6)</h1>
          <p className="text-sm text-gray-600">Send WhatsApp broadcasts to cold leads, warm leads & alumni.</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Campaign</button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <Radio className="mx-auto mb-3 text-gray-300" size={40} />
          No campaigns yet.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c._id} className="card p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">{c.name}</div>
                    <span className={`pill ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                    <span className="pill bg-gray-100 text-gray-600">{TRIGGER_LABELS[c.triggerType]}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Segments: {(c.segments || []).join(', ')} ·
                    {c.sentCount > 0 ? ` Sent: ${c.sentCount}` : ''}{c.failCount > 0 ? ` Failed: ${c.failCount}` : ''}
                    {c.sentAt ? ` on ${new Date(c.sentAt).toLocaleDateString('en-IN')}` : ''}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{c.bodyText}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {c.status !== 'sent' && c.status !== 'sending' && (
                    <>
                      <button onClick={() => openEdit(c)} className="btn-secondary !py-1.5 !px-3 !text-xs"><Pencil size={13} /></button>
                      <button onClick={() => send(c._id)} className="btn-primary !py-1.5 !px-3 !text-xs"><Send size={13} /> Send</button>
                    </>
                  )}
                  <button onClick={() => remove(c._id)} className="btn-danger !py-1.5 !px-3 !text-xs"><Trash2 size={13} /></button>
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
              <div className="font-semibold text-brand-800">{editingId ? 'Edit Campaign' : 'New Campaign'}</div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Campaign Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Trigger Type</label>
                <select className="input" value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value })}>
                  {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Target Segments</label>
                <div className="flex flex-wrap gap-2">
                  {['cold', 'warm', 'alumni', 'all'].map((seg) => (
                    <label key={seg} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.segments.includes(seg)} onChange={() => toggleSegment(seg)} />
                      {seg}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Body Text *</label>
                <textarea rows={4} className="input" value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} placeholder="Message body shown in WhatsApp" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">CTA Button Label</label>
                  <input className="input" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    {['EN', 'HI', 'DE', 'ES', 'FR', 'JP'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Header Image (optional)</label>
                <input type="file" accept="image/*" className="input" onChange={(e) => setForm({ ...form, headerImageFile: e.target.files?.[0] || null })} />
              </div>
              <div>
                <label className="label">Schedule At (optional)</label>
                <input type="datetime-local" className="input" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
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
