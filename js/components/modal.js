/* ==========================================================================
   Reusable Modal Dialog Helper
   ========================================================================== */

export function renderModal(id, title, contentHTML, footerHTML = '') {
  let modalOverlay = document.getElementById(id);

  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = id;
    modalOverlay.className = 'modal-overlay';
    document.body.appendChild(modalOverlay);
  }

  modalOverlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title font-serif">${title}</h3>
        <button class="modal-close" data-close="true">&times;</button>
      </div>
      <div class="modal-body">
        ${contentHTML}
      </div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;

  // Attach close listeners
  const closeBtn = modalOverlay.querySelector('[data-close="true"]');
  if (closeBtn) {
    closeBtn.onclick = () => closeModal(id);
  }

  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) {
      closeModal(id);
    }
  };

  return modalOverlay;
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 250);
  }
}
