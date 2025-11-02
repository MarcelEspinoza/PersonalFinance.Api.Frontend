// App.tsx
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { ExpensesPage } from './pages/ExpensesPage';
import IncomePage from './pages/IncomesPage/IncomePage';
import { LoansPage } from './pages/LoansPage';
import { Login } from './pages/Login';
import { MonthlyView } from './pages/MonthlyView';
import { PasanacoPage } from './pages/PasanacoPage';
import { Register } from './pages/Register';

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
        path="/incomes"
        element={
          <PrivateRoute>
            <Layout><IncomePage /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <PrivateRoute>
            <Layout><ExpensesPage /></Layout>
          </PrivateRoute>
        }
      />
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
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
