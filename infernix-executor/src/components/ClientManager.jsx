import { useState, useEffect, useRef } from 'react';
import { Zap, RefreshCw, Power, User, Gamepad2, Hash, Check, AlertCircle, Loader, CheckSquare, Square, XCircle, Unplug, Activity, Clock, Bot } from 'lucide-react';
import './ClientManager.css';

import { attachReliability, avgAttachTime, formatMs } from '../utils/stats';

function ClientManager({ clients, onNotify, stats, onAttach }) {
  const [gameInfo, setGameInfo] = useState({});
  const [avatars, setAvatars] = useState({});
  const [userIds, setUserIds] = useState({});
  const [selectedPids, setSelectedPids] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [autoAttachStatus, setAutoAttachStatus] = useState(null);
  const gameInfoCache = useRef(new Map());
  const avatarCache = useRef(new Map());
  const userIdCache = useRef(new Map());

  // Poll auto-attach status
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const status = await window.electronAPI?.getAutoAttachStatus?.();
        if (mounted) setAutoAttachStatus(status);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Parse client data - handles both array and object formats
  // PIDs must be strings like Xeno does
  const parseClient = (client) => {
    if (Array.isArray(client)) {
      // Real Xeno DLL format: [pid, username, version, status, placeId]
      return {
        pid: String(client[0] ?? ''),
        username: client[1] || 'Unknown',
        playerName: client[1] || '',
        status: client[3] || 0,
        version: client[2] || '',
        placeId: client[5] || null
      };
    }
    // Object format
    return {
      pid: String(client.pid ?? ''),
      username: client.username || 'Unknown',
      playerName: client.playerName || client.displayName || '',
      status: client.status || 0,
      version: client.version || '',
      placeId: client.placeId || client.PlaceId || null
    };
  };

  // Fetch game info using main process proxy (avoids CORS)
  useEffect(() => {
    const fetchGameInfo = async () => {
      for (const client of clients) {
        const parsed = parseClient(client);
        const placeId = parsed.placeId;
        
        if (!placeId || placeId === 0) continue;
        const placeIdStr = String(placeId);
        
        if (gameInfoCache.current.has(placeIdStr)) {
          setGameInfo(prev => ({...prev, [placeId]: gameInfoCache.current.get(placeIdStr)}));
          continue;
        }

        try {
          // Use the main process proxy to avoid CORS
          const info = await window.electronAPI?.robloxGetGameInfo(placeId);
          if (info) {
            gameInfoCache.current.set(placeIdStr, info);
            setGameInfo(prev => ({...prev, [placeId]: info}));
          }
        } catch (e) {
          console.error('Failed to fetch game info:', e);
        }
      }
    };

    if (clients.length > 0) {
      fetchGameInfo();
    }
  }, [clients]);

  // Fetch avatars using main process proxy (avoids CORS)
  useEffect(() => {
    const fetchAvatars = async () => {
      for (const client of clients) {
        const parsed = parseClient(client);
        const username = parsed.username;
        
        if (!username || username === 'Unknown') continue;
        if (avatarCache.current.has(username)) {
          setAvatars(prev => ({...prev, [username]: avatarCache.current.get(username)}));
          continue;
        }

        try {
          // First get user ID
          let userId = userIdCache.current.get(username);
          if (!userId) {
            const userInfo = await window.electronAPI?.robloxGetUserInfo(username);
            if (userInfo?.id) {
              userId = userInfo.id;
              userIdCache.current.set(username, userId);
              setUserIds(prev => ({...prev, [username]: userId}));
            }
          }
          
          if (userId) {
            // Then get avatar
            const avatarUrl = await window.electronAPI?.robloxGetAvatar(userId);
            if (avatarUrl) {
              avatarCache.current.set(username, avatarUrl);
              setAvatars(prev => ({...prev, [username]: avatarUrl}));
            }
          }
        } catch (e) {
          console.error('Failed to fetch avatar:', e);
        }
      }
    };

    if (clients.length > 0) {
      fetchAvatars();
    }
  }, [clients]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await window.electronAPI?.refreshClients();
      if (result?.ok) {
        // Clear game info cache so it re-fetches with new placeIds
        gameInfoCache.current.clear();
        setGameInfo({});
        onNotify?.({
          type: 'success',
          title: 'Refreshed',
          message: result.attached > 0
            ? `Found ${result.clients} client(s), ${result.attached} attached — game info refreshed`
            : result.message || 'No attached clients found'
        });
      } else {
        onNotify?.({
          type: 'error',
          title: 'Refresh Failed',
          message: result?.error || 'Could not refresh clients'
        });
      }
    } catch (e) {
      onNotify?.({
        type: 'error',
        title: 'Refresh Error',
        message: e.message
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAttach = async () => {
    if (onAttach) {
      await onAttach();
      return;
    }
    // Fallback if prop not provided
    try {
      const result = await window.electronAPI?.attach();
      if (result?.ok) {
        onNotify?.({ type: 'success', title: 'Attached', message: 'Successfully attached to Roblox' });
      } else {
        onNotify?.({ type: 'error', title: 'Attach Failed', message: result?.error || 'Could not attach to Roblox' });
      }
    } catch (e) {
      onNotify?.({ type: 'error', title: 'Attach Error', message: e.message });
    }
  };


  const handleUnattach = async () => {
    if (selectedPids.size === 0) {
      onNotify?.({
        type: 'warning',
        title: 'No Selection',
        message: 'Select a client to unattach'
      });
      return;
    }

    try {
      for (const pid of selectedPids) {
        await window.electronAPI?.unattach(pid);
      }
      onNotify?.({
        type: 'success',
        title: 'Unattached',
        message: 'Cleaned up '+ selectedPids.size + 'client(s) - UI destroyed'
      });
      setSelectedPids(new Set());
    } catch (e) {
      onNotify?.({
        type: 'error',
        title: 'Unattach Error',
        message: e.message
      });
    }
  };
  const handleKillAll = async () => {
    try {
      const result = await window.electronAPI?.killRoblox();
      if (result?.killed) {
        onNotify?.({
          type: 'success',
          title: 'Killed',
          message: 'All Roblox processes terminated'
        });
      } else {
        onNotify?.({
          type: 'warning',
          title: 'Kill Roblox',
          message: 'No Roblox processes found'
        });
      }
    } catch (e) {
      onNotify?.({
        type: 'error',
        title: 'Kill Failed',
        message: e.message
      });
    }
  };
  // Check if all clients are selected
  const allSelected = clients.length > 0 && clients.every(c => {
    const parsed = parseClient(c);
    return selectedPids.has(parsed.pid);
  });

  // Selection functions
  const toggleSelect = (pid) => {
    setSelectedPids(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pid)) {
        newSet.delete(pid);
      } else {
        newSet.add(pid);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPids(new Set());
    } else {
      const allPids = clients.map(c => {
        const parsed = parseClient(c);
        return parsed.pid;
      });
      setSelectedPids(new Set(allPids));
    }
  };

  const killSelected = async () => {
    if (selectedPids.size === 0) {
      onNotify?.({
        type: 'warning',
        title: 'No Selection',
        message: 'Select clients to kill first'
      });
      return;
    }

    try {
      for (const pid of selectedPids) {
        await window.electronAPI?.killProcess?.(parseInt(pid));
      }
      onNotify?.({
        type: 'success',
        title: 'Killed',
        message: `Killed ${selectedPids.size} client(s)`
      });
      setSelectedPids(new Set());
    } catch (e) {
      onNotify?.({
        type: 'error',
        title: 'Kill Failed',
        message: e.message
      });
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 3:
        return { label: 'ATTACHED', color: 'attached', icon: Check };
      case 2:
        return { label: 'WAITING', color: 'waiting', icon: Loader };
      case 1:
        return { label: 'ATTACHING', color: 'attaching', icon: Loader };
      default:
        return { label: 'READY', color: 'ready', icon: AlertCircle };
    }
  };

  return (
    <div className="client-manager">
      <div className="cm-header">
        <h2 className="cm-title">Client Manager</h2>
        <div className="cm-actions">
          <button className="cm-btn secondary" onClick={toggleSelectAll} title="Select All">
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            Select All
          </button>
          <button className="cm-btn primary" onClick={handleAttach}>
            <Zap size={14} />
            Attach
          </button>
          <button className="cm-btn secondary" onClick={handleRefresh} disabled={refreshing} title="Re-detect game info for all clients">
            <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {selectedPids.size > 0 && (
            <>
              <button className="cm-btn warning" onClick={handleUnattach} title="Unattach - Cleans up all injected UI">
                <Unplug size={14} />
                Unattach ({selectedPids.size})
              </button>
              <button className="cm-btn danger" onClick={killSelected}>
                <XCircle size={14} />
                Kill ({selectedPids.size})
              </button>
            </>
          )}
          <button className="cm-btn danger" onClick={handleKillAll}>
            <Power size={14} />
            Kill All
          </button>
        </div>
      </div>

      {/* Attach stats — subtle live telemetry */}
      {(stats?.attach?.attempts > 0 || autoAttachStatus) && (
        <div className="cm-stats">
          {autoAttachStatus && (
            <>
              <span className="cm-stat" title={autoAttachStatus.enabled ? 'Auto Attach is enabled' : 'Auto Attach is disabled'}>
                <Bot size={10} style={{ color: autoAttachStatus.enabled ? '#34d399' : 'var(--text-muted)' }} />
                <span className="cm-stat-val" style={{ color: autoAttachStatus.enabled ? '#34d399' : 'var(--text-muted)' }}>
                  {autoAttachStatus.enabled ? 'ON' : 'OFF'}
                </span>
                <span className="cm-stat-label">auto</span>
              </span>
              <span className="cm-stat-divider" />
            </>
          )}
          {stats?.attach?.attempts > 0 && (
            <>
              <span className="cm-stat" title="Attach success rate">
                <Activity size={10} />
                <span className="cm-stat-val">{attachReliability(stats)}%</span>
                <span className="cm-stat-label">reliability</span>
              </span>
              <span className="cm-stat-divider" />
              <span className="cm-stat" title="Total attach attempts">
                <span className="cm-stat-val">{stats.attach.attempts}</span>
                <span className="cm-stat-label">attempts</span>
              </span>
              <span className="cm-stat-divider" />
              <span className="cm-stat" title="Average attach time">
                <Clock size={10} />
                <span className="cm-stat-val">{formatMs(avgAttachTime(stats))}</span>
                <span className="cm-stat-label">avg</span>
              </span>
              {stats.attach.lastTime > 0 && (
                <>
                  <span className="cm-stat-divider" />
                  <span className="cm-stat" title="Last attach time">
                    <span className="cm-stat-val">{formatMs(stats.attach.lastTime)}</span>
                    <span className="cm-stat-label">last</span>
                  </span>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="clients-list">
        {clients.length === 0 ? (
          <div className="no-clients">
            <div className="no-clients-icon">
              <User size={40} />
            </div>
            <h3>No Roblox Clients Detected</h3>
            <p>Launch Roblox and join a game, then click Attach to get started</p>
          </div>
        ) : (
          clients.map((client, idx) => {
            const parsed = parseClient(client);
            const statusInfo = getStatusInfo(parsed.status);
            const StatusIcon = statusInfo.icon;
            const game = gameInfo[parsed.placeId];
            const avatar = avatars[parsed.username];
            const isSelected = selectedPids.has(parsed.pid);

            return (
              <div 
                key={parsed.pid || idx} 
                className={`client-card ${isSelected ? 'selected': ''}`}
                onClick={() => toggleSelect(parsed.pid)}
              >
                <div className="client-select">
                  {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className="client-avatar">
                  {avatar ? (
                    <img src={avatar} alt="" />
                  ) : (
                    <div className="avatar-placeholder">
                      <User size={24} />
                    </div>
                  )}
                </div>

                <div className="client-info">
                  <div className="client-user">
                    <span className="username">{parsed.username}</span>
                    {parsed.playerName && parsed.playerName !== parsed.username && (
                      <span className="display-name">({parsed.playerName})</span>
                    )}
                  </div>

                  <div className="client-game">
                    {game?.thumbnail ? (
                      <img src={game.thumbnail} alt="" className="game-icon" />
                    ) : (
                      <Gamepad2 size={16} className="game-icon-fallback" />
                    )}
                    <span className="game-name">{game?.name || 'Not in game'}</span>
                  </div>
                </div>

                <div className="client-pid">
                  <Hash size={12} />
                  <span>PID:</span>
                  <strong>{parsed.pid}</strong>
                </div>

                <div className={`client-status ${statusInfo.color}`}>
                  <StatusIcon size={12} className={statusInfo.color === 'attaching'|| statusInfo.color === 'waiting'? 'spinning': ''} />
                  <span>{statusInfo.label}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ClientManager;



