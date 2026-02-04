import { writable } from 'svelte/store';

function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  return {
    subscribe,
    setUser: (user) => {
      set({ user, isAuthenticated: !!user, loading: false });
    },
    clearUser: () => {
      set({ user: null, isAuthenticated: false, loading: false });
    },
    setLoading: (loading) => {
      update(state => ({ ...state, loading }));
    },
  };
}

export const authStore = createAuthStore();
