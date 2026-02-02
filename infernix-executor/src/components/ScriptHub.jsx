import { Search, Star, Download, ExternalLink, Flame, Filter, RefreshCw, ChevronDown, Eye, Key, Globe, Copy, Play, FileText, Gamepad2, X, Zap } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

  // Virtualization state - track which cards are visible
  const [visibleIndices, setVisibleIndices] = useState(new Set());
  const observerRef = useRef(null);
  const cardRefs = useRef(new Map());

  // Game Detection State
  const [detectedGame, setDetectedGame] = useState(null);
  const [gameFilterEnabled, setGameFilterEnabled] = useState(true);
  const gameInfoCache = useRef(new Map());

  // Setup Intersection Observer for virtualization with fade animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const index = parseInt(entry.target.dataset.index);
          if (!isNaN(index)) {
            setVisibleIndices(prev => {
              const newSet = new Set(prev);
              if (entry.isIntersecting) {
                newSet.add(index);
              } else {
                newSet.delete(index);
              }
              return newSet;
            });
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '150px 0px', // Preload cards slightly before visible
        threshold: 0.1
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Register cards with observer
  const registerCardRef = useCallback((index, element) => {
    if (element) {
      cardRefs.current.set(index, element);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      const existing = cardRefs.current.get(index);
      if (existing && observerRef.current) {
        observerRef.current.unobserve(existing);
      }
      cardRefs.current.delete(index);
    }
  }, []);

  // Detect game from connected clients
  useEffect(() => {
    const detectGame = async () => {
      if (!clients || clients.length === 0) return;

      const clientsWithGame = clients.filter(client => {
        if (Array.isArray(client)) {
          const placeId = client[5] || client[6];
          return placeId && Number(placeId) > 0;
        }
        const placeId = client.placeId || client.PlaceId || client.place_id || client.rootPlaceId;
        return placeId && Number(placeId) > 0;
      });

      if (clientsWithGame.length === 0) {
        setDetectedGame(null);
        return;
      }

      const firstClient = clientsWithGame[0];
      let placeId = Array.isArray(firstClient) ? (firstClient[5] || firstClient[6]) : 
        (firstClient.placeId || firstClient.PlaceId || firstClient.place_id || firstClient.rootPlaceId);

      if (!placeId) { setDetectedGame(null); return; }

      const placeIdStr = String(placeId);
      if (gameInfoCache.current.has(placeIdStr)) {
        setDetectedGame(gameInfoCache.current.get(placeIdStr));
        return;
      }

      try {
        const gameInfo = await window.electronAPI?.robloxGetGameInfo(placeId);
        if (gameInfo) {
          const fullGameInfo = { placeId: placeIdStr, ...gameInfo };
          gameInfoCache.current.set(placeIdStr, fullGameInfo);
          setDetectedGame(fullGameInfo);
        }
      } catch (error) {
        console.error('Failed to detect game:', error);
      }
    };
    detectGame();
  }, [clients]);

  // Fetch scripts with optional game filter
  const fetchScriptsForGame = useCallback(async (placeId = null, resetPage = true) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;

    try {
      const query = { page: currentPage, max: 20, sortBy, order: 'desc' };
      if (placeId && gameFilterEnabled) query.placeId = placeId;
      if (filters.mode) query.mode = filters.mode;
      if (filters.key !== null) query.key = filters.key ? '1' : '0';

      let data = window.electronAPI?.scriptbloxFetch 
        ? await window.electronAPI.scriptbloxFetch('script/fetch', query)
        : await (await fetch(`https://scriptblox.com/api/script/fetch?${new URLSearchParams(query)}`)).json();

      let gameScripts = data.result?.scripts || [];
      setTotalPages(data.result?.totalPages || 1);

      if (placeId && gameFilterEnabled && gameScripts.length < 20) {
        const universalData = window.electronAPI?.scriptbloxFetch
          ? await window.electronAPI.scriptbloxFetch('script/fetch', { page: 1, max: 10, sortBy: 'views', order: 'desc', universal: '1' })
          : await (await fetch(`https://scriptblox.com/api/script/fetch?page=1&max=10&sortBy=views&order=desc&universal=1`)).json();
        if (universalData.result?.scripts) {
          gameScripts = [...gameScripts, ...universalData.result.scripts.map(s => ({...s, _isUniversal: true}))];
        }
      }

      if (resetPage) { setScripts(gameScripts); setPage(1); setVisibleIndices(new Set()); }
      else { setScripts(prev => [...prev, ...gameScripts]); }
      setHasMore(gameScripts.length >= 20);
    } catch (error) { console.error('Failed to fetch scripts:', error); }
    setLoading(false);
  }, [page, sortBy, filters, gameFilterEnabled]);

  const fetchFeaturedScripts = async () => {
    setLoading(true);
    try {
      const query = { page: 1, max: 20, sortBy: 'views', order: 'desc' };
      const data = window.electronAPI?.scriptbloxFetch
        ? await window.electronAPI.scriptbloxFetch('script/fetch', query)
        : await (await fetch(`https://scriptblox.com/api/script/fetch?${new URLSearchParams(query)}`)).json();
      if (data.result?.scripts) {
        setScripts(data.result.scripts);
        setTotalPages(data.result.totalPages || 1);
        setHasMore(data.result.scripts.length === 20);
        setVisibleIndices(new Set());
      }
    } catch (error) { console.error('Failed to fetch featured scripts:', error); }
    setLoading(false);
  };

  const fetchScripts = async (reset = false) => {
    if (!search.trim()) {
      setIsSearchMode(false);
      if (detectedGame && gameFilterEnabled) fetchScriptsForGame(detectedGame.placeId, true);
      else fetchFeaturedScripts();
      return;
    }
    setIsSearchMode(true);
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const query = { q: search.trim(), page: currentPage, max: 20, sortBy, order: 'desc', strict: 'true' };
      if (filters.mode) query.mode = filters.mode;
      if (filters.key !== null) query.key = filters.key ? '1' : '0';
      if (filters.universal !== null) query.universal = filters.universal ? '1' : '0';
      if (detectedGame && gameFilterEnabled) query.placeId = detectedGame.placeId;

      const data = window.electronAPI?.scriptbloxFetch
        ? await window.electronAPI.scriptbloxFetch('script/search', query)
        : await (await fetch(`https://scriptblox.com/api/script/search?${new URLSearchParams(query)}`)).json();

      if (data.result?.scripts) {
        if (reset) { setScripts(data.result.scripts); setPage(1); setVisibleIndices(new Set()); }
        else { setScripts(prev => [...prev, ...data.result.scripts]); }
        setTotalPages(data.result.totalPages || 1);
        setHasMore(currentPage < (data.result.totalPages || 1));
      }
    } catch (error) { console.error('Failed to fetch scripts:', error); }
    setLoading(false);
  };

  useEffect(() => {
    if (detectedGame && gameFilterEnabled && !search.trim()) fetchScriptsForGame(detectedGame.placeId, true);
    else if (!search.trim()) fetchFeaturedScripts();
  }, [detectedGame, gameFilterEnabled]);

  useEffect(() => {
    if (search.trim()) {
      const timer = setTimeout(() => fetchScripts(true), 500);
      return () => clearTimeout(timer);
    }
  }, [search, sortBy, filters]);

  const handleLoadScript = async (script) => {
    try {
      if (script.script && onLoadScript) { onLoadScript(script.script); return; }
      const data = window.electronAPI?.scriptbloxFetch
        ? await window.electronAPI.scriptbloxFetch(`script/${script.slug}`, {})
        : await (await fetch(`https://scriptblox.com/api/script/${script.slug}`)).json();
      if (data.script?.script && onLoadScript) onLoadScript(data.script.script);
    } catch (err) { console.error('Failed to load script:', err); }
  };

  const parseClient = (client) => {
    if (Array.isArray(client)) {
      return { pid: String(client[0] ?? ''), username: client[1], playerName: client[2], status: client[3], version: client[4], placeId: client[5] };
    }
    return { ...client, pid: String(client.pid ?? '') };
  };

  const executeScript = async (script, targetClients) => {
    try {
      const response = await fetch('http://localhost:3110/o', {
        method: 'POST', headers: { 'Content-Type': 'text/plain', 'Clients': JSON.stringify(targetClients) }, body: script
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ok: true };
    } catch (error) {
      if (window.electronAPI?.execute) return await window.electronAPI.execute(script, targetClients);
      throw error;
    }
  };

  const handleExecuteScript = async (script) => {
    try {
      let scriptContent = script.script;
      if (!scriptContent) {
        const data = window.electronAPI?.scriptbloxFetch
          ? await window.electronAPI.scriptbloxFetch(`script/${script.slug}`, {})
          : await (await fetch(`https://scriptblox.com/api/script/${script.slug}`)).json();
        scriptContent = data.script?.script;
      }
      if (scriptContent) {
        const attachedClients = clients.map(parseClient).filter(c => c.status === 3).map(c => c.pid);
        if (attachedClients.length === 0 && window.electronAPI?.execute) {
          await window.electronAPI.execute(scriptContent, []);
          return;
        }
        await executeScript(scriptContent, attachedClients);
      }
    } catch (err) { console.error('Failed to execute script:', err); }
  };

  const handleCopyScript = async (script) => {
    try {
      let scriptContent = script.script;
      if (!scriptContent) {
        const data = window.electronAPI?.scriptbloxFetch
          ? await window.electronAPI.scriptbloxFetch(`script/${script.slug}`, {})
          : await (await fetch(`https://scriptblox.com/api/script/${script.slug}`)).json();
        scriptContent = data.script?.script;
      }
      if (scriptContent) {
        await navigator.clipboard.writeText(scriptContent);
        setCopiedId(script._id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) { console.error('Failed to copy script:', err); }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    if (isSearchMode) fetchScripts(false);
    else if (detectedGame && gameFilterEnabled) fetchScriptsForGame(detectedGame.placeId, false);
    else {
      setLoading(true);
      const query = { page: nextPage, max: 20, sortBy: 'views', order: 'desc' };
      if (window.electronAPI?.scriptbloxFetch) {
        window.electronAPI.scriptbloxFetch('script/fetch', query).then(data => {
          if (data.result?.scripts) { setScripts(prev => [...prev, ...data.result.scripts]); setHasMore(nextPage < (data.result.totalPages || 1)); }
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
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getImageUrl = (script) => {
    if (script.game?.imageUrl) {
      const url = script.game.imageUrl;
      return url.startsWith('http') ? url : `https://scriptblox.com${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return null;
  };

  const toggleGameFilter = () => {
    setGameFilterEnabled(!gameFilterEnabled);
    if (!gameFilterEnabled && detectedGame) fetchScriptsForGame(detectedGame.placeId, true);
    else fetchFeaturedScripts();
  };

  return (
    <div className="scripthub">
      <div className="scripthub-header">
        {detectedGame && (
          <div className={`game-detection-banner ${gameFilterEnabled ? 'active' : 'inactive'}`}>
            <div className="game-info">
              {detectedGame.thumbnail && <img src={detectedGame.thumbnail} alt="" className="game-thumb" />}
              <div className="game-details">
                <div className="game-status"><Zap size={12} /><span>Playing</span></div>
                <h3 className="game-name">{detectedGame.name}</h3>
                <span className="game-creator">by {detectedGame.creator}</span>
              </div>
            </div>
            <div className="game-filter-toggle">
              <button className={`filter-toggle-btn ${gameFilterEnabled ? 'enabled' : ''}`} onClick={toggleGameFilter}>
                {gameFilterEnabled ? <><Gamepad2 size={14} /><span>Game Filter ON</span></> : <><Globe size={14} /><span>Show All</span></>}
              </button>
            </div>
          </div>
        )}

        <div className="search-row">
          <div className="search-box">
            <Search size={14} />
            <input type="text" placeholder={detectedGame && gameFilterEnabled ? `Search scripts for ${detectedGame.name}...` : "Search scripts..."} value={search} onChange={(e) => setSearch(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && fetchScripts(true)} />
          </div>
          <div className="header-actions">
            <button className={`filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} />Filters<ChevronDown size={12} className={showFilters ? 'rotated' : ''} />
            </button>
            <button className="refresh-btn" onClick={() => { if (detectedGame && gameFilterEnabled) fetchScriptsForGame(detectedGame.placeId, true); else if (search) fetchScripts(true); else fetchFeaturedScripts(); }}>
              <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group"><label>Sort by</label><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="views">Most Views</option><option value="likeCount">Most Likes</option><option value="updatedAt">Recently Updated</option><option value="createdAt">Newest</option></select></div>
            <div className="filter-group"><label>Type</label><select value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value })}><option value="">All</option><option value="free">Free</option><option value="paid">Paid</option></select></div>
            <div className="filter-group"><label>Key Required</label><select value={filters.key === null ? '' : filters.key ? '1' : '0'} onChange={(e) => setFilters({ ...filters, key: e.target.value === '' ? null : e.target.value === '1' })}><option value="">Any</option><option value="0">No Key</option><option value="1">Key Required</option></select></div>
            <div className="filter-group"><label>Universal</label><select value={filters.universal === null ? '' : filters.universal ? '1' : '0'} onChange={(e) => setFilters({ ...filters, universal: e.target.value === '' ? null : e.target.value === '1' })}><option value="">Any</option><option value="1">Universal Only</option><option value="0">Game Specific</option></select></div>
          </div>
        )}

        {!search && !loading && scripts.length > 0 && (
          <div className="section-title">
            {detectedGame && gameFilterEnabled ? <><Gamepad2 size={16} /><span>Scripts for {detectedGame.name}</span></> : <><Flame size={16} /><span>Featured Scripts</span></>}
          </div>
        )}
      </div>

      <div className="scripts-container" ref={scrollContainerRef}>
        <div className="scripts-grid">
          {scripts.map((script, idx) => (
            <div key={script._id || idx} ref={(el) => registerCardRef(idx, el)} data-index={idx} className={`script-card-wrapper ${visibleIndices.has(idx) ? 'in-view' : 'out-of-view'}`}>
              {(visibleIndices.has(idx) || idx < 8) ? (
                <div className={`script-card ${script._isUniversal ? 'universal-highlight' : ''}`}>
                  <div className="script-thumbnail">
                    {getImageUrl(script) ? <img src={getImageUrl(script)} alt="" loading="lazy" /> : <div className="thumb-placeholder"><Flame size={28} /></div>}
                    <div className="thumbnail-overlay">
                      <div className="script-badges">
                        {script.key && <span className="badge key-badge" title="Key Required"><Key size={10} />KEY</span>}
                        {(script.isUniversal || script._isUniversal) && <span className="badge universal-badge" title="Universal Script"><Globe size={10} />UNIVERSAL</span>}
                      </div>
                    </div>
                  </div>
                  <div className="script-content">
                    <div className="script-header"><h4 className="script-title" title={script.title}>{script.title}</h4></div>
                    <div className="script-info"><p className="script-game">{script.game?.name || 'Universal'}</p></div>
                    <div className="script-stats">
                      <span className="stat" title="Views"><Eye size={12} />{formatNumber(script.views)}</span>
                      <span className="stat" title="Likes"><Star size={12} />{formatNumber(script.likeCount)}</span>
                      <span className="stat date" title="Updated">{formatDate(script.updatedAt || script.createdAt)}</span>
                    </div>
                    <div className="script-actions">
                      <button className={`action-btn copy-btn ${copiedId === script._id ? 'copied' : ''}`} onClick={() => handleCopyScript(script)} title="Copy Script"><Copy size={12} /></button>
                      <button className="action-btn open-btn" onClick={() => handleLoadScript(script)} title="Open in Tab"><FileText size={12} />Open in Tab</button>
                      <button className="action-btn execute-btn" onClick={() => handleExecuteScript(script)} title="Execute Script"><Play size={12} />Execute Script</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="script-card placeholder-card"><div className="script-thumbnail"><div className="thumb-placeholder"><Flame size={28} /></div></div><div className="script-content"><div className="placeholder-text"></div><div className="placeholder-text short"></div></div></div>
              )}
            </div>
          ))}

          {loading && scripts.length === 0 && <div className="loading-state"><Flame size={32} className="flame-loader" /><p>Loading scripts...</p></div>}
          {!loading && scripts.length === 0 && <div className="empty-state"><Search size={32} /><p>No scripts found</p><span>{detectedGame && gameFilterEnabled ? `No scripts found for ${detectedGame.name}. Try disabling game filter.` : 'Try a different search term'}</span></div>}
        </div>
      </div>

      {hasMore && !loading && scripts.length > 0 && <div className="load-more-section"><button className="load-more-btn" onClick={handleLoadMore}><RefreshCw size={14} />Load More Scripts</button><span className="page-info">Page {page} of {totalPages}</span></div>}
      {loading && scripts.length > 0 && <div className="loading-more"><Flame size={16} className="flame-loader" /><span>Loading more...</span></div>}
    </div>
  );
}

export default ScriptHub;