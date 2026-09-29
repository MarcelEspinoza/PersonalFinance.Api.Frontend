import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ImportProgressProvider } from './contexts/ImportProgressContext';
import { Login } from './pages/AuthPages/Login';
import { Register } from './pages/AuthPages/Register';
import { Dashboard } from './pages/DashboardPage/Dashboard';
import { MovementsPage } from './pages/Movements/MovementsPage';
import LoansPage from './pages/LoansPage/LoansPage';
import { MonthlyView } from './pages/Monthly/MonthlyView';
import { LedgerMonthPage } from './pages/Ledger/LedgerMonthPage';
import { PasanacoPage } from './pages/pasanaco/PasanacoPage';
import { SettlementsPage } from './pages/Settlements/SettlementsPage';
import SettingsPage from './pages/SettinggPage/SettingsPage';
import { ImportsPage } from './pages/Imports/ImportsPage';
import { AssistantPage } from './pages/Assistant/AssistantPage';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/monthly"
        element={
          <PrivateRoute>
            <Layout><MonthlyView /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/ledger"
        element={
          <PrivateRoute>
            <Layout><LedgerMonthPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/imports"
        element={
          <PrivateRoute>
            <Layout><ImportsPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/movements"
        element={
          <PrivateRoute>
            <Layout><MovementsPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route path="/incomes" element={<Navigate to="/movements?type=income" replace />} />
      <Route path="/expenses" element={<Navigate to="/movements?type=expense" replace />} />
      <Route
        path="/loans"
        element={
          <PrivateRoute>
            <Layout><LoansPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/pasanaco"
        element={
          <PrivateRoute>
            <Layout><PasanacoPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settlements"
        element={
          <PrivateRoute>
            <Layout><SettlementsPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <PrivateRoute>
            <Layout><AssistantPage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Layout><SettingsPage /></Layout>
          </PrivateRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  // IMPORTANT: Router must be above AuthProvider because AuthProvider uses useNavigate()
  return (
    <Router>
      <AuthProvider>
        <ImportProgressProvider>
          <AppRoutes />
        </ImportProgressProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;