import { useState } from 'react';
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

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'recipes',   label: 'Recipes',   icon: '🍽️' },
  { id: 'plan',      label: 'Meal Plan', icon: '📅' },
  { id: 'shopping',  label: 'Shopping',  icon: '🛒' },
  { id: 'pantry',    label: 'Pantry',    icon: '🫙' },
];

// Bottom nav shows most-used 5 + AI
const BOTTOM_VIEWS = ['dashboard', 'recipes', 'plan', 'shopping', 'pantry'];

// Sidebar panel SVG icon (two-column layout)
function IconSidebar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="5" height="14" rx="1.5" fill="currentColor" opacity="0.9"/>
      <rect x="8" y="1" width="7" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="8" y="9" width="7" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [toast, setToast] = useState(null);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [showNtfySettings, setShowNtfySettings] = useState(false);
  const [showChildProfile, setShowChildProfile] = useState(false);
  const [showAdultGoals, setShowAdultGoals] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      case 'collections':  return <CollectionsPanel showToast={showToast} onFilterByCollection={(col) => { setView('recipes'); }} />;
      default:             return null;
    }
  }

  return (
    <>
    <div className="mesh-bg">
      <div className="mesh-orb mesh-orb-1" />
      <div className="mesh-orb mesh-orb-2" />
      <div className="mesh-orb mesh-orb-3" />
      <div className="mesh-orb mesh-orb-4" />
    </div>
    <div className={`layout${sidebarOpen ? '' : ' sidebar-closed'}`}>
      <nav className={`sidebar${sidebarOpen ? '' : ' sidebar-closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🥘 Meals</div>
          <button className="sidebar-collapse-btn" onClick={() => setSidebarOpen(false)} title="Collapse sidebar">
            <IconSidebar />
          </button>
        </div>

        {VIEWS.map(v => (
          <button key={v.id} className={`nav-item${view === v.id ? ' active' : ''}`} onClick={() => setView(v.id)}>
            <span className="nav-emoji">{v.icon}</span>
            <span>{v.label}</span>
          </button>
        ))}
        <button className={`nav-item${view === 'allergens' ? ' active' : ''}`} onClick={() => setView('allergens')}>
          <span className="nav-emoji">🧪</span><span>Allergens</span>
        </button>
        <button className={`nav-item${view === 'history' ? ' active' : ''}`} onClick={() => setView('history')}>
          <span className="nav-emoji">📖</span><span>History</span>
        </button>
        <button className={`nav-item${view === 'firstfoods' ? ' active' : ''}`} onClick={() => setView('firstfoods')}>
          <span className="nav-emoji">👶</span><span>First Foods</span>
        </button>
        <button className={`nav-item${view === 'collections' ? ' active' : ''}`} onClick={() => setView('collections')}>
          <span className="nav-emoji">🗂</span><span>Collections</span>
        </button>

        <div style={{ flex: 1 }} />
        <div className="sidebar-divider" />
        <button className="nav-item" onClick={() => setShowAdultGoals(true)}>
          <span className="nav-emoji">💪</span><span>Adult Goals</span>
        </button>
        <button className="nav-item" onClick={() => setShowChildProfile(true)}>
          <span className="nav-emoji">🧒</span><span>Child Profile</span>
        </button>
        <button className="nav-item" onClick={() => setShowNtfySettings(true)}>
          <span className="nav-emoji">🔔</span><span>Notifications</span>
        </button>
        <button className="nav-item" onClick={() => setShowIntegrations(true)}>
          <span className="nav-emoji">🔌</span><span>Integrations</span>
        </button>
        <button className="nav-item" onClick={() => setShowLLMSettings(true)}>
          <span className="nav-emoji">🤖</span><span>AI Model</span>
        </button>
      </nav>

      {!sidebarOpen && (
        <button className="sidebar-expand-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar">
          <IconSidebar />
        </button>
      )}

      <main className="main">{renderView()}</main>

      <nav className="bottom-nav">
        {BOTTOM_VIEWS.map(id => {
          const v = VIEWS.find(x => x.id === id);
          return (
            <button key={id} className={`bottom-nav-item${view === id ? ' active' : ''}`} onClick={() => setView(id)}>
              <span className="nav-icon">{v.icon}</span>
              <span>{v.label}</span>
            </button>
          );
        })}
        <button className="bottom-nav-item" onClick={() => setShowLLMSettings(true)}>
          <span className="nav-icon">🤖</span><span>AI</span>
        </button>
      </nav>

      {showLLMSettings && <LLMSettings onClose={() => setShowLLMSettings(false)} />}
      {showNtfySettings && <NtfySettings onClose={() => setShowNtfySettings(false)} showToast={showToast} />}
      {showIntegrations && <IntegrationsSettings onClose={() => setShowIntegrations(false)} showToast={showToast} />}
      {showAdultGoals && <AdultGoals onClose={() => setShowAdultGoals(false)} showToast={showToast} />}
      {showChildProfile && <ChildProfile onClose={() => setShowChildProfile(false)} showToast={showToast} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
    </>
  );
}
