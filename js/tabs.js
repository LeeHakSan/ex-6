const TABS = ['plans', 'todos', 'review'];

export function showTab(name) {
  TABS.forEach((t) => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === name);
    document.getElementById(`panel-${t}`).classList.toggle('active', t === name);
  });
  document.dispatchEvent(new CustomEvent('app:tab-shown', { detail: { tab: name } }));
}

export function initTabs() {
  TABS.forEach((t) => {
    document.getElementById(`tab-${t}`).addEventListener('click', () => showTab(t));
  });
}
