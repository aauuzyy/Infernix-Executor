import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Play, Check, X, FileText, ChevronRight } from 'lucide-react';
import './AutoExecManager.css';

function AutoExecManager({ tabs, onClose }) {
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [autoExecScripts, setAutoExecScripts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load existing autoexec scripts
  useEffect(() => {
    loadAutoExecScripts();
  }, []);

  const loadAutoExecScripts = async () => {
    try {
      const scripts = await window.electronAPI?.getAutoExecScripts?.();
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

  const openAutoExecFolder = async () => {
    await window.electronAPI?.openAutoexecDir?.();
  };

  return (
    <div className="autoexec-modal-overlay" onClick={onClose}>
      <div className="autoexec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="autoexec-header">
          <h2>🔥 AutoExec Manager</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="autoexec-content">
          {/* Left Panel - Open Tabs */}
          <div className="autoexec-panel">
            <div className="panel-header">
              <h3><FileText size={14} /> Open Tabs</h3>
              <div className="panel-actions">
                <button onClick={selectAll} className="mini-btn">All</button>
                <button onClick={deselectAll} className="mini-btn">None</button>
              </div>
            </div>
            
            <div className="tabs-list">
              {(tabs || []).map(tab => (
                <div 
                  key={tab.id}
                  className={`tab-item ${selectedTabs.includes(tab.id) ? 'selected' : ''}`}
                  onClick={() => toggleTabSelection(tab.id)}
                >
                  <div className="tab-checkbox">
                    {selectedTabs.includes(tab.id) && <Check size={12} />}
                  </div>
                  <span className="tab-name">{tab.name}</span>
                  <span className="tab-preview">
                    {(tab.content || '').split('\n')[0].substring(0, 30)}...
                  </span>
                </div>
              ))}
            </div>

            <button 
              className="add-to-autoexec-btn"
              onClick={addToAutoExec}
              disabled={selectedTabs.length === 0 || loading}
            >
              <ChevronRight size={16} />
              Add {selectedTabs.length > 0 ? `(${selectedTabs.length})` : ''} to AutoExec
            </button>
          </div>

          {/* Right Panel - AutoExec Scripts */}
          <div className="autoexec-panel">
            <div className="panel-header">
              <h3><Play size={14} /> AutoExec Scripts</h3>
              <button onClick={openAutoExecFolder} className="mini-btn">
                <FolderOpen size={12} /> Open Folder
              </button>
            </div>

            <div className="autoexec-list">
              {autoExecScripts.length === 0 ? (
                <div className="empty-state">
                  <p>No autoexec scripts yet.</p>
                  <p className="muted">Scripts here run automatically when you join a game.</p>
                </div>
              ) : (
                autoExecScripts.map((script, index) => (
                  <div key={index} className="autoexec-item">
                    <FileText size={14} />
                    <span className="script-name">{script.name}</span>
                    <button 
                      className="remove-btn"
                      onClick={() => removeFromAutoExec(script.name)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="autoexec-info">
              <p>✨ Scripts auto-execute when you attach to Roblox</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutoExecManager;
