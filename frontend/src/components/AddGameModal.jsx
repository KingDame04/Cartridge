import React, { useState, useEffect, useContext } from 'react';
import Button from './Button';
import searchIcon from '../assets/Search.svg'; 
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

export default function AddGameModal({ isOpen, onClose, onOpenEditModal, onSaveSuccess }) {
  const { token } = useContext(AuthContext); 
  const currentToken = token || localStorage.getItem('token'); 

  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedGame, setSelectedGame] = useState(null);
  const [isCustomGame, setIsCustomGame] = useState(false);

  const [played, setPlayed] = useState(false);
  const [platform, setPlatform] = useState('');
  const [hoursPlayed, setHoursPlayed] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  
  const [selectedLists, setSelectedLists] = useState([]); 
  const [userLists, setUserLists] = useState([]);

  const [customTitle, setCustomTitle] = useState('');
  const [customDeveloper, setCustomDeveloper] = useState('');
  const [customCover, setCustomCover] = useState('');
  const [customYear, setCustomYear] = useState('');
  const [customGenres, setCustomGenres] = useState('');

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);

  const [duplicateEntry, setDuplicateEntry] = useState(null); 

  const resetFormDetails = () => {
    setPlayed(false);
    setPlatform('');
    setHoursPlayed('');
    setRating(0);
    setReview('');
    setSelectedLists([]);
    setDuplicateEntry(null);
  };

  const getPlatformOptions = (game) => {
    if (!game || !Array.isArray(game.platforms)) return ['Other'];
    const names = game.platforms.map(p => typeof p === 'string' ? p : (p.platform?.name || p.name)).filter(Boolean);
    const uniqueNames = [...new Set(names)];
    if (!uniqueNames.includes('Other')) uniqueNames.push('Other');
    return uniqueNames;
  };

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedGame(null);
      setIsCustomGame(false);
      resetFormDetails();
      setCustomTitle('');
      setCustomDeveloper('');
      setCustomCover('');
      setCustomYear('');
      setCustomGenres('');
      setShowAllGenres(false);

      api.get('/lists', currentToken)
        .then(res => res.json())
        .then(data => {
          const listsArray = Array.isArray(data) ? data : (data?.lists || []);
          setUserLists(Array.isArray(listsArray) ? listsArray : []);
        })
        .catch(err => console.error("Failed to load lists", err));
    }
  }, [isOpen, currentToken]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const res = await api.get(`/games/search?search=${encodeURIComponent(searchQuery)}`, currentToken);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(Array.isArray(data.results) ? data.results : []); 
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentToken]);

  if (!isOpen) return null;

  const handleGameSelect = async (game) => {
    setShowAllGenres(false);
    setIsCustomGame(false);
    resetFormDetails();

    if (game.rawgId || game.id) {
      setIsLoadingDetails(true);
      const targetId = game.rawgId || game.id;
      
      try {
        const res = await api.get(`/games/rawg/${targetId}`, currentToken);
        if (res.ok) {
          const fullGame = await res.json();
          setSelectedGame(fullGame);
        } else {
          setSelectedGame(game);
        }
      } catch (err) {
        setSelectedGame(game);
      } finally {
        setIsLoadingDetails(false);
        setStep(2);
      }
    } else {
      setSelectedGame(game);
      setStep(2);
    }
  };

  const handleCreateCustomGame = async () => {
    try {
      const payload = {
        name: customTitle,
        developers: customDeveloper ? [customDeveloper] : [],
        coverImage: customCover.trim() || null,
        releaseDate: customYear.trim() ? `${customYear.trim()}-01-01` : null,
        genres: customGenres ? customGenres.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      const res = await api.post('/games/manual', payload, currentToken);
      
      if (res.ok) {
        const data = await res.json();
        setSelectedGame(data.game);
        setIsCustomGame(true);
        resetFormDetails();
        setStep(2); 
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create manual game");
      }
    } catch (error) {
      alert("Network error while creating manual game.");
    }
  };

  const handleSaveEntry = async () => {
    try {
      setDuplicateEntry(null);
      let finalGameId = selectedGame._id; 

      if (!finalGameId) {
        const rawgIdToSync = selectedGame.rawgId || selectedGame.id;
        if (!rawgIdToSync) throw new Error("Could not find a valid RAWG ID to sync.");

        const syncRes = await api.post(`/games/rawg/${rawgIdToSync}`, {}, currentToken);
        const syncData = await syncRes.json();

        if (!syncRes.ok) throw new Error(syncData.error || "Failed to sync RAWG game to database.");
        finalGameId = syncData.game?._id; 
      }

      if (!finalGameId) throw new Error("Database returned an empty game ID.");

      const payload = {
        gameId: finalGameId,
        played: played,
        platformPlayed: platform || 'Other',
        hoursPlayed: Number(hoursPlayed) || 0,
        rating: rating,
        review: review,
        listIds: selectedLists 
      };

      const res = await api.post('/user-game-entries', payload, currentToken);
      const resData = await res.json();
      
      if (res.ok) {
        const newEntryId =
          resData.entry?._id ||
          resData.entryId ||
          resData._id ||
          null;

        /*
        * Update the parent before closing. This allows the
        * parent to remember the new entry before reopening
        * Create List or Edit List.
        */
        if (onSaveSuccess) {
          onSaveSuccess(
            newEntryId
              ? newEntryId.toString()
              : null
          );
        }

        onClose();
      }
      else if (res.status === 409) {
        const existingEntryId = resData.entryId || resData.entry?._id || resData.existingEntry?._id;
        setDuplicateEntry(existingEntryId);
      } else {
        alert(resData.error || resData.message || "Failed to save game entry.");
      }
    } catch (error) {
      alert(`Save Error: ${error.message}`);
    }
  };

  const getCoverImage = (game) => game?.coverImage || game?.background_image || null;

  const getDevAndYear = (game) => {
    if (!game) return '';
    const dev = Array.isArray(game.developers) && game.developers.length > 0 
      ? (typeof game.developers[0] === 'string' ? game.developers[0] : game.developers[0].name)
      : null;
    
    const year = (typeof game.releaseDate === 'string') 
      ? game.releaseDate.substring(0,4) 
      : (game.year ? String(game.year) : null);
      
    if (dev && dev !== 'Unknown Developer' && year) return `${dev} • ${year}`;
    if (dev && dev !== 'Unknown Developer') return dev;
    if (year) return year;
    return '';
  };

  const getGenres = (game) => {
    if (!game || !Array.isArray(game.genres) || game.genres.length === 0) return 'No genres available';
    return game.genres.map(g => typeof g === 'string' ? g : g.name).filter(Boolean).join(', ');
  };

  const CoverThumbnail = ({ game, size = 'small' }) => {
    const src = getCoverImage(game);
    const dimensions = size === 'small' ? { width: '40px', height: '56px' } : { width: '120px', height: '160px' };
    
    if (src) {
      return <img src={src} alt="Cover" style={{ ...dimensions, objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '2px solid #143910' }} />;
    }
    
    return (
      <div style={{ 
        ...dimensions, 
        backgroundColor: '#FFFFFF', 
        borderRadius: '8px', 
        border: '2px solid #143910',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        color: '#6B7280', 
        fontSize: size === 'small' ? '10px' : '16px',
        textAlign: 'center',
        flexShrink: 0
      }}>
        No Img
      </div>
    );
  };

  const genresText = getGenres(selectedGame);
  const isLongGenres = genresText.length > 40; 

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
    }}>
      <div style={{
        backgroundColor: '#ffffff', 
        borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', border: '4px solid #143910',
        position: 'relative'
      }}>
        
        {duplicateEntry && (
          <div style={{
            position: 'absolute', top: '650px', left: '16px', right: '16px',
            backgroundColor: '#FEF3C7', border: '2px solid #F59E0B', borderRadius: '8px', padding: '16px', zIndex: 100, 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#92400E', fontSize: '15px', fontWeight: 'bold' }}>⚠️ Game Already in Collection</h4>
              <p style={{ margin: 0, color: '#B45309', fontSize: '13px' }}>You have already saved this game.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                variant="tertiary" 
                onClick={() => setDuplicateEntry(null)} 
                style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #D97706', color: '#92400E' }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  onClose();
                  if (onOpenEditModal) onOpenEditModal(duplicateEntry);
                }} 
                style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#D97706', color: '#fff', border: 'none' }}
              >
                Edit Entry
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-vt323" style={{ fontSize: '36px', color: '#143910', marginBottom: '24px', letterSpacing: '1px' }}>
              Add Game
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '2px solid #143910' }}>
              <img src={searchIcon} alt="Search" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Search for a game..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', backgroundColor: 'transparent', width: '100%', outline: 'none', fontFamily: 'Inter', fontSize: '16px', color: '#143910' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40vh', overflowY: 'auto', marginBottom: '16px' }}>
              {isSearching && <div style={{ textAlign: 'center', color: '#143910', padding: '16px', fontWeight: 'bold' }}>Searching database...</div>}
              {isLoadingDetails && <div style={{ textAlign: 'center', color: '#98B910', padding: '16px', fontWeight: 'bold' }}>Fetching full game details...</div>}
              
              {!isSearching && !isLoadingDetails && searchQuery.length > 2 && Array.isArray(searchResults) && searchResults.map(game => (
                <div 
                  key={game.id || game._id || game.rawgId} 
                  onClick={() => handleGameSelect(game)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#FFFFFF', border: '2px solid #143910', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <CoverThumbnail game={game} size="small" />
                    <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                      <div style={{ fontWeight: '700', color: '#143910', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.title || game.name}</div>
                      <div style={{ fontSize: '12px', color: '#4B5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getDevAndYear(game)}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: '#98B910', fontWeight: 'bold', fontSize: '18px' }}>&gt;</div>
                </div>
              ))}
              
              {!isSearching && !isLoadingDetails && searchQuery.length > 2 && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', color: '#143910', padding: '24px', fontWeight: 'bold' }}>No games found in database.</div>
              )}
            </div>

            {searchQuery.length > 2 && !isSearching && !isLoadingDetails && (
              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', textAlign: 'center', border: '2px dashed #143910' }}>
                <p style={{ color: '#143910', fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>Can't find the game you're looking for?</p>
                <Button variant="primary" style={{ width: '100%', padding: '8px' }} onClick={() => { setCustomTitle(searchQuery); setStep(1.5); }}>
                  + New Game Entry
                </Button>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button variant="tertiary" onClick={onClose} style={{ color: '#143910', fontWeight: 'bold' }}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 1.5 && (
          <div>
            <button onClick={() => setStep(1)} style={{ color: '#143910', fontSize: '14px', marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              ← Back to Search
            </button>
            <h2 className="font-vt323" style={{ fontSize: '32px', color: '#143910', marginBottom: '8px', letterSpacing: '1px' }}>Create Custom Game</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#143910', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Game Title *</label>
                <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: '700', color: '#143910', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Developer (Optional)</label>
                <input type="text" placeholder="e.g. Nintendo" value={customDeveloper} onChange={(e) => setCustomDeveloper(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: '700', color: '#143910', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Cover Image URL (Optional)</label>
                <input type="text" placeholder="https://..." value={customCover} onChange={(e) => setCustomCover(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: '700', color: '#143910', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Release Year (Optional)</label>
                <input type="text" placeholder="e.g. 2026" value={customYear} onChange={(e) => setCustomYear(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: '700', color: '#143910', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Genres (Optional, comma-separated)</label>
                <input type="text" placeholder="e.g. RPG, Action" value={customGenres} onChange={(e) => setCustomGenres(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="tertiary" onClick={() => setStep(1)} style={{ color: '#143910', fontWeight: 'bold' }}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateCustomGame} disabled={!customTitle.trim()}>Continue to Rating</Button>
            </div>
          </div>
        )}

        {step === 2 && selectedGame && (
          <div>
            <button 
              onClick={() => {
                if (isCustomGame) {
                  setStep(1.5); 
                } else {
                  setStep(1); 
                }
              }} 
              style={{ color: '#143910', fontSize: '14px', marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              {isCustomGame ? '← Edit Custom Game' : '← Change Game'}
            </button>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'flex-start' }}>
              <CoverThumbnail game={selectedGame} size="large" />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflow: 'hidden', width: '100%' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#143910', marginBottom: '4px' }}>
                  {selectedGame.title || selectedGame.name}
                </h3>
                
                {getDevAndYear(selectedGame) && (
                  <span style={{ color: '#4B5563', fontSize: '14px', marginBottom: '8px', fontWeight: '600' }}>
                    {getDevAndYear(selectedGame)}
                  </span>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ 
                    color: '#2e7d32', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    whiteSpace: showAllGenres ? 'normal' : 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    width: '100%',
                    display: 'block'
                  }}>
                    {genresText}
                  </span>
                  
                  {isLongGenres && (
                    <button 
                      onClick={() => setShowAllGenres(!showAllGenres)} 
                      style={{ 
                        background: 'none', border: 'none', color: '#143910', fontSize: '12px', 
                        cursor: 'pointer', padding: '4px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' 
                      }}
                    >
                      {showAllGenres ? 'See less' : 'See all'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              
              <label style={{ fontWeight: '700', color: '#143910', fontSize: '14px' }}>Played</label>
              <input type="checkbox" checked={played} onChange={(e) => setPlayed(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />

              <label style={{ fontWeight: '700', color: '#143910', fontSize: '14px' }}>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none' }}>
                <option value="" disabled>Choose Platform</option>
                {getPlatformOptions(selectedGame).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              <label style={{ fontWeight: '700', color: '#143910', fontSize: '14px' }}>Hours Played</label>
              <input type="number" min="0" placeholder="0" value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', width: '80px' }} />

              <label style={{ fontWeight: '700', color: '#143910', fontSize: '14px' }}>Rating</label>
              <div style={{ display: 'flex', gap: '4px', fontSize: '28px', letterSpacing: '2px', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    onClick={() => setRating(star)}
                    style={{ color: star <= rating ? '#FFD700' : '#374151' }}
                  >
                    {star <= rating ? '★' : '☆'}
                  </span>
                ))}
              </div>

              <label style={{ fontWeight: '700', color: '#143910', fontSize: '14px', alignSelf: 'flex-start', paddingTop: '8px' }}>Lists</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', maxHeight: '100px', overflowY: 'auto' }}>
                {userLists.length === 0 ? <span style={{fontSize:'13px', color:'#6B7280'}}>No lists created.</span> : userLists.map(list => (
                  <label key={list._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#111827' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedLists.includes(list._id)} 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedLists([...selectedLists, list._id]);
                        else setSelectedLists(selectedLists.filter(id => id !== list._id));
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    {list.name}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
              <label style={{ fontWeight: '700', color: '#143910', fontSize: '14px' }}>Review</label>
              <textarea 
                rows="4" 
                placeholder="Write your thoughts here..." 
                value={review}
                onChange={(e) => setReview(e.target.value)}
                style={{ padding: '12px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="tertiary" onClick={onClose} style={{ color: '#143910', fontWeight: 'bold' }}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveEntry}>Save Game</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}