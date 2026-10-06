export function openModal() {
  const overlay = document.getElementById('modal-overlay');
  const mainView = document.getElementById('app-view');
  if (overlay) overlay.classList.remove('hidden');
  if (mainView) mainView.classList.add('blurred');
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const mainView = document.getElementById('app-view');
  if (overlay) overlay.classList.add('hidden');
  if (mainView) mainView.classList.remove('blurred');
}

// Expose globally for inline fallback
window.closeModal = closeModal;

function initModal() {
  const closeBtn = document.getElementById('close-modal-btn');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    };
  }

  // Also close if clicking outside modal box (on dark backdrop)
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModal);
} else {
  initModal();
}
