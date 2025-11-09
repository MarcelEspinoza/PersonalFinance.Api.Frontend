import {
  Calendar,
  Coins,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'monthly', label: 'Vista Mensual', icon: Calendar },
    { id: 'incomes', label: 'Ingresos', icon: TrendingUp },
    { id: 'expenses', label: 'Gastos', icon: TrendingDown },
    { id: 'loans', label: 'Préstamos', icon: Coins },
    { id: 'pasanaco', label: 'Pasanaco', icon: Users },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const onNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(`/${path}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-slate-800">
                Mi Finanzas
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center px-4 py-2 rounded-lg transition ${
                      currentPath === item.id
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    aria-current={currentPath === item.id ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Desktop sign out */}
            <div className="hidden md:block">
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-2 text-slate-600 hover:text-red-600 transition"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Salir
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-slate-600" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu (visible on small screens when open) */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center w-full px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 ${
                      currentPath === item.id ? 'bg-emerald-50 text-emerald-600' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                className="flex items-center w-full px-3 py-2 rounded-lg text-red-600 hover:bg-slate-50"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Salir
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}