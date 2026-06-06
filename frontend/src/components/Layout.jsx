import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Calendar,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  LogOut,
  Menu,
  BookOpen,
  Layers,
  CreditCard,
  Radio,
  Tag,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { label: 'Programs', divider: true },
  { to: '/programs', label: 'Programs', icon: BookOpen },
  { to: '/batches', label: 'Batches & Sessions', icon: Layers },
  { to: '/bookings', label: 'Bookings', icon: CreditCard },
  { to: '/sequences', label: 'Nurture Sequences', icon: Activity },
  { label: 'Campaigns', divider: true },
  { to: '/broadcasts', label: 'Broadcasts (W6)', icon: Radio },
  { to: '/offers', label: 'Payment Offers', icon: Tag },
  { to: '/faqs', label: 'FAQ Content', icon: HelpCircle },
  { label: 'Users', divider: true },
  { to: '/registered', label: 'Registered Users', icon: UserCheck },
  { to: '/non-registered', label: 'Non-Registered', icon: Users },
  { label: 'Content', divider: true },
  { to: '/events', label: 'Events', icon: Calendar },
  { to: '/enquiries', label: 'Enquiries', icon: MessageSquare },
  { to: '/pdfs', label: 'PDF Resources', icon: FileText },
  { to: '/flow-images', label: 'Flow Images', icon: ImageIcon },
];

export default function Layout({ user, setAuth }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('hy_token');
    setAuth(null);
    nav('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-900 text-white flex flex-col transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="px-5 py-6 flex items-center gap-3 border-b border-brand-800">
          <div className="w-10 h-10 rounded-full bg-saffron-500 flex items-center justify-center text-xl">
            🧘
          </div>
          <div>
            <div className="font-bold leading-tight">Himalayan Yoga</div>
            <div className="text-xs text-brand-200">Academy Admin</div>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
          {NAV.map((item, i) => {
            if (item.divider) {
              return (
                <div
                  key={`div-${i}`}
                  className="px-3 pt-4 pb-1 text-xs font-semibold text-brand-400 uppercase tracking-wider"
                >
                  {item.label}
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-brand-700 text-white font-medium'
                      : 'text-brand-100 hover:bg-brand-800 hover:text-white'
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-brand-800">
          <div className="px-3 py-2 mb-2 text-xs text-brand-200">
            Signed in as{' '}
            <span className="text-white font-medium">{user?.username}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-100 hover:bg-brand-800"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2">
            <Menu size={22} />
          </button>
          <div className="font-semibold text-brand-800 truncate">
            Himalayan Yoga Academy
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
