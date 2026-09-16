import { store } from '../state.js';
import { renderModal, openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { paginate, renderPagination } from '../utils/paginate.js';
import { parseFlexNumber } from '../utils/numberParser.js';

let currentPage = 1;

export function renderMPModule() {
  const currency = store.settings.currency || 'TND';

  // 1. Filtrer d abord (recherche cote donnees)
  let filtered = store.mp;
  if (store.searchQuery) {
    const q = store.searchQuery.toLowerCase();
    filtered = filtered.filter(m => m.name.toLowerCase().includes(q));
  }

  // 2. Paginer le resultat filtre
  const { paginated, total, totalPages, start, end } = paginate(filtered, currentPage, 10);

  return `
    <div style="max-width:1200px;margin:0 auto;">
      <div class="section-header">
        <h2 class="section-title font-serif">Matieres Premieres & Packaging</h2>
        <div class="actions-group">
          <div class="search-box">
            <i data-lucide="search" class="search-icon"></i>
            <input type="text" id="mpSearchInput" class="form-control" placeholder="Rechercher..." value="${store.searchQuery || ''}">
          </div>
          <button class="btn btn-primary" id="addMpBtn">
            <i data-lucide="plus"></i> + Ingredient
          </button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ingredient / Article</th>
                <th>Prix Unitaire</th>
                <th>Stock Actuel</th>
                <th style="text-align:center;">+/- Flash</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paginated.length === 0 ? `
                <tr><td colspan="5" style="text-align:center;padding:2.5rem;color:#8C8580;">
                  ${store.searchQuery ? 'Aucun resultat pour "' + store.searchQuery + '"' : 'Aucun article. Cliquez sur "+ Ingredient" pour commencer.'}
                </td></tr>
              ` : paginated.map(m => {
                const stock = parseFloat(m.stockQty) || 0;
                const minThreshold = parseFloat(m.minThreshold) || 0;
                const isLow = stock <= minThreshold;
                const price = parseFloat(m.purchasePrice) || 0;
                const step = (m.unit === 'g' || m.unit === 'ml') ? 100 : 1;
                return `
                  <tr>
                    <td><div style="font-weight:700;font-size:0.95rem;">${m.name}</div></td>
                    <td style="font-weight:600;">${price.toFixed(2)} ${currency} / ${m.unit}</td>
                    <td>
                      <span style="font-weight:700;font-size:1rem;color:${isLow ? '#D90429' : '#1A1A1A'}">
                        ${stock % 1 === 0 ? stock : stock.toFixed(2)} ${m.unit}
                      </span>
                      ${isLow ? '<span class="badge badge-danger" style="margin-left:0.4rem;">Stock bas</span>' : ''}
                    </td>
                    <td style="text-align:center;">
                      <div style="display:flex;gap:0.3rem;justify-content:center;">
                        <button class="btn btn-secondary btn-sm table-stock-minus" data-id="${m.id}" data-step="${step}" style="font-weight:700;">
                          -${step}${m.unit}
                        </button>
                        <button class="btn btn-secondary btn-sm table-stock-plus" data-id="${m.id}" data-step="${step}" style="font-weight:700;background:#F4E2E3;">
                          +${step}${m.unit}
                        </button>
                      </div>
                    </td>
                    <td style="text-align:right;white-space:nowrap;">
                      <button class="btn btn-secondary btn-sm edit-mp-btn" data-id="${m.id}" style="margin-right:0.25rem;">
                        ✎ Modifier
                      </button>
                      <button class="btn btn-sm delete-mp-btn" data-id="${m.id}" style="background:#FDF0F2;color:#D90429;border-color:rgba(217,4,41,0.2);">
                        ✕ Suppr.
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="padding:0 1.1rem 0.25rem;">
          ${renderPagination(currentPage, totalPages, total, start, end, 'mp-page')}
        </div>
      </div>
    </div>
  `;
}

export function attachMPEvents() {
  const searchInput = document.getElementById('mpSearchInput');
  if (searchInput) {
    searchInput.oninput = (e) => {
      currentPage = 1;
      store.setSearchQuery(e.target.value);
    };
  }

  const addBtn = document.getElementById('addMpBtn');
  if (addBtn) addBtn.onclick = () => openMPModal();

  document.querySelectorAll('[data-mp-page]').forEach(btn => {
    btn.onclick = () => {
      currentPage = parseInt(btn.getAttribute('data-mp-page'));
      store.notify();
    };
  });

  document.querySelectorAll('.table-stock-minus').forEach(btn => {
    btn.onclick = () => store.quickAdjustStock(btn.getAttribute('data-id'), -parseFloat(btn.getAttribute('data-step')));
  });

  document.querySelectorAll('.table-stock-plus').forEach(btn => {
    btn.onclick = () => store.quickAdjustStock(btn.getAttribute('data-id'), parseFloat(btn.getAttribute('data-step')));
  });

  document.querySelectorAll('.edit-mp-btn').forEach(btn => {
    btn.onclick = () => {
      const mp = store.mp.find(m => m.id === btn.getAttribute('data-id'));
      if (mp) openMPModal(mp);
    };
  });

  document.querySelectorAll('.delete-mp-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const mp = store.mp.find(m => m.id === id);
      if (mp && confirm('Supprimer "' + mp.name + '" ?')) {
        store.deleteMP(id);
        showToast('Article supprime', 'warning');
      }
    };
  });
}

function openMPModal(existingMP = null) {
  const isEdit = !!existingMP;
  const modalId = 'mpFormModal';
  const currency = store.settings.currency || 'TND';

  const contentHTML = `
    <form id="mpForm" novalidate>
      <div class="form-group">
        <label class="form-label">Nom de l ingredient *</label>
        <input type="text" id="mpName" class="form-control" placeholder="ex: Chocolat Noir 70%" value="${existingMP ? existingMP.name : ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Unite de mesure *</label>
        <select id="mpUnit" class="form-control" required>
          <option value="kg" ${existingMP && existingMP.unit === 'kg' ? 'selected' : ''}>Kilogramme (kg)</option>
          <option value="g" ${existingMP && existingMP.unit === 'g' ? 'selected' : ''}>Gramme (g)</option>
          <option value="L" ${existingMP && existingMP.unit === 'L' ? 'selected' : ''}>Litre (L)</option>
          <option value="ml" ${existingMP && existingMP.unit === 'ml' ? 'selected' : ''}>Millilitre (ml)</option>
          <option value="piece" ${existingMP && existingMP.unit === 'piece' ? 'selected' : ''}>Piece</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label class="form-label">Prix d achat (${currency}) *</label>
          <input type="text" inputmode="decimal" id="mpPrice" class="form-control" placeholder="ex: 48,5" value="${existingMP ? existingMP.purchasePrice : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Stock Actuel *</label>
          <input type="text" inputmode="decimal" id="mpStock" class="form-control" placeholder="ex: 12,5" value="${existingMP ? existingMP.stockQty : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Seuil d alerte *</label>
          <input type="text" inputmode="decimal" id="mpMinThreshold" class="form-control" placeholder="ex: 3" value="${existingMP ? existingMP.minThreshold : ''}">
        </div>
      </div>
    </form>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-close="true">Annuler</button>
    <button class="btn btn-primary" id="saveMpSubmitBtn">${isEdit ? 'Enregistrer' : 'Creer'}</button>
  `;

  renderModal(modalId, isEdit ? 'Modifier : ' + existingMP.name : 'Nouvel Ingredient', contentHTML, footerHTML);
  openModal(modalId);

  document.getElementById('saveMpSubmitBtn').onclick = () => {
    const name = document.getElementById('mpName').value.trim();
    if (!name) { showToast('Saisissez le nom', 'warning'); return; }

    const payload = {
      name,
      unit: document.getElementById('mpUnit').value,
      purchasePrice: parseFlexNumber(document.getElementById('mpPrice').value),
      stockQty: parseFlexNumber(document.getElementById('mpStock').value),
      minThreshold: parseFlexNumber(document.getElementById('mpMinThreshold').value)
    };

    if (isEdit) {
      store.updateMP(existingMP.id, payload);
      showToast('Mis a jour !', 'success');
    } else {
      store.addMP(payload);
      showToast('Ingredient cree !', 'success');
    }
    closeModal(modalId);
  };
}
