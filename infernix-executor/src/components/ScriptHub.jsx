import { Search, Star, Download, ExternalLink, Flame, Filter, RefreshCw, ChevronDown, Eye, Key, Globe, Copy, Play, FileText, Gamepad2, X, Zap } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import './ScriptHub.css';

function ScriptHub({ onLoadScript, onExecuteScript, clients = [] }) {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('views');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    mode: '',
    key: null,
    universal: null
  });
  const [isSearchMode, setIsSearchMode] = useState(false);
  const scrollContainerRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  // Game Detection State
  const [detectedGame, setDetectedGame] = useState(null);
  const [gameFilterEnabled, setGameFilterEnabled] = useState(true);
  const gameInfoCache = useRef(new Map());
  const placeToUniverseCache = useRef(new Map());

  // Detect game from connected clients (passed as prop)
  useEffect(() => {
    const detectGame = async () => {
      console.log('ScriptHub received clients:', clients);
      
      if (!clients || clients.length === 0) {
        console.log('No clients connected');
        return;
      }
      
      // Find clients with placeId - check multiple formats
      const clientsWithGame = clients.filter(client => {
        // Client can be array format [pid, username, playerName, status, version, placeId]
        // or object format {pid, username, placeId, ...}
        if (Array.isArray(client)) {
          // Array format - placeId is at index 5 or might be elsewhere
          const placeId = client[5] || client[6];
          return placeId && Number(placeId) > 0;
        }
        // Object format - check various property names
        const placeId = client.placeId || client.PlaceId || client.place_id || client.rootPlaceId;
        return placeId && Number(placeId) > 0;
      });

      console.log('Clients with game:', clientsWithGame);

      if (clientsWithGame.length === 0) {
        setDetectedGame(null);
        return;
      }

      // Get the placeId from first connected client
      const firstClient = clientsWithGame[0];
      let placeId;
      if (Array.isArray(firstClient)) {
        placeId = firstClient[5] || firstClient[6];
      } else {
        placeId = firstClient.placeId || firstClient.PlaceId || firstClient.place_id || firstClient.rootPlaceId;
      }
      
      if (!placeId) {
        setDetectedGame(null);
        return;
      }

      const placeIdStr = String(placeId);

      // Check cache first
      if (gameInfoCache.current.has(placeIdStr)) {
        setDetectedGame(gameInfoCache.current.get(placeIdStr));
        return;
      }

      try {
        // Use the main process proxy to avoid CORS issues
        const gameInfo = await window.electronAPI?.robloxGetGameInfo(placeId);
        
        if (gameInfo) {
          const fullGameInfo = {
            placeId: placeIdStr,
            ...gameInfo
          };
          gameInfoCache.current.set(placeIdStr, fullGameInfo);
          setDetectedGame(fullGameInfo);
        } else {
          setDetectedGame(null);
        }
      } catch (error) {
        console.error('Failed to detect game:', error);
        setDetectedGame(null);
      }
    };

    detectGame();
  }, [clients]);

  // Fetch scripts with optional game filter
  const fetchScriptsForGame = useCallback(async (placeId = null, resetPage = true) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;
    
    try {
      const query = {
        page: currentPage,
        max: 20,
        sortBy: sortBy,
        order: 'desc'
      };

      // Add placeId filter if game detected and filter enabled
      if (placeId && gameFilterEnabled) {
        query.placeId = placeId;
      }

      if (filters.mode) query.mode = filters.mode;
      if (filters.key !== null) query.key = filters.key ? '1' : '0';

      let data;
      if (window.electronAPI?.scriptbloxFetch) {
        data = await window.electronAPI.scriptbloxFetch('script/fetch', query);
      } else {
        const params = new URLSearchParams(query);
        const response = await fetch(`https://scriptblox.com/api/script/fetch?${params}`);
        data = await response.json();
      }

      console.log('Scripts response:', data);

      let gameScripts = [];
      if (data.result && data.result.scripts) {
        gameScripts = data.result.scripts;
        setTotalPages(data.result.totalPages || 1);
      }

      // If we have a placeId filter and game filter is enabled, also fetch universal scripts
      if (placeId && gameFilterEnabled && gameScripts.length < 20) {
        // Fetch some universal scripts too
        const universalQuery = {
          page: 1,
          max: 10,
          sortBy: 'views',
          order: 'desc',
          universal: '1'
        };

        let universalData;
        if (window.electronAPI?.scriptbloxFetch) {
          universalData = await window.electronAPI.scriptbloxFetch('script/fetch', universalQuery);
        } else {
          const params = new URLSearchParams(universalQuery);
          const response = await fetch(`https://scriptblox.com/api/script/fetch?${params}`);
          universalData = await response.json();
        }

        if (universalData.result?.scripts) {
          // Mark universal scripts and combine
          const universalScripts = universalData.result.scripts.map(s => ({...s, _isUniversal: true}));
          gameScripts = [...gameScripts, ...universalScripts];
        }
      }

      if (resetPage) {
        setScripts(gameScripts);
        setPage(1);
      } else {
        setScripts(prev => [...prev, ...gameScripts]);
      }
      setHasMore(gameScripts.length >= 20);

    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    }
    setLoading(false);
  }, [page, sortBy, filters, gameFilterEnabled]);

  // Fetch featured/top scripts (no game filter)
  const fetchFeaturedScripts = async () => {
    setLoading(true);
    try {
      const query = {
        page: 1,
        max: 20,
        sortBy: 'views',
        order: 'desc'
      };

      let data;
      if (window.electronAPI?.scriptbloxFetch) {
        data = await window.electronAPI.scriptbloxFetch('script/fetch', query);
      } else {
        const params = new URLSearchParams(query);
        const response = await fetch(`https://scriptblox.com/api/script/fetch?${params}`);
        data = await response.json();
      }

      if (data.result && data.result.scripts) {
        setScripts(data.result.scripts);
        setTotalPages(data.result.totalPages || 1);
        setHasMore(data.result.scripts.length === 20);
      }
    } catch (error) {
      console.error('Failed to fetch featured scripts:', error);
    }
    setLoading(false);
  };

  // Fetch scripts when search changes
  const fetchScripts = async (reset = false) => {
    if (!search.trim()) {
      setIsSearchMode(false);
      // Use game filter if available
      if (detectedGame && gameFilterEnabled) {
        fetchScriptsForGame(detectedGame.placeId, true);
      } else {
        fetchFeaturedScripts();
      }
      return;
    }

    setIsSearchMode(true);
    setLoading(true);

    try {
      const currentPage = reset ? 1 : page;
      const query = {
        q: search.trim(),
        page: currentPage,
        max: 20,
        sortBy: sortBy,
        order: 'desc',
        strict: 'true'
      };

      if (filters.mode) query.mode = filters.mode;
      if (filters.key !== null) query.key = filters.key ? '1' : '0';
      if (filters.universal !== null) query.universal = filters.universal ? '1' : '0';
      
      // Add placeId if game detected and filter enabled
      if (detectedGame && gameFilterEnabled) {
        query.placeId = detectedGame.placeId;
      }

      let data;
      if (window.electronAPI?.scriptbloxFetch) {
        data = await window.electronAPI.scriptbloxFetch('script/search', query);
      } else {
        const params = new URLSearchParams(query);
        const response = await fetch(`https://scriptblox.com/api/script/search?${params}`);
        data = await response.json();
      }

      if (data.result && data.result.scripts) {
        if (reset) {
          setScripts(data.result.scripts);
          setPage(1);
        } else {
          setScripts(prev => [...prev, ...data.result.scripts]);
        }
        setTotalPages(data.result.totalPages || 1);
        setHasMore(currentPage < (data.result.totalPages || 1));
      }
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    }
    setLoading(false);
  };

  // Initial load and when game changes
  useEffect(() => {
    if (detectedGame && gameFilterEnabled && !search.trim()) {
      fetchScriptsForGame(detectedGame.placeId, true);
    } else if (!search.trim()) {
      fetchFeaturedScripts();
    }
  }, [detectedGame, gameFilterEnabled]);

  // Handle search with debounce
  useEffect(() => {
    if (search.trim()) {
      const timer = setTimeout(() => fetchScripts(true), 500);
      return () => clearTimeout(timer);
    }
  }, [search, sortBy, filters]);

  const handleLoadScript = async (script) => {
    try {
      if (script.script && onLoadScript) {
        onLoadScript(script.script);
        return;
      }

      let data;
      if (window.electronAPI?.scriptbloxFetch) {
        data = await window.electronAPI.scriptbloxFetch(`script/${script.slug}`, {});
      } else {
        const res = await fetch(`https://scriptblox.com/api/script/${script.slug}`);
        data = await res.json();
      }

      if (data.script?.script && onLoadScript) {
        onLoadScript(data.script.script);
      }
    } catch (err) {
      console.error('Failed to load script:', err);
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

  // Execute via direct HTTP like EditorView
  const executeScript = async (script, targetClients) => {
    try {
      const response = await fetch('http://localhost:3110/o', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Clients': JSON.stringify(targetClients)
        },
        body: script
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return { ok: true };
    } catch (error) {
      console.error('Direct execution failed:', error);
      // Fallback to IPC
      if (window.electronAPI?.execute) {
        return await window.electronAPI.execute(script, targetClients);
      }
      throw error;
    }
  };

  const handleExecuteScript = async (script) => {
    try {
      let scriptContent = script.script;

      if (!scriptContent) {
        let data;
        if (window.electronAPI?.scriptbloxFetch) {
          data = await window.electronAPI.scriptbloxFetch(`script/${script.slug}`, {});
        } else {
          const res = await fetch(`https://scriptblox.com/api/script/${script.slug}`);
          data = await res.json();
        }
        scriptContent = data.script?.script;
      }

      if (scriptContent) {
        // Get attached clients
        const attachedClients = clients
          .map(parseClient)
          .filter(c => c.status === 3)
          .map(c => c.pid);
        
        if (attachedClients.length === 0) {
          console.warn('No attached clients for execution');
          // Still try IPC as fallback
          if (window.electronAPI?.execute) {
            await window.electronAPI.execute(scriptContent, []);
          }
          return;
        }
        
        await executeScript(scriptContent, attachedClients);
        console.log('Script executed:', script.title);
      }
    } catch (err) {
      console.error('Failed to execute script:', err);
    }
  };

  const handleCopyScript = async (script) => {
    try {
      let scriptContent = script.script;

      if (!scriptContent) {
        let data;
        if (window.electronAPI?.scriptbloxFetch) {
          data = await window.electronAPI.scriptbloxFetch(`script/${script.slug}`, {});
        } else {
          const res = await fetch(`https://scriptblox.com/api/script/${script.slug}`);
          data = await res.json();
        }
        scriptContent = data.script?.script;
      }

      if (scriptContent) {
        await navigator.clipboard.writeText(scriptContent);
        setCopiedId(script._id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy script:', err);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);

    if (isSearchMode) {
      fetchScripts(false);
    } else if (detectedGame && gameFilterEnabled) {
      fetchScriptsForGame(detectedGame.placeId, false);
    } else {
      setLoading(true);
      const query = {
        page: nextPage,
        max: 20,
        sortBy: 'views',
        order: 'desc'
      };

      if (window.electronAPI?.scriptbloxFetch) {
        window.electronAPI.scriptbloxFetch('script/fetch', query).then(data => {
          if (data.result && data.result.scripts) {
            setScripts(prev => [...prev, ...data.result.scripts]);
            setHasMore(nextPage < (data.result.totalPages || 1));
          }
          setLoading(false);
        }).catch(() => setLoading(false));
      }
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getImageUrl = (script) => {
    if (script.game?.imageUrl) {
      const url = script.game.imageUrl;
      if (url.startsWith('http')) return url;
      return `https://scriptblox.com${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return null;
  };

  const toggleGameFilter = () => {
    setGameFilterEnabled(!gameFilterEnabled);
    if (!gameFilterEnabled && detectedGame) {
      // Re-enabling filter - fetch game scripts
      fetchScriptsForGame(detectedGame.placeId, true);
    } else {
      // Disabling filter - fetch all featured
      fetchFeaturedScripts();
    }
  };

  return (
    <div className="scripthub">
      <div className="scripthub-header">
        {/* Game Detection Banner */}
        {detectedGame && (
          <div className={`game-detection-banner ${gameFilterEnabled ? 'active' : 'inactive'}`}>
            <div className="game-info">
              {detectedGame.thumbnail && (
                <img src={detectedGame.thumbnail} alt="" className="game-thumb" />
              )}
              <div className="game-details">
                <div className="game-status">
                  <Zap size={12} />
                  <span>Playing</span>
                </div>
                <h3 className="game-name">{detectedGame.name}</h3>
                <span className="game-creator">by {detectedGame.creator}</span>
              </div>
            </div>
            <div className="game-filter-toggle">
              <button 
                className={`filter-toggle-btn ${gameFilterEnabled ? 'enabled' : ''}`}
                onClick={toggleGameFilter}
                title={gameFilterEnabled ? 'Showing scripts for this game' : 'Showing all scripts'}
              >
                {gameFilterEnabled ? (
                  <>
                    <Gamepad2 size={14} />
                    <span>Game Filter ON</span>
                  </>
                ) : (
                  <>
                    <Globe size={14} />
                    <span>Show All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="search-row">
          <div className="search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder={detectedGame && gameFilterEnabled 
                ? `Search scripts for ${detectedGame.name}...` 
                : "Search scripts..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchScripts(true)}
            />
          </div>

          <div className="header-actions">
            <button
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} />
              Filters
              <ChevronDown size={12} className={showFilters ? 'rotated' : ''} />
            </button>

            <button className="refresh-btn" onClick={() => {
              if (detectedGame && gameFilterEnabled) {
                fetchScriptsForGame(detectedGame.placeId, true);
              } else if (search) {
                fetchScripts(true);
              } else {
                fetchFeaturedScripts();
              }
            }}>
              <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>Sort by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="views">Most Views</option>
                <option value="likeCount">Most Likes</option>
                <option value="updatedAt">Recently Updated</option>
                <option value="createdAt">Newest</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Type</label>
              <select value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value })}>
                <option value="">All</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Key Required</label>
              <select
                value={filters.key === null ? '' : filters.key ? '1' : '0'}
                onChange={(e) => setFilters({ ...filters, key: e.target.value === '' ? null : e.target.value === '1' })}
              >
                <option value="">Any</option>
                <option value="0">No Key</option>
                <option value="1">Key Required</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Universal</label>
              <select
                value={filters.universal === null ? '' : filters.universal ? '1' : '0'}
                onChange={(e) => setFilters({ ...filters, universal: e.target.value === '' ? null : e.target.value === '1' })}
              >
                <option value="">Any</option>
                <option value="1">Universal Only</option>
                <option value="0">Game Specific</option>
              </select>
            </div>
          </div>
        )}

        {!search && !loading && scripts.length > 0 && (
          <div className="section-title">
            {detectedGame && gameFilterEnabled ? (
              <>
                <Gamepad2 size={16} />
                <span>Scripts for {detectedGame.name}</span>
              </>
            ) : (
              <>
                <Flame size={16} />
                <span>Featured Scripts</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="scripts-container" ref={scrollContainerRef}>
        <div className="scripts-grid">
          {scripts.map((script, idx) => (
            <div key={script._id || idx} className={`script-card ${script._isUniversal ? 'universal-highlight' : ''}`}>
              <div className="script-thumbnail">
                {getImageUrl(script) ? (
                  <img src={getImageUrl(script)} alt="" loading="lazy" />
                ) : (
                  <div className="thumb-placeholder">
                    <Flame size={28} />
                  </div>
                )}
                <div className="thumbnail-overlay">
                  <div className="script-badges">
                    {script.key && (
                      <span className="badge key-badge" title="Key Required">
                        <Key size={10} />
                        KEY
                      </span>
                    )}
                    {(script.isUniversal || script._isUniversal) && (
                      <span className="badge universal-badge" title="Universal Script">
                        <Globe size={10} />
                        UNIVERSAL
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="script-content">
                <div className="script-header">
                  <h4 className="script-title" title={script.title}>{script.title}</h4>
                </div>

                <div className="script-info">
                  <p className="script-game">{script.game?.name || 'Universal'}</p>
                </div>

                <div className="script-stats">
                  <span className="stat" title="Views">
                    <Eye size={12} />
                    {formatNumber(script.views)}
                  </span>
                  <span className="stat" title="Likes">
                    <Star size={12} />
                    {formatNumber(script.likeCount)}
                  </span>
                  <span className="stat date" title="Updated">
                    {formatDate(script.updatedAt || script.createdAt)}
                  </span>
                </div>

                <div className="script-actions">
                  <button
                    className={`action-btn copy-btn ${copiedId === script._id ? 'copied' : ''}`}
                    onClick={() => handleCopyScript(script)}
                    title="Copy Script"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    className="action-btn open-btn"
                    onClick={() => handleLoadScript(script)}
                    title="Open in Tab"
                  >
                    <FileText size={12} />
                    Open in Tab
                  </button>
                  <button
                    className="action-btn execute-btn"
                    onClick={() => handleExecuteScript(script)}
                    title="Execute Script"
                  >
                    <Play size={12} />
                    Execute Script
                  </button>
                </div>
              </div>
            </div>
          ))}

          {loading && scripts.length === 0 && (
            <div className="loading-state">
              <Flame size={32} className="flame-loader" />
              <p>Loading scripts...</p>
            </div>
          )}

          {!loading && scripts.length === 0 && (
            <div className="empty-state">
              <Search size={32} />
              <p>No scripts found</p>
              <span>{detectedGame && gameFilterEnabled 
                ? `No scripts found for ${detectedGame.name}. Try disabling game filter.` 
                : 'Try a different search term'}</span>
            </div>
          )}
        </div>
      </div>

      {hasMore && !loading && scripts.length > 0 && (
        <div className="load-more-section">
          <button className="load-more-btn" onClick={handleLoadMore}>
            <RefreshCw size={14} />
            Load More Scripts
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
        </div>
      )}

      {loading && scripts.length > 0 && (
        <div className="loading-more">
          <Flame size={16} className="flame-loader" />
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
}

export default ScriptHub;
