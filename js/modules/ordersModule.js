import { store } from '../state.js';
import { deductStockForOrder, restoreStockForOrder, checkOrderStockAvailability, calculateOrderCostMPSnapshot } from '../calculations.js';
import { renderModal, openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { paginate, renderPagination } from '../utils/paginate.js';
import { parseFlexNumber } from '../utils/numberParser.js';

let currentPage = 1;

const STATUS_CONFIG = {
  Pending:   { label: 'A preparer', badge: 'warning' },
  Ready:     { label: 'Prete',      badge: 'success' },
  Delivered: { label: 'Livree',     badge: 'muted'   },
  Cancelled: { label: 'Annulee',    badge: 'danger'  }
};

export function renderOrdersModule() {
  const currency = store.settings.currency || 'TND';

  // 1. Migrer In Progress -> Pending
  let allOrders = store.orders.map(o => o.status === 'In Progress' ? { ...o, status: 'Pending' } : o);

  // 2. Filtrer par recherche (cote donnees)
  if (store.searchQuery) {
    const q = store.searchQuery.toLowerCase();
    allOrders = allOrders.filter(o =>
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      String(o.id).includes(q)
    );
  }

  // 3. Filtrer par statut
  let filtered = allOrders;
  if (store.selectedOrderStatus && store.selectedOrderStatus !== 'all') {
    filtered = allOrders.filter(o => o.status === store.selectedOrderStatus);
  }

  // 4. Paginer le resultat filtre
  const { paginated, total, totalPages, start, end } = paginate(filtered, currentPage, 10);

  const rawOrders = store.orders;
  const countAll = rawOrders.length;
  const countPending = rawOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length;
  const countReady = rawOrders.filter(o => o.status === 'Ready').length;
  const countDelivered = rawOrders.filter(o => o.status === 'Delivered').length;
  const countCancelled = rawOrders.filter(o => o.status === 'Cancelled').length;
  const sel = store.selectedOrderStatus || 'all';

  return `
    <div class="orders-module" style="max-width:1250px;margin:0 auto;">
      <div class="section-header">
        <h2 class="section-title font-serif">Commandes Clients</h2>
        <div class="actions-group">
          <div class="search-box">
            <i data-lucide="search" class="search-icon"></i>
            <input type="text" id="orderSearchInput" class="form-control" placeholder="Rechercher..." value="${store.searchQuery || ''}">
          </div>
          <button class="btn btn-primary" id="addOrderBtn">
            <i data-lucide="plus"></i> Nouvelle Commande
          </button>
        </div>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;flex-wrap:wrap;" id="orderStatusFilterPills">
        <button class="btn btn-sm ${sel === 'all' ? 'btn-primary' : 'btn-secondary'}" data-status="all">Toutes (${countAll})</button>
        <button class="btn btn-sm ${sel === 'Pending' ? 'btn-primary' : 'btn-secondary'}" data-status="Pending">A preparer (${countPending})</button>
        <button class="btn btn-sm ${sel === 'Ready' ? 'btn-primary' : 'btn-secondary'}" data-status="Ready">Prete (${countReady})</button>
        <button class="btn btn-sm ${sel === 'Delivered' ? 'btn-primary' : 'btn-secondary'}" data-status="Delivered">Livree (${countDelivered})</button>
        <button class="btn btn-sm ${sel === 'Cancelled' ? 'btn-primary' : 'btn-secondary'}" data-status="Cancelled">Annulee (${countCancelled})</button>
      </div>

      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Livraison</th>
                <th>Produits</th>
                <th>Finances</th>
                <th>Statut</th>
                <th>Disponibilite MP</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paginated.length === 0 ? `
                <tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#8C8580;">Aucune commande trouvee.</td></tr>
              ` : paginated.map(ord => {
                const total = parseFloat(ord.totalAmount) || 0;
                const deposit = parseFloat(ord.depositPaid) || 0;
                const remaining = Math.max(0, total - deposit);
                const deliveryFormatted = ord.deliveryDate
                  ? new Date(ord.deliveryDate).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                  : '--';
                const stockCheck = checkOrderStockAvailability(ord, store.recipes, store.mp);
                const currentStatus = (ord.status === 'In Progress') ? 'Pending' : ord.status;

                let mpCell = '';
                if (ord.stockDeducted) {
                  mpCell = '<span class="badge badge-success">OK Deduit</span>';
                } else if (stockCheck.isAvailable) {
                  mpCell = `
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                      <span class="badge badge-success" style="font-size:0.75rem;">MP OK</span>
                      <button class="btn btn-sm dash-deduct-btn" data-id="${ord.id}" style="font-size:0.73rem;padding:0.15rem 0.45rem;background:#EAF6F4;color:#2A9D8F;border-color:#b2ddd7;">
                        Valider
                      </button>
                    </div>`;
                } else {
                  const missing = stockCheck.missingItems.map(m =>
                    `<div style="color:#D90429;font-size:0.72rem;"> - ${m.name}: manque <b>${m.missingQty} ${m.unit}</b> (dispo: ${m.currentStock.toFixed(1)} / besoin: ${m.needed.toFixed(1)})</div>`
                  ).join('');
                  mpCell = `<span class="badge badge-danger" style="display:block;margin-bottom:0.3rem;">Insuffisant</span>${missing}`;
                }

                return `
                  <tr>
                    <td>
                      <div style="font-weight:700;">${ord.customerName}</div>
                      <div style="font-size:0.73rem;color:#8C8580;">#${ord.id} - ${ord.customerPhone}</div>
                    </td>
                    <td style="font-size:0.85rem;font-weight:600;white-space:nowrap;">${deliveryFormatted}</td>
                    <td style="font-size:0.83rem;">
                      ${(ord.items || []).map(i => `<div><b>${i.qty}x</b> ${i.recipeName}</div>`).join('')}
                      ${ord.notes ? `<div style="font-size:0.72rem;color:#8C8580;font-style:italic;">${ord.notes}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-weight:700;">${total.toFixed(2)} ${currency}</div>
                      <div style="font-size:0.73rem;color:${remaining > 0 ? '#D90429' : '#2A9D8F'};">
                        Acompte: ${deposit.toFixed(2)} ${remaining > 0 ? '(Reste: ' + remaining.toFixed(2) + ')' : '(Regle)'}
                      </div>
                    </td>
                    <td>
                      <select class="form-control change-order-status" data-id="${ord.id}" style="padding:0.2rem 0.35rem;font-size:0.8rem;font-weight:600;width:105px;border-radius:8px;">
                        <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>A preparer</option>
                        <option value="Ready" ${currentStatus === 'Ready' ? 'selected' : ''}>Prete</option>
                        <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Livree</option>
                        <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Annulee</option>
                      </select>
                    </td>
                    <td>${mpCell}</td>
                    <td style="text-align:right;white-space:nowrap;">
                      <button class="btn btn-secondary btn-sm print-invoice-btn" data-id="${ord.id}" title="Recu">Recu</button>
                      <button class="btn btn-secondary btn-sm edit-order-btn" data-id="${ord.id}" title="Modifier">Modifier</button>
                      <button class="btn btn-secondary btn-sm delete-order-btn" data-id="${ord.id}" title="Supprimer" style="color:#D90429;">Supprimer</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="padding:0 1.1rem 0.25rem;">
          ${renderPagination(currentPage, totalPages, total, start, end, 'ord-page')}
        </div>
      </div>
    </div>
  `;
}

export function attachOrdersEvents() {
  const searchInput = document.getElementById('orderSearchInput');
  if (searchInput) searchInput.oninput = (e) => {
    currentPage = 1;
    store.setSearchQuery(e.target.value);
  };

  const addBtn = document.getElementById('addOrderBtn');
  if (addBtn) addBtn.onclick = () => openOrderModal();

  document.querySelectorAll('[data-ord-page]').forEach(btn => {
    btn.onclick = () => {
      currentPage = parseInt(btn.getAttribute('data-ord-page'));
      store.notify();
    };
  });

  document.querySelectorAll('#orderStatusFilterPills button').forEach(pill => {
    pill.onclick = () => {
      currentPage = 1;
      store.selectedOrderStatus = pill.getAttribute('data-status');
      store.notify();
    };
  });

  document.querySelectorAll('.change-order-status').forEach(sel => {
    sel.onchange = (e) => {
      const orderId = sel.getAttribute('data-id');
      handleOrderStatusChange(orderId, e.target.value);
    };
  });

  document.querySelectorAll('.dash-deduct-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const order = store.orders.find(o => o.id === id);
      if (!order) return;
      if (confirm('Valider la fabrication et deduire les ingredients du stock ?')) {
        const result = deductStockForOrder(order, store.recipes, store.mp);
        if (result.success) {
          store.updateOrderStockDeduction(order.id, result.updatedMpList);
          showToast('Fabrication validee ! Stock mis a jour.', 'success');
        } else {
          showToast('Erreur : ' + result.errors.join(', '), 'danger');
        }
      }
    };
  });

  document.querySelectorAll('.edit-order-btn').forEach(btn => {
    btn.onclick = () => {
      const order = store.orders.find(o => o.id === btn.getAttribute('data-id'));
      if (order) openOrderModal(order);
    };
  });

  document.querySelectorAll('.print-invoice-btn').forEach(btn => {
    btn.onclick = () => {
      const order = store.orders.find(o => o.id === btn.getAttribute('data-id'));
      if (order) openOrderInvoiceModal(order);
    };
  });

  document.querySelectorAll('.delete-order-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const order = store.orders.find(o => o.id === id);
      if (order && confirm('Supprimer la commande #' + order.id + ' ?')) {
        store.deleteOrder(id);
        showToast('Commande supprimee', 'warning');
      }
    };
  });
}

function openOrderModal(existingOrder = null) {
  const isEdit = !!existingOrder;
  const modalId = 'orderFormModal';
  const currency = store.settings.currency || 'TND';
  let currentItems = isEdit ? JSON.parse(JSON.stringify(existingOrder.items || [])) : [];
  const defaultDateStr = isEdit ? existingOrder.deliveryDate : new Date(Date.now() + 86400000).toISOString().slice(0, 16);

  const renderItemRows = () => {
    if (currentItems.length === 0) {
      return '<div style="text-align:center;color:#8C8580;padding:1rem;border:1px dashed #EAE4DC;border-radius:10px;">Aucun produit selectionne.</div>';
    }
    return currentItems.map((item, idx) => {
      const recipe = store.recipes.find(r => r.id === item.recipeId);
      const unitPrice = item.unitPrice || (recipe ? recipe.sellingPrice : 0);
      const totalItem = (parseFloat(item.qty) || 0) * unitPrice;
      return `
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 36px;gap:0.5rem;align-items:center;margin-bottom:0.5rem;background:#FAF8F5;padding:0.5rem;border-radius:8px;">
          <select class="form-control ord-recipe-select" data-idx="${idx}">
            <option value="">-- Produit --</option>
            ${store.recipes.map(r => `<option value="${r.id}" ${item.recipeId === r.id ? 'selected' : ''}>${r.name} (${r.sellingPrice} ${currency})</option>`).join('')}
          </select>
          <input type="text" inputmode="decimal" class="form-control ord-qty-input" data-idx="${idx}" placeholder="Qte" value="${item.qty}">
          <div style="font-weight:700;text-align:right;">${totalItem.toFixed(2)} ${currency}</div>
          <button type="button" class="btn btn-secondary btn-sm remove-ord-item-btn" data-idx="${idx}" style="color:#D90429;">&times;</button>
        </div>`;
    }).join('');
  };

  const updateTotalSummary = () => {
    let total = 0;
    currentItems.forEach(item => {
      const recipe = store.recipes.find(r => r.id === item.recipeId);
      total += (parseFloat(item.qty) || 0) * (item.unitPrice || (recipe ? recipe.sellingPrice : 0));
    });
    const deposit = parseFlexNumber(document.getElementById('ordDepositPaid')?.value);
    const remaining = Math.max(0, total - deposit);
    const tEl = document.getElementById('ordTotalDisplay');
    const rEl = document.getElementById('ordRemainingDisplay');
    if (tEl) tEl.innerText = total.toFixed(2) + ' ' + currency;
    if (rEl) rEl.innerText = remaining.toFixed(2) + ' ' + currency;
  };

  const currentStatus = isEdit ? ((existingOrder.status === 'In Progress') ? 'Pending' : existingOrder.status) : 'Pending';

  const contentHTML = `
    <form id="orderForm">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label class="form-label">Nom du Client *</label>
          <input type="text" id="ordCustomerName" class="form-control" placeholder="ex: Sarra" value="${isEdit ? existingOrder.customerName : ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Telephone *</label>
          <input type="tel" id="ordCustomerPhone" class="form-control" placeholder="ex: 22 123 456" value="${isEdit ? existingOrder.customerPhone : ''}" required>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label class="form-label">Date Livraison *</label>
          <input type="datetime-local" id="ordDeliveryDate" class="form-control" value="${defaultDateStr}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Statut</label>
          <select id="ordStatus" class="form-control">
            <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>A preparer</option>
            <option value="Ready" ${currentStatus === 'Ready' ? 'selected' : ''}>Prete</option>
            <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Livree</option>
            <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Annulee</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <label class="form-label" style="margin:0;">Produits *</label>
          <button type="button" class="btn btn-secondary btn-sm" id="addOrderItemBtn"><i data-lucide="plus"></i> Produit</button>
        </div>
        <div id="orderItemsContainer">${renderItemRows()}</div>
      </div>
      <div style="background:#FAF8F5;border:1px solid #EAE4DC;border-radius:12px;padding:1rem;margin-bottom:1rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;align-items:center;">
        <div>
          <div style="font-size:0.75rem;color:#736D67;">Total</div>
          <div id="ordTotalDisplay" style="font-size:1.2rem;font-weight:700;font-family:var(--font-serif);">0.00 ${currency}</div>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-size:0.75rem;">Acompte (${currency})</label>
          <input type="text" inputmode="decimal" id="ordDepositPaid" class="form-control" value="${isEdit ? existingOrder.depositPaid : 0}">
        </div>
        <div>
          <div style="font-size:0.75rem;color:#736D67;">Reste</div>
          <div id="ordRemainingDisplay" style="font-size:1.2rem;font-weight:700;color:#D90429;font-family:var(--font-serif);">0.00 ${currency}</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Remarques / Personnalisation</label>
        <input type="text" id="ordNotes" class="form-control" placeholder="ex: Inscription sur le gateau..." value="${isEdit ? existingOrder.notes || '' : ''}">
      </div>
    </form>`;

  const footerHTML = `
    <button class="btn btn-secondary" data-close="true">Annuler</button>
    <button class="btn btn-primary" id="saveOrderSubmitBtn">${isEdit ? 'Enregistrer' : 'Valider Commande'}</button>`;

  renderModal(modalId, isEdit ? 'Commande #' + existingOrder.id : 'Nouvelle Commande', contentHTML, footerHTML);
  openModal(modalId);

  const bindItemRowEvents = () => {
    const container = document.getElementById('orderItemsContainer');
    if (!container) return;
    container.innerHTML = renderItemRows();
    container.querySelectorAll('.ord-recipe-select').forEach(sel => {
      sel.onchange = (e) => {
        const idx = parseInt(sel.getAttribute('data-idx'));
        const rId = e.target.value;
        const recipe = store.recipes.find(r => r.id === rId);
        currentItems[idx].recipeId = rId;
        currentItems[idx].recipeName = recipe ? recipe.name : '';
        currentItems[idx].unitPrice = recipe ? recipe.sellingPrice : 0;
        bindItemRowEvents();
        updateTotalSummary();
      };
    });
    container.querySelectorAll('.ord-qty-input').forEach(inp => {
      const handleQty = (e) => {
        const idx = parseInt(inp.getAttribute('data-idx'));
        if (!isNaN(idx) && currentItems[idx]) {
          currentItems[idx].qty = parseFlexNumber(e.target.value) || 1;
          updateTotalSummary();
        }
      };
      inp.oninput = handleQty;
      inp.onkeyup = handleQty;
      inp.onchange = handleQty;
    });
    container.querySelectorAll('.remove-ord-item-btn').forEach(btn => {
      btn.onclick = () => {
        currentItems.splice(parseInt(btn.getAttribute('data-idx')), 1);
        bindItemRowEvents();
        updateTotalSummary();
      };
    });
  };

  document.getElementById('addOrderItemBtn').onclick = () => {
    const firstRec = store.recipes[0];
    currentItems.push({ recipeId: firstRec ? firstRec.id : '', recipeName: firstRec ? firstRec.name : '', qty: 1, unitPrice: firstRec ? firstRec.sellingPrice : 0 });
    bindItemRowEvents();
    updateTotalSummary();
  };

  ['input', 'keyup', 'change'].forEach(evt => {
    const depositEl = document.getElementById('ordDepositPaid');
    if (depositEl) depositEl.addEventListener(evt, updateTotalSummary);
  });
  bindItemRowEvents();
  updateTotalSummary();

  document.getElementById('saveOrderSubmitBtn').onclick = () => {
    const form = document.getElementById('orderForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (currentItems.length === 0) { showToast('Selectionnez un produit', 'warning'); return; }
    let totalAmount = 0;
    currentItems.forEach(item => { totalAmount += (item.qty || 1) * (item.unitPrice || 0); });
    const payload = {
      customerName: document.getElementById('ordCustomerName').value.trim(),
      customerPhone: document.getElementById('ordCustomerPhone').value.trim(),
      deliveryDate: document.getElementById('ordDeliveryDate').value,
      status: document.getElementById('ordStatus').value,
      items: currentItems.filter(i => i.recipeId),
      totalAmount,
      depositPaid: parseFlexNumber(document.getElementById('ordDepositPaid').value),
      notes: document.getElementById('ordNotes').value.trim()
    };
    if ((payload.status === 'Ready' || payload.status === 'Delivered') && (!isEdit || !existingOrder.stockDeducted)) {
      const stockCheck = deductStockForOrder(payload, store.recipes, store.mp);
      if (stockCheck.success) {
        payload.stockDeducted = true;
        payload.costMPSnapshot = calculateOrderCostMPSnapshot(payload, store.recipes, store.mp);
        store.mp = stockCheck.updatedMpList;
        store.save('rose_chocolat_mp_v1', store.mp);
      }
    }
    if (isEdit) {
      store.updateOrder(existingOrder.id, payload);
      showToast('Commande mise a jour !', 'success');
    } else {
      const newOrd = store.addOrder(payload);
      showToast('Commande #' + newOrd.id + ' creee !', 'success');
    }
    closeModal(modalId);
  };
}

export function handleOrderStatusChange(orderId, newStatus) {
  const order = store.orders.find(o => o.id === orderId);
  if (!order) return;

  const oldStatus = order.status;

  if (newStatus === 'Cancelled') {
    openCancellationModal(order);
    return;
  }

  if ((newStatus === 'Ready' || newStatus === 'Delivered') && !order.stockDeducted) {
    const result = deductStockForOrder(order, store.recipes, store.mp);
    if (result.success) {
      const snapshotCost = calculateOrderCostMPSnapshot(order, store.recipes, store.mp);
      store.updateOrderStockDeduction(order.id, result.updatedMpList, newStatus, snapshotCost);
      showToast(`Statut mis a jour (${newStatus}). Stock MP deduit !`, 'success');
    } else {
      showToast(`Stock insuffisant pour deduire les MP : ${result.errors.join(', ')}`, 'danger');
      store.notify();
    }
    return;
  }

  const snapshotCost = (newStatus === 'Delivered') ? calculateOrderCostMPSnapshot(order, store.recipes, store.mp) : order.costMPSnapshot;
  store.updateOrder(orderId, { status: newStatus, costMPSnapshot: snapshotCost });
  showToast('Statut mis a jour', 'info');
}

export function openCancellationModal(order) {
  const modalId = 'orderCancellationModal';

  const contentHTML = `
    <div style="padding: 0.25rem 0;">
      <p style="font-size: 0.95rem; margin-bottom: 1.2rem; line-height: 1.5; color: #1A1A1A;">
        La commande <strong>#${order.id}</strong> (${order.customerName}) va etre marquee comme <strong style="color: #D90429;">Annulee</strong>.
      </p>
      
      <div style="background: #FAF8F5; border: 1px solid #EAE4DC; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
        <label style="font-weight: 700; font-size: 0.9rem; display: block; margin-bottom: 0.75rem; color: #1A1A1A;">
          ❓ Quand cette annulation est-elle survenue ?
        </label>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <label style="display: flex; align-items: flex-start; gap: 0.65rem; cursor: pointer; background: white; padding: 0.75rem; border-radius: 8px; border: 1px solid #EAE4DC;">
            <input type="radio" name="cancelChoice" value="before" checked style="margin-top: 3px;">
            <div>
              <strong style="color: #2A9D8F; font-size: 0.9rem;">🚫 AVANT fabrication (Ingredients non consommes)</strong>
              <div style="font-size: 0.78rem; color: #736D67; margin-top: 0.2rem;">
                Le gateau n'a pas ete mep/fabrique. Le stock de matieres premieres sera restitue / conserve.
              </div>
            </div>
          </label>

          <label style="display: flex; align-items: flex-start; gap: 0.65rem; cursor: pointer; background: white; padding: 0.75rem; border-radius: 8px; border: 1px solid #EAE4DC;">
            <input type="radio" name="cancelChoice" value="after" style="margin-top: 3px;">
            <div>
              <strong style="color: #D90429; font-size: 0.9rem;">⚠️ APRES fabrication (Gaspillage / Ingredients consommes)</strong>
              <div style="font-size: 0.78rem; color: #736D67; margin-top: 0.2rem;">
                Le gateau a deja ete fabrique avant d'etre annule. Le stock reste deduit (perte).
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-close="true">Conserver Commande</button>
    <button class="btn btn-primary" id="confirmCancelOrderBtn" style="background:#D90429;border-color:#D90429;">Valider l'annulation</button>
  `;

  renderModal(modalId, `Annulation Commande #${order.id}`, contentHTML, footerHTML);
  openModal(modalId);

  document.getElementById('confirmCancelOrderBtn').onclick = () => {
    const choice = document.querySelector('input[name="cancelChoice"]:checked')?.value || 'before';

    if (choice === 'before') {
      if (order.stockDeducted) {
        const res = restoreStockForOrder(order, store.recipes, store.mp);
        store.restoreOrderStock(order.id, res.updatedMpList);
        showToast('Commande annulee. Stock MP restitue !', 'info');
      } else {
        showToast('Commande annulee (AVANT fabrication)', 'info');
      }
      store.updateOrder(order.id, { status: 'Cancelled' });
    } else {
      if (!order.stockDeducted) {
        const res = deductStockForOrder(order, store.recipes, store.mp);
        const snapshotCost = calculateOrderCostMPSnapshot(order, store.recipes, store.mp);
        store.updateOrderStockDeduction(order.id, res.updatedMpList, 'Cancelled', snapshotCost);
      } else {
        store.updateOrder(order.id, { status: 'Cancelled' });
      }
      showToast('Commande annulee (Ingredients deduits / perte enregistree)', 'warning');
    }

    closeModal(modalId);
  };
}

function openOrderInvoiceModal(order) {
  const modalId = 'orderInvoiceModal';
  const currency = store.settings.currency || 'TND';
  const total = parseFloat(order.totalAmount) || 0;
  const deposit = parseFloat(order.depositPaid) || 0;
  const remaining = Math.max(0, total - deposit);

  const contentHTML = `
    <div style="padding:1.5rem;">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1A1A1A;padding-bottom:1rem;margin-bottom:1.5rem;">
        <div>
          <h1 style="font-family:var(--font-serif);font-size:1.8rem;">Rose Chocolat</h1>
          <div style="font-size:0.85rem;color:#666;">Patisserie Fine</div>
        </div>
        <div style="text-align:right;">
          <h2 style="font-size:1.2rem;">RECU CLIENT</h2>
          <div style="font-weight:700;">N #${order.id}</div>
          <div style="font-size:0.8rem;color:#777;">${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      <div style="margin-bottom:1.5rem;background:#fdfaf8;padding:1rem;border-radius:8px;">
        <strong>Client :</strong> ${order.customerName} (${order.customerPhone})<br>
        <strong>Livraison :</strong> ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleString('fr-FR') : '--'}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;">
        <thead>
          <tr style="background:#1A1A1A;color:white;text-align:left;">
            <th style="padding:0.6rem;">Produit</th>
            <th style="padding:0.6rem;text-align:center;">Qte</th>
            <th style="padding:0.6rem;text-align:right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:0.6rem;font-weight:600;">${item.recipeName}</td>
              <td style="padding:0.6rem;text-align:center;">${item.qty}</td>
              <td style="padding:0.6rem;text-align:right;">${((item.qty || 1) * item.unitPrice).toFixed(2)} ${currency}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;">
        <div style="width:240px;background:#f9f9f9;padding:1rem;border-radius:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;"><span>Total :</span><strong>${total.toFixed(2)} ${currency}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;color:#2A9D8F;"><span>Acompte :</span><strong>-${deposit.toFixed(2)} ${currency}</strong></div>
          <div style="display:flex;justify-content:space-between;border-top:2px solid #ccc;padding-top:0.4rem;font-weight:700;color:#D90429;"><span>Reste :</span><span>${remaining.toFixed(2)} ${currency}</span></div>
        </div>
      </div>
      ${order.notes ? `<div style="margin-top:1rem;background:#FDF9F6;border-left:3px solid #E8B4B8;padding:0.75rem;font-size:0.85rem;border-radius:4px;"><strong>Note :</strong> ${order.notes}</div>` : ''}
    </div>`;

  const footerHTML = `
    <button class="btn btn-secondary" data-close="true">Fermer</button>
    <button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Imprimer</button>`;

  renderModal(modalId, 'Recu #' + order.id, contentHTML, footerHTML);
  openModal(modalId);
}
