import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './auth.jsx';

const PrefsCtx = createContext(null);

const DEFAULTS = {
  energy_level: 'mid',
  low_capacity_mode: false,
  onboarding_complete: false,
  last_mood: null,
  last_mood_at: null,
  excluded_cuisines: [],
  comfort_meal_type: null,
  goblin_name: 'the goblin',
};

export function PrefsProvider({ children }) {
  const { session } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) { setPrefs(DEFAULTS); setLoaded(false); return; }
    fetch('/api/user-prefs')
      .then(r => r.json())
      .then(data => { setPrefs({ ...DEFAULTS, ...data }); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [session]);

  const update = useCallback(async (patch) => {
    setPrefs(p => ({ ...p, ...patch }));
    const res = await fetch('/api/user-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const fresh = await res.json();
    setPrefs({ ...DEFAULTS, ...fresh });
    return fresh;
  }, []);

  return (
    <PrefsCtx.Provider value={{ prefs, loaded, update }}>
      {children}
    </PrefsCtx.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsCtx);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
