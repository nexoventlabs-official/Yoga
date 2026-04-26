import { useEffect, useState } from 'react';
import { Phone, Trash2, Filter } from 'lucide-react';
import api from '../api';

const STATUSES = ['new', 'in_progress', 'resolved'];
const STATUS_COLORS = {
  new: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function Enquiries() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/enquiries', { params: filter ? { status: filter } : {} });
      setItems(data.enquiries);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateStatus = async (id, status) => {
    await api.patch(`/enquiries/${id}`, { status });
    load();
  };

  const updateNotes = async (id, notes) => {
    await api.patch(`/enquiries/${id}`, { notes });
  };

  const remove = async (id) => {
    if (!confirm('Delete this enquiry?')) return;
    await api.delete(`/enquiries/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Enquiries</h1>
          <p className="text-sm text-gray-600">{items.length} {filter || 'total'} — submitted via WhatsApp.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select className="input !py-1.5 !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">No enquiries.</div>
      ) : (
        <div className="space-y-3">
          {items.map((e) => (
            <div key={e._id} className="card p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-brand-900">{e.name}</div>
                    <span className={`pill ${STATUS_COLORS[e.status]}`}>{e.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Phone size={12} /> {e.phone}
                  </div>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{e.enquiry}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="input !py-1.5 !w-auto"
                    value={e.status}
                    onChange={(ev) => updateStatus(e._id, ev.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <button onClick={() => remove(e._id)} className="text-red-600 hover:bg-red-50 p-2 rounded-md">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="Internal notes…"
                defaultValue={e.notes || ''}
                onBlur={(ev) => updateNotes(e._id, ev.target.value)}
                className="input mt-3 text-sm"
              />
              <div className="text-xs text-gray-400 mt-2">
                Received {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
