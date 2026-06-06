import { useEffect, useState } from 'react';
import { CreditCard, Phone, Filter } from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
};

const FLOW_COLORS = {
  w1: 'bg-gray-100 text-gray-600',
  w2: 'bg-orange-100 text-orange-700',
  w3: 'bg-blue-100 text-blue-700',
  w4: 'bg-cyan-100 text-cyan-700',
  w5: 'bg-red-100 text-red-700',
  alumni: 'bg-green-100 text-green-700',
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bookings', { params: statusFilter ? { status: statusFilter } : {} });
      setBookings(data.bookings);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Bookings</h1>
          <p className="text-sm text-gray-600">{bookings.length} total booking records.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select className="input !py-1.5 !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <CreditCard className="mx-auto mb-3 text-gray-300" size={40} />
          No bookings yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Booking Ref</th>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Flow Stage</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{b.bookingRef || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.name || '—'}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} />{b.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{b.programName || b.programId?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{b.batchName || ''}</div>
                    </td>
                    <td className="px-4 py-3">₹{(b.amountPaid || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`pill ${STATUS_COLORS[b.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${FLOW_COLORS[b.currentFlow] || 'bg-gray-100 text-gray-600'}`}>
                        {b.currentFlow?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
