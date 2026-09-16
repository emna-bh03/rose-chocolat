/* ==========================================================================
   Toast Notification Helper
   ========================================================================== */

let toastContainer = null;

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'info', duration = 3500) {
  const container = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '✨';
  if (type === 'success') icon = '✅';
  if (type === 'danger') icon = '⚠️';
  if (type === 'warning') icon = '🔔';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}
