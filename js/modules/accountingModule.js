/* ==========================================================================
   Dashboard & Commandes Express ("Tak Tak" Mode Ultra-Simple)
   ========================================================================== */

import { store } from '../state.js';
import { calculateFinancialsSummary, deductStockForOrder } from '../calculations.js';
import { renderModal, openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { parseFlexNumber } from '../utils/numberParser.js';
import { handleOrderStatusChange } from './ordersModule.js';

let currentAccountingPage = 1;

export function renderDashboardView() {
  const currency = store.settings.currency || 'TND';
  const fin = calculateFinancialsSummary(store.orders, store.recipes, store.mp, store.expenses);

  const pendingOrders = store.orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const lowStockMp = store.mp.filter(m => (parseFloat(m.stockQty) || 0) <= (parseFloat(m.minThreshold) || 0));

  return `
    <div class="dashboard-view" style="max-width: 1200px; margin: 0 auto;">
      
      <!-- Quick Action Buttons Bar ("Tak Tak") -->
      <div style="background: var(--color-white); padding: 1rem 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap; box-shadow: var(--shadow-sm);">
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--color-black);">
          ⚡ Actions Rapides :
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-primary" id="quickAddOrderBtn" style="padding: 0.7rem 1.2rem; font-weight: 700;">
            <i data-lucide="plus-circle"></i> + Commande Rapide
          </button>

          <button class="btn btn-secondary" id="quickAddMpBtn" style="padding: 0.7rem 1.2rem; font-weight: 600;">
            <i data-lucide="boxes"></i> + Ingrédient / Stock
          </button>

          <button class="btn btn-secondary" id="quickAddExpenseBtn" style="padding: 0.7rem 1.2rem; font-weight: 600;">
            <i data-lucide="minus-circle"></i> - Saisir Dépense
          </button>
        </div>
      </div>

      <!-- Top Financial Counters -->
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card" style="border-top: 4px solid var(--color-rose-poudre);">
          <div class="stat-title">Chiffre d'Affaires</div>
          <div class="stat-value" style="color: var(--color-black); font-size: 2rem;">${fin.totalRevenue.toFixed(2)} <span style="font-size: 1rem;">${currency}</span></div>
          <div class="stat-subtext">${store.orders.length} commande(s) au total</div>
        </div>

        <div class="stat-card" style="border-top: 4px solid var(--color-success);">
          <div class="stat-title">Bénéfice Net Réel</div>
          <div class="stat-value" style="color: ${fin.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-size: 2rem;">
            ${fin.netProfit >= 0 ? '+' : ''}${fin.netProfit.toFixed(2)} <span style="font-size: 1rem;">${currency}</span>
          </div>
          <div class="stat-subtext">Ventes - Ingrédients - Dépenses</div>
        </div>

        <div class="stat-card" style="border-top: 4px solid var(--color-warning);">
          <div class="stat-title">Commandes en Cours</div>
          <div class="stat-value" style="font-size: 2rem;">${pendingOrders.length}</div>
          <div class="stat-subtext">Reste à encaisser : <strong>${fin.remainingToCollect.toFixed(2)} ${currency}</strong></div>
        </div>
      </div>

      <!-- Main Dashboard Content Grid -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        
        <!-- Live Orders List (Tak Tak 1-Click Status) -->
        <div class="table-card" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 class="font-serif" style="font-size: 1.15rem;">📋 Commandes en Atelier</h3>
            <button class="btn btn-secondary btn-sm" id="dashViewOrdersBtn">Voir Toutes</button>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Livraison</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              ${pendingOrders.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    Aucune commande en cours.
                  </td>
                </tr>
              ` : pendingOrders.slice(0, 5).map(ord => {
                const total = parseFloat(ord.totalAmount) || 0;
                const deposit = parseFloat(ord.depositPaid) || 0;
                const remaining = Math.max(0, total - deposit);

                return `
                  <tr>
                    <td>
                      <div style="font-weight: 700;">${ord.customerName}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${ord.customerPhone}</div>
                    </td>

                    <td style="font-size: 0.85rem; font-weight: 600;">
                      ${ord.deliveryDate ? new Date(ord.deliveryDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </td>

                    <td>
                      <div style="font-weight: 700;">${total.toFixed(2)} ${currency}</div>
                      ${remaining > 0 ? `<div style="font-size: 0.7rem; color: var(--color-danger);">Reste: ${remaining.toFixed(2)} ${currency}</div>` : `<div style="font-size: 0.7rem; color: var(--color-success);">Réglé</div>`}
                    </td>

                    <td>
                      <select class="form-control quick-status-change" data-id="${ord.id}" style="padding: 0.2rem 0.4rem; font-size: 0.8rem; font-weight: 600;">
                        <option value="Pending" ${ord.status === 'Pending' || ord.status === 'À préparer' ? 'selected' : ''}>À préparer</option>
                        <option value="In Progress" ${ord.status === 'In Progress' ? 'selected' : ''}>En cours</option>
                        <option value="Ready" ${ord.status === 'Ready' ? 'selected' : ''}>Prête</option>
                        <option value="Delivered" ${ord.status === 'Delivered' ? 'selected' : ''}>Livrée</option>
                      </select>
                    </td>

                    <td>
                      ${ord.stockDeducted ? `
                        <span class="badge badge-success">Déduit</span>
                      ` : `
                        <button class="btn btn-secondary btn-sm dash-deduct-btn" data-id="${ord.id}" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">
                          Valider Fab.
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Quick Stock Adjuster ("Tak Tak" +/- Buttons) -->
        <div class="table-card" style="padding: 1.25rem; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 class="font-serif" style="font-size: 1.15rem;">📦 Stock Express (+/-)</h3>
            <button class="btn btn-secondary btn-sm" id="dashViewMpBtn">Gérer</button>
          </div>

          <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.6rem;">
            ${store.mp.slice(0, 6).map(m => {
              const stock = parseFloat(m.stockQty) || 0;
              const isLow = stock <= (parseFloat(m.minThreshold) || 0);

              return `
                <div style="background: ${isLow ? 'var(--color-danger-bg)' : 'var(--color-beige-bg)'}; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">${m.name}</div>
                    <div style="font-size: 0.75rem; color: ${isLow ? 'var(--color-danger)' : 'var(--text-muted)'}; font-weight: 700;">
                      ${stock.toFixed(stock % 1 === 0 ? 0 : 1)} ${m.unit} ${isLow ? '(Stock bas!)' : ''}
                    </div>
                  </div>

                  <div style="display: flex; gap: 0.3rem;">
                    <button class="btn btn-secondary btn-sm quick-stock-minus" data-id="${m.id}" data-step="${m.unit === 'g' || m.unit === 'ml' ? 100 : 1}" style="padding: 0.2rem 0.5rem; font-weight: 700;">
                      -
                    </button>
                    <button class="btn btn-secondary btn-sm quick-stock-plus" data-id="${m.id}" data-step="${m.unit === 'g' || m.unit === 'ml' ? 100 : 1}" style="padding: 0.2rem 0.5rem; font-weight: 700; background: var(--color-rose-soft);">
                      +
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>

    </div>
  `;
}

export function initDashboardCharts() {}

export function renderAccountingModule() {
  const currency = store.settings.currency || 'TND';
  const fin = calculateFinancialsSummary(store.orders, store.recipes, store.mp, store.expenses);

  const { paginated, total, totalPages, start, end } = paginate(store.expenses, currentAccountingPage, 10);

  return `
    <div class="accounting-module">
      <div class="section-header">
        <h2 class="section-title font-serif">Comptabilité & Charges</h2>
        <div class="actions-group">
          <button class="btn btn-primary" id="addExpenseBtn">
            <i data-lucide="plus"></i> Saisir Dépense
          </button>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-title">Ventes Totales</div>
          <div class="stat-value" style="color: var(--color-success);">${fin.totalRevenue.toFixed(2)} ${currency}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Ingrédients Consommés</div>
          <div class="stat-value" style="color: var(--color-danger);">${fin.totalCostMP.toFixed(2)} ${currency}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Charges Atelier</div>
          <div class="stat-value">${fin.totalExpenses.toFixed(2)} ${currency}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Bénéfice Net Réel</div>
          <div class="stat-value" style="font-weight: 700; color: var(--color-black);">${fin.netProfit.toFixed(2)} ${currency}</div>
        </div>
      </div>

      <div class="table-card">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color);">
          <h3 class="font-serif" style="font-size: 1.1rem;">Charges & Dépenses</h3>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Catégorie</th>
              <th>Montant</th>
              <th>Date</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Aucune dépense enregistrée.</td></tr>
            ` : paginated.map(exp => `
              <tr>
                <td><strong>${exp.description}</strong></td>
                <td><span class="badge badge-muted">${exp.category}</span></td>
                <td style="font-weight: 700; color: var(--color-danger);">${parseFloat(exp.amount).toFixed(2)} ${currency}</td>
                <td>${exp.date ? new Date(exp.date).toLocaleDateString('fr-FR') : '--'}</td>
                <td style="text-align: right;">
                  <button class="btn btn-secondary btn-sm delete-expense-btn" data-id="${exp.id}" style="color: var(--color-danger);">Supprimer</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="padding: 0 1.1rem 0.25rem;">
          ${renderPagination(currentAccountingPage, totalPages, total, start, end, 'acc-page')}
        </div>
      </div>
    </div>
  `;
}

export function attachAccountingEvents() {
  document.querySelectorAll('[data-acc-page]').forEach(btn => {
    btn.onclick = () => {
      currentAccountingPage = parseInt(btn.getAttribute('data-acc-page'));
      store.notify();
    };
  });

  // Quick Add Order button
  const quickOrderBtn = document.getElementById('quickAddOrderBtn');
  if (quickOrderBtn) {
    quickOrderBtn.onclick = () => store.setActiveTab('orders');
  }

  // Quick Add MP button
  const quickMpBtn = document.getElementById('quickAddMpBtn');
  if (quickMpBtn) {
    quickMpBtn.onclick = () => store.setActiveTab('mp');
  }

  // Quick Add Expense button
  const quickExpBtn = document.getElementById('quickAddExpenseBtn');
  if (quickExpBtn) {
    quickExpBtn.onclick = () => openExpenseModal();
  }

  const addExpBtn = document.getElementById('addExpenseBtn');
  if (addExpBtn) {
    addExpBtn.onclick = () => openExpenseModal();
  }

  const dashViewOrdersBtn = document.getElementById('dashViewOrdersBtn');
  if (dashViewOrdersBtn) {
    dashViewOrdersBtn.onclick = () => store.setActiveTab('orders');
  }

  const dashViewMpBtn = document.getElementById('dashViewMpBtn');
  if (dashViewMpBtn) {
    dashViewMpBtn.onclick = () => store.setActiveTab('mp');
  }

  // Quick Status change directly in dashboard table
  document.querySelectorAll('.quick-status-change').forEach(sel => {
    sel.onchange = (e) => {
      const id = sel.getAttribute('data-id');
      handleOrderStatusChange(id, e.target.value);
    };
  });

  // Direct Stock Deduct button
  document.querySelectorAll('.dash-deduct-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const order = store.orders.find(o => o.id === id);
      if (order && confirm(`Valider la fabrication de la commande #${order.id} ?`)) {
        const result = deductStockForOrder(order, store.recipes, store.mp);
        if (result.success) {
          store.updateOrderStockDeduction(order.id, result.updatedMpList);
          showToast(`Stock déduit !`, 'success');
        } else {
          showToast(`Stock insuffisant : ${result.errors.join(', ')}`, 'danger');
        }
      }
    };
  });

  // Tak Tak Stock Quick Plus/Minus Buttons
  document.querySelectorAll('.quick-stock-minus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const step = parseFloat(btn.getAttribute('data-step')) || 1;
      store.quickAdjustStock(id, -step);
    };
  });

  document.querySelectorAll('.quick-stock-plus').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const step = parseFloat(btn.getAttribute('data-step')) || 1;
      store.quickAdjustStock(id, step);
    };
  });

  document.querySelectorAll('.delete-expense-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Supprimer cette dépense ?')) {
        store.deleteExpense(id);
        showToast('Dépense supprimée', 'warning');
      }
    };
  });
}

function openExpenseModal() {
  const modalId = 'expenseFormModal';
  const currency = store.settings.currency || 'TND';

  const contentHTML = `
    <form id="expenseForm">
      <div class="form-group">
        <label class="form-label">Description *</label>
        <input type="text" id="expDesc" class="form-control" placeholder="ex: Facture STEG Électricité" required>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label class="form-label">Catégorie *</label>
          <select id="expCategory" class="form-control" required>
            <option value="Loyer & Locaux">Loyer & Locaux</option>
            <option value="Énergie & Fluides">Énergie (STEG / Gaz)</option>
            <option value="Marketing">Publicité / Marketing</option>
            <option value="Matériel">Matériel & Équipement</option>
            <option value="Autre">Autre Dépense</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Montant (${currency}) *</label>
          <input type="text" inputmode="decimal" id="expAmount" class="form-control" placeholder="ex: 12,500" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" id="expDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
      </div>
    </form>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-close="true">Annuler</button>
    <button class="btn btn-primary" id="saveExpenseSubmitBtn">
      <span>Enregistrer Dépense</span>
    </button>
  `;

  renderModal(modalId, 'Saisir Dépense', contentHTML, footerHTML);
  openModal(modalId);

  document.getElementById('saveExpenseSubmitBtn').onclick = () => {
    const form = document.getElementById('expenseForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      description: document.getElementById('expDesc').value.trim(),
      category: document.getElementById('expCategory').value,
      amount: parseFlexNumber(document.getElementById('expAmount').value),
      date: document.getElementById('expDate').value,
      period: 'ponctuel'
    };

    store.addExpense(payload);
    showToast(`Dépense enregistrée !`, 'success');
    closeModal(modalId);
  };
}
