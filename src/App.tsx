import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Router } from './components/Router';
import { Navigation } from './components/Navigation';
import { Submit } from './pages/Submit';
import { Inbox } from './pages/Inbox';
import { TicketDetail } from './pages/TicketDetail';
import { Admin } from './pages/Admin';
import { Metrics } from './pages/Metrics';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const currentPath = window.location.pathname;

  if (currentPath === '/submit') {
    return <Submit />;
  }

  return (
    <>
      <Navigation />
      <Router
        routes={[
          { path: '/inbox', component: <Inbox /> },
          { path: '/ticket/:id', component: <TicketDetail /> },
          { path: '/admin', component: <Admin /> },
          { path: '/metrics', component: <Metrics /> },
          { path: '/submit', component: <Submit /> },
          { path: '/', component: <Inbox /> },
        ]}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
