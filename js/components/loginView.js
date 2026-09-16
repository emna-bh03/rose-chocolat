/* ==========================================================================
   Rose Chocolat Private PIN Authentication Screen
   ========================================================================== */

import { store } from '../state.js';

export function renderLoginView() {
  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #FAF8F5 0%, #FDF0F2 100%); padding: 1.5rem;">
      <div style="background: white; border-radius: 24px; border: 1px solid #EAE4DC; padding: 2.5rem 2rem; width: 100%; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.06); text-align: center;">
        
        <div style="width: 72px; height: 72px; background: #FDF0F2; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;">
          <span style="font-size: 2.2rem;">🌸</span>
        </div>

        <h1 style="font-family: var(--font-serif); font-size: 1.75rem; color: #1A1A1A; margin-bottom: 0.3rem;">
          Rose Chocolat
        </h1>
        <p style="font-size: 0.88rem; color: #736D67; margin-bottom: 2rem;">
          Atelier Privé — Accès Réservé
        </p>

        <form id="loginPinForm">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="font-weight: 700; font-size: 0.85rem; color: #1A1A1A; display: block; margin-bottom: 0.6rem;">
              Entrez votre Code PIN :
            </label>
            
            <input 
              type="password" 
              inputmode="numeric" 
              pattern="[0-9]*" 
              maxLength="8" 
              id="pinInput" 
              class="form-control" 
              placeholder="••••" 
              style="font-size: 1.8rem; text-align: center; letter-spacing: 0.5rem; padding: 0.75rem; border-radius: 12px; font-weight: 700;" 
              autoFocus 
              required
            >
          </div>

          <div id="loginErrorMsg" style="color: #D90429; font-size: 0.83rem; margin-bottom: 1rem; display: none; font-weight: 600;">
            Code PIN incorrect
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-weight: 700; font-size: 1rem; border-radius: 12px;">
            Accéder à l'Atelier
          </button>
        </form>

        <div style="margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid #F5EFEB; font-size: 0.78rem; color: #8C8580;">
          🔒 Espace sécurisé & synchronisé en temps réel
        </div>

      </div>
    </div>
  `;
}

export function attachLoginEvents() {
  const form = document.getElementById('loginPinForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const pin = document.getElementById('pinInput').value.trim();
    const errorEl = document.getElementById('loginErrorMsg');

    const result = await store.login(pin);
    if (!result.success) {
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.innerText = result.error || 'Code PIN incorrect';
      }
      document.getElementById('pinInput').value = '';
      document.getElementById('pinInput').focus();
    }
  };
}
