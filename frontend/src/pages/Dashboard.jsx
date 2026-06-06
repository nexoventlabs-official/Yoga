import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, Users, Calendar, MessageSquare,
  AlertCircle, Phone, CreditCard, Activity,
} from 'lucide-react';
import api from '../api';

const cards = [
  { key: 'confirmedBookings', label: 'Confirmed Bookings', icon: CreditCard, to: '/bookings', color: 'bg-brand-100 text-brand-700' },
  { key: 'registeredUsers', label: 'Registered Users', icon: UserCheck, to: '/registered', color: 'bg-blue-100 text-blue-700' },
  { key: 'nonRegisteredUsers', label: 'Non-Registered', icon: Users, to: '/non-registered', color: 'bg-amber-100 text-amber-700' },
  { key: 'w2Active', label: 'In W2 Nurture', icon: Activity, to: '/sequences', color: 'bg-orange-100 text-orange-700' },
  { key: 'events', label: 'Active Events', icon: Calendar, to: '/events', color: 'bg-saffron-500/20 text-saffron-600' },
  { key: 'enquiries', label: 'Total Enquiries', icon: MessageSquare, to: '/enquiries', color: 'bg-rose-100 text-rose-700' },
];

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, recentUsers: [], recentEnquiries: [], recentBookings: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
        <p className="text-sm text-gray-600">Overview of your WhatsApp flow &amp; booking activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(({ key, label, icon: Icon, to, color }) => (
          <Link key={key} to={to} className="card p-4 hover:shadow-md transition">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-2`}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold text-brand-900">
              {loading ? '…' : (data.stats[key] ?? 0)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</div>
          </Link>
        ))}
      </div>

      {/* New enquiries alert */}
      {(data.stats.newEnquiries ?? 0) > 0 && (
        <div className="card p-4 flex items-center gap-3 border-amber-300 bg-amber-50">
          <AlertCircle className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-amber-900">
              {data.stats.newEnquiries} new enquir{data.stats.newEnquiries === 1 ? 'y' : 'ies'} awaiting response
            </div>
            <div className="text-xs text-amber-700">Open the Enquiries page to follow up.</div>
          </div>
          <Link to="/enquiries" className="btn-primary !py-1.5 !px-3 !text-xs">View</Link>
        </div>
      )}

      {/* Recent data panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Bookings */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-brand-800 flex items-center justify-between">
            Recent Bookings
            <Link to="/bookings" className="text-xs text-brand-600 font-normal hover:underline">View all</Link>
          </div>
          {!data.recentBookings?.length ? (
            <div className="p-6 text-sm text-gray-500 text-center">No bookings yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentBookings.map((b) => (
                <li key={b._id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate">{b.name || b.phone}</div>
                    <span className="pill bg-green-100 text-green-700 text-xs shrink-0">
                      ₹{(b.amountPaid || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {b.programName || b.programId?.name || '—'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Registrations */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-brand-800 flex items-center justify-between">
            Recent Registrations
            <Link to="/registered" className="text-xs text-brand-600 font-normal hover:underline">View all</Link>
          </div>
          {!data.recentUsers?.length ? (
            <div className="p-6 text-sm text-gray-500 text-center">No registrations yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentUsers.map((u) => (
                <li key={u._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium text-sm shrink-0">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{u.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={11} /> {u.phone}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Enquiries */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-brand-800 flex items-center justify-between">
            Recent Enquiries
            <Link to="/enquiries" className="text-xs text-brand-600 font-normal hover:underline">View all</Link>
          </div>
          {!data.recentEnquiries?.length ? (
            <div className="p-6 text-sm text-gray-500 text-center">No enquiries yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentEnquiries.map((e) => (
                <li key={e._id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{e.name}</div>
                    <span className={`pill text-xs shrink-0 ${
                      e.status === 'new'
                        ? 'bg-amber-100 text-amber-700'
                        : e.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {e.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{e.phone}</div>
                  <div className="text-sm text-gray-700 mt-1 line-clamp-1">{e.enquiry}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
