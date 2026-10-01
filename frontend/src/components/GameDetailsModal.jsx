import React from 'react';

const GameDetailsModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onDelete, 
  gameData, 
  setGameData, 
  userLists = [] 
}) => {
  if (!isOpen || !gameData) return null;

  const handleRatingClick = (ratingValue) => {
    setGameData(prev => ({ ...prev, rating: ratingValue }));
  };

  const handleListCheckboxChange = (listId, isChecked) => {
    setGameData(prev => {
      const currentListIds = prev.listIds || [];
      const updatedListIds = isChecked
        ? [...currentListIds, listId]
        : currentListIds.filter(id => id !== listId);
      return { ...prev, listIds: updatedListIds };
    });
  };

  const availablePlatforms = gameData.platforms || [];
  const coverUrl = gameData.coverImage || gameData.background_image;

  const parseNames = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.map(item => (typeof item === 'object' ? item.name : item)).join(', ') || 'N/A';
    }
    return 'N/A';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      
      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        {/* Navigation / Header */}
        <div style={{ padding: '15px 24px 0 24px' }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Change Game
          </button>
        </div>

        {/* Global View-Only Header Info */}
        <div style={{ display: 'flex', gap: '18px', padding: '15px 24px 15px 24px', alignItems: 'center' }}>
      
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={gameData.name} 
              style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }} 
            />
          ) : (
            <div style={{ width: '150px', height: '100px', backgroundColor: '#e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>
              🎮
            </div>
          )}

          {/* Title & Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: '700', lineHeight: 1.2 }}>
              {gameData.name || 'Untitled Game'}
            </h2>
            
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              <strong>Dev:</strong> {parseNames(gameData.developer || gameData.developers)}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              <strong>Released:</strong> {gameData.releaseDate || gameData.released || 'N/A'}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              <strong>Genre:</strong> {parseNames(gameData.genres || gameData.genre)}
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0 24px' }} />

        {/* Editable User Fields Form */}
        <form onSubmit={onSubmit} style={{ padding: '16px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Played</label>
            <input 
              type="checkbox" 
              checked={gameData.played || false} 
              onChange={(e) => setGameData(prev => ({ ...prev, played: e.target.checked }))} 
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#143910' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Platform</label>
            <select 
              value={gameData.platformPlayed || ''} 
              onChange={(e) => setGameData(prev => ({ ...prev, platformPlayed: e.target.value }))}
              style={{ width: '220px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none', fontSize: '14px', color: '#0f172a' }}
            >
              <option value="">Select platform...</option>
              {availablePlatforms.map((system) => (
                <option key={typeof system === 'object' ? system.name : system} value={typeof system === 'object' ? system.name : system}>
                  {typeof system === 'object' ? system.name : system}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Hours Played</label>
            <input 
              type="number" 
              min="0"
              value={gameData.hoursPlayed || 0} 
              onChange={(e) => setGameData(prev => ({ ...prev, hoursPlayed: e.target.value }))}
              style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px', color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Rating</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5].map((starValue) => (
                <button
                  key={starValue}
                  type="button"
                  onClick={() => handleRatingClick(starValue)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '24px', color: starValue <= (gameData.rating || 0) ? '#ffb300' : '#cbd5e1' }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginTop: '6px' }}>Lists</label>
            <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #cbd5e1', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: '#fff' }}>
              {userLists.map((list) => {
                const isChecked = (gameData.listIds || []).includes(list.id);
                return (
                  <label key={list.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#0f172a', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleListCheckboxChange(list.id, e.target.checked)}
                      style={{ accentColor: '#143910', cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    {list.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Review</label>
            <textarea 
              rows="3" 
              placeholder="Write your thoughts here..." 
              value={gameData.review || ''} 
              onChange={(e) => setGameData(prev => ({ ...prev, review: e.target.value }))}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            {gameData.entryId ? (
              <button 
                type="button" 
                onClick={() => onDelete(gameData.entryId)} 
                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
              >
                Delete Entry
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#143910', color: '#ffffff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Save Game
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default GameDetailsModal;