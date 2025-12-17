interface NavbarProps {
  currentPage: string;
  setPage: (page: 'ask' | 'batch' | 'admin') => void;
}

export function Navbar({ currentPage, setPage }: NavbarProps) {
  const navItems = [
    { id: 'ask', label: 'Ask' },
    { id: 'batch', label: 'Batch' },
    { id: 'admin', label: 'Admin' },
  ] as const;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zenlytic-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <span className="font-semibold text-gray-900">RFI Assistant</span>
          </div>

          <div className="flex gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-zenlytic-100 text-zenlytic-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
