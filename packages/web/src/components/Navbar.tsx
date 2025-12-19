interface User {
  email: string;
  name: string;
  picture: string;
}

interface NavbarProps {
  currentPage: string;
  setPage: (page: 'ask' | 'batch' | 'admin') => void;
  user: User | null;
  onLogout: () => void;
}

export function Navbar({ currentPage, setPage, user, onLogout }: NavbarProps) {
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

          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user.name?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
