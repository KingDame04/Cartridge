import React, { useState, useEffect, useMemo } from 'react';
import logo from '../assets/Menu & Fab.png';
import searchIcon from '../assets/Icon.png';
import GameDetailsModal from '../components/GameDetailsModal';

const GameSearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [userLists] = useState([
    { id: 'fav-id-123', name: 'Favorites' },
    { id: 'back-id-456', name: 'Backlog' },
  ]);

  const [userCollection, setUserCollection] = useState([]);

  const [filterLists, setFilterLists] = useState([]); 
  const [playedFilter, setPlayedFilter] = useState('All'); 
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [filterDevelopers, setFilterDevelopers] = useState([]); 
  const [filterGenres, setFilterGenres] = useState([]); 
  const [collectionSortRule, setCollectionSortRule] = useState('date_desc'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('cartridge_items_per_page')) || 10);

  const [selectedGame, setSelectedGame] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState(null);

 
  const getDeveloperDisplay = (game) => {
    if (game.developer) return game.developer;
    if (Array.isArray(game.developers) && game.developers.length > 0) {
      return game.developers.join(', ');
    }
    return '';
  };


  const getGenreDisplay = (game) => {
    if (Array.isArray(game.genres) && game.genres.length > 0) {
      return game.genres.slice(0, 3).join(', ');
    }
    if (typeof game.genre === 'string') return game.genre;
    return 'N/A';
  };

  const dynamicDevelopers = useMemo(() => {
    const devs = userCollection.flatMap(g => g.developers || [g.developer]).filter(Boolean);
    return [...new Set(devs)];
  }, [userCollection]);

  const dynamicGenres = useMemo(() => [...new Set(userCollection.flatMap(g => g.genres || []).filter(Boolean))], [userCollection]);

  useEffect(() => {
    if (!query.trim()) return setResults([]);
    setLoading(true);
    
    const delayDebounceFn = setTimeout(async () => {
    try {
        const response = await fetch(`http://localhost:5000/api/games/search?search=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Search endpoint failed");
        const data = await response.json();

        setResults(data.results || data || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleItemsPerPageChange = (val) => {
    setItemsPerPage(val === 'All' ? userCollection.length : Number(val));
    localStorage.setItem('cartridge_items_per_page', val);
    setCurrentPage(1);
  };

  const toggleCheckboxFilter = (item, state, setter) => {
    setter(state.includes(item) ? state.filter(i => i !== item) : [...state, item]);
    setCurrentPage(1); 
  };

  const getListNameById = (id) => {
    const listObj = userLists.find(l => l.id === id);
    return listObj ? listObj.name : id;
  };

  const processedCollection = useMemo(() => {
    return [...userCollection]
      .filter(game => filterLists.length === 0 || (game.listIds && game.listIds.some(lId => filterLists.includes(lId))))
      .filter(game => playedFilter === 'All' || (playedFilter === 'Played' ? game.played : !game.played))
      .filter(game => {
        const y = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
        return (!yearMin || (y && y >= parseInt(yearMin, 10))) && (!yearMax || (y && y <= parseInt(yearMax, 10)));
      })
      .filter(game => {
        if (filterDevelopers.length === 0) return true;
        const gameDevs = game.developers || (game.developer ? [game.developer] : []);
        return gameDevs.some(dev => filterDevelopers.includes(dev));
      })
      .filter(game => filterGenres.length === 0 || (game.genres && game.genres.some(g => filterGenres.includes(g))))
      .sort((a, b) => {
        const devA = getDeveloperDisplay(a);
        const devB = getDeveloperDisplay(b);
        const sortMap = {
          date_desc: () => new Date(b.dateAdded || b.createdAt) - new Date(a.dateAdded || a.createdAt),
          date_asc: () => new Date(a.dateAdded || a.createdAt) - new Date(b.dateAdded || b.createdAt),
          title_asc: () => a.name.localeCompare(b.name),
          title_desc: () => b.name.localeCompare(a.name),
          dev_asc: () => devA.localeCompare(devB),
          dev_desc: () => devB.localeCompare(devA),
          rate_desc: () => b.rating - a.rating,
          rate_asc: () => a.rating - b.rating,
        };
        return (sortMap[collectionSortRule] || sortMap.date_desc)();
      });
  }, [userCollection, filterLists, playedFilter, yearMin, yearMax, filterDevelopers, filterGenres, collectionSortRule, userLists]);

  const totalPages = Math.ceil(processedCollection.length / itemsPerPage) || 1;
  const paginatedCollection = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedCollection.slice(start, start + itemsPerPage);
  }, [processedCollection, currentPage, itemsPerPage]);

const openAddModal = async (game) => {
    setSelectedGame(game);
    setModalFormData({
      ...game,
      developer: getDeveloperDisplay(game) || 'Loading...',
      played: false,
      hoursPlayed: 0,
      rating: 0,
      review: '',
      platforms: game.platforms || [],
      platformPlayed: '',
      listIds: []
    });
    setIsModalOpen(true);

    const id = game.id || game.rawgId;
    if (!id) return;

    try {
      const detailRes = await fetch(`http://localhost:5000/api/games/rawg/${id}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        const enrichedGame = {
          ...game,
          ...detailData,
          developers: detailData.developers || game.developers || []
        };
        setSelectedGame(enrichedGame);
        setModalFormData(prev => ({
          ...prev,
          ...enrichedGame,
          developer: getDeveloperDisplay(enrichedGame) || 'Unknown Developer',
          played: prev.played,
          hoursPlayed: prev.hoursPlayed,
          rating: prev.rating,
          review: prev.review,
          platformPlayed: prev.platformPlayed,
          listIds: prev.listIds,
        }));
      } else {
        console.warn(`Detail fetch returned ${detailRes.status} for game ${id}`);
        setModalFormData(prev => ({ ...prev, developer: 'Unknown Developer' }));
      }
    } catch (err) {
      console.error(`Detail fetch error for game ${id}:`, err);
      setModalFormData(prev => ({ ...prev, developer: 'Unknown Developer' }));
    }
  };

  const openEditModal = (game) => {
    setSelectedGame(game);
    setModalFormData({
      ...game,
      entryId: game.entryId,
      gameId: game.gameId, 
      rawgId: game.rawgId, 
      name: game.name, 
      releaseDate: game.releaseDate,
      developer: getDeveloperDisplay(game) || 'Unknown Developer', 
      played: game.played ?? true,
      hoursPlayed: game.hoursPlayed ?? 0, 
      rating: game.rating ?? 0, 
      review: game.review ?? '',
      platforms: game.platforms || [], 
      platformPlayed: game.platformPlayed || '',
      listIds: game.listIds || [],
      dateAdded: game.dateAdded || game.createdAt
    });
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!selectedGame || !modalFormData) return;

    const isExistingEntry = !!modalFormData.entryId;
    const targetListIds = modalFormData.listIds || [];

    const backendPayload = {
      played: !!modalFormData.played,
      hoursPlayed: Number(modalFormData.hoursPlayed) || 0,
      rating: modalFormData.rating ? Number(modalFormData.rating) : null,
      review: modalFormData.review || "",
      platformPlayed: modalFormData.platformPlayed || "",
      listIds: targetListIds,
    };

    if (!isExistingEntry) {
      if (selectedGame.gameId) {
        backendPayload.gameId = selectedGame.gameId;
      } else if (selectedGame.rawgId || selectedGame.id) {
        backendPayload.rawgId = Number(selectedGame.rawgId || selectedGame.id);
      }
    }

    const url = isExistingEntry 
      ? `http://localhost:5000/api/gameuserentries/${modalFormData.entryId}`
      : 'http://localhost:5000/api/gameuserentries';
    
    const method = isExistingEntry ? 'PUT' : 'POST';

    const localUpdatedItem = {
      entryId: modalFormData.entryId || "temp_" + Date.now(),
      gameId: selectedGame.gameId || null,
      rawgId: selectedGame.rawgId || selectedGame.id || null,
      name: selectedGame.name,
      developer: getDeveloperDisplay(selectedGame) || 'Unknown Developer',
      developers: selectedGame.developers || [],
      releaseDate: selectedGame.releaseDate,
      genres: selectedGame.genres || [],
      coverImage: selectedGame.coverImage || null,
      played: modalFormData.played,
      hoursPlayed: Number(modalFormData.hoursPlayed),
      rating: modalFormData.rating,
      review: modalFormData.review,
      platformPlayed: modalFormData.platformPlayed,
      listIds: targetListIds,
      dateAdded: modalFormData.dateAdded || new Date().toISOString()
    };

    setUserCollection(prev => {
      const filtered = prev.filter(item => item.entryId !== modalFormData.entryId);
      return [localUpdatedItem, ...filtered];
    });

    setIsModalOpen(false);
    setSelectedGame(null);
    setModalFormData(null);

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload)
      });
      if (response.ok) {
        const serverData = await response.json();
        setUserCollection(prev => prev.map(item => 
          (item.entryId === localUpdatedItem.entryId || item.entryId === serverData.entryId) ? serverData : item
        ));
      }
    } catch {
      console.warn("Backend server not reached yet. Running in offline/mock mode.");
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'monospace, sans-serif' }}>
      <div style={{ width: '260px', backgroundColor: '#787878', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '30px', display: 'flex', justifyContent: 'center' }}>
          <img src={logo} alt="Cartridge Logo" style={{ width: '160px', height: 'auto' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px' }}>
          {['Home', 'Collection', 'Profile'].map((item) => (
            <button key={item} style={{ padding: '16px 20px', backgroundColor: item === 'Collection' ? '#98B910' : 'transparent', border: 'none', color: item === 'Collections' ? '#143910' : '#fff', textAlign: 'left', borderRadius: '30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: '#143910', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px', borderBottom: '6px solid #0b1f09' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '900px' }}>
            <input type="text" placeholder="Search your library or type a new game to add..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%', padding: '16px 50px 16px 25px', borderRadius: '40px', border: 'none', backgroundColor: '#98B910', fontWeight: 'bold', fontSize: '18px', outline: 'none', color: '#143910' }} />
            <img src={searchIcon} alt="Search" style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '28px' }} />
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '40px', display: 'flex', gap: '30px' }}>
          {query ? (
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', color: '#143910', marginBottom: '20px' }}>Search Results</h1>
              {loading && <h3 style={{ color: '#143910' }}>Searching...</h3>}
              {!loading && results.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {results.map((game) => (
  <div
    key={game.rawgId || game.gameId || game.id}
    style={{
      border: '2px dashed #98B910',
      borderRadius: '20px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between',
      backgroundColor: '#f8fafc',
      boxSizing: 'border-box'
    }}
  >
    <div>
      {/* BIGGER COVER IMAGE */}
      {game.coverImage ? (
        <img
          src={game.coverImage}
          alt={game.name}
          style={{
            width: '100%',
            height: '150px',
            objectFit: 'cover',
            borderRadius: '12px',
            marginBottom: '12px'
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '150px',
            backgroundColor: '#cbd5e1',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '12px'
          }}
        >
          🎮
        </div>
      )}

      {/* GAME DETAILS */}
      <h4
        style={{
          margin: '0 0 6px 0',
          color: '#143910',
          fontSize: '16px',
          textAlign: 'center',
          lineHeight: '1.2'
        }}
      >
        {game.name}
      </h4>

      <div
        style={{
          fontSize: '12px',
          color: '#64748b',
          lineHeight: '1.4',
          textAlign: 'center',
          marginBottom: '16px'
        }}
      >
        <div><strong>Genre:</strong> {getGenreDisplay(game)}</div>
        <div><strong>Released:</strong> {game.releaseDate ? new Date(game.releaseDate).getFullYear() : 'N/A'}</div>
      </div>
    </div>

    {/* ACTION BUTTON */}
    <button
      onClick={() => openAddModal(game)}
      style={{
        backgroundColor: '#143910',
        color: '#fff',
        border: 'none',
        padding: '10px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        width: '100%'
      }}
    >
      + Add to Collection
    </button>
  </div>
))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ width: '260px', borderRight: '2px solid #e2e8f0', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ color: '#143910', marginTop: 0, marginBottom: '15px' }}>Filters</h3>
                  <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px' }}>Belongs to List:</h4>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px' }}>
                    {userLists.map(list => (
                      <label key={list.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={filterLists.includes(list.id)} onChange={() => toggleCheckboxFilter(list.id, filterLists, setFilterLists)} />
                        {list.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Gameplay Status:</h4>
                  <select value={playedFilter} onChange={(e) => { setPlayedFilter(e.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #cbd5e1' }}>
                    <option value="All">All Games</option>
                    <option value="Played">Played</option>
                    <option value="Unplayed">Not Yet Played</option>
                  </select>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Release Date Era:</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select value={yearMin} onChange={(e) => { setYearMin(e.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '6px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                      <option value="">Any Min</option>
                      {Array.from({ length: 2026 - 1970 + 1 }, (_, i) => 1970 + i).map(year => <option key={year} value={year} disabled={yearMax && year > parseInt(yearMax, 10)}>{year}</option>)}
                    </select>
                    <span style={{ fontSize: '12px' }}>to</span>
                    <select value={yearMax} onChange={(e) => { setYearMax(e.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '6px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                      <option value="">Any Max</option>
                      {Array.from({ length: 2026 - 1970 + 1 }, (_, i) => 1970 + i).map(year => <option key={year} value={year} disabled={yearMin && year < parseInt(yearMin, 10)}>{year}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Developer:</h4>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px' }}>
                    {dynamicDevelopers.length > 0 ? (
                      dynamicDevelopers.map(dev => (
                        <label key={dev} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '4px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={filterDevelopers.includes(dev)} onChange={() => toggleCheckboxFilter(dev, filterDevelopers, setFilterDevelopers)} />
                          {dev}
                        </label>
                      ))
                    ) : <span style={{ fontSize: '12px', color: '#94a3b8' }}>No developers yet</span>}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Genre:</h4>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px' }}>
                    {dynamicGenres.length > 0 ? (
                      dynamicGenres.map(gen => (
                        <label key={gen} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '4px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={filterGenres.includes(gen)} onChange={() => toggleCheckboxFilter(gen, filterGenres, setFilterGenres)} />
                          {gen}
                        </label>
                      ))
                    ) : <span style={{ fontSize: '12px', color: '#94a3b8' }}>No genres yet</span>}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h1 style={{ fontSize: '32px', color: '#143910', margin: 0 }}>My Collection</h1>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '5px 0 0 0' }}>Showing {processedCollection.length} titles.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#143910' }}>Sort By:</span>
                      <select value={collectionSortRule} onChange={(e) => setCollectionSortRule(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #143910', fontWeight: 'bold' }}>
                        <option value="date_desc">Date Added (Most Recent)</option>
                        <option value="date_asc">Date Added (Oldest)</option>
                        <option value="title_asc">Title (A–Z)</option>
                        <option value="title_desc">Title (Z–A)</option>
                        <option value="dev_asc">Developer (A–Z)</option>
                        <option value="dev_desc">Developer (Z–A)</option>
                        <option value="rate_desc">Rating (Descending)</option>
                        <option value="rate_asc">Rating (Ascending)</option>
                      </select>
                    </div>
                  </div>

                  {processedCollection.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', border: '2px dashed #cbd5e1', borderRadius: '20px', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '48px', marginBottom: '15px' }}>🕹️</div>
                      <h2 style={{ color: '#143910', margin: '0 0 10px 0', fontSize: '22px' }}>Your Collection is Empty</h2>
                      <p style={{ margin: 0, fontSize: '15px' }}>Use the top search bar to search for games and add them to your collection!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '25px' }}>
                      {paginatedCollection.map((game) => (
                        <div key={game.entryId || game.gameId || game.rawgId} onClick={() => openEditModal(game)} style={{ border: '1px solid #e2e8f0', borderRadius: '24px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '360px', boxSizing: 'border-box' }}>
                          {game.coverImage ? <img src={game.coverImage} alt={game.name} style={{ height: '140px', width: '100%', objectFit: 'cover', borderRadius: '16px', marginBottom: '12px' }} /> : <div style={{ height: '140px', backgroundColor: '#cbd5e1', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '12px' }}>🎮</div>}
                          <div>
                            <h3 style={{ margin: '0 0 4px 0', color: '#143910', fontSize: '18px', fontWeight: 'bold', lineHeight: '1.3' }}>{game.name}</h3>
                            <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '13px' }}>Genre: {getGenreDisplay(game)}</p>
                            {game.platformPlayed && <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Platform: {game.platformPlayed}</p>}
                          </div>
                          <div style={{ marginTop: 'auto' }}>
                            <div style={{ color: '#ffb300', fontSize: '14px', marginBottom: '8px' }}>{'★'.repeat(game.rating)}{'☆'.repeat(5 - game.rating)}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                              {game.listIds && game.listIds.map(lId => <span key={lId} style={{ backgroundColor: '#e0f2fe', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#0369a1' }}>{getListNameById(lId)}</span>)}
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '11px', color: '#94a3b8' }}>Added: {new Date(game.dateAdded || game.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', paddingTop: '25px', borderTop: '2px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Show:</span>
                    <select value={itemsPerPage === (userCollection.length || 1) ? 'All' : itemsPerPage} onChange={(e) => handleItemsPerPageChange(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <option value="2">2 per page (Test)</option>
                      <option value="10">10 per page</option>
                      <option value="20">20 per page</option>
                      <option value="50">50 per page</option>
                      <option value="All">All Games</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '8px 16px', backgroundColor: '#143910', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>Previous</button>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '8px 16px', backgroundColor: '#143910', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>Next</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <GameDetailsModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setModalFormData(null); }} onSubmit={handleSaveEntry} gameData={modalFormData} setGameData={setModalFormData} userLists={userLists} />
    </div>
  );
};

export default GameSearchPage;