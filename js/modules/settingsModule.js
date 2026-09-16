/* ==========================================================================
   Module Paramètres & Données (Simple & Épuré)
   ========================================================================== */

import { store } from '../state.js';
import { showToast } from '../components/toast.js';

export function renderSettingsModule() {
  const settings = store.settings;
  const currencies = [
    { symbol: 'TND', label: 'Dinar Tunisien (TND / DT)' },
    { symbol: '€', label: 'Euro (€)' },
    { symbol: 'MAD', label: 'Dirham Marocain (MAD)' },
    { symbol: 'FCFA', label: 'Franc CFA (FCFA)' },
    { symbol: '$', label: 'Dollar US ($)' }
  ];

  return `
    <div class="settings-module">
      <div class="section-header">
        <h2 class="section-title font-serif">Paramètres & Données</h2>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- General Preferences Card -->
        <div class="table-card" style="padding: 1.5rem;">
          <h3 class="font-serif" style="font-size: 1.1rem; margin-bottom: 1rem;">Préférences Générales</h3>
          <form id="settingsForm">
            <div class="form-group">
              <label class="form-label">Nom de l'Atelier</label>
              <input type="text" id="setAtelierName" class="form-control" value="${settings.atelierName || 'Rose Chocolat Atelier'}">
            </div>

            <div class="form-group">
              <label class="form-label">Devise Principale</label>
              <select id="setCurrency" class="form-control">
                ${currencies.map(c => `
                  <option value="${c.symbol}" ${(settings.currency || 'TND') === c.symbol ? 'selected' : ''}>${c.label}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Code PIN de Sécurité (Accès Privé)</label>
              <input type="text" id="setPinCode" class="form-control" value="${settings.pinCode || '2026'}" placeholder="ex: 2026" style="font-weight: 700; letter-spacing: 2px;">
              <small style="font-size: 0.75rem; color: #8C8580;">Ce code protège l'accès à votre atelier sur votre téléphone et celui de votre sœur.</small>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 1rem;">
              <i data-lucide="save"></i>
              <span>Enregistrer</span>
            </button>
          </form>
        </div>

        <!-- Export & Backup Card -->
        <div class="table-card" style="padding: 1.5rem;">
          <h3 class="font-serif" style="font-size: 1.1rem; margin-bottom: 1rem;">Sauvegarde & Restauration</h3>
          
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="background: #FAF8F5; padding: 1rem; border-radius: 12px; border: 1px solid #EAE4DC;">
              <h4 style="font-size: 0.88rem; margin-bottom: 0.5rem; font-weight: 700;">Sauvegarder mes données</h4>
              <p style="font-size: 0.8rem; color: #736D67; margin-bottom: 0.75rem;">Telecharger un fichier JSON de toutes vos donnees (MP, recettes, commandes, depenses).</p>
              <button class="btn btn-secondary btn-sm" id="exportBackupJsonBtn">
                <i data-lucide="download"></i> Telecharger Sauvegarde
              </button>
            </div>

            <div style="background: #FAF8F5; padding: 1rem; border-radius: 12px; border: 1px solid #EAE4DC;">
              <h4 style="font-size: 0.88rem; margin-bottom: 0.5rem; font-weight: 700;">Restaurer une sauvegarde</h4>
              <p style="font-size: 0.8rem; color: #736D67; margin-bottom: 0.75rem;">Importer un fichier JSON precedemment exporte.</p>
              <input type="file" id="importJsonFileInput" accept=".json" style="display: none;">
              <button class="btn btn-secondary btn-sm" id="importBackupJsonBtn">
                <i data-lucide="upload"></i> Importer un fichier JSON
              </button>
            </div>

            <div style="background: #FDF0F2; padding: 1rem; border-radius: 12px; border: 1px solid rgba(217, 4, 41, 0.15);">
              <h4 style="font-size: 0.88rem; color: #D90429; margin-bottom: 0.5rem; font-weight: 700;">Effacer toutes les donnees</h4>
              <p style="font-size: 0.8rem; color: #8C8580; margin-bottom: 0.75rem;">Supprime definitivement tous vos MP, recettes, commandes et depenses. Pensez a faire une sauvegarde avant !</p>
              <button class="btn btn-danger btn-sm" id="clearAllDataBtn">
                <i data-lucide="trash-2"></i> Effacer toutes mes donnees
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PWA Install Info -->
      <div class="table-card" style="padding: 1.5rem; margin-top: 1.5rem;">
        <h3 class="font-serif" style="font-size: 1.1rem; margin-bottom: 0.75rem;">Installer l'application sur le Bureau</h3>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start;">
          <div style="font-size: 2rem;">💻</div>
          <div>
            <p style="font-size: 0.88rem; color: #44403C; line-height: 1.7; margin-bottom: 0.75rem;">
              Pour installer <strong>Rose Chocolat</strong> comme application sur votre bureau Windows :
            </p>
            <ol style="font-size: 0.85rem; color: #44403C; line-height: 2; padding-left: 1.2rem;">
              <li>Ouvrez l'application dans <strong>Google Chrome ou Microsoft Edge</strong> sur <code style="background:#F4E2E3;padding:0.1rem 0.4rem;border-radius:5px;">http://localhost:3000</code></li>
              <li>Cliquez sur l'icone <strong>installer</strong> (☁️ ou ⬇️) dans la barre d'adresse</li>
              <li>Cliquez <strong>"Installer"</strong> dans la fenetre qui s'affiche</li>
              <li>L'icone <strong>Rose Chocolat</strong> apparait sur votre bureau !</li>
            </ol>
            <p style="font-size: 0.8rem; color: #8C8580; margin-top: 0.5rem;">Vos donnees sont sauvegardees automatiquement dans le navigateur et restent disponibles meme apres fermeture.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachSettingsEvents() {
  const form = document.getElementById('settingsForm');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const atelierName = document.getElementById('setAtelierName').value.trim();
      const currency = document.getElementById('setCurrency').value;
      const pinCode = document.getElementById('setPinCode').value.trim() || '2026';

      store.updateSettings({ atelierName, currency, pinCode });
      showToast('Paramètres & Code PIN enregistrés !', 'success');
    };
  }

  const exportBtn = document.getElementById('exportBackupJsonBtn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        mp: store.mp,
        recipes: store.recipes,
        orders: store.orders,
        expenses: store.expenses,
        settings: store.settings
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rose_chocolat_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Sauvegarde exportée avec succès !', 'success');
    };
  }

  const importBtn = document.getElementById('importBackupJsonBtn');
  const fileInput = document.getElementById('importJsonFileInput');

  if (importBtn && fileInput) {
    importBtn.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.mp && data.recipes) {
            store.mp = data.mp;
            store.recipes = data.recipes;
            if (data.orders) store.orders = data.orders;
            if (data.expenses) store.expenses = data.expenses;
            if (data.settings) store.settings = data.settings;

            store.save('rose_chocolat_mp_v1', store.mp);
            store.save('rose_chocolat_recipes_v1', store.recipes);
            store.save('rose_chocolat_orders_v1', store.orders);
            store.save('rose_chocolat_expenses_v1', store.expenses);
            store.save('rose_chocolat_settings_v1', store.settings);

            store.notify();
            showToast('Données restaurées avec succès !', 'success');
          } else {
            showToast('Fichier invalide', 'danger');
          }
        } catch (err) {
          showToast('Erreur lecture JSON', 'danger');
        }
      };
      reader.readAsText(file);
    };
  }

  const clearBtn = document.getElementById('clearAllDataBtn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm('Attention ! Cette action va effacer definitivement toutes vos donnees (MP, recettes, commandes, depenses). Etes-vous certain(e) ?')) {
        if (confirm('Derniere confirmation : effacer toutes les donnees ?')) {
          store.clearAllData();
          showToast('Toutes les donnees ont ete effacees.', 'warning');
        }
      }
    };
  }
}
