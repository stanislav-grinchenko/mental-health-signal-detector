import { Component, type ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean }

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // En production, envoyer à un service de monitoring (Sentry, etc.)
    console.error('[AppErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-teal-50 px-6 text-center">
          <p className="text-2xl mb-3">😔</p>
          <h1 className="text-lg font-medium text-gray-700 mb-2">Une erreur est survenue</h1>
          <p className="text-sm text-gray-500 mb-6">Rechargez la page pour recommencer.</p>
          <button
            onClick={() => window.location.replace('/')}
            className="bg-teal-400 text-white rounded-2xl px-6 py-3 text-sm font-medium"
          >
            Recommencer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Mobile Frame */}
      <div className="w-full h-screen max-w-[430px] max-h-[932px] bg-white shadow-2xl rounded-[3rem] overflow-hidden relative border-8 border-gray-800">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-800 rounded-b-3xl z-50"></div>

        {/* App Content */}
        <div className="w-full h-full overflow-auto">
          <AppErrorBoundary>
            <RouterProvider router={router} />
          </AppErrorBoundary>
        </div>
      </div>
    </div>
  );
}
