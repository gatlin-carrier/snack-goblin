import { createContext, useContext, useEffect, useState } from 'react';
import { get, post } from './api';
import { useAuth } from './auth';

const PrefsCtx = createContext(null);

const DEFAULTS = {
  energy_level: 'mid',
  low_capacity_mode: false,
  onboarding_complete: false,
  excluded_cuisines: [],
  comfort_meal_type: null,
  goblin_name: null,
};

export function PrefsProvider({ children }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setPrefs(DEFAULTS); setLoaded(false); return; }
    get('/api/user-prefs').then(data => {
      setPrefs({ ...DEFAULTS, ...data });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [user]);

  async function update(patch) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await post('/api/user-prefs', next).catch(() => {});
  }

  return (
    <PrefsCtx.Provider value={{ prefs, loaded, update }}>
      {children}
    </PrefsCtx.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsCtx);
  if (!ctx) throw new Error('usePrefs must be inside PrefsProvider');
  return ctx;
}
