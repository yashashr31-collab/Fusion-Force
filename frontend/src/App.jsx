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
import ApiSettingsModal from './components/ApiSettingsModal';
import { Menu, X, Cpu, Settings2, Sparkles } from 'lucide-react';
import './App.css';

function DashboardContent() {
  const [currentView, setCurrentView] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);

  const { isLiveBackend } = useSecurity();

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
          {/* Informative Standalone Demo Banner when running without external FastAPI backend */}
          {!isLiveBackend && !bannerDismissed && (
            <div className="backend-demo-banner">
              <div className="demo-banner-left">
                <div className="demo-icon-box">
                  <Cpu size={18} className="text-cyan animate-pulse" />
                </div>
                <div>
                  <div className="demo-banner-title">
                    <span>Standalone In-Browser Engine Active</span>
                    <span className="demo-pill-badge">
                      <Sparkles size={10} style={{ display: 'inline', marginRight: 3 }} />
                      Fully Interactive Demo
                    </span>
                  </div>
                  <div className="demo-banner-desc">
                    Running full client-side RF signal simulation, adversarial attack injections, and the GhostWave anomaly detection engine directly in your browser.
                  </div>
                </div>
              </div>
              <div className="demo-banner-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setApiModalOpen(true)}
                  title="Configure or connect an external FastAPI backend"
                >
                  <Settings2 size={13} />
                  <span>Connect Backend</span>
                </button>
                <button
                  className="btn btn-ghost btn-sm demo-dismiss-btn"
                  onClick={() => setBannerDismissed(true)}
                  title="Dismiss notice"
                  aria-label="Dismiss banner"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {renderView()}
        </main>
      </div>

      <ApiSettingsModal isOpen={apiModalOpen} onClose={() => setApiModalOpen(false)} />
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
