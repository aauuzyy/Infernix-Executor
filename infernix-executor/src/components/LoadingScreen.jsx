import { useState, useEffect, useRef } from 'react';
import { Flame, Cpu, HardDrive, Zap, FileCode, Layers, Wifi } from 'lucide-react';
import './LoadingScreen.css';

const LOADING_STEPS = [
  { label: 'Initializing core', target: 8,  minMs: 400, maxMs: 700 },
  { label: 'Loading Lua engine', target: 18, minMs: 500, maxMs: 900 },
  { label: 'Resolving offsets', target: 28, minMs: 600, maxMs: 1100 },
  { label: 'Patching bytecode', target: 38, minMs: 400, maxMs: 800 },
  { label: 'Binding APIs', target: 48, minMs: 300, maxMs: 600 },
  { label: 'Scanning modules', target: 58, minMs: 500, maxMs: 1000 },
  { label: 'Hooking scheduler', target: 68, minMs: 400, maxMs: 800 },
  { label: 'Loading presets', target: 76, minMs: 300, maxMs: 600 },
  { label: 'Caching Script Hub', target: 85, minMs: 600, maxMs: 1400 },
  { label: 'Optimizing memory', target: 92, minMs: 400, maxMs: 800 },
  { label: 'Finalizing', target: 98, minMs: 300, maxMs: 500 },
  { label: 'Ready', target: 100, minMs: 200, maxMs: 400 },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function LoadingScreen({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('Booting');
  const [subLabel, setSubLabel] = useState('');
  const [version, setVersion] = useState('1.4.1');
  const [realStats, setRealStats] = useState({
    scriptHubScripts: 0, workspaceFiles: 0, autoExecScripts: 0, presets: 0,
  });
  const [stats, setStats] = useState({ modules: 0, memory: 0, threads: 0, apis: 0 });
  const [updateState, setUpdateState] = useState({ show: false, latest: null, checking: true });
  const doneRef = useRef(false);

  const skippedRef = useRef(false);
  const updateShowRef = useRef(false);

  // Keyboard skip
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        skippedRef.current = true;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Check web version in background during loading
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const local = await window.electronAPI?.getCurrentVersion?.() ?? version;
        const res = await window.electronAPI?.checkWebVersion?.();
        if (!alive) return;
        if (res?.ok && res.version) {
          const localNorm = String(local).replace(/^v/, '');
          const webNorm = String(res.version).replace(/^v/, '');
          if (webNorm !== localNorm) {
            updateShowRef.current = true;
            setUpdateState({ show: true, latest: webNorm, checking: false });
            return;
          }
        }
      } catch { /* silent fail */ }
      if (alive) setUpdateState({ show: false, latest: null, checking: false });
    };
    const timer = setTimeout(check, 1200);
    return () => { alive = false; clearTimeout(timer); };
  }, [version]);

  // Main loading sequence — uses plain setTimeout chains instead of async/await
  // to avoid any Promise-related races or restart issues.
  useEffect(() => {
    let alive = true;
    const timers = [];
    const schedule = (fn, ms) => {
      const id = setTimeout(() => { if (alive) fn(); }, ms);
      timers.push(id);
      return id;
    };

    async function loadRealStats() {
      try {
        let scriptHubCount = 0;
        try {
          const cached = localStorage.getItem('infernix-scriptblox-cache');
          if (cached) {
            const data = JSON.parse(cached);
            scriptHubCount = Array.isArray(data) ? data.length : (data?.scripts?.length || 0);
          }
          if (!scriptHubCount) {
            const resp = await fetch('https://scriptblox.com/api/script/fetch?page=1&max=100');
            const data = await resp.json();
            scriptHubCount = data?.result?.scripts?.length || data?.scripts?.length || 0;
          }
        } catch {}
        let workspaceCount = 0;
        try { workspaceCount = (await window.electronAPI?.listWorkspaceFiles?.())?.length || 0; } catch {}
        let autoexecCount = 0;
        try { autoexecCount = (await window.electronAPI?.listAutoexecFiles?.())?.length || 0; } catch {}
        let presetCount = 0;
        try { presetCount = (await window.electronAPI?.loadSettings?.())?.presets?.length || 0; } catch {}
        if (alive) setRealStats({ scriptHubScripts: scriptHubCount, workspaceFiles: workspaceCount, autoExecScripts: autoexecCount, presets: presetCount });
      } catch { /* ok */ }
    }

    // Load version & stats immediately
    (async () => {
      try {
        const [, cv, lv] = await Promise.all([
          window.electronAPI?.loadSettings?.() ?? null,
          window.electronAPI?.getCurrentVersion?.() ?? null,
          window.electronAPI?.getVersion?.() ?? null,
        ]);
        const ver = cv || lv;
        if (ver && alive) setVersion(String(ver).replace(/^v/, ''));
      } catch { /* ok */ }
      loadRealStats();
    })();

    let stepIdx = 0;
    const runStep = () => {
      if (!alive) return;
      if (skippedRef.current || stepIdx >= LOADING_STEPS.length) {
        // Finish
        setProgress(100);
        setLabel('Ready');
        setSubLabel('');
        schedule(() => {
          if (!alive) return;
          doneRef.current = true;
          if (!updateShowRef.current) onDone?.();
        }, 250);
        return;
      }

      const step = LOADING_STEPS[stepIdx];
      setLabel(step.label);
      const subs = getSubLabelsForStep(step.label);
      if (subs[0]) setSubLabel(subs[0]);
      setProgress(step.target);
      setStats({
        modules: Math.floor(step.target * 0.42) + Math.floor(Math.random() * 3),
        memory: Math.floor(step.target * 12800) + Math.floor(Math.random() * 2048),
        threads: Math.floor(step.target * 0.08) + 2 + Math.floor(Math.random() * 2),
        apis: Math.floor(step.target * 0.18) + Math.floor(Math.random() * 2),
      });

      const duration = step.minMs + Math.random() * (step.maxMs - step.minMs);
      stepIdx++;
      schedule(runStep, duration);
    };

    // Kick off after a short delay so the browser paints the initial frame
    schedule(runStep, 80);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [onDone]);

  const pctStr = String(progress);

  return (
    <div className="ls-root">
      <div className="ls-grid" aria-hidden="true" />
      <div className="ls-scanline" aria-hidden="true" />

      <div className="ls-motion" aria-hidden="true">
        <div className="ls-motion-ring ring-1" />
        <div className="ls-motion-ring ring-2" />
      </div>

      <div className="ls-center">
        <div className="ls-logo">
          <div className="ls-ring ls-ring-1" />
          <div className="ls-ring ls-ring-2" />
          <div className="ls-ring ls-ring-3" />
          <Flame size={28} style={{ color: 'rgba(255,255,255,0.65)' }} />
        </div>

        <div className="ls-title">INFERNIX</div>
        <div className="ls-subtitle">Executor</div>

        <div className="ls-stats ls-real-stats">
          <div className="ls-stat"><Layers size={10} /><span>{realStats.scriptHubScripts} hub scripts</span></div>
          <div className="ls-stat"><FileCode size={10} /><span>{realStats.workspaceFiles} workspace</span></div>
          <div className="ls-stat"><Zap size={10} /><span>{realStats.autoExecScripts} autoexec</span></div>
          <div className="ls-stat"><Wifi size={10} /><span>{realStats.presets} presets</span></div>
        </div>

        <div className="ls-stats">
          <div className="ls-stat"><Cpu size={10} /><span>{stats.modules} mods</span></div>
          <div className="ls-stat"><HardDrive size={10} /><span>{formatBytes(stats.memory)}</span></div>
          <div className="ls-stat"><Zap size={10} /><span>{stats.apis} APIs</span></div>
          <div className="ls-stat"><span className="ls-stat-dot" /><span>{stats.threads} threads</span></div>
        </div>

        <div className="ls-bar-container">
          <div className="ls-bar-meta">
            <span className="ls-bar-step">{label}<span className="ls-bar-sub">{subLabel ? ` — ${subLabel}` : ''}</span></span>
            <span className="ls-bar-pct">{pctStr}%</span>
          </div>
          <div className="ls-bar-track">
            <div className="ls-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}>
              <div className="ls-bar-sheen" />
            </div>
          </div>
        </div>

        <div className="ls-tagline">Getting everything ready for you</div>

        <button
          className="ls-skip-btn"
          onClick={() => { skippedRef.current = true; }}
          title="Press Space to skip"
        >
          <span className="ls-skip-line" />
          <span>Skip</span>
          <kbd className="ls-skip-key">Space</kbd>
          <span className="ls-skip-line" />
        </button>
      </div>

      <div className="ls-version">v{version}</div>

      {/* Update Available Overlay */}
      {updateState.show && (
        <div className="ls-update-overlay">
          <div className="ls-update-card">
            <div className="ls-update-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h2 className="ls-update-title">Update Available</h2>
            <p className="ls-update-desc">
              A newer version of Infernix is available on the website.
            </p>
            <div className="ls-update-versions">
              <div className="ls-update-version-col">
                <span className="ls-update-version-label">Current</span>
                <span className="ls-update-badge current">v{version}</span>
              </div>
              <span className="ls-update-arrow">→</span>
              <div className="ls-update-version-col">
                <span className="ls-update-version-label">Latest</span>
                <span className="ls-update-badge latest">v{updateState.latest}</span>
              </div>
            </div>
            <div className="ls-update-actions">
              <button
                className="ls-update-btn primary"
                onClick={() => {
                  window.electronAPI?.openExternal?.('https://infernix.vercel.app/');
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Download Update
              </button>
              <button
                className="ls-update-btn secondary"
                onClick={() => {
                  updateShowRef.current = false;
                  setUpdateState(prev => ({ ...prev, show: false }));
                  if (doneRef.current) onDone?.();
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSubLabelsForStep(label) {
  const map = {
    'Initializing core': ['Loading config', 'Verifying integrity', 'Allocating buffers'],
    'Loading Lua engine': ['Parsing grammar', 'Building AST', 'Linking stdlib'],
    'Resolving offsets': ['Reading PE headers', 'Scanning .rdata', 'Matching signatures'],
    'Patching bytecode': ['Replacing OP codes', 'Injecting hooks', 'Verifying checksums'],
    'Binding APIs': ['Registering functions', 'Setting up callbacks', 'Linking proxies'],
    'Scanning modules': ['Enumerating DLLs', 'Reading exports', 'Mapping addresses'],
    'Hooking scheduler': ['Finding heartbeat', 'Installing trampoline', 'Testing latency'],
    'Loading presets': ['Reading themes', 'Applying accent', 'Caching icons'],
    'Caching Script Hub': ['Fetching index', 'Parsing metadata', 'Storing locally'],
    'Optimizing memory': ['Defragmenting pools', 'Purging cache', 'Compacting tables'],
    'Finalizing': ['Running health checks', 'Cleaning up', 'Preparing UI'],
    'Ready': ['Launching...'],
  };
  return map[label] || ['Working...'];
}
