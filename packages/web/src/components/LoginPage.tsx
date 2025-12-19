interface LoginPageProps {
  onLogin: () => void;
  error?: string | null;
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
  return (
    <div className="min-h-screen bg-zenlytic-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-zenlytic-cyan/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-zenlytic-blue/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.prod.website-files.com/64245009d04c101696e3d489/64301fdfad085fb44ede278a_newlogo.svg"
            alt="Zenlytic"
            className="h-10"
          />
        </div>

        <h1 className="text-center text-3xl font-bold text-white font-heading">
          RFI Assistant
        </h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          AI-powered responses for security questionnaires
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-dark py-8 px-6 shadow-xl rounded-xl">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <p className="text-sm text-gray-400 text-center mb-6">
                Sign in with your Zenlytic Google account to continue
              </p>
              <button
                onClick={onLogin}
                className="w-full flex justify-center items-center gap-3 py-3 px-4 rounded-lg bg-white text-gray-800 font-medium hover:bg-gray-100 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zenlytic-cyan focus:ring-offset-2 focus:ring-offset-zenlytic-dark"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Access restricted to <span className="text-zenlytic-cyan">@zenlytic.com</span> accounts
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-600">
          Powered by Claude AI
        </p>
      </div>
    </div>
  );
}
