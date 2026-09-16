/* ==========================================================================
   Sidebar Component (Logo Grand, Menu Fixe Sans Scroll, Compact)
   ========================================================================== */

import { store } from '../state.js';

export function renderSidebar() {
  const lowStockCount = store.getLowStockCount();
  const pendingOrdersCount = store.orders.filter(o => o.status === 'Pending' || o.status === 'À préparer').length;

  return `
    <aside class="sidebar" id="appSidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo-container">
          <img src="./assets/logo.jpg" alt="Rose Chocolat Logo" class="sidebar-logo-img">
        </div>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-item ${store.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
          <i data-lucide="layout-dashboard"></i>
          <span>Tableau de Bord</span>
        </a>

        <a class="nav-item ${store.activeTab === 'mp' ? 'active' : ''}" data-tab="mp">
          <i data-lucide="boxes"></i>
          <span>Matières Premières</span>
          ${lowStockCount > 0 ? `<span class="nav-item-badge">${lowStockCount}</span>` : ''}
        </a>

        <a class="nav-item ${store.activeTab === 'recipes' ? 'active' : ''}" data-tab="recipes">
          <i data-lucide="book-open"></i>
          <span>Fiches Techniques</span>
        </a>

        <a class="nav-item ${store.activeTab === 'orders' ? 'active' : ''}" data-tab="orders">
          <i data-lucide="shopping-bag"></i>
          <span>Commandes Clients</span>
          ${pendingOrdersCount > 0 ? `<span class="nav-item-badge" style="background-color: #1A1A1A; color: #FFFFFF;">${pendingOrdersCount}</span>` : ''}
        </a>

        <a class="nav-item ${store.activeTab === 'accounting' ? 'active' : ''}" data-tab="accounting">
          <i data-lucide="receipt"></i>
          <span>Comptabilité & Charges</span>
        </a>

        <a class="nav-item ${store.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          <i data-lucide="settings"></i>
          <span>Paramètres</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div>Rose Chocolat • Atelier</div>
      </div>
    </aside>
  `;
}

export function attachSidebarEvents() {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar) return;

  const navItems = sidebar.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.onclick = (e) => {
      e.preventDefault();
      const tab = item.getAttribute('data-tab');
      if (tab) {
        store.setActiveTab(tab);
        sidebar.classList.remove('open');
      }
    };
  });
}
