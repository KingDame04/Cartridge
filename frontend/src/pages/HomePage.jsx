import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GameCard from '../components/GameCard';
import ListCard from '../components/ListCard';
import Button from '../components/Button';
import AddGameModal from '../components/AddGameModal';
import GameDetailModal from '../components/GameDetailModal';
import EditGameModal from '../components/EditGameModal';
import CreateListModal from '../components/CreateListModal'; 
import EditListModal from '../components/EditListModal';

import { api } from '../api';
import { AuthContext } from '../context/AuthContext'; 

function normalizeEntry(raw) {
  const rawGame = raw.gameId;
  const game = (rawGame && typeof rawGame === 'object') ? rawGame : null;

  return {
    ...raw,
    entryId: raw._id?.toString(),
    gameId: game ? game._id?.toString() : raw.gameId?.toString(),
    name: game?.name || raw.name || 'Unknown Game',
    coverImage: game?.coverImage || raw.coverImage || null,
    genres: game?.genres || raw.genres || [],
    platforms: game?.platforms || raw.platforms || [],
    releaseDate: game?.releaseDate || raw.releaseDate || null,
    developers: game?.developers || raw.developers || [],
  };
}

function getEntryListIds(entry) {
  if (!Array.isArray(entry?.listIds)) {
    return [];
  }

  return entry.listIds
    .map((listId) => {
      if (
        listId &&
        typeof listId === 'object'
      ) {
        return listId._id?.toString();
      }

      return listId?.toString();
    })
    .filter(Boolean);
}

export default function HomePage() {
  const { token } = useContext(AuthContext); 
  const currentToken = token || localStorage.getItem('token'); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryToEdit, setEntryToEdit] = useState(null); 
  const [listToEdit, setListToEdit] = useState(null);

  const [tempListName, setTempListName] = useState('');
  const [tempSelectedEntryIds, setTempSelectedEntryIds] = useState([]);
  const [returnToListModal, setReturnToListModal] = useState(false);
  
  const [editListDraft, setEditListDraft] = useState(null);

  const [allGames, setAllGames] = useState([]); 
  const [recentGames, setRecentGames] = useState([]);
  const [myLists, setMyLists] = useState([]);
  const [recentLists, setRecentLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const collectionRes = await api.get('/user-game-entries/collection', currentToken);
      if (collectionRes.ok) {
        const collectionData = await collectionRes.json();
        const normalizedEntries = (Array.isArray(collectionData) ? collectionData : []).map(normalizeEntry);
        
        normalizedEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllGames(normalizedEntries);
        setRecentGames(normalizedEntries.slice(0, 10));
      }

      const listsRes = await api.get('/lists', currentToken);

      if (listsRes.ok) {
        const listsData = await listsRes.json();
        const listsArray = Array.isArray(listsData) ? listsData : [];

        const sortedLists = [...listsArray].sort(
          (listA, listB) =>
            new Date(listB.updatedAt || listB.createdAt || 0) -
            new Date(listA.updatedAt || listA.createdAt || 0)
        );

        setMyLists(sortedLists);
        setRecentLists(sortedLists.slice(0, 10));
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentToken) {
      fetchDashboardData();
    }
  }, [currentToken]);

  return (
    <DashboardLayout>
      {/* Add Game Modal */}
      <AddGameModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);

          if (editListDraft) {
            setListToEdit(editListDraft.list);
          } else if (returnToListModal) {
            setIsCreateListOpen(true);
            setReturnToListModal(false);
          }
        }} 
        onSaveSuccess={(newEntryData) => {
          fetchDashboardData();
          
          const finalEntryId = typeof newEntryData === 'object' 
            ? (newEntryData?._id || newEntryData?.entryId) 
            : newEntryData;

          if (returnToListModal && finalEntryId) {
            setTempSelectedEntryIds(prev => [...prev, finalEntryId]);
          }

          if (editListDraft && finalEntryId) {
            setEditListDraft(prev => ({
              ...prev,
              selectedEntryIds: [...prev.selectedEntryIds, finalEntryId]
            }));
          }
        }}
        onOpenEditModal={(duplicateId) => {
          const existingEntry = allGames.find(g => g.entryId === duplicateId || g._id === duplicateId);
          setEntryToEdit(existingEntry || { _id: duplicateId, entryId: duplicateId });
        }}
      />

      {/* Create List Modal */}
      <CreateListModal 
        isOpen={isCreateListOpen}
        onClose={() => {
          setIsCreateListOpen(false);
          setTempListName('');
          setTempSelectedEntryIds([]);
        }}
        prefilledName={tempListName}
        prefilledSelectedIds={tempSelectedEntryIds}
        onStateChange={(name, ids) => {
          setTempListName(name);
          setTempSelectedEntryIds(ids);
        }}
        onListCreated={() => fetchDashboardData()}
        onOpenAddGameModal={() => {
          setReturnToListModal(true);
          setIsCreateListOpen(false);
          setIsAddModalOpen(true);
        }}
      />

      {/* Edit List Modal */}
      <EditListModal
        isOpen={listToEdit !== null}
        list={listToEdit}
        draftSnapshot={editListDraft} // 🟢 Pass the draft state in to resume smoothly
        onClose={() => {
          setListToEdit(null);
          setEditListDraft(null); // Clear the draft when manually closing
        }}
        onListUpdated={() => fetchDashboardData()}
        onListDeleted={() => fetchDashboardData()}
        onOpenAddGameModal={(draft) => {
          setEditListDraft(draft);
          setListToEdit(null);
          setIsAddModalOpen(true);
        }}
      />

      {/* Game Detail Modal */}
      <GameDetailModal 
        isOpen={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
        userLists={myLists}
        onEdit={(entry) => {
          setSelectedEntry(null); 
          setEntryToEdit(entry);  
        }}
      />

      {/* Edit Game Modal */}
      <EditGameModal 
        isOpen={entryToEdit !== null}
        onClose={() => setEntryToEdit(null)}
        entry={entryToEdit}
        userLists={myLists}
        onSaveSuccess={() => {
          setEntryToEdit(null);
          fetchDashboardData(); 
        }}
      />

      {error && <div style={{ color: '#ff4d4d', marginBottom: '16px' }}>{error}</div>}

      {/* Recently Added Section */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="font-vt323" style={{ fontSize: '32px', color: '#143910', letterSpacing: '2px', margin: 0 }}>
            Recently Added
          </h2>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <Button 
              variant="tertiary" 
              style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: 'transparent', border: '2px solid #98B910', color: '#143910', fontWeight: 'bold' }}
              onClick={() => navigate('/collection')}
            >
              See All
            </Button>
            <Button 
              variant="primary" 
              style={{ padding: '8px 16px', borderRadius: '4px' }}
              onClick={() => {
                setReturnToListModal(false);
                setEditListDraft(null);
                setIsAddModalOpen(true);
              }}
            >
              + Add Game
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px' }}>
          {isLoading ? (
            <p style={{ color: '#6B7280' }}>Loading collection...</p>
          ) : recentGames.length > 0 ? (
            recentGames.map((entry) => (
              <GameCard 
                key={entry.entryId || entry._id}
                title={entry.name} 
                platform={entry.platformPlayed || 'Unknown'} 
                rating={entry.rating || 0} 
                hoursPlayed={entry.hoursPlayed || 0} 
                coverImage={entry.coverImage}
                onClick={() => setSelectedEntry(entry)}
              />
            ))
          ) : (
            <p style={{ color: '#6B7280' }}>No games in your collection yet.</p>
          )}
        </div>
      </section>

      {/* Recently Updated Lists Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="font-vt323" style={{ fontSize: '32px', color: '#143910', letterSpacing: '2px', margin: 0 }}>
            Recently Updated Lists
          </h2>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Button 
              variant="tertiary" 
              style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: 'transparent', border: '2px solid #98B910', color: '#143910', fontWeight: 'bold' }}
              onClick={() => navigate('/lists')}
            >
              See All
            </Button>
            <Button 
              variant="primary" 
              style={{ padding: '8px 16px', borderRadius: '4px' }}
              onClick={() => setIsCreateListOpen(true)}
            >
              + New List
            </Button>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            paddingBottom: '16px'
          }}
        >
          {isLoading ? (
            <p style={{ color: '#6B7280' }}>
              Loading lists...
            </p>
          ) : recentLists.length > 0 ? (
            recentLists.map((list) => (
              <ListCard
                key={list._id}
                list={list}
                entries={allGames
                  .filter((entry) =>
                    getEntryListIds(entry).includes(
                      list._id?.toString()
                    )
                  )
                  .sort(
                    (entryA, entryB) =>
                      new Date(entryB.createdAt || 0) -
                      new Date(entryA.createdAt || 0)
                  )}
                compact
                showActions
                onView={() =>
                  navigate(
                    `/collection?list=${encodeURIComponent(
                      list.name
                    )}`
                  )
                }
                onEdit={() =>
                  setListToEdit(list)
                }
              />
            ))
          ) : (
            <p style={{ color: '#6B7280' }}>
              No lists created yet.
            </p>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}