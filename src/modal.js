export function openModal() {
  const overlay = document.getElementById('modal-overlay');
  const mainView = document.getElementById('app-view');
  
  overlay.classList.remove('hidden');
  mainView.classList.add('blurred');
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const mainView = document.getElementById('app-view');
  
  overlay.classList.add('hidden');
  mainView.classList.remove('blurred');
}

// Bind close button
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
});
