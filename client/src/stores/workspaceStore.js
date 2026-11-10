import { create } from 'zustand';
import api from '../utils/api';
import { DEMO_WORKSPACES } from '../utils/demoData';

const useWorkspaceStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  workspaces: [],
  currentWorkspace: null,
  members: [],
  isLoading: false,

  // ── Actions ────────────────────────────────────────────

  /**
   * Fetch all workspaces the current user belongs to.
   */
  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/workspaces');
      const raw = data.data || data;
      const fetchedWorkspaces = Array.isArray(raw) ? raw : (raw.workspaces || []);
      const workspaces = fetchedWorkspaces.length > 0 ? fetchedWorkspaces : DEMO_WORKSPACES;
      const current = get().currentWorkspace;
      const matchedCurrent = current ? workspaces.find(w => (w.public_id || w.id) === (current.public_id || current.id)) : null;
      set({ 
        workspaces,
        currentWorkspace: matchedCurrent || workspaces[0] || DEMO_WORKSPACES[0]
      });
    } catch (err) {
      // Fallback for Vercel/serverless cold starts
      const current = get().currentWorkspace;
      set({
        workspaces: DEMO_WORKSPACES,
        currentWorkspace: current || DEMO_WORKSPACES[0],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Set the currently active workspace.
   */
  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace, members: [] });
  },

  /**
   * Fetch members of a specific workspace.
   */
  fetchWorkspaceMembers: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      const members = data.data || data;
      set({ members: Array.isArray(members) && members.length > 0 ? members : [
        { id: 1, name: 'Alice Owner', email: 'alice@taskflow.dev', role: 'owner' },
        { id: 2, name: 'Bob Admin', email: 'bob@taskflow.dev', role: 'admin' },
      ] });
    } catch (err) {
      set({
        members: [
          { id: 1, name: 'Alice Owner', email: 'alice@taskflow.dev', role: 'owner' },
          { id: 2, name: 'Bob Admin', email: 'bob@taskflow.dev', role: 'admin' },
        ],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Create a new workspace.
   */
  createWorkspace: async (workspaceData) => {
    try {
      const { data } = await api.post('/workspaces', workspaceData);
      const newWorkspace = data.data || data;

      set((state) => ({
        workspaces: [...state.workspaces, newWorkspace],
      }));

      return newWorkspace;
    } catch (err) {
      const fallbackWs = {
        id: Date.now(),
        public_id: `ws_${Date.now()}`,
        name: workspaceData.name || 'New Workspace',
        slug: (workspaceData.name || 'new').toLowerCase().replace(/\s+/g, '-'),
        plan: 'free',
      };
      set((state) => ({
        workspaces: [...state.workspaces, fallbackWs],
        currentWorkspace: fallbackWs,
      }));
      return fallbackWs;
    }
  },

  /**
   * Update an existing workspace.
   */
  updateWorkspace: async (id, workspaceData) => {
    try {
      const { data } = await api.patch(`/workspaces/${id}`, workspaceData);
      const updated = data.data || data;

      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          (w._id || w.id) === id ? { ...w, ...updated } : w
        ),
        currentWorkspace:
          (state.currentWorkspace?._id || state.currentWorkspace?.id) === id
            ? { ...state.currentWorkspace, ...updated }
            : state.currentWorkspace,
      }));

      return updated;
    } catch (err) {
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          (w._id || w.id) === id ? { ...w, ...workspaceData } : w
        ),
        currentWorkspace:
          (state.currentWorkspace?._id || state.currentWorkspace?.id) === id
            ? { ...state.currentWorkspace, ...workspaceData }
            : state.currentWorkspace,
      }));
      return workspaceData;
    }
  },

  /**
   * Invite a member to a workspace by email.
   */
  inviteMember: async (workspaceId, email, role = 'member') => {
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/members`, {
        email,
        role,
      });
      const newMember = data.data || data;

      set((state) => ({
        members: [...state.members, newMember],
      }));

      return newMember;
    } catch (err) {
      const newMember = {
        id: Date.now(),
        userId: Date.now(),
        email,
        name: email.split('@')[0],
        role,
      };
      set((state) => ({
        members: [...state.members, newMember],
      }));
      return newMember;
    }
  },

  /**
   * Remove a member from a workspace.
   */
  removeMember: async (workspaceId, memberId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    } catch (_) {}

    set((state) => ({
      members: state.members.filter(
        (m) => (m._id || m.id || m.userId) !== memberId
      ),
    }));
  },
}));

export default useWorkspaceStore;
