/* ==========================================================================
   Module 2: Fiches Techniques & Recettes (Simple & Épuré)
   ========================================================================== */

import { store } from '../state.js';
import { calculateRecipeCost, calculateRecipeFinancials } from '../calculations.js';
import { renderModal, openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { paginate, renderPagination } from '../utils/paginate.js';
import { parseFlexNumber } from '../utils/numberParser.js';

let currentPage = 1;

export function renderRecipesModule() {
  const currency = store.settings.currency || 'TND';

  // 1. Filtrer d abord (recherche cote donnees)
  let filtered = store.recipes;
  if (store.searchQuery) {
    const q = store.searchQuery.toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q));
  }

  // 2. Paginer le resultat filtre
  const { paginated, total, totalPages, start, end } = paginate(filtered, currentPage, 10);

  return `
    <div class="recipes-module">
      <div class="section-header">
        <h2 class="section-title font-serif">Fiches Techniques & Recettes</h2>
        <div class="actions-group">
          <div class="search-box">
            <i data-lucide="search" class="search-icon"></i>
            <input type="text" id="recipeSearchInput" class="form-control" placeholder="Rechercher..." value="${store.searchQuery || ''}">
          </div>
          <button class="btn btn-primary" id="addRecipeBtn">
            <i data-lucide="plus"></i> Nouvelle Recette
          </button>
        </div>
      </div>

      <div class="recipes-grid">
        ${paginated.length === 0 ? `
          <div style="grid-column:1/-1;background:#FAF8F5;border-radius:14px;padding:3rem;text-align:center;color:#8C8580;border:1px solid #EAE4DC;">
            ${store.searchQuery ? 'Aucun resultat pour "' + store.searchQuery + '"' : 'Aucune fiche technique. Cliquez sur "Nouvelle Recette" pour commencer.'}
          </div>
        ` : paginated.map(r => {
          const { totalCost } = calculateRecipeCost(r, store.mp);
          const financials = calculateRecipeFinancials(r.sellingPrice, totalCost, r.yieldQty);
          return `
            <div class="recipe-card">
              <div class="recipe-header">
                <div style="display:flex;justify-content:flex-end;align-items:flex-start;margin-bottom:0.3rem;">
                  <span class="badge badge-${financials.health}">${financials.marginPercentage}% Marge</span>
                </div>
                <h3 class="recipe-title font-serif">${r.name}</h3>
                <div style="font-size:0.8rem;color:#736D67;margin-top:0.25rem;">
                  ${r.prepTimeMinutes || 30} min &bull; ${r.yieldQty} ${r.yieldUnit || 'parts'}
                </div>
              </div>
              <div class="recipe-body">
                <div class="recipe-stat-row">
                  <span class="recipe-stat-label">Cout MP :</span>
                  <span class="recipe-stat-value" style="color:#D90429;">${totalCost.toFixed(2)} ${currency}</span>
                </div>
                <div class="recipe-stat-row">
                  <span class="recipe-stat-label">Prix Vente :</span>
                  <span class="recipe-stat-value" style="color:#2A9D8F;">${parseFloat(r.sellingPrice || 0).toFixed(2)} ${currency}</span>
                </div>
                <div class="recipe-stat-row">
                  <span class="recipe-stat-label">Benefice :</span>
                  <span class="recipe-stat-value">+${financials.grossMargin.toFixed(2)} ${currency}</span>
                </div>
              </div>
              <div class="recipe-footer">
                <button class="btn btn-secondary btn-sm print-recipe-btn" data-id="${r.id}">
                  &#9113; Fiche Labo
                </button>
                <button class="btn btn-secondary btn-sm edit-recipe-btn" data-id="${r.id}" style="margin-left:0.25rem;">
                  &#10002; Modifier
                </button>
                <button class="btn btn-sm delete-recipe-btn" data-id="${r.id}" style="background:#FDF0F2;color:#D90429;border-color:rgba(217,4,41,0.2);margin-left:0.25rem;">
                  &#10005; Suppr.
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="padding:0.25rem 0;">
        ${renderPagination(currentPage, totalPages, total, start, end, 'rec-page')}
      </div>
    </div>
  `;
}

export function attachRecipesEvents() {
  const searchInput = document.getElementById('recipeSearchInput');
  if (searchInput) {
    searchInput.oninput = (e) => {
      currentPage = 1;
      store.setSearchQuery(e.target.value);
    };
  }

  const addBtn = document.getElementById('addRecipeBtn');
  if (addBtn) addBtn.onclick = () => openRecipeModal();

  document.querySelectorAll('[data-rec-page]').forEach(btn => {
    btn.onclick = () => {
      currentPage = parseInt(btn.getAttribute('data-rec-page'));
      store.notify();
    };
  });

  document.querySelectorAll('.edit-recipe-btn').forEach(btn => {
    btn.onclick = () => {
      const recipe = store.recipes.find(r => r.id === btn.getAttribute('data-id'));
      if (recipe) openRecipeModal(recipe);
    };
  });

  document.querySelectorAll('.print-recipe-btn').forEach(btn => {
    btn.onclick = () => {
      const recipe = store.recipes.find(r => r.id === btn.getAttribute('data-id'));
      if (recipe) openPrintableRecipeModal(recipe);
    };
  });

  document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const recipe = store.recipes.find(r => r.id === id);
      if (recipe && confirm('Supprimer "' + recipe.name + '" ?')) {
        store.deleteRecipe(id);
        showToast('Recette supprimee', 'warning');
      }
    };
  });
}

function openRecipeModal(existingRecipe = null) {
  const isEdit = !!existingRecipe;
  const modalId = 'recipeFormModal';
  const currency = store.settings.currency || 'TND';

  let currentIngredients = isEdit ? JSON.parse(JSON.stringify(existingRecipe.ingredients || [])) : [];

  const categories = [
    'Tartes & Entremets',
    'Macarons & Mignardises',
    'Viennoiseries & Gâteaux',
    'Chocolats & Confiseries',
    'Créations Sur-Mesure',
    'Autre'
  ];

  const renderIngredientRows = () => {
    if (currentIngredients.length === 0) {
      return `<div style="text-align: center; color: var(--text-muted); padding: 1rem; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">Aucun ingrédient sélectionné.</div>`;
    }

    return currentIngredients.map((ing, idx) => {
      const mp = store.mp.find(m => m.id === ing.mpId);
      const ingCost = mp ? ((parseFloat(ing.qty) || 0) * (parseFloat(mp.purchasePrice) || 0) / (mp.unit === 'kg' && ing.unit === 'g' ? 1000 : (mp.unit === 'L' && ing.unit === 'ml' ? 1000 : 1))) : 0;

      return `
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 40px; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; background: var(--color-beige-bg); padding: 0.5rem; border-radius: var(--radius-sm);">
          <select class="form-control ing-mp-select" data-idx="${idx}">
            <option value="">-- Choisir Ingredient --</option>
            ${store.mp.map(m => `
              <option value="${m.id}" ${ing.mpId === m.id ? 'selected' : ''}>${m.name} (${m.purchasePrice} ${currency}/${m.unit})</option>
            `).join('')}
          </select>

          <input type="text" inputmode="decimal" class="form-control ing-qty-input" data-idx="${idx}" placeholder="ex: 0,35" value="${ing.qty}">

          <select class="form-control ing-unit-select" data-idx="${idx}">
            <option value="g" ${ing.unit === 'g' ? 'selected' : ''}>g</option>
            <option value="kg" ${ing.unit === 'kg' ? 'selected' : ''}>kg</option>
            <option value="ml" ${ing.unit === 'ml' ? 'selected' : ''}>ml</option>
            <option value="L" ${ing.unit === 'L' ? 'selected' : ''}>L</option>
            <option value="piece" ${ing.unit === 'piece' || ing.unit === 'pièce' ? 'selected' : ''}>piece</option>
          </select>

          <div style="font-weight: 700; font-size: 0.85rem; text-align: right; color: var(--color-danger);">
            ${ingCost.toFixed(2)} ${currency}
          </div>

          <button type="button" class="btn btn-secondary btn-sm remove-ing-btn" data-idx="${idx}" style="color: var(--color-danger);">
            &times;
          </button>
        </div>
      `;
    }).join('');
  };

  const updateCalculationsPreview = () => {
    const tempRecipe = {
      yieldQty: parseFlexNumber(document.getElementById('recYieldQty')?.value) || 1,
      ingredients: currentIngredients
    };
    const { totalCost, costPerUnit } = calculateRecipeCost(tempRecipe, store.mp);
    const sellingPrice = parseFlexNumber(document.getElementById('recSellingPrice')?.value) || 0;
    const financials = calculateRecipeFinancials(sellingPrice, totalCost, tempRecipe.yieldQty);

    const costDisplay = document.getElementById('recipeTotalCostPreview');
    const marginDisplay = document.getElementById('recipeMarginPreview');

    if (costDisplay) costDisplay.innerText = `${totalCost.toFixed(2)} ${currency}`;
    if (marginDisplay) {
      marginDisplay.innerHTML = `
        <span class="badge badge-${financials.health}">${financials.marginPercentage}% Marge</span>
        <strong style="color: var(--color-black); margin-left: 0.5rem;">+${financials.grossMargin.toFixed(2)} ${currency}</strong>
      `;
    }
  };

  const contentHTML = `
    <form id="recipeForm">
      <div class="form-group">
        <label class="form-label">Nom de la recette *</label>
        <input type="text" id="recName" class="form-control" placeholder="ex: Tarte au Chocolat" value="${isEdit ? existingRecipe.name : ''}" required>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 1rem;">
        <div class="form-group">
          <label class="form-label">Temps (min)</label>
          <input type="text" inputmode="decimal" id="recPrepTime" class="form-control" placeholder="45" value="${isEdit ? existingRecipe.prepTimeMinutes : 45}">
        </div>

        <div class="form-group">
          <label class="form-label">Quantité Produite *</label>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <input type="text" inputmode="decimal" id="recYieldQty" class="form-control" value="${isEdit ? existingRecipe.yieldQty : 1}" required placeholder="ex: 1.5" style="width: 85px; font-weight: 600; text-align: center;">
            <select id="recYieldUnit" class="form-control" style="font-weight: 600;">
              ${['pc', 'kg', 'g', 'L', 'ml', 'parts'].map(u => `
                <option value="${u}" ${isEdit && (existingRecipe.yieldUnit === u) ? 'selected' : (!isEdit && u === 'pc' ? 'selected' : '')}>${u}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Financial Calculation Bar -->
      <div style="background: var(--color-rose-soft); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 700;">Coût MP Total</div>
          <div id="recipeTotalCostPreview" style="font-size: 1.2rem; font-weight: 700; color: var(--color-danger); font-family: var(--font-serif);">0.00 ${currency}</div>
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 700;">Prix de Vente (${currency})</div>
          <input type="text" inputmode="decimal" id="recSellingPrice" class="form-control" style="width: 100px; font-weight: 700; text-align: right;" value="${isEdit ? existingRecipe.sellingPrice : 50}">
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 700;">Marge & Bénéfice</div>
          <div id="recipeMarginPreview">--</div>
        </div>
      </div>

      <!-- Ingredients list -->
      <div style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <label class="form-label" style="margin: 0;">Composition Matières Premières *</label>
          <button type="button" class="btn btn-secondary btn-sm" id="addIngRowBtn">
            <i data-lucide="plus"></i> Ingrédient
          </button>
        </div>
        <div id="ingRowsContainer">
          ${renderIngredientRows()}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Instructions Laboratoire</label>
        <textarea id="recInstructions" class="form-control" rows="3" placeholder="Procédé de fabrication...">${isEdit ? existingRecipe.instructions || '' : ''}</textarea>
      </div>
    </form>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-close="true">Annuler</button>
    <button class="btn btn-primary" id="saveRecipeSubmitBtn">
      <span>${isEdit ? 'Enregistrer' : 'Créer Recette'}</span>
    </button>
  `;

  renderModal(modalId, isEdit ? `Modifier : ${existingRecipe.name}` : 'Nouvelle Fiche Technique', contentHTML, footerHTML);
  openModal(modalId);

  const bindIngRowEvents = () => {
    const container = document.getElementById('ingRowsContainer');
    if (!container) return;

    container.innerHTML = renderIngredientRows();

    container.querySelectorAll('.ing-mp-select').forEach(sel => {
      sel.onchange = (e) => {
        const idx = parseInt(sel.getAttribute('data-idx'));
        currentIngredients[idx].mpId = e.target.value;
        const mp = store.mp.find(m => m.id === e.target.value);
        if (mp) currentIngredients[idx].unit = mp.unit === 'kg' ? 'g' : (mp.unit === 'L' ? 'ml' : mp.unit);
        bindIngRowEvents();
        updateCalculationsPreview();
      };
    });

    container.querySelectorAll('.ing-qty-input').forEach(inp => {
      const handleInput = (e) => {
        const idx = parseInt(inp.getAttribute('data-idx'));
        if (!isNaN(idx) && currentIngredients[idx]) {
          currentIngredients[idx].qty = parseFlexNumber(e.target.value);
          updateCalculationsPreview();
        }
      };
      inp.oninput = handleInput;
      inp.onkeyup = handleInput;
      inp.onchange = handleInput;
    });

    container.querySelectorAll('.ing-unit-select').forEach(sel => {
      sel.onchange = (e) => {
        const idx = parseInt(sel.getAttribute('data-idx'));
        if (!isNaN(idx) && currentIngredients[idx]) {
          currentIngredients[idx].unit = e.target.value;
          updateCalculationsPreview();
        }
      };
    });

    container.querySelectorAll('.remove-ing-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        currentIngredients.splice(idx, 1);
        bindIngRowEvents();
        updateCalculationsPreview();
      };
    });
  };

  document.getElementById('addIngRowBtn').onclick = () => {
    const firstMp = store.mp[0];
    currentIngredients.push({
      mpId: firstMp ? firstMp.id : '',
      qty: 100,
      unit: firstMp ? (firstMp.unit === 'kg' ? 'g' : firstMp.unit) : 'g'
    });
    bindIngRowEvents();
    updateCalculationsPreview();
  };

  ['input', 'keyup', 'change'].forEach(evt => {
    const priceEl = document.getElementById('recSellingPrice');
    const yieldEl = document.getElementById('recYieldQty');
    if (priceEl) priceEl.addEventListener(evt, updateCalculationsPreview);
    if (yieldEl) yieldEl.addEventListener(evt, updateCalculationsPreview);
  });

  bindIngRowEvents();
  updateCalculationsPreview();

  document.getElementById('saveRecipeSubmitBtn').onclick = () => {
    const form = document.getElementById('recipeForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (currentIngredients.length === 0) {
      showToast('Ajoutez au moins un ingrédient', 'warning');
      return;
    }

    const payload = {
      name: document.getElementById('recName').value.trim(),
      prepTimeMinutes: parseFlexNumber(document.getElementById('recPrepTime').value) || 30,
      yieldQty: parseFlexNumber(document.getElementById('recYieldQty').value) || 1,
      yieldUnit: document.getElementById('recYieldUnit').value || 'pc',
      sellingPrice: parseFlexNumber(document.getElementById('recSellingPrice').value) || 0,
      ingredients: currentIngredients.filter(i => i.mpId && i.qty > 0),
      instructions: document.getElementById('recInstructions').value.trim()
    };

    if (isEdit) {
      store.updateRecipe(existingRecipe.id, payload);
      showToast(`Recette mise à jour !`, 'success');
    } else {
      store.addRecipe(payload);
      showToast(`Recette créée avec succès !`, 'success');
    }

    closeModal(modalId);
  };
}

function openPrintableRecipeModal(recipe) {
  const modalId = 'printRecipeModal';
  const currency = store.settings.currency || 'TND';
  const { totalCost, costPerUnit, ingredientBreakdown } = calculateRecipeCost(recipe, store.mp);
  const financials = calculateRecipeFinancials(recipe.sellingPrice, totalCost, recipe.yieldQty);

  const contentHTML = `
    <div id="printableArea" style="padding: 1rem; background: white; color: black; font-family: var(--font-sans);">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--color-black); padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h1 class="font-serif" style="font-size: 1.8rem;">${recipe.name}</h1>
          <div style="font-size: 0.85rem; color: #555;">Fiche Technique • Rose Chocolat</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 1.1rem;">${recipe.yieldQty} ${recipe.yieldUnit || 'parts'}</div>
          <div style="font-size: 0.85rem; color: #666;">Temps : ${recipe.prepTimeMinutes || 30} min</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: #f9f9f9; padding: 1rem; border-radius: 8px;">
        <div>
          <strong>Coût MP Total :</strong> ${totalCost.toFixed(2)} ${currency}<br>
          <strong>Prix de Vente :</strong> ${parseFloat(recipe.sellingPrice).toFixed(2)} ${currency}
        </div>
        <div>
          <strong>Marge Brute :</strong> ${financials.marginPercentage}%<br>
          <strong>Bénéfice Net :</strong> +${financials.grossMargin.toFixed(2)} ${currency}
        </div>
      </div>

      <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 0.4rem; margin-bottom: 0.8rem;">Matières Premières</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.9rem;">
        <thead>
          <tr style="background: #eee; text-align: left;">
            <th style="padding: 0.5rem;">Ingrédient</th>
            <th style="padding: 0.5rem;">Quantité</th>
            <th style="padding: 0.5rem; text-align: right;">Coût</th>
          </tr>
        </thead>
        <tbody>
          ${ingredientBreakdown.map(ing => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 0.5rem; font-weight: 600;">${ing.mpName}</td>
              <td style="padding: 0.5rem;">${ing.qty} ${ing.unit}</td>
              <td style="padding: 0.5rem; text-align: right;">${ing.cost.toFixed(2)} ${currency}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${recipe.instructions ? `
        <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 0.4rem; margin-bottom: 0.8rem;">Procédé Atelier</h3>
        <div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: #333; background: #fff; border: 1px solid #eee; padding: 1rem; border-radius: 6px;">
          ${recipe.instructions}
        </div>
      ` : ''}
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-close="true">Fermer</button>
    <button class="btn btn-primary" id="printNowBtn">
      <i data-lucide="printer"></i>
      <span>Imprimer</span>
    </button>
  `;

  renderModal(modalId, `Fiche : ${recipe.name}`, contentHTML, footerHTML);
  openModal(modalId);

  document.getElementById('printNowBtn').onclick = () => window.print();
}
