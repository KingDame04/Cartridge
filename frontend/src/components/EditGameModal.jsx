import React, { useState, useEffect, useContext } from 'react';
import Button from './Button';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

export default function EditGameModal({ isOpen, onClose, entry, userLists = [], onSaveSuccess }) {
  const { token } = useContext(AuthContext);
  const currentToken = token || localStorage.getItem('token');

  const [played, setPlayed] = useState(false);
  const [platform, setPlatform] = useState('');
  const [hoursPlayed, setHoursPlayed] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedLists, setSelectedLists] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false); // 🟢 Toggle state for genres

  useEffect(() => {
    if (isOpen && entry) {
      setPlayed(entry.played || false);
      setPlatform(entry.platformPlayed || '');
      setHoursPlayed(entry.hoursPlayed !== undefined ? String(entry.hoursPlayed) : '');
      setRating(entry.rating || 0);
      setReview(entry.review || '');
      setShowDeleteConfirm(false);
      setShowAllGenres(false);
      
      if (Array.isArray(entry.listIds)) {
        setSelectedLists(entry.listIds.map(id => typeof id === 'object' ? id._id : id));
      } else {
        setSelectedLists([]);
      }
    }
  }, [isOpen, entry]);

  if (!isOpen || !entry) return null;

  const gameObj = (entry.gameId && typeof entry.gameId === 'object') ? entry.gameId : null;
  const title = entry.name || gameObj?.name || 'Unknown Game';
  const coverImage = entry.coverImage || gameObj?.coverImage || null;

  const devsSource = entry.developers?.length > 0 ? entry.developers : gameObj?.developers;
  const dev = Array.isArray(devsSource) && devsSource.length > 0
    ? (typeof devsSource[0] === 'string' ? devsSource[0] : devsSource[0]?.name)
    : null;

  const releaseDateSource = entry.releaseDate || gameObj?.releaseDate;
  const year = typeof releaseDateSource === 'string' ? releaseDateSource.substring(0, 4) : null;
  const devAndYear = [dev && dev !== 'Unknown Developer' ? dev : null, year].filter(Boolean).join(' • ');

  const genresSource = entry.genres?.length > 0 ? entry.genres : gameObj?.genres;
  const genresList = Array.isArray(genresSource)
    ? genresSource.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean)
    : [];
  const genresText = genresList.join(', ');
  const isLongGenres = genresText.length > 40;

  const platformsSource = entry.platforms ;
  const gamePlatforms = Array.isArray(platformsSource) 
    ? platformsSource.map(p => typeof p === 'string' ? p : (p.platform?.name || p.name)).filter(Boolean)
    : [];
    
  const platformOptions = [...new Set([...gamePlatforms, entry.platformPlayed].filter(Boolean)), 'Other'];

  const handleUpdateEntry = async () => {
    try {
      setIsSubmitting(true);
      const entryId = entry.entryId || entry._id;
      const targetGameId = gameObj?._id || entry.gameId;

      const payload = {
        played,
        platformPlayed: platform || 'Other',
        hoursPlayed: Number(hoursPlayed) || 0,
        rating,
        review
      };

      const res = await api.patch(`/user-game-entries/collection/${entryId}`, payload, currentToken);
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to update entry.");
      } else {
        if (!res.ok) throw new Error("Server error. Verify your backend is running and the route exists.");
      }

      // Synchronize lists
      const originalLists = Array.isArray(entry.listIds) 
        ? entry.listIds.map(id => typeof id === 'object' ? id._id : id) 
        : [];
      
      const listsToAdd = selectedLists.filter(id => !originalLists.includes(id));
      const listsToRemove = originalLists.filter(id => !selectedLists.includes(id));

      for (const listId of listsToAdd) {
        await api.post(`/user-game-entries/lists/${listId}/games/${targetGameId}`, {}, currentToken);
      }
      for (const listId of listsToRemove) {
        await api.delete(`/user-game-entries/lists/${listId}/games/${targetGameId}`, currentToken);
      }

      onSaveSuccess();
    } catch (error) {
      alert(`Update Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async () => {
    try {
      setIsSubmitting(true);
      const entryId = entry.entryId || entry._id;
      
      const res = await api.delete(`/user-game-entries/${entryId}`, currentToken);
      if (res.ok) {
        onSaveSuccess();
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const resData = await res.json();
          alert(resData.error || "Failed to delete entry.");
        } else {
          alert("Server error processing deletion.");
        }
      }
    } catch (error) {
      alert(`Delete Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (count) => "★".repeat(count) + "☆".repeat(5 - count);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 110
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', width: '100%', maxWidth: '480px', maxHeight: '90vh',
        borderRadius: '16px', border: '4px solid #143910', boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden'
      }}>
        
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E5E7EB' }}>
          <h3 className="font-vt323" style={{ fontSize: '24px', color: '#143910', margin: 0 }}>Edit Game Entry</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', color: '#143910', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          
          {/* 🟢 Refined Header Info */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-start' }}>
            <div style={{ width: '80px', height: '110px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#EBE5F0', border: '1px solid #143910', flexShrink: 0 }}>
              {coverImage ? (
                <img src={coverImage} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '10px', color: '#6B7280', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>No Img</span>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflow: 'hidden', width: '100%' }}>
              <h4 style={{ fontSize: '22px', fontWeight: '800', color: '#143910', margin: '0 0 4px 0', lineHeight: 1.1 }}>{title}</h4>
              
              {devAndYear && (
                <span style={{ color: '#4B5563', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                  {devAndYear}
                </span>
              )}

              {genresList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ 
                    color: '#2e7d32', 
                    fontSize: '12px', 
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
                        background: 'none', border: 'none', color: '#143910', fontSize: '11px', 
                        cursor: 'pointer', padding: '2px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' 
                      }}
                    >
                      {showAllGenres ? 'See less' : 'See all'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <label style={{ fontWeight: '700', color: '#4B5563', fontSize: '14px' }}>Played</label>
            <input type="checkbox" checked={played} onChange={(e) => setPlayed(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />

            <label style={{ fontWeight: '700', color: '#4B5563', fontSize: '14px' }}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none' }}>
              <option value="" disabled>Choose Platform</option>
              {platformOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>

            <label style={{ fontWeight: '700', color: '#4B5563', fontSize: '14px' }}>Hours Played</label>
            <input type="number" min="0" value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', width: '80px' }} />

            <label style={{ fontWeight: '700', color: '#4B5563', fontSize: '14px' }}>Rating</label>
            <div style={{ display: 'flex', gap: '4px', fontSize: '24px', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} onClick={() => setRating(star)} style={{ color: star <= rating ? '#FFD700' : '#374151' }}>
                  {star <= rating ? '★' : '☆'}
                </span>
              ))}
            </div>

            <label style={{ fontWeight: '700', color: '#4B5563', fontSize: '14px', alignSelf: 'flex-start', paddingTop: '8px' }}>Lists</label>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '700', color: '#4B5563', fontSize: '14px' }}>Review</label>
            <textarea rows="3" value={review} onChange={(e) => setReview(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '2px solid #143910', fontFamily: 'Inter', outline: 'none', resize: 'vertical' }} />
          </div>

        </div>

        <div style={{ padding: '16px 24px', backgroundColor: '#F9FAFB', borderTop: '2px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ position: 'relative' }}>
            {showDeleteConfirm ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#FEE2E2', padding: '8px', borderRadius: '6px', border: '1px solid #F87171' }}>
                <span style={{ fontSize: '13px', color: '#B91C1C', fontWeight: 'bold' }}>Confirm delete?</span>
                <Button variant="danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleDeleteEntry} disabled={isSubmitting}>
                  Yes
                </Button>
                <Button variant="tertiary" style={{ padding: '6px 12px', fontSize: '12px', color: '#111827' }} onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button 
                variant="danger" 
                style={{ padding: '8px 12px' }} 
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Game
              </Button>
            )}
          </div>

          {!showDeleteConfirm && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="tertiary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleUpdateEntry} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}