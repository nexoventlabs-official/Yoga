import { useEffect, useState } from 'react';
import { Activity, Phone, Pause, Play, X as XIcon, Filter } from 'lucide-react';
import api from '../api';

const FLOW_LABELS = { w2: 'W2 Nurture', w4: 'W4 Pre-Arrival', w5: 'W5 Post-Course' };
const FLOW_COLORS = {
  w2: 'bg-orange-100 text-orange-700',
  w4: 'bg-cyan-100 text-cyan-700',
  w5: 'bg-red-100 text-red-700',
};
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-400',
};

export default function Sequences() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flowFilter, setFlowFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (flowFilter) params.flowType = flowFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/sequences', { params });
      setSequences(data.sequences);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [flowFilter, statusFilter]);

  const pause = async (id) => { await api.post(`/sequences/pause/${id}`); load(); };
  const resume = async (id) => { await api.post(`/sequences/resume/${id}`); load(); };
  const cancel = async (id) => { if (!confirm('Cancel this sequence?')) return; await api.post(`/sequences/cancel/${id}`); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Nurture Sequences</h1>
          <p className="text-sm text-gray-600">Active W2 / W4 / W5 timed message sequences per student.</p>
        </div>
        <div className="flex gap-2">
          <select className="input !py-1.5 !w-auto" value={flowFilter} onChange={(e) => setFlowFilter(e.target.value)}>
            <option value="">All Flows</option>
            <option value="w2">W2 Nurture</option>
            <option value="w4">W4 Pre-Arrival</option>
            <option value="w5">W5 Post-Course</option>
          </select>
          <select className="input !py-1.5 !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="">All Status</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : sequences.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <Activity className="mx-auto mb-3 text-gray-300" size={40} />
          No sequences found.
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((s) => (
            <div key={s._id} className="card p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Phone size={14} className="text-gray-400" />
                    <span className="font-medium">{s.phone}</span>
                    <span className={`pill ${FLOW_COLORS[s.flowType]}`}>{FLOW_LABELS[s.flowType]}</span>
                    <span className={`pill ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Started: {new Date(s.startDate).toLocaleDateString('en-IN')} ·
                    Days sent: {(s.completedDays || []).join(', ') || 'none'}
                    {s.meta?.programName && ` · ${s.meta.programName}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {s.status === 'active' && (
                    <button onClick={() => pause(s._id)} className="btn-secondary !py-1.5 !px-3 !text-xs" title="Pause">
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {s.status === 'paused' && (
                    <button onClick={() => resume(s._id)} className="btn-primary !py-1.5 !px-3 !text-xs" title="Resume">
                      <Play size={13} /> Resume
                    </button>
                  )}
                  {['active', 'paused'].includes(s.status) && (
                    <button onClick={() => cancel(s._id)} className="btn-danger !py-1.5 !px-3 !text-xs" title="Cancel">
                      <XIcon size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
