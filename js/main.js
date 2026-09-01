import { api } from './api.js';
import { initTabs, showTab } from './tabs.js';
import { initPlans, loadPlans } from './plans.js';
import { initTodos } from './todos.js';
import { initExecutions } from './executions.js';
import { initReview } from './review.js';
import { initExport } from './exportData.js';

const authScreen = document.getElementById('authScreen');
const appRoot = document.getElementById('appRoot');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authError = document.getElementById('authError');
const authTabLogin = document.getElementById('authTabLogin');
const authTabSignup = document.getElementById('authTabSignup');
const userEmailLabel = document.getElementById('userEmailLabel');
const logoutBtn = document.getElementById('logoutBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');

let appInitialized = false;

function setAuthError(msg) {
  authError.textContent = msg || '';
  authError.hidden = !msg;
}

function showAuthScreen() {
  authScreen.hidden = false;
  appRoot.hidden = true;
}

async function showApp(user) {
  authScreen.hidden = true;
  appRoot.hidden = false;
  userEmailLabel.textContent = user.email;
  if (!appInitialized) {
    initTabs();
    initPlans();
    initTodos();
    initExecutions();
    initReview();
    initExport();
    showTab('plans');
    appInitialized = true;
  }
  await loadPlans();
}

async function checkSession() {
  try {
    const { user } = await api.me();
    if (user) {
      await showApp(user);
      return;
    }
  } catch {
    // 로그인 안 됨 — 아래에서 로그인 화면 표시
  }
  showAuthScreen();
}

function switchAuthTab(target) {
  const isLogin = target === 'login';
  authTabLogin.classList.toggle('active', isLogin);
  authTabSignup.classList.toggle('active', !isLogin);
  loginForm.hidden = !isLogin;
  signupForm.hidden = isLogin;
  setAuthError('');
}

async function handleLogin(e) {
  e.preventDefault();
  setAuthError('');
  try {
    await api.login(loginForm.email.value.trim().toLowerCase(), loginForm.password.value);
    loginForm.reset();
    await checkSession();
  } catch (err) {
    setAuthError(err.message);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  setAuthError('');
  try {
    await api.signup(signupForm.email.value.trim().toLowerCase(), signupForm.password.value);
    signupForm.reset();
    await checkSession();
  } catch (err) {
    setAuthError(err.message);
  }
}

async function handleLogout() {
  await api.logout().catch(() => {});
  appInitialized = false;
  location.reload();
}

async function handleDeleteAccount() {
  if (!confirm('계정을 삭제하면 내 모든 자료(계획·할 일·실행 기록)가 함께 삭제됩니다. 계속할까요?')) return;
  try {
    await api.deleteAccount();
  } catch (err) {
    alert('계정 삭제 실패: ' + err.message);
    return;
  }
  appInitialized = false;
  location.reload();
}

function init() {
  authTabLogin.addEventListener('click', () => switchAuthTab('login'));
  authTabSignup.addEventListener('click', () => switchAuthTab('signup'));
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  logoutBtn.addEventListener('click', handleLogout);
  deleteAccountBtn.addEventListener('click', handleDeleteAccount);
  checkSession();
}

init();
