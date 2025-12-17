import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AskPage } from './pages/AskPage';
import { BatchPage } from './pages/BatchPage';
import { AdminPage } from './pages/AdminPage';

type Page = 'ask' | 'batch' | 'admin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('ask');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage={currentPage} setPage={setCurrentPage} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {currentPage === 'ask' && <AskPage />}
        {currentPage === 'batch' && <BatchPage />}
        {currentPage === 'admin' && <AdminPage />}
      </main>
    </div>
  );
}

export default App;
