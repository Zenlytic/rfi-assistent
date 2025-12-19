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
      <div className="min-h-screen bg-zenlytic-dark flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5 text-zenlytic-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onLogin={login} error={error} />;
  }

  return (
    <div className="min-h-screen bg-zenlytic-dark-secondary">
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
