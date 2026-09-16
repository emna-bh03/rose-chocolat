/* ==========================================================================
   Header Navbar Component (Simple & Épuré sans mode sombre)
   ========================================================================== */

import { store } from '../state.js';

const TAB_TITLES = {
  dashboard: 'Tableau de Bord',
  mp: 'Stock & Matières Premières',
  recipes: 'Fiches Techniques',
  orders: 'Commandes Clients',
  accounting: 'Comptabilité & Charges',
  settings: 'Paramètres'
};

export function renderNavbar() {
  const lowStockCount = store.getLowStockCount();
  const currentTitle = TAB_TITLES[store.activeTab] || 'Rose Chocolat';

  return `
    <header class="top-header">
      <div class="header-left">
        <button class="menu-toggle" id="menuToggleBtn">
          <i data-lucide="menu"></i>
        </button>
        <h2 class="page-title font-serif">${currentTitle}</h2>
      </div>

      <div class="header-right" style="display: flex; gap: 0.6rem; align-items: center;">
        ${lowStockCount > 0 ? `
          <div class="stock-alert-pill" id="stockAlertBtn" title="Voir les matières en stock bas">
            <i data-lucide="alert-triangle"></i>
            <span>${lowStockCount} Stock${lowStockCount > 1 ? 's' : ''} bas</span>
          </div>
        ` : ''}
        <button class="btn btn-secondary btn-sm" id="logoutBtn" title="Verrouiller l'accès" style="font-size:0.78rem;padding:0.3rem 0.65rem;">
          🔒 Déconnexion
        </button>
      </div>
    </header>
  `;
}

export function attachNavbarEvents() {
  const menuToggle = document.getElementById('menuToggleBtn');
  if (menuToggle) {
    menuToggle.onclick = () => {
      const sidebar = document.getElementById('appSidebar');
      if (sidebar) sidebar.classList.toggle('open');
    };
  }

  const alertBtn = document.getElementById('stockAlertBtn');
  if (alertBtn) {
    alertBtn.onclick = () => store.setActiveTab('mp');
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => store.logout();
  }
}
