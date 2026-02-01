import { useState, useRef } from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { Play, Trash2, Power, Save, FolderOpen, Plus, X, Check } from 'lucide-react';
import SaveScriptModal from './SaveScriptModal';
import OpenScriptModal from './OpenScriptModal';
import './EditorView.css';

function EditorView({ tabs, activeTab, onTabChange, onNewTab, onCloseTab, onRenameTab, onCodeChange, onNotify, clients = [] }) {
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const renameInputRef = useRef(null);

  const activeScript = tabs.find(t => t.id === activeTab);

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    onCloseTab(tabId);
  };

  const handleCodeChange = (value) => {
    onCodeChange(activeTab, value || '');
  };

  // Execute script directly via HTTP (like Xeno does)
  const executeScript = async (script, targetClients) => {
    console.log('Executing script via HTTP to port 3110');
    console.log('Target clients:', targetClients);
    console.log('Script length:', script?.length);
    
    try {
      const response = await fetch('http://localhost:3110/o', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Clients': JSON.stringify(targetClients)
        },
        body: script
      });
      
      console.log('Execution response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Execution failed:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      return { ok: true };
    } catch (error) {
      console.error('Direct execution failed:', error);
      // Fallback to IPC
      if (window.electronAPI?.execute) {
        console.log('Falling back to IPC execution');
        return await window.electronAPI.execute(script, targetClients);
      }
      throw error;
    }
  };

  // Parse client helper - PIDs must be strings like Xeno does
  const parseClient = (client) => {
    if (Array.isArray(client)) {
      return {
        pid: String(client[0] ?? ''),
        username: client[1],
        playerName: client[2],
        status: client[3],
        version: client[4],
        placeId: client[5]
      };
    }
    return {
      ...client,
      pid: String(client.pid ?? '')
    };
  };

  const handleExecute = async () => {
    if (!activeScript?.content) {
      onNotify({
        type: 'error',
        title: 'No Script',
        message: 'Nothing to execute'
      });
      return;
    }
    
    try {
      // Get all clients with status attached (3)
      const attachedClients = clients
        .map(parseClient)
        .filter(c => c.status === 3)
        .map(c => c.pid);
      
      console.log('Attached clients for execution:', attachedClients);
      console.log('All clients:', clients.map(parseClient));
      
      if (attachedClients.length === 0) {
        onNotify({
          type: 'warning',
          title: 'No Clients',
          message: 'No attached Roblox clients found'
        });
        return;
      }
      
      // Execute via direct HTTP (like Xeno)
      console.log('Executing script to:', attachedClients);
      const result = await executeScript(activeScript.content, attachedClients);
      if (result?.ok) {
        onNotify({
          type: 'fire',
          title: 'Script Executed',
          message: `Running on ${attachedClients.length} client(s)...`
        });
      } else {
        onNotify({
          type: 'warning',
          title: 'Execution Warning',
          message: result?.error || 'Execution may have failed'
        });
      }
    } catch (e) {
      onNotify({
        type: 'error',
        title: 'Execution Failed',
        message: e.message || 'Unknown error'
      });
    }
  };

  const handleClear = () => {
    onCodeChange(activeTab, '');
  };

  const handleSaveScript = async (name, description) => {
    if (!activeScript?.content) {
      onNotify({
        type: 'warning',
        title: 'Nothing to Save',
        message: 'Script is empty'
      });
      return;
    }
    
    try {
      const result = await window.electronAPI?.saveScript(name, description, activeScript.content);
      if (result?.ok) {
        onNotify({
          type: 'success',
          title: 'Script Saved',
          message: `"${name}" saved successfully`
        });
        // Update the tab name to match
        onRenameTab(activeTab, name);
      } else {
        throw new Error(result?.error || 'Failed to save');
      }
    } catch (e) {
      onNotify({
        type: 'error',
        title: 'Save Failed',
        message: e.message
      });
    }
  };

  const handleOpenScript = (name, content) => {
    // Create a new tab with the loaded script name and content
    onNewTab({ name, content });
    
    onNotify({
      type: 'success',
      title: 'Script Loaded',
      message: `"${name}" opened in new tab`
    });
  };

  const handleKillRoblox = async () => {
    try {
      const result = await window.electronAPI?.killRoblox();
      if (result?.killed) {
        onNotify({
          type: 'success',
          title: 'Roblox Killed',
          message: 'All Roblox processes terminated'
        });
      } else {
        onNotify({
          type: 'warning',
          title: 'Kill Roblox',
          message: 'No Roblox processes found'
        });
      }
    } catch (e) {
      onNotify({
        type: 'error',
        title: 'Kill Failed',
        message: e.message
      });
    }
  };

  const handleDoubleClick = (e, tab) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingName(tab.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const handleRenameSubmit = (tabId) => {
    if (editingName.trim()) {
      onRenameTab(tabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleRenameKeyDown = (e, tabId) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    monaco.editor.defineTheme('infernix-fire', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ef4444', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'dc2626' },
        { token: 'string', foreground: 'fbbf24' },
        { token: 'string.escape', foreground: 'fde047' },
        { token: 'number', foreground: 'fb923c' },
        { token: 'number.float', foreground: 'fdba74' },
        { token: 'variable', foreground: 'e5e7eb' },
        { token: 'variable.predefined', foreground: 'f97316' },
        { token: 'function', foreground: 'facc15' },
        { token: 'type', foreground: 'f59e0b' },
        { token: 'type.identifier', foreground: 'fcd34d' },
        { token: 'tag', foreground: 'ef4444' },
        { token: 'attribute.name', foreground: 'fb923c' },
        { token: 'attribute.value', foreground: 'fbbf24' },
        { token: 'delimiter', foreground: '9ca3af' },
        { token: 'delimiter.bracket', foreground: 'a8a29e' },
        { token: 'operator', foreground: 'f97316' },
        { token: 'constant', foreground: 'dc2626' },
        { token: 'constant.language', foreground: 'ef4444' },
        { token: 'global', foreground: 'f59e0b' },
        { token: 'identifier', foreground: 'e5e7eb' },
        { token: 'predefined', foreground: 'facc15' },
      ],
      colors: {
        'editor.background': '#0a0a0a',
        'editor.foreground': '#e5e7eb',
        'editor.lineHighlightBackground': '#1a1510',
        'editor.selectionBackground': '#f9731644',
        'editorCursor.foreground': '#f97316',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#f97316',
        'editor.wordHighlightBackground': '#f9731622',
        'editorBracketMatch.background': '#f9731633',
        'editorBracketMatch.border': '#f97316',
      },
    });
    monaco.editor.setTheme('infernix-fire');
  };

  return (
    <div className="editor-view">
      {/* Tab Bar */}
      <div className="tab-bar">
        <div className="tabs">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              onDoubleClick={(e) => handleDoubleClick(e, tab)}
            >
              {editingTabId === tab.id ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  className="tab-rename-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRenameSubmit(tab.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, tab.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="tab-name">{tab.name}</span>
              )}
              <button 
                className="tab-close" 
                onClick={(e) => handleCloseTab(e, tab.id)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button className="tab-new" onClick={onNewTab}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button className="tool-btn primary" onClick={handleExecute}>
          <Play size={14} />
          <span>Execute</span>
        </button>
        <button className="tool-btn" onClick={handleClear}>
          <Trash2 size={14} />
          <span>Clear</span>
        </button>
        <div className="toolbar-divider" />
        <button className="tool-btn danger" onClick={handleKillRoblox}>
          <Power size={14} />
          <span>Kill Roblox</span>
        </button>
        <div className="toolbar-spacer" />
        <button className="tool-btn" onClick={() => setShowSaveModal(true)}>
          <Save size={14} />
          <span>Save</span>
        </button>
        <button className="tool-btn" onClick={() => setShowOpenModal(true)}>
          <FolderOpen size={14} />
          <span>Open</span>
        </button>
      </div>

      {/* Editor */}
      <div className="editor-container">
        <MonacoEditor
          height="100%"
          defaultLanguage="lua"
          value={activeScript?.content || ''}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true, scale: 1, showSlider: 'always' },
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
            fontLigatures: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      {/* Modals */}
      <SaveScriptModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveScript}
        defaultName={activeScript?.name || 'Untitled'}
      />
      
      <OpenScriptModal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        onOpen={handleOpenScript}
      />
    </div>
  );
}

export default EditorView;

