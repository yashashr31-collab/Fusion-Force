import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  Clock,
  Database,
  BarChart3,
  Radio,
  Cpu,
  ChevronRight,
  Wifi
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export default function Sidebar({ currentView, onNavigate, mobileOpen, onCloseMobile }) {
  const { incidents, auditLogs, isOnline } = useSecurity();

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'System health & summary'
    },
    {
      id: 'telemetry',
      label: 'Live Telemetry',
      icon: Activity,
      badge: isOnline ? 'LIVE' : null,
      badgeColor: 'badge-teal',
      badgePulse: true,
      description: 'RF stream & manual injection'
    },
    {
      id: 'alerts',
      label: 'Security Alerts',
      icon: ShieldAlert,
      badge: incidents.length > 0 ? incidents.length : null,
      badgeColor: 'badge-rose',
      description: 'Anomalies & flagged packets'
    },
    {
      id: 'timeline',
      label: 'Incident Timeline',
      icon: Clock,
      badge: null,
      description: 'Chronological security log'
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: Database,
      badge: auditLogs.length > 0 ? auditLogs.length : null,
      badgeColor: 'badge-cyan',
      description: 'Immutable ledger records'
    },
    {
      id: 'evaluation',
      label: 'Evaluation',
      icon: BarChart3,
      badge: 'BENCH',
      badgeColor: 'badge-purple',
      description: 'Synthetic detection test'
    }
  ];

  const handleItemClick = (id) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}
      <aside className={`ghostwave-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Navigation list */}
        <div className="sidebar-section-title">SECURITY OPERATIONS</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item.id)}
              >
                <div className="nav-item-icon-wrapper">
                  <Icon size={18} className="nav-icon" />
                </div>
                <div className="nav-item-content">
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-desc">{item.description}</span>
                </div>
                {item.badge !== null && (
                  <span className={`badge ${item.badgeColor || 'badge-cyan'} nav-badge ${item.badgePulse ? 'badge-pulse-glow' : ''}`}>
                    {item.badgePulse && <span className="nav-badge-dot" />}
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={14} className="nav-chevron" />
              </button>
            );
          })}
        </nav>

        {/* Active Sensor Node Info Panel with Animated Signal Indicator */}
        <div className="sidebar-sensor-card">
          <div className="sensor-card-header">
            <div className="sensor-title-row">
              <Radio size={14} className="sensor-icon text-cyan" />
              <span className="sensor-title">ACTIVE SENSOR NODE</span>
            </div>
            {/* Animated signal transmission indicator */}
            <div className="sensor-signal-wave" title="Real-time RF Carrier Signal Active">
              <span className="wave-bar wave-1" />
              <span className="wave-bar wave-2" />
              <span className="wave-bar wave-3" />
            </div>
          </div>
          <div className="sensor-details">
            <div className="sensor-row">
              <span className="sensor-key">Node ID:</span>
              <span className="sensor-val mono text-primary">sensor-01</span>
            </div>
            <div className="sensor-row">
              <span className="sensor-key">Channel:</span>
              <span className="sensor-val mono text-primary">RF-BAND-7 [UHF]</span>
            </div>
            <div className="sensor-row">
              <span className="sensor-key">Integrity Mode:</span>
              <span className="sensor-val text-cyan font-semibold">Adversarial Monitored</span>
            </div>
          </div>
        </div>

        {/* System Footer info */}
        <div className="sidebar-footer">
          <div className="footer-tag-row">
            <Cpu size={12} className="text-cyan" />
            <span>GhostWave Engine v1.0.0</span>
          </div>
          <div className="footer-subtext">
            BYTEFORGE 2026 // Deep Telemetry Defense
          </div>
        </div>
      </aside>
    </>
  );
}
