import { useState, useRef, useEffect, useCallback } from 'react';
import './DevTerminal.css';

const WELCOME = `Infernix Dev Terminal v1.0.0
Type commands and press Enter. Output streams live.
Type 'clear' to clear the screen.\r\n`;

function DevTerminal({ className = '' }) {
  const [lines, setLines] = useState([{ type: 'system', text: WELCOME }]);
  const [input, setInput]   = useState('');
  const [cwd, setCwd]       = useState('~');
  const [busy, setBusy]     = useState(false);
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Register output listener once
  useEffect(() => {
    window.electronAPI?.devTerminalStart?.().then(r => {
      if (r?.cwd) setCwd(r.cwd);
    });

    const handler = (data) => {
      if (data.type === 'done') {
        setCwd(data.cwd || cwd);
        setBusy(false);
        return;
      }
      if (data.type === 'error') {
        appendLine({ type: 'error', text: data.text });
        setBusy(false);
        return;
      }
      if (data.text) {
        appendLine({ type: data.type === 'stderr' ? 'error' : 'stdout', text: data.text });
      }
    };

    window.electronAPI?.onDevTerminalOutput?.(handler);
    return () => window.electronAPI?.removeDevTerminalListeners?.();
  }, []); // eslint-disable-line

  const appendLine = useCallback((line) => {
    setLines(prev => [...prev, line]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const runCommand = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setLines([]);
      return;
    }

    // Add to history
    setHistory(prev => [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 50));
    setHistIdx(-1);

    // Echo the command
    appendLine({ type: 'prompt', text: `${cwd}> ${trimmed}` });
    setBusy(true);
    window.electronAPI?.devTerminalInput?.(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (busy) return;
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      setInput(history[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? '' : history[next]);
    } else if (e.key === 'c' && e.ctrlKey) {
      window.electronAPI?.devTerminalKill?.();
      appendLine({ type: 'system', text: '^C\r\n' });
      setBusy(false);
    }
  };

  return (
    <div className={`dev-terminal ${className}`} onClick={() => inputRef.current?.focus()}>
      <div className="dev-terminal-header">
        <span className="dt-dot dt-red" />
        <span className="dt-dot dt-yellow" />
        <span className="dt-dot dt-green" />
        <span className="dt-title">POWERSHELL — INFERNIX DEV</span>
        <button className="dt-clear-btn" onClick={() => setLines([])}>CLR</button>
      </div>

      <div className="dev-terminal-body">
        {lines.map((line, i) => (
          <pre key={i} className={`dt-line dt-${line.type}`}>
            {line.text}
          </pre>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="dev-terminal-input-row">
        <span className="dt-cwd">{cwd}&gt;</span>
        <input
          ref={inputRef}
          className="dt-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          placeholder={busy ? 'Running…' : 'Enter command…'}
          autoComplete="off"
          spellCheck={false}
        />
        {busy && <span className="dt-busy-indicator" />}
      </div>
    </div>
  );
}

export default DevTerminal;
