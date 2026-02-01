import { Minus, Maximize2, X } from 'lucide-react';
import './TitleBar.css';

function TitleBar() {
  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();

  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="fireGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24"/>
                <stop offset="50%" stopColor="#f97316"/>
                <stop offset="100%" stopColor="#ef4444"/>
              </linearGradient>
            </defs>
            <path d="M12 2C12 2 8 6 8 10C8 12 9 14 12 14C15 14 16 12 16 10C16 6 12 2 12 2Z" fill="url(#fireGrad)"/>
            <path d="M12 8C12 8 10 10 10 12C10 13 10.5 14 12 14C13.5 14 14 13 14 12C14 10 12 8 12 8Z" fill="#fcd34d"/>
            <path d="M8 14C6 16 6 18 8 20C10 22 14 22 16 20C18 18 18 16 16 14" stroke="url(#fireGrad)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="logo-name">Infernix</span>
        </div>
      </div>
      
      <div className="titlebar-drag" />
      
      <div className="titlebar-controls">
        <button className="control-btn" onClick={handleMinimize}><Minus size={14} /></button>
        <button className="control-btn" onClick={handleMaximize}><Maximize2 size={12} /></button>
        <button className="control-btn control-close" onClick={handleClose}><X size={14} /></button>
      </div>
    </header>
  );
}

export default TitleBar;
