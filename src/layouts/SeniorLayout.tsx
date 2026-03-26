import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Phone, Pill, Map, HelpCircle, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const navItems = [
  { to: '/senior', icon: Home, label: 'Home', end: true },
  { to: '/senior/contacts', icon: Phone, label: 'Contacts', end: false },
  { to: '/senior/medications', icon: Pill, label: 'Reminders', end: false },
  { to: '/senior/map', icon: Map, label: 'Map', end: false },
  { to: '/senior/help', icon: HelpCircle, label: 'Help', end: false },
];

export default function SeniorLayout() {
  const { signOut, profile } = useAuth();
  const { fontSize, highContrast, setFontSize, setHighContrast } = useAccessibility();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 hidden md:flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-teal-700">SafeConnect</h1>
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Hi, {profile?.name || 'User'}</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-6 px-4 py-6 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden z-40">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-teal-700' : 'text-gray-400'
              }`
            }
          >
            <item.icon className="w-6 h-6" />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-400"
        >
          <Settings className="w-6 h-6" />
          Settings
        </button>
      </nav>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Accessibility Settings">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Font Size</label>
            <div className="flex gap-2">
              {(['normal', 'large', 'xlarge'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-center font-medium transition-all ${
                    fontSize === size
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className={size === 'normal' ? 'text-sm' : size === 'large' ? 'text-base' : 'text-lg'}>
                    {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'Extra Large'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">High Contrast Mode</span>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  highContrast ? 'bg-teal-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={highContrast}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    highContrast ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 md:hidden">
            <Button variant="danger" fullWidth onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
