import {
  Bell,
  ClipboardList,
  Coins,
  HandCoins,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ReceiptText,
  Settings,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ChatBubble } from './Chat/ChatBubble';
import { GlobalImportProgress } from './Imports/GlobalImportProgress';
import { ReminderBell } from './Reminders/ReminderBell';
import { ScrollButtons } from './ScrollButtons';
import { HelpMenu } from './Tour/HelpMenu';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: 'dashboard', activePaths: ['dashboard'], label: 'Dashboard', icon: LayoutDashboard, activeClass: 'bg-indigo-600 text-white' },
  { path: 'ledger', activePaths: ['ledger', 'monthly'], label: 'Mes', icon: ClipboardList, activeClass: 'bg-sky-600 text-white' },
  { path: 'imports', activePaths: ['imports'], label: 'Importar / Exportar', icon: Upload, activeClass: 'bg-cyan-600 text-white' },
  { path: 'movements', activePaths: ['movements'], label: 'Movimientos', icon: ReceiptText, activeClass: 'bg-emerald-600 text-white' },
  { path: 'loans', activePaths: ['loans'], label: 'Préstamos', icon: Coins, activeClass: 'bg-amber-600 text-white' },
  { path: 'pasanaco', activePaths: ['pasanaco'], label: 'Pasanaco', icon: Users, activeClass: 'bg-orange-600 text-white' },
  { path: 'settlements', activePaths: ['settlements'], label: 'Liquidaciones', icon: HandCoins, activeClass: 'bg-teal-600 text-white' },
  { path: 'reminders', activePaths: ['reminders'], label: 'Recordatorios', icon: Bell, activeClass: 'bg-rose-600 text-white' },
  { path: 'assistant', activePaths: ['assistant'], label: 'Asistente', icon: MessageCircle, activeClass: 'bg-fuchsia-600 text-white' },
  { path: 'settings', activePaths: ['settings'], label: 'Configuración', icon: Settings, activeClass: 'bg-slate-700 text-white' },
  { path: 'ayuda', activePaths: ['ayuda'], label: 'Cómo usar la app', icon: Info, activeClass: 'bg-violet-600 text-white' },
];

// Screens with wide tables get extra room; the rest keep a readable width.
const wideContentPaths = ['imports', 'movements', 'ledger', 'monthly'];

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const onNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(`/${path}`);
  };

  const NavLinks = () => (
    <nav className="flex-1 space-y-0.5 px-3" data-tour="nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.activePaths.includes(currentPath);
        return (
          <button
            key={item.path}
            data-tour={`nav-${item.path}`}
            onClick={() => onNavigate(item.path)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? `${item.activeClass} font-medium shadow-sm`
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
          <div className="ml-auto">
            <HelpMenu align="left" />
          </div>
        </div>
        <div className="border-b px-3 py-2">
          <ReminderBell variant="sidebar" />
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
        <div className="flex items-center gap-1">
          <ReminderBell variant="topbar" />
          <HelpMenu compact align="right" />
          <button
            data-tour="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 hover:bg-accent"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
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

      {/* overflow-x-clip (not hidden) so main doesn't become a scroll container and sticky headers keep working. */}
      <main className="min-w-0 flex-1 overflow-x-clip">
        <div className={`mx-auto px-4 py-5 sm:px-6 lg:px-8 ${wideContentPaths.includes(currentPath) ? 'max-w-[1500px]' : 'max-w-6xl'}`}>
          {children}
        </div>
      </main>
      <ScrollButtons />
      <ChatBubble />
      <GlobalImportProgress />
    </div>
  );
}