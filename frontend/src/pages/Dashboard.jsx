import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  Users,
  Calendar,
  MessageSquare,
  AlertCircle,
  Phone,
} from 'lucide-react';
import api from '../api';

const cards = [
  { key: 'registeredUsers', label: 'Registered Users', icon: UserCheck, to: '/registered', color: 'bg-brand-100 text-brand-700' },
  { key: 'nonRegisteredUsers', label: 'Non-Registered', icon: Users, to: '/non-registered', color: 'bg-amber-100 text-amber-700' },
  { key: 'events', label: 'Active Events', icon: Calendar, to: '/events', color: 'bg-saffron-500/20 text-saffron-600' },
  { key: 'enquiries', label: 'Total Enquiries', icon: MessageSquare, to: '/enquiries', color: 'bg-rose-100 text-rose-700' },
];

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, recentUsers: [], recentEnquiries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
        <p className="text-sm text-gray-600">Overview of your WhatsApp chatbot activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ key, label, icon: Icon, to, color }) => (
          <Link
            key={key}
            to={to}
            className="card p-5 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{label}</div>
                <div className="text-3xl font-bold text-brand-900 mt-1">
                  {loading ? '…' : data.stats[key] ?? 0}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={22} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {data.stats.newEnquiries > 0 && (
        <div className="card p-4 flex items-center gap-3 border-amber-300 bg-amber-50">
          <AlertCircle className="text-amber-600" />
          <div className="flex-1">
            <div className="font-medium text-amber-900">
              {data.stats.newEnquiries} new enquir{data.stats.newEnquiries === 1 ? 'y' : 'ies'} awaiting response
            </div>
            <div className="text-xs text-amber-700">Open the Enquiries page to follow up.</div>
          </div>
          <Link to="/enquiries" className="btn-primary !py-1.5 !px-3 !text-xs">View</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-brand-800">
            Recent Registrations
          </div>
          {!data.recentUsers?.length ? (
            <div className="p-6 text-sm text-gray-500 text-center">No registrations yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentUsers.map((u) => (
                <li key={u._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={12} /> {u.phone}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-brand-800">
            Recent Enquiries
          </div>
          {!data.recentEnquiries?.length ? (
            <div className="p-6 text-sm text-gray-500 text-center">No enquiries yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentEnquiries.map((e) => (
                <li key={e._id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{e.name}</div>
                    <span className={`pill ${
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
                  <div className="text-sm text-gray-700 mt-1 line-clamp-2">{e.enquiry}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
