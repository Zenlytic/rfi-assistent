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
    <nav className="bg-zenlytic-dark border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.prod.website-files.com/64245009d04c101696e3d489/64301fdfad085fb44ede278a_newlogo.svg"
              alt="Zenlytic"
              className="h-6"
            />
            <span className="font-semibold text-white font-heading">RFI Assistant</span>
          </div>

          <div className="flex gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-zenlytic-cyan/20 text-zenlytic-cyan'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                    className="w-8 h-8 rounded-full ring-2 ring-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 bg-zenlytic-green rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.name?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-300 hidden sm:block">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
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
