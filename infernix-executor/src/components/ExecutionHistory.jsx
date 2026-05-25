import { useState, useEffect, useRef } from 'react';
import {
  X, History, Trash2, Clock, FileCode,
  CheckCircle, XCircle, RotateCcw, Search,
  ChevronDown, Flame
} from 'lucide-react';
import './ExecutionHistory.css';

export default function ExecutionHistory({ isOpen, onClose, onRerun }) {
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [closing, setClosing]         = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter]           = useState('all');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [expandedId, setExpandedId]   = useState(null);
  const [listKey, setListKey]         = useState(0); // force re-mount for animations
  const searchRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setSelectedItems(new Set());
      setExpandedId(null);
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI?.getExecutionHistory?.();
      setHistory(data || []);
      setListKey(k => k + 1); // re-trigger stagger animations
    } catch (e) {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 180);
  };

  const handleRerun = (item) => {
    if (onRerun) onRerun(item.script, item.scriptName);
    handleClose();
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all execution history?')) return;
    try {
      await window.electronAPI?.clearExecutionHistory?.();
      setHistory([]);
      setSelectedItems(new Set());
    } catch (e) { /* noop */ }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected item(s)?`)) return;
    try {
      await window.electronAPI?.deleteHistoryItems?.(Array.from(selectedItems));
      setHistory(prev => prev.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
    } catch (e) { /* noop */ }
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  };

  const formatTime = (ts) => {
    const date = new Date(ts);
    const diff = Date.now() - date;
    if (diff < 60000)    return { text: 'Just now',                              cls: 'time-green'  };
    if (diff < 3600000)  return { text: `${Math.floor(diff / 60000)}m ago`,     cls: 'time-green'  };
    if (diff < 86400000) return { text: `${Math.floor(diff / 3600000)}h ago`,   cls: 'time-muted'  };
    return { text: date.toLocaleDateString(), cls: 'time-muted' };
  };

  const getPreview = (script, maxLen = 90) => {
    if (!script) return '';
    const line = script.split('\n')[0];
    return line.length > maxLen ? line.slice(0, maxLen) + '…' : line;
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'success' && !item.success) return false;
    if (filter === 'failed'  &&  item.success) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.scriptName?.toLowerCase().includes(q) &&
          !item.script?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className={`hist-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`hist-modal ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="hist-header">
          <div className="hist-title">
            <div className="hist-icon">
              <History size={16} />
            </div>
            <div>
              <h2>Execution History</h2>
              <span className="hist-subtitle">{history.length} total execution{history.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button className="hist-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {/* ── Toolbar ────────────────────────────────────── */}
        <div className="hist-toolbar">
          <div className="hist-search" onClick={() => searchRef.current?.focus()}>
            <Search size={14} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search scripts…"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="hist-filters">
            <button className={`filt-btn ${filter === 'all'     ? 'active'       : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filt-btn ${filter === 'success' ? 'active green' : ''}`} onClick={() => setFilter('success')}>
              <CheckCircle size={12} /> OK
            </button>
            <button className={`filt-btn ${filter === 'failed'  ? 'active red'   : ''}`} onClick={() => setFilter('failed')}>
              <XCircle size={12} /> Err
            </button>
          </div>
        </div>

        {/* ── Action bar ─────────────────────────────────── */}
        {(selectedItems.size > 0 || history.length > 0) && (
          <div className="hist-actions">
            {selectedItems.size > 0 ? (
              <button className="action-btn danger" onClick={handleDeleteSelected}>
                <Trash2 size={13} /> Delete ({selectedItems.size})
              </button>
            ) : (
              <button className="action-btn ghost" onClick={handleClearHistory}>
                <Trash2 size={13} /> Clear All
              </button>
            )}
          </div>
        )}

        {/* ── Content ────────────────────────────────────── */}
        <div className="hist-content">
          {loading ? (
            <div className="hist-loading">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skel-row" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="skel skel-check" />
                  <div className="skel skel-badge" />
                  <div className="skel-info">
                    <div className="skel skel-line" style={{ width: '55%' }} />
                    <div className="skel skel-line" style={{ width: '75%' }} />
                  </div>
                  <div className="skel skel-btn" />
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="hist-empty">
              <div className="empty-icon"><History size={40} /></div>
              <h3>{searchQuery || filter !== 'all' ? 'No results' : 'No executions yet'}</h3>
              <p>{searchQuery ? `Nothing matched "${searchQuery}"` : 'Scripts you execute will appear here'}</p>
            </div>
          ) : (
            <div className="hist-list" key={listKey}>
              {filteredHistory.map((item, index) => {
                const time = formatTime(item.timestamp);
                const isExp = expandedId === item.id;
                const isSel = selectedItems.has(item.id);

                return (
                  <div
                    key={item.id || index}
                    className={`hist-item ${item.success ? 'is-ok' : 'is-err'} ${isSel ? 'is-selected' : ''} ${isExp ? 'is-expanded' : ''}`}
                    style={{ animationDelay: `${index * 0.045}s` }}
                    onClick={() => toggleSelect(item.id)}
                  >
                    {/* Colored left accent */}
                    <div className="item-accent" />

                    {/* Checkbox */}
                    <div className={`item-check ${isSel ? 'checked' : ''}`}>
                      {isSel && <CheckCircle size={11} />}
                    </div>

                    {/* Status dot */}
                    <div className={`item-status-dot ${item.success ? 'dot-ok' : 'dot-err'}`} />

                    {/* Info */}
                    <div className="item-info">
                      <div className="item-name">
                        <FileCode size={13} />
                        <span>{item.scriptName || 'Untitled'}</span>
                      </div>

                      {!isExp && (
                        <div className="item-preview">{getPreview(item.script)}</div>
                      )}

                      {isExp && (
                        <div className="item-expanded-code">
                          <pre>{item.script?.split('\n').slice(0, 8).join('\n') || ''}</pre>
                        </div>
                      )}

                      <div className="item-meta">
                        <span className={`meta-time ${time.cls}`}>
                          <Clock size={11} />{time.text}
                        </span>
                        {item.client && (
                          <span className="meta-client">
                            <Flame size={11} />{item.client}
                          </span>
                        )}
                        {item.success ? (
                          <span className="meta-tag ok"><CheckCircle size={10} /> OK</span>
                        ) : (
                          <span className="meta-tag err"><XCircle size={10} /> Failed</span>
                        )}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="item-btns">
                      <button
                        className="item-expand-btn"
                        onClick={e => toggleExpand(item.id, e)}
                        title={isExp ? 'Collapse' : 'Preview'}
                      >
                        <ChevronDown size={14} style={{ transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                      </button>
                      <button
                        className="item-rerun-btn"
                        onClick={e => { e.stopPropagation(); handleRerun(item); }}
                        title="Re-run"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer stats ───────────────────────────────── */}
        {history.length > 0 && (
          <div className="hist-footer">
            <span className="footer-stat ok">
              <CheckCircle size={12} /> {history.filter(h => h.success).length} success
            </span>
            <span className="footer-divider" />
            <span className="footer-stat err">
              <XCircle size={12} /> {history.filter(h => !h.success).length} failed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}