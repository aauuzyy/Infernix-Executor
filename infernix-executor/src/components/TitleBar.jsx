import { useState } from 'react';
import { Minus, Maximize2, X, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import './TitleBar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'executor',  label: 'Executor'  },
  { id: 'scripthub', label: 'Script Hub' },
  { id: 'clients',   label: 'Clients'   },
  { id: 'collab',    label: 'Collaborate' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'settings',  label: 'Settings'  },
];

function TitleBar({ activeView, onViewChange, clientCount = 0 }) {
  const { accentColor } = useTheme();
  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose    = () => window.electronAPI?.closeWindow();

  return (
    <motion.header
      className="titlebar"
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Logo */}
      <div className="titlebar-logo">
        <div className="logo-circle">
          <Flame size={15} style={{ color: accentColor }} />
        </div>
        <span className="logo-name">Infernix</span>
      </div>

      <div className="titlebar-drag" />

      {/* Nav links - plain text, website style */}
      <nav className="titlebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`tb-link${activeView === item.id ? ' active' : ''}`}
            onClick={() => onViewChange?.(item.id)}
          >
            {item.label}
            {item.id === 'clients' && clientCount > 0 && (
              <span className="tb-count">{clientCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="titlebar-drag" />

      {/* Right side */}
      <div className="titlebar-right">
        <a
          className="discord-btn"
          href="https://discord.gg/d3CdsJnHHb"
          onClick={e => { e.preventDefault(); window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb'); }}
          style={{ color: '#ffffff', textDecoration: 'none', background: '#5865F2', display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: '#ffffff', flexShrink: 0 }}>
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span style={{ color: '#ffffff' }}>Join Discord</span>
        </a>

        <div className="titlebar-controls">
          <button className="control-btn" onClick={handleMinimize}><Minus size={13} /></button>
          <button className="control-btn" onClick={handleMaximize}><Maximize2 size={11} /></button>
          <button className="control-btn control-close" onClick={handleClose}><X size={13} /></button>
        </div>
      </div>
    </motion.header>
  );
}

export default TitleBar;

