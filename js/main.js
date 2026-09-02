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
const authSuccess = document.getElementById('authSuccess');
const authTabLogin = document.getElementById('authTabLogin');
const authTabSignup = document.getElementById('authTabSignup');
const userEmailLabel = document.getElementById('userEmailLabel');
const logoutBtn = document.getElementById('logoutBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');

let appInitialized = false;

const SPECIAL_CHAR_RE = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/;
function validatePassword(pw) {
  if (pw.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  if (!SPECIAL_CHAR_RE.test(pw)) return '비밀번호에 특수문자를 1개 이상 포함해 주세요.';
  return null;
}

function setAuthError(msg) {
  authError.textContent = msg || '';
  authError.hidden = !msg;
}

function setAuthSuccess(msg) {
  authSuccess.textContent = msg || '';
  authSuccess.hidden = !msg;
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
  setAuthSuccess('');
}

async function handleLogin(e) {
  e.preventDefault();
  setAuthError('');
  setAuthSuccess('');
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
  setAuthSuccess('');
  const email = signupForm.email.value.trim().toLowerCase();
  const password = signupForm.password.value;
  const password2 = signupForm.password2.value;
  if (password !== password2) {
    setAuthError('비밀번호 확인이 일치하지 않습니다.');
    return;
  }
  const pwError = validatePassword(password);
  if (pwError) {
    setAuthError(pwError);
    return;
  }
  try {
    await api.signup(email, password);
    signupForm.reset();
    // 가입 직후 자동 로그인시키지 않는다 — 성공 메시지를 보여주고
    // 로그인 탭으로 돌려보내 사용자가 직접 로그인하게 한다.
    switchAuthTab('login');
    loginForm.email.value = email;
    setAuthSuccess('회원가입에 성공했습니다. 로그인해 주세요.');
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
