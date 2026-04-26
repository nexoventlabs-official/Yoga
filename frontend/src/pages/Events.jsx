import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Calendar, X, Image as ImageIcon } from 'lucide-react';
import api from '../api';

const blank = { title: '', description: '', fromDate: '', toDate: '', active: true, imageFile: null, image: '' };

function toLocalDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events');
      setEvents(data.events);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(blank);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setForm({
      title: ev.title,
      description: ev.description || '',
      fromDate: toLocalDateInput(ev.fromDate),
      toDate: toLocalDateInput(ev.toDate),
      active: ev.active,
      image: ev.image || '',
      imageFile: null,
    });
    setEditingId(ev._id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.fromDate || !form.toDate) {
      alert('Title, From Date and To Date are required.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('fromDate', form.fromDate);
      fd.append('toDate', form.toDate);
      fd.append('active', String(form.active));
      if (form.imageFile) fd.append('image', form.imageFile);

      if (editingId) {
        await api.put(`/events/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/events/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Events</h1>
          <p className="text-sm text-gray-600">{events.length} total — shown dynamically in the WhatsApp flow.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> New Event
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : events.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <Calendar className="mx-auto mb-3 text-gray-300" size={40} />
          No events yet. Click <strong>New Event</strong> to create one.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <div key={ev._id} className="card overflow-hidden flex flex-col">
              <div className="aspect-video bg-gray-100 relative">
                {ev.image ? (
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon size={32} />
                  </div>
                )}
                <span
                  className={`absolute top-2 left-2 pill ${
                    ev.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {ev.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-semibold text-brand-900">{ev.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(ev.fromDate).toLocaleDateString()} – {new Date(ev.toDate).toLocaleDateString()}
                </div>
                {ev.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3">{ev.description}</p>
                )}
                <div className="mt-auto pt-3 flex gap-2">
                  <button onClick={() => openEdit(ev)} className="btn-secondary flex-1 !py-1.5">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => remove(ev._id)} className="btn-danger !py-1.5">
                    <Trash2 size={14} />
                  </button>
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
              <div className="font-semibold text-brand-800">
                {editingId ? 'Edit Event' : 'New Event'}
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.fromDate}
                    onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">To Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.toDate}
                    onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  rows={4}
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Event Image</label>
                {form.image && !form.imageFile && (
                  <img src={form.image} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
                />
                <p className="text-xs text-gray-500 mt-1">Recommended ratio 16:9. Used as the event card icon in WhatsApp.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Show this event in the WhatsApp flow
              </label>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
