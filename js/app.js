/* ==========================================================================
   Rose Chocolat Main Application Entry Point
   ========================================================================== */

import { store } from './state.js';
import { renderSidebar, attachSidebarEvents } from './components/sidebar.js';
import { renderNavbar, attachNavbarEvents } from './components/navbar.js';
import { renderLoginView, attachLoginEvents } from './components/loginView.js';
import { renderMPModule, attachMPEvents } from './modules/mpModule.js';
import { renderRecipesModule, attachRecipesEvents } from './modules/recipesModule.js';
import { renderOrdersModule, attachOrdersEvents } from './modules/ordersModule.js';
import { renderDashboardView, renderAccountingModule, attachAccountingEvents, initDashboardCharts } from './modules/accountingModule.js';
import { renderSettingsModule, attachSettingsEvents } from './modules/settingsModule.js';

function renderApp() {
  const root = document.getElementById('appRoot');
  if (!root) return;

  // Check Authentication State
  if (!store.isAuthenticated) {
    if (!document.getElementById('loginPinForm')) {
      root.innerHTML = renderLoginView();
      attachLoginEvents();
    }
    return;
  }

  // Determine active view content
  let viewHTML = '';
  switch (store.activeTab) {
    case 'dashboard':
      viewHTML = renderDashboardView();
      break;
    case 'mp':
      viewHTML = renderMPModule();
      break;
    case 'recipes':
      viewHTML = renderRecipesModule();
      break;
    case 'orders':
      viewHTML = renderOrdersModule();
      break;
    case 'accounting':
      viewHTML = renderAccountingModule();
      break;
    case 'settings':
      viewHTML = renderSettingsModule();
      break;
    default:
      viewHTML = renderDashboardView();
  }

  // Render main layout frame
  root.innerHTML = `
    <div class="app-container">
      ${renderSidebar()}
      <div class="main-wrapper">
        ${renderNavbar()}
        <main class="content-area" id="contentArea">
          ${viewHTML}
        </main>
      </div>
    </div>
  `;

  // Attach event handlers for navigation & components
  attachSidebarEvents();
  attachNavbarEvents();

  // Attach view-specific events
  if (store.activeTab === 'dashboard') {
    attachAccountingEvents();
    initDashboardCharts();
  } else if (store.activeTab === 'mp') {
    attachMPEvents();
  } else if (store.activeTab === 'recipes') {
    attachRecipesEvents();
  } else if (store.activeTab === 'orders') {
    attachOrdersEvents();
  } else if (store.activeTab === 'accounting') {
    attachAccountingEvents();
  } else if (store.activeTab === 'settings') {
    attachSettingsEvents();
  }

  // Initialize Lucide icons if available
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Subscribe app render to store state changes
store.subscribe(() => {
  renderApp();
});

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
