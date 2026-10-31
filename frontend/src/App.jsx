import { useState } from 'react';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OverviewView from './views/OverviewView';
import LiveTelemetryView from './views/LiveTelemetryView';
import SecurityAlertsView from './views/SecurityAlertsView';
import IncidentTimelineView from './views/IncidentTimelineView';
import AuditLogsView from './views/AuditLogsView';
import EvaluationView from './views/EvaluationView';
import { Menu, X, AlertTriangle, RefreshCw } from 'lucide-react';
import './App.css';

function DashboardContent() {
  const [currentView, setCurrentView] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOnline, backendStatus, apiBaseUrl, checkHealth, loading } = useSecurity();

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView onNavigate={setCurrentView} />;
      case 'telemetry':
        return <LiveTelemetryView />;
      case 'alerts':
        return <SecurityAlertsView />;
      case 'timeline':
        return <IncidentTimelineView />;
      case 'audit':
        return <AuditLogsView />;
      case 'evaluation':
        return <EvaluationView />;
      default:
        return <OverviewView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="ghostwave-app-shell">
      {/* Top Header */}
      <Header onNavigate={setCurrentView} />

      {/* Mobile Top Bar */}
      <div className="mobile-header-bar">
        <button
          className="btn btn-outline btn-sm mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          <span className="mobile-view-name">
            {currentView.toUpperCase().replace('_', ' ')}
          </span>
        </button>
      </div>

      <div className="app-body-layout">
        {/* Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="ghostwave-main-viewport">
          {/* Backend Offline Warning Banner if disconnected */}
          {!isOnline && backendStatus === 'offline' && (
            <div className="backend-offline-banner">
              <div className="offline-banner-left">
                <AlertTriangle size={20} className="text-rose" />
                <div>
                  <div className="offline-banner-title">
                    Backend Connection Offline (<code className="mono">{apiBaseUrl}</code>)
                  </div>
                  <div className="offline-banner-desc">
                    Unable to query FastAPI endpoints. Ensure backend server is running:
                    <span className="mono code-snippet">uvicorn main:app --reload --port 8000</span>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={checkHealth}
                disabled={loading.health}
              >
                <RefreshCw size={14} className={loading.health ? 'animate-spin' : ''} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SecurityProvider>
      <DashboardContent />
    </SecurityProvider>
  );
}
