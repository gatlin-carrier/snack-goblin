import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import RecipeBrowser from './components/RecipeBrowser.jsx';
import MealPlanBuilder from './components/MealPlanBuilder.jsx';
import ShoppingList from './components/ShoppingList.jsx';
import PantryManager from './components/PantryManager.jsx';
import AllergenTracker from './components/AllergenTracker.jsx';
import MealHistory from './components/MealHistory.jsx';
import LLMSettings from './components/LLMSettings.jsx';
import NtfySettings from './components/NtfySettings.jsx';
import IntegrationsSettings from './components/IntegrationsSettings.jsx';
import ChildProfile from './components/ChildProfile.jsx';
import AdultGoals from './components/AdultGoals.jsx';
import FirstFoodsLog from './components/FirstFoodsLog.jsx';
import CollectionsPanel from './components/CollectionsPanel.jsx';
import { GlassPill, THEME } from './lib/glass.jsx';
import { useAuth } from './lib/auth.jsx';
import { usePrefs } from './lib/prefs.jsx';
import Login from './components/Login.jsx';
import Onboarding from './components/Onboarding.jsx';
import MoodCheckIn from './components/MoodCheckIn.jsx';

const TOP_NAV = [
  { id: 'dashboard', label: 'This Week' },
  { id: 'recipes',   label: 'Recipes' },
  { id: 'plan',      label: 'Plan' },
  { id: 'shopping',  label: 'Shopping' },
  { id: 'pantry',    label: 'Pantry' },
];

const MORE_VIEWS = [
  { id: 'allergens',   label: 'Allergens' },
  { id: 'history',     label: 'History' },
  { id: 'firstfoods',  label: 'First foods' },
  { id: 'collections', label: 'Collections' },
];

const TAB_BAR = [
  { id: 'dashboard', label: 'Today',   icon: '◇' },
  { id: 'recipes',   label: 'Recipes', icon: '◎' },
  { id: 'plan',      label: 'Plan',    icon: '☰' },
  { id: 'shopping',  label: 'Shop',    icon: '⌗' },
  { id: 'menu',      label: 'More',    icon: '···' },
];

function GlassTopNav({ view, setView, onMore, showMoreMenu, onMoreToggle, settingsHandlers, onSignOut }) {
  return (
    <header className="glass-topnav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, paddingLeft: 8 }}>
        <div className="glass-logo">
          <span style={{ marginRight: 6, filter: 'saturate(1.15)' }}>👹</span>
          Snack Goblins
        </div>
        <nav style={{ display: 'flex', gap: 2 }}>
          {TOP_NAV.map(item => (
            <GlassPill
              key={item.id}
              active={view === item.id}
              onClick={() => setView(item.id)}
            >{item.label}</GlassPill>
          ))}
          <GlassPill active={MORE_VIEWS.some(m => m.id === view) || showMoreMenu} onClick={onMoreToggle}>
            More ▾
          </GlassPill>
        </nav>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingRight: 4, position: 'relative' }}>
        <GlassPill onClick={() => settingsHandlers.openIntegrations()} title="Integrations">🔌</GlassPill>
        <GlassPill onClick={() => settingsHandlers.openLLM()} title="AI model">🤖</GlassPill>
        <GlassPill onClick={() => settingsHandlers.openNtfy()} title="Notifications">🔔</GlassPill>
        <GlassPill onClick={() => settingsHandlers.openAdultGoals()} title="Adult goals">💪</GlassPill>
        <GlassPill onClick={() => settingsHandlers.openChildProfile()} title="Child profile">🧒</GlassPill>
        <GlassPill onClick={onSignOut} title="Sign out">↪</GlassPill>
        {showMoreMenu && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 10, zIndex: 60,
            background: 'oklch(1 0 0 / 0.7)',
            backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            borderRadius: 16, padding: 6, minWidth: 180,
            boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.7), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16), 0 12px 32px -10px oklch(0.3 0.04 50 / 0.3)',
          }}>
            {MORE_VIEWS.map(v => (
              <button key={v.id}
                onClick={() => { setView(v.id); onMore(); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: view === v.id ? 'oklch(0.62 0.14 35 / 0.15)' : 'transparent',
                  color: view === v.id ? THEME.accent : THEME.ink,
                  border: 'none', borderRadius: 10,
                  padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >{v.label}</button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

function GlassTabBar({ view, setView, onMoreOpen }) {
  return (
    <nav className="glass-tabbar">
      {TAB_BAR.map(item => {
        const active = item.id === 'menu'
          ? MORE_VIEWS.some(m => m.id === view) || view === 'pantry-extra'
          : view === item.id;
        return (
          <button
            key={item.id}
            className={`glass-tabbar-item${active ? ' active' : ''}`}
            onClick={() => item.id === 'menu' ? onMoreOpen() : setView(item.id)}
          >
            <span className="glass-tabbar-indicator" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const { loading, session, signOut } = useAuth();
  const { prefs, loaded: prefsLoaded, update: updatePrefs } = usePrefs();
  const [view, setView] = useState('dashboard');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [toast, setToast] = useState(null);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [showNtfySettings, setShowNtfySettings] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showChildProfile, setShowChildProfile] = useState(false);
  const [showAdultGoals, setShowAdultGoals] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [showMood, setShowMood] = useState(false);

  // Mood check-in: once per day on first dashboard visit, only after onboarding
  useEffect(() => {
    if (!session || !prefsLoaded) return;
    if (!prefs.onboarding_complete) return;
    const today = new Date().toISOString().slice(0, 10);
    if (prefs.last_mood_at === today) return;
    if (sessionStorage.getItem('mood_skipped_today') === today) return;
    const t = setTimeout(() => setShowMood(true), 1500);
    return () => clearTimeout(t);
  }, [session, prefsLoaded, prefs.onboarding_complete, prefs.last_mood_at]);

  function dismissMood() {
    sessionStorage.setItem('mood_skipped_today', new Date().toISOString().slice(0, 10));
    setShowMood(false);
  }

  if (loading) {
    return (
      <>
        <div className="mesh-bg" />
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: THEME.dim, gap: 12, position: 'relative',
        }}>
          <div className="spinner" /> Loading…
        </div>
      </>
    );
  }
  if (!session) return <Login />;

  // First-run onboarding gate. Once prefs load, if onboarding hasn't been
  // completed (or skipped), block the app behind the onboarding ritual.
  if (prefsLoaded && !prefs.onboarding_complete) {
    return (
      <>
        <div className="mesh-bg" />
        <Onboarding onDone={() => {/* prefs update triggers re-render */}} />
      </>
    );
  }

  function showToast(msg, duration = 3000) {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }

  function renderView() {
    switch (view) {
      case 'dashboard': return <Dashboard currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} onNavigate={setView} showToast={showToast} />;
      case 'recipes':   return <RecipeBrowser currentPlan={currentPlan} onNavigate={setView} showToast={showToast} />;
      case 'plan':      return <MealPlanBuilder currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} onNavigate={setView} showToast={showToast} />;
      case 'shopping':  return <ShoppingList currentPlan={currentPlan} showToast={showToast} />;
      case 'pantry':    return <PantryManager showToast={showToast} />;
      case 'allergens': return <AllergenTracker showToast={showToast} />;
      case 'history':   return <MealHistory />;
      case 'firstfoods':   return <FirstFoodsLog showToast={showToast} />;
      case 'collections':  return <CollectionsPanel showToast={showToast} onFilterByCollection={() => setView('recipes')} />;
      default:             return null;
    }
  }

  const settingsHandlers = {
    openLLM:          () => setShowLLMSettings(true),
    openNtfy:         () => setShowNtfySettings(true),
    openIntegrations: () => setShowIntegrations(true),
    openChildProfile: () => setShowChildProfile(true),
    openAdultGoals:   () => setShowAdultGoals(true),
  };

  return (
    <>
      <div className="mesh-bg" />
      <div className="layout">
        <GlassTopNav
          view={view}
          setView={(v) => { setView(v); setShowMoreMenu(false); }}
          showMoreMenu={showMoreMenu}
          onMoreToggle={() => setShowMoreMenu(v => !v)}
          onMore={() => setShowMoreMenu(false)}
          settingsHandlers={settingsHandlers}
          onSignOut={signOut}
        />

        <main className="main">{renderView()}</main>

        <GlassTabBar view={view} setView={setView} onMoreOpen={() => setShowMobileMore(true)} />

        {showMobileMore && (
          <div className="modal-backdrop" onClick={() => setShowMobileMore(false)}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, fontStyle: 'italic', color: 'var(--ink)' }}>More</div>
                <button className="modal-close" onClick={() => setShowMobileMore(false)}>×</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...MORE_VIEWS, { id: 'pantry', label: 'Pantry' }].map(item => (
                  <button key={item.id} className="btn-ghost" style={{ textAlign: 'left' }}
                    onClick={() => { setView(item.id); setShowMobileMore(false); }}>
                    {item.label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--hairline)', margin: '8px 0' }} />
                <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => { setShowAdultGoals(true); setShowMobileMore(false); }}>💪 Adult goals</button>
                <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => { setShowChildProfile(true); setShowMobileMore(false); }}>🧒 Child profile</button>
                <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => { setShowNtfySettings(true); setShowMobileMore(false); }}>🔔 Notifications</button>
                <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => { setShowIntegrations(true); setShowMobileMore(false); }}>🔌 Integrations</button>
                <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => { setShowLLMSettings(true); setShowMobileMore(false); }}>🤖 AI model</button>
                <div style={{ height: 1, background: 'var(--hairline)', margin: '8px 0' }} />
                <button
                  className="btn-ghost"
                  style={{
                    textAlign: 'left',
                    background: prefs.low_capacity_mode ? 'oklch(0.78 0.07 145 / 0.18)' : undefined,
                    color: prefs.low_capacity_mode ? THEME.sage : undefined,
                  }}
                  onClick={() => updatePrefs({ low_capacity_mode: !prefs.low_capacity_mode })}
                >
                  {prefs.low_capacity_mode ? '🌿 low-capacity day · on' : '🌿 low-capacity day · off'}
                </button>
                <div style={{ height: 1, background: 'var(--hairline)', margin: '8px 0' }} />
                <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => { signOut(); setShowMobileMore(false); }}>↪ Sign out</button>
              </div>
            </div>
          </div>
        )}

        {showLLMSettings && <LLMSettings onClose={() => setShowLLMSettings(false)} />}
        {showNtfySettings && <NtfySettings onClose={() => setShowNtfySettings(false)} showToast={showToast} />}
        {showIntegrations && <IntegrationsSettings onClose={() => setShowIntegrations(false)} showToast={showToast} />}
        {showAdultGoals && <AdultGoals onClose={() => setShowAdultGoals(false)} showToast={showToast} />}
        {showChildProfile && <ChildProfile onClose={() => setShowChildProfile(false)} showToast={showToast} />}
        {showMood && <MoodCheckIn onClose={dismissMood} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
