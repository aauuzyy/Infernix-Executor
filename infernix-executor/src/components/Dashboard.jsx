import { motion } from 'framer-motion';
import { ArrowRight, Code2, Flame, Zap, Bot, BookOpen, Play, Shield, Users, Activity, GitBranch, BarChart3, Timer } from 'lucide-react';
import './Dashboard.css';
import { attachReliability, avgAIResponseTime, avgExecutionTime, formatMs } from '../utils/stats';

const FEATURES = [
  { icon: Zap,      title: 'Fast Execution',  desc: 'Near-instant Lua & Luau script execution with minimal overhead.' },
  { icon: Bot,      title: 'Infernix AI',     desc: 'Built-in AI assistant for scripting help and navigation.' },
  { icon: BookOpen, title: 'Script Hub',      desc: 'Browse and run a curated library of community scripts.' },
  { icon: Play,     title: 'Auto Execute',    desc: 'Automatically run scripts every time you hook into Roblox.' },
  { icon: Shield,   title: 'Safe & Private',  desc: 'No telemetry, no data collection. Runs fully offline.' },
];

const CHANGELOG = [
  {
    version: '1.4.0', date: 'May 1, 2026', latest: true,
    items: [
      'Wider default window (1280×750) for more workspace',
      'AI sidebar no longer overlaps executor toolbar',
      'Staggered loading screen ring pulse animations',
      'Copy & Send to Editor hover states fixed',
      'Custom app icon applied to installer & taskbar',
    ],
  },
  {
    version: '1.3.1', date: 'April 12, 2026', latest: false,
    items: [
      'AI auto-navigates to relevant views on response',
      'Smooth tab scroll on narrow toolbar',
      'Grid background visibility increased',
    ],
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Dashboard({ onViewChange, executorVersion = '1.4.0', clients = [], executionCount = 0, stats }) {
  const versionStr = (executorVersion || '1.4.0').replace(/^v/, '');

  return (
    <div className="dash-page">

      {/* -- Hero -- */}
      <section className="dash-hero">
        <div className="dash-hero-inner">
          <motion.div
            className="hero-icon-wrap"
            initial={{ scale: 0, filter: 'blur(20px)' }}
            animate={{ scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 80 }}
          >
            <Flame className="hero-flame" />
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="shimmer-text">Infernix</span>
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            The next-generation Roblox executor.{' '}
            <span style={{ color: '#fff' }}>Powerful</span>,{' '}
            <span style={{ color: '#fff' }}>secure</span>, and{' '}
            <span style={{ color: '#fff' }}>fast</span>.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.44 }}
          >
            <button className="dash-btn-primary" onClick={() => onViewChange?.('executor')}>
              <Code2 size={15} />
              Open Executor
              <ArrowRight size={15} />
            </button>
            <a
              className="dash-btn-secondary"
              href="https://discord.gg/d3CdsJnHHb"
              onClick={e => { e.preventDefault(); window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb'); }}
            >
              Join Discord
            </a>
          </motion.div>

          <motion.div
            className="hero-badges"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.56 }}
          >
            <span className="hero-badge"><span className="badge-dot" />v{versionStr}</span>
            <span className="hero-badge"><span className="badge-dot" />Windows 10/11</span>
            <span className="hero-badge"><span className="badge-dot" />Free Forever</span>
            <span className="hero-badge"><span className="badge-dot" />Auto Updates</span>
          </motion.div>
        </div>
      </section>

      {/* -- Live stats bar -- */}
      <motion.div className="dash-container" {...fadeUp(0.5)}>
        <div className="dash-stats-bar">
          <div className="dash-stat">
            <Users size={14} className="dash-stat-icon" />
            <span className="dash-stat-value">{clients.length}</span>
            <span className="dash-stat-label">Connected</span>
          </div>
          <div className="dash-stat-divider" />
          <div className="dash-stat">
            <Activity size={14} className="dash-stat-icon" />
            <span className="dash-stat-value">{executionCount}</span>
            <span className="dash-stat-label">Executions</span>
          </div>
          <div className="dash-stat-divider" />
          <div className="dash-stat">
            <GitBranch size={14} className="dash-stat-icon" />
            <span className="dash-stat-value">v{versionStr}</span>
            <span className="dash-stat-label">Latest</span>
          </div>
          {stats && stats.attach.attempts > 0 && (
            <>
              <div className="dash-stat-divider" />
              <div className="dash-stat">
                <BarChart3 size={14} className="dash-stat-icon" />
                <span className="dash-stat-value">{attachReliability(stats)}%</span>
                <span className="dash-stat-label">Attach</span>
              </div>
            </>
          )}
          {stats && stats.ai.requests > 0 && (
            <>
              <div className="dash-stat-divider" />
              <div className="dash-stat">
                <Timer size={14} className="dash-stat-icon" />
                <span className="dash-stat-value">{formatMs(avgAIResponseTime(stats))}</span>
                <span className="dash-stat-label">AI Avg</span>
              </div>
            </>
          )}
          {stats && stats.execution.count > 0 && (
            <>
              <div className="dash-stat-divider" />
              <div className="dash-stat">
                <Zap size={14} className="dash-stat-icon" />
                <span className="dash-stat-value">{formatMs(avgExecutionTime(stats))}</span>
                <span className="dash-stat-label">Exec Avg</span>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* -- Features -- */}
      <section className="dash-section">
        <div className="dash-container">
          <motion.p className="section-heading" {...fadeUp(0.55)} style={{ marginBottom: '1.25rem' }}>
            Everything you need
          </motion.p>
          <div className="features-grid">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div className="feature-card" key={title} {...fadeUp(0.58 + i * 0.06)}>
                <div className="feature-icon-wrap">
                  <Icon size={14} color="#fff" />
                </div>
                <p className="feature-title">{title}</p>
                <p className="feature-desc">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Changelog + CTA -- */}
      <section className="dash-section" style={{ paddingTop: 0 }}>
        <div className="dash-container">
          <motion.p className="section-heading" {...fadeUp(0.62)} style={{ textAlign: 'left', marginBottom: '1rem' }}>
            What's new
          </motion.p>
          <div className="changelog-layout">
            {/* Changelog */}
            <div className="changelog-list">
                {CHANGELOG.map((entry, i) => (
                  <motion.div className="changelog-entry" key={entry.version} {...fadeUp(0.65 + i * 0.07)}>
                    <div className="changelog-header">
                      <span className="version-badge">v{entry.version}</span>
                      {entry.latest && <span className="latest-badge">Latest</span>}
                      <span className="changelog-date">{entry.date}</span>
                    </div>
                    <ul className="changelog-items">
                      {entry.items.map(item => (
                        <li className="changelog-item" key={item}>
                          <span className="changelog-bullet">�</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
            </div>

            {/* CTA panel */}
            <motion.div className="cta-panel" {...fadeUp(0.68)}>
              <div className="cta-icon-wrap">
                <Flame size={20} color="#fff" />
              </div>
              <p className="cta-title">Ready to execute?</p>
              <p className="cta-sub">Open the executor, hook into Roblox, and run your first script in seconds.</p>
              <button className="dash-btn-primary cta-full" onClick={() => onViewChange?.('executor')}>
                <Code2 size={14} />
                Open Executor
              </button>
              <a
                className="cta-discord-btn"
                href="https://discord.gg/d3CdsJnHHb"
                onClick={e => { e.preventDefault(); window.electronAPI?.openExternal?.('https://discord.gg/d3CdsJnHHb'); }}
              >
                Join our Discord
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      <div style={{ height: '3rem' }} />
    </div>
  );
}

