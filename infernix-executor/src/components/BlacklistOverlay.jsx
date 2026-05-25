import { useState, useEffect } from 'react';
import { Ban, AlertTriangle, Shield, Clock, X } from 'lucide-react';
import './BlacklistOverlay.css';

function BlacklistOverlay({ data }) {
  const [countdown, setCountdown] = useState(5);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Entrance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`bl-overlay ${entered ? 'bl-entered' : ''}`}>
      <div className="bl-scanlines" />
      <div className="bl-content">
        {/* Pulsing danger icon */}
        <div className="bl-icon-wrap">
          <Ban size={48} className="bl-icon-main" />
          <div className="bl-icon-ring" />
          <div className="bl-icon-ring bl-ring-2" />
        </div>

        <h1 className="bl-title">ACCESS DENIED</h1>
        <p className="bl-subtitle">YOUR ACCOUNT HAS BEEN BLACKLISTED</p>

        <div className="bl-info-card">
          <div className="bl-info-row">
            <AlertTriangle size={14} className="bl-info-icon" />
            <span className="bl-info-label">Account</span>
            <span className="bl-info-value bl-info-value--danger">{data?.username || 'Unknown'}</span>
          </div>
          <div className="bl-info-row">
            <Shield size={14} className="bl-info-icon" />
            <span className="bl-info-label">Blacklisted by</span>
            <span className="bl-info-value bl-info-value--accent">{data?.addedBy || 'Developer'}</span>
          </div>
          <div className="bl-info-row">
            <Ban size={14} className="bl-info-icon" />
            <span className="bl-info-label">Reason</span>
            <span className="bl-info-value">{data?.reason || 'No reason provided'}</span>
          </div>
        </div>

        <div className="bl-countdown-section">
          <Clock size={16} className="bl-clock-icon" />
          <span className="bl-countdown-text">Infernix will close in</span>
          <div className="bl-countdown-number">{countdown}</div>
          <span className="bl-countdown-unit">second{countdown !== 1 ? 's' : ''}</span>
        </div>

        <div className="bl-progress-bar">
          <div className="bl-progress-fill" style={{ width: `${((5 - countdown) / 5) * 100}%` }} />
        </div>

        <p className="bl-footer">
          If you believe this is an error, contact a developer.
        </p>
      </div>
    </div>
  );
}

export default BlacklistOverlay;
