import {
  Calendar,
  Coins,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ChatBubble } from './Chat/ChatBubble';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'monthly', label: 'Vista mensual', icon: Calendar },
  { id: 'ledger', label: 'Mes (nuevo)', icon: Calendar },
  { id: 'imports', label: 'Importar', icon: Upload },
  { id: 'incomes', label: 'Ingresos', icon: TrendingUp },
  { id: 'expenses', label: 'Gastos', icon: TrendingDown },
  { id: 'loans', label: 'Préstamos', icon: Coins },
  { id: 'pasanaco', label: 'Pasanaco', icon: Users },
  { id: 'assistant', label: 'Asistente', icon: MessageCircle },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const onNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(`/${path}`);
  };

  const NavLinks = () => (
    <nav className="flex-1 space-y-0.5 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = currentPath === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="rounded-md bg-primary p-1.5">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight">Mi Finanzas</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLinks />
        </div>
        <div className="border-t p-3">
          <button
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-negative"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary p-1.5">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Mi Finanzas</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-md p-2 hover:bg-accent"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="flex flex-col border-b bg-card md:hidden">
          <NavLinks />
          <div className="border-t p-3">
            <button
              onClick={() => { setMobileMenuOpen(false); void handleSignOut(); }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-negative hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
      <ChatBubble />
    </div>
  );
}