import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Play, Check, X, FileText, Zap, RefreshCw, Power } from 'lucide-react';
import './AutoExecManager.css';

function AutoExecManager({ tabs, onClose }) {
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [autoExecScripts, setAutoExecScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  // Load existing autoexec scripts
  useEffect(() => {
    loadAutoExecScripts();
  }, []);

  const loadAutoExecScripts = async () => {
    try {
      const scripts = await window.electronAPI?.getAutoExecScripts?.();
      // Backend now returns correct enabled state per script
      setAutoExecScripts(scripts || []);
    } catch (e) {
      console.error('Failed to load autoexec scripts:', e);
    }
  };

  const toggleTabSelection = (tabId) => {
    setSelectedTabs(prev =>
      prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    );
  };

  const selectAll = () => {
    setSelectedTabs((tabs || []).map(t => t.id));
  };

  const deselectAll = () => {
    setSelectedTabs([]);
  };

  const addToAutoExec = async () => {
    if (selectedTabs.length === 0) return;

    setLoading(true);
    try {
      for (const tabId of selectedTabs) {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
          await window.electronAPI?.addToAutoExec?.({
            name: tab.name,
            content: tab.content
          });
        }
      }
      await loadAutoExecScripts();
      setSelectedTabs([]);
    } catch (e) {
      console.error('Failed to add to autoexec:', e);
    } finally {
      setLoading(false);
    }
  };

  const removeFromAutoExec = async (scriptName) => {
    try {
      await window.electronAPI?.removeFromAutoExec?.(scriptName);
      await loadAutoExecScripts();
    } catch (e) {
      console.error('Failed to remove from autoexec:', e);
    }
  };

  const toggleScriptEnabled = async (index) => {
    const script = autoExecScripts[index];
    if (!script) return;
    const newEnabled = !script.enabled;
    try {
      await window.electronAPI?.setAutoExecEnabled?.(script.name, newEnabled);
      await loadAutoExecScripts();
    } catch (e) {
      console.error('Failed to toggle autoexec script:', e);
    }
  };

  const runScriptNow = async (script) => {
    try {
      await window.electronAPI?.execute?.(script.content, [], script.name);
    } catch (e) {
      console.error('Failed to run script:', e);
    }
  };

  const openAutoExecFolder = async () => {
    await window.electronAPI?.openAutoexecDir?.();
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 250);
  };

  return (
    <div className={`autoexec-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`autoexec-modal ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="autoexec-header">
          <div className="autoexec-title">
            <div className="autoexec-icon">
              <Zap size={16} />
            </div>
            <h2>AutoExec Manager</h2>
          </div>
          <button className="autoexec-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {/* Two-panel body */}
        <div className="autoexec-body">

          {/* Left — Open Tabs */}
          <div className="autoexec-panel left-panel">
            <div className="panel-head">
              <div className="panel-head-title">
                <FileText size={13} />
                <span>Open Tabs</span>
              </div>
              <div className="panel-head-actions">
                <button onClick={selectAll} className="ghost-btn">All</button>
                <button onClick={deselectAll} className="ghost-btn">Clear</button>
              </div>
            </div>

            <div className="panel-list">
              {(tabs || []).length === 0 ? (
                <div className="panel-empty">
                  <FileText size={28} />
                  <p>No open tabs</p>
                  <span>Open scripts in the editor first</span>
                </div>
              ) : (
                (tabs || []).map(tab => (
                  <div
                    key={tab.id}
                    className={`tab-row ${selectedTabs.includes(tab.id) ? 'selected' : ''}`}
                    onClick={() => toggleTabSelection(tab.id)}
                  >
                    <div className="tab-row-check">
                      {selectedTabs.includes(tab.id) && <Check size={11} />}
                    </div>
                    <div className="tab-row-info">
                      <span className="tab-row-name">{tab.name}</span>
                      <span className="tab-row-preview">
                        {(tab.content || '').split('\n')[0].substring(0, 42) || 'Empty'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              className="add-btn"
              onClick={addToAutoExec}
              disabled={selectedTabs.length === 0 || loading}
            >
              <Plus size={14} />
              {loading ? 'Adding…' : `Add to AutoExec${selectedTabs.length > 0 ? ` (${selectedTabs.length})` : ''}`}
            </button>
          </div>

          {/* Divider */}
          <div className="panel-divider" />

          {/* Right — AutoExec list */}
          <div className="autoexec-panel right-panel">
            <div className="panel-head">
              <div className="panel-head-title">
                <Play size={13} />
                <span>AutoExec Scripts</span>
              </div>
              <div className="panel-head-actions">
                <button onClick={loadAutoExecScripts} className="ghost-btn icon-only" title="Refresh">
                  <RefreshCw size={13} />
                </button>
                <button onClick={openAutoExecFolder} className="ghost-btn">
                  <FolderOpen size={13} />
                  Folder
                </button>
              </div>
            </div>

            <div className="panel-list">
              {autoExecScripts.length === 0 ? (
                <div className="panel-empty">
                  <Zap size={28} />
                  <p>No scripts yet</p>
                  <span>Select tabs and click Add to AutoExec</span>
                </div>
              ) : (
                autoExecScripts.map((script, index) => (
                  <div
                    key={index}
                    className={`script-row ${!script.enabled ? 'row-disabled' : ''}`}
                    style={{ animationDelay: `${index * 0.04}s` }}
                  >
                    <div className="script-row-icon">
                      <FileText size={14} />
                    </div>
                    <div className="script-row-info">
                      <span className="script-row-name">{script.name}</span>
                      <span className="script-row-status">
                        {script.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="script-row-actions">
                      <button
                        className={`toggle-btn ${script.enabled ? 'on' : 'off'}`}
                        onClick={() => toggleScriptEnabled(index)}
                        title={script.enabled ? 'Disable' : 'Enable'}
                      >
                        <Power size={12} />
                      </button>
                      <button
                        className="run-btn"
                        onClick={() => runScriptNow(script)}
                        title="Run now"
                      >
                        <Play size={11} />
                        Run
                      </button>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromAutoExec(script.name)}
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="autoexec-hint">
              <Zap size={12} />
              <span>Enabled scripts run automatically on attach</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutoExecManager;