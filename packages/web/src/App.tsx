import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { AskPage } from './pages/AskPage';
import { BatchPage } from './pages/BatchPage';
import { AdminPage } from './pages/AdminPage';
import { useAuth } from './hooks/useAuth';

type Page = 'ask' | 'batch' | 'admin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('ask');
  const { loading, authenticated, user, login, logout } = useAuth();

  // Get error from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');

  // Clear error from URL after reading
  if (error) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onLogin={login} error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        currentPage={currentPage}
        setPage={setCurrentPage}
        user={user}
        onLogout={logout}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {currentPage === 'ask' && <AskPage />}
        {currentPage === 'batch' && <BatchPage />}
        {currentPage === 'admin' && <AdminPage />}
      </main>
    </div>
  );
}

export default App;
