import { create } from 'zustand';
import api from '../utils/api';
import { DEMO_BOARDS, getDemoBoardPayload } from '../utils/demoData';

const useBoardStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  boards: [],
  currentBoard: null,
  lists: [],
  cards: {}, // keyed by listId → array of cards
  labels: [],
  members: [],
  isLoading: false,

  // ── Board Actions ──────────────────────────────────────

  /**
   * Fetch all boards for a workspace.
   */
  fetchBoards: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/boards`);
      const raw = data.data || data;
      const fetchedBoards = Array.isArray(raw) ? raw : (raw.boards || []);
      set({ boards: fetchedBoards.length > 0 ? fetchedBoards : DEMO_BOARDS });
    } catch (err) {
      // Fallback for Vercel/serverless cold starts
      set({ boards: DEMO_BOARDS });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Fetch full board payload (board + lists + cards + labels + members).
   */
  fetchBoardPayload: async (boardId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/boards/${boardId}`);
      const payload = data.data || data;
      get().setBoardPayload(payload);
    } catch (err) {
      // Fallback to rich demo payload
      const demoPayload = getDemoBoardPayload(boardId);
      get().setBoardPayload(demoPayload);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Parse a board payload into individual state slices.
   */
  setBoardPayload: (payload) => {
    const board = payload.board || payload;
    const lists = payload.lists || [];
    const labels = payload.labels || [];
    const members = payload.members || board.members || [];

    // Group cards by listId (checking nested list.cards first)
    const cardsByList = {};
    lists.forEach((list) => {
      const lid = list.id ?? list.public_id;
      cardsByList[lid] = Array.isArray(list.cards) ? [...list.cards] : [];
    });

    // Also include top-level payload.cards if present
    const extraCards = payload.cards || [];
    extraCards.forEach((card) => {
      const listId = card.list_id ?? card.listId ?? card.list;
      if (!cardsByList[listId]) cardsByList[listId] = [];
      const cardKey = card.public_id || card.id;
      if (!cardsByList[listId].some((c) => (c.public_id || c.id) === cardKey)) {
        cardsByList[listId].push(card);
      }
    });

    // Sort cards by position within each list
    Object.keys(cardsByList).forEach((listId) => {
      cardsByList[listId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });

    // Sort lists by position
    const sortedLists = [...lists].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    set({
      currentBoard: board,
      lists: sortedLists,
      cards: cardsByList,
      labels,
      members,
    });
  },

  // ── List Actions ───────────────────────────────────────

  /**
   * Create a new list on a board.
   */
  createList: async (boardId, listData) => {
    try {
      const { data } = await api.post(`/boards/${boardId}/lists`, listData);
      const newList = data.data || data;

      set((state) => ({
        lists: [...state.lists, newList],
        cards: { ...state.cards, [newList._id || newList.id]: [] },
      }));

      return newList;
    } catch (err) {
      const fallbackList = {
        id: Date.now(),
        public_id: `lst_${Date.now()}`,
        board_id: boardId,
        title: listData.title || 'New Column',
        position: (get().lists.length + 1) * 1000,
      };
      set((state) => ({
        lists: [...state.lists, fallbackList],
        cards: { ...state.cards, [fallbackList.id]: [] },
      }));
      return fallbackList;
    }
  },

  /**
   * Update a list's properties (e.g. title).
   */
  updateList: async (listId, listData) => {
    try {
      const { data } = await api.patch(`/lists/${listId}`, listData);
      const updated = data.data || data;

      set((state) => ({
        lists: state.lists.map((l) =>
          (l._id || l.id) === listId ? { ...l, ...updated } : l
        ),
      }));

      return updated;
    } catch (err) {
      set((state) => ({
        lists: state.lists.map((l) =>
          (l._id || l.id) === listId ? { ...l, ...listData } : l
        ),
      }));
      return listData;
    }
  },

  /**
   * Delete a list.
   */
  deleteList: async (listId) => {
    try {
      await api.delete(`/lists/${listId}`);
    } catch (_) {}

    set((state) => {
      const newCards = { ...state.cards };
      delete newCards[listId];

      return {
        lists: state.lists.filter((l) => (l._id || l.id) !== listId),
        cards: newCards,
      };
    });
  },

  /**
   * Reorder lists via drag-and-drop. Optimistic update.
   */
  reorderList: (activeId, overId) => {
    set((state) => {
      const oldIndex = state.lists.findIndex(
        (l) => (l._id || l.id) === activeId
      );
      const newIndex = state.lists.findIndex(
        (l) => (l._id || l.id) === overId
      );

      if (oldIndex === -1 || newIndex === -1) return state;

      const updated = [...state.lists];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);

      // Update position values
      const withPositions = updated.map((list, idx) => ({
        ...list,
        position: idx,
      }));

      return { lists: withPositions };
    });

    // Persist to server (best-effort)
    const { lists, currentBoard } = get();
    const boardId = currentBoard?._id || currentBoard?.id;
    if (boardId) {
      const order = lists.map((l) => l._id || l.id);
      api.patch(`/boards/${boardId}/lists/reorder`, { order }).catch(() => {});
    }
  },

  // ── Card Actions ───────────────────────────────────────

  /**
   * Create a new card in a list.
   */
  createCard: async (listId, cardData) => {
    try {
      const { data } = await api.post(`/lists/${listId}/cards`, cardData);
      const newCard = data.data || data;

      set((state) => ({
        cards: {
          ...state.cards,
          [listId]: [...(state.cards[listId] || []), newCard],
        },
      }));

      return newCard;
    } catch (err) {
      const fallbackCard = {
        id: Date.now(),
        public_id: `crd_${Date.now()}`,
        title: cardData.title || 'New Task',
        description: cardData.description || '',
        list_id: listId,
        position: ((get().cards[listId] || []).length + 1) * 1000,
        labels: [],
        members: [],
        checklists: [],
      };
      set((state) => ({
        cards: {
          ...state.cards,
          [listId]: [...(state.cards[listId] || []), fallbackCard],
        },
      }));
      return fallbackCard;
    }
  },

  /**
   * Update a card's properties.
   */
  updateCard: async (cardId, cardData) => {
    try {
      const { data } = await api.patch(`/cards/${cardId}`, cardData);
      const updated = data.data || data;

      set((state) => {
        const newCards = { ...state.cards };
        for (const listId of Object.keys(newCards)) {
          const idx = newCards[listId].findIndex(
            (c) => (c._id || c.id) === cardId
          );
          if (idx !== -1) {
            newCards[listId] = [...newCards[listId]];
            newCards[listId][idx] = { ...newCards[listId][idx], ...updated };
            break;
          }
        }
        return { cards: newCards };
      });

      return updated;
    } catch (err) {
      set((state) => {
        const newCards = { ...state.cards };
        for (const listId of Object.keys(newCards)) {
          const idx = newCards[listId].findIndex(
            (c) => (c._id || c.id) === cardId
          );
          if (idx !== -1) {
            newCards[listId] = [...newCards[listId]];
            newCards[listId][idx] = { ...newCards[listId][idx], ...cardData };
            break;
          }
        }
        return { cards: newCards };
      });
      return cardData;
    }
  },

  /**
   * Move a card between lists with optimistic update.
   */
  moveCard: async (cardId, fromListId, toListId, position) => {
    set((state) => {
      const newCards = { ...state.cards };
      const fromList = [...(newCards[fromListId] || [])];
      const toList =
        fromListId === toListId ? fromList : [...(newCards[toListId] || [])];

      const cardIndex = fromList.findIndex(
        (c) => (c._id || c.id) === cardId
      );
      if (cardIndex === -1) return state;

      const [card] = fromList.splice(cardIndex, 1);
      const movedCard = {
        ...card,
        listId: toListId,
        list: toListId,
        position,
      };

      if (fromListId === toListId) {
        fromList.splice(position, 0, movedCard);
        newCards[fromListId] = fromList;
      } else {
        toList.splice(position, 0, movedCard);
        newCards[fromListId] = fromList;
        newCards[toListId] = toList;
      }

      return { cards: newCards };
    });

    try {
      await api.patch(`/cards/${cardId}/move`, {
        listId: toListId,
        position,
      });
    } catch (_) {}
  },

  /**
   * Delete a card from a list.
   */
  deleteCard: async (listId, cardId) => {
    try {
      await api.delete(`/cards/${cardId}`);
    } catch (_) {}

    set((state) => ({
      cards: {
        ...state.cards,
        [listId]: (state.cards[listId] || []).filter(
          (c) => (c._id || c.id) !== cardId
        ),
      },
    }));
  },

  // ── Label Helpers ──────────────────────────────────────

  addLabel: (label) => {
    set((state) => ({
      labels: [...state.labels, label],
    }));
  },

  removeLabel: (labelId) => {
    set((state) => ({
      labels: state.labels.filter((l) => (l._id || l.id) !== labelId),
    }));
  },

  // ── Cleanup ────────────────────────────────────────────

  clearBoard: () => {
    set({
      currentBoard: null,
      lists: [],
      cards: {},
      labels: [],
      members: [],
    });
  },
}));

export default useBoardStore;
