import { useEffect, useState } from 'react';
import { Phone, MessageCircle, Clock } from 'lucide-react';
import api from '../api';

export default function NonRegisteredUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/users/non-registered')
      .then((r) => setUsers(r.data.users))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Non-Registered Users</h1>
        <p className="text-sm text-gray-600">
          {users.length} contacts have messaged the bot but never completed registration.
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No non-registered contacts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Profile Name</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">Last Message</th>
                  <th className="px-4 py-3 text-left">Messages</th>
                  <th className="px-4 py-3 text-left">First Seen</th>
                  <th className="px-4 py-3 text-left">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.profileName || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <Phone size={14} /> {u.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <MessageCircle size={14} /> {u.lastMessage || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{u.messageCount}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={14} /> {new Date(u.firstSeenAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(u.lastSeenAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
