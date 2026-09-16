// ===== AWS COGNITO CONFIGURATION =====
const awsConfig = {
  region:     'ap-southeast-1',
  userPoolId: 'ap-southeast-1_WYFK7E7to',
  clientId:   '4p5cb41uasdnfdhh53ogg3629j',
};

// ===== COGNITO POOL & CLIENT SETUP =====
const cognitoUserPool = new AmazonCognitoIdentity.CognitoUserPool({
  UserPoolId: awsConfig.userPoolId,
  ClientId:   awsConfig.clientId,
});

// ─── Helper: get current pending registration email ───
let pendingEmail = '';   // used across OTP step

// ─── Helper: show toast ───
function showToast(msg, type = 'success') {
  const toast = document.getElementById('auth-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `auth-toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Helper: show error banner inside modal ───
function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

// ─── Helper: clear error ───
function clearError(elId) {
  const el = document.getElementById(elId);
  if (el) { el.textContent = ''; el.classList.remove('show'); }
}

// ─── Helper: set button loading state ───
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) btn.classList.add('loading');
  else btn.classList.remove('loading');
  btn.disabled = loading;
}

// ─── Update navbar based on auth state ───
function updateNavbarAuth(user) {
  const loggedOut = document.getElementById('auth-logged-out');
  const loggedIn  = document.getElementById('auth-logged-in');
  const nameEl    = document.getElementById('user-name-nav');
  const avatarEl  = document.getElementById('user-avatar-nav');
  if (!loggedOut || !loggedIn) return;
  if (user) {
    loggedOut.style.display = 'none';
    loggedIn.style.display  = 'flex';
    const name = user.email || user.username || 'User';
    if (nameEl)   nameEl.textContent = name.split('@')[0];
    if (avatarEl) avatarEl.textContent = (name[0] || 'U').toUpperCase();
  } else {
    loggedOut.style.display = 'flex';
    loggedIn.style.display  = 'none';
  }
}

// ─── Check existing session on page load ───
function checkSession() {
  const currentUser = cognitoUserPool.getCurrentUser();
  if (!currentUser) { updateNavbarAuth(null); return; }
  currentUser.getSession((err, session) => {
    if (err || !session.isValid()) { updateNavbarAuth(null); return; }
    currentUser.getUserAttributes((attrErr, attrs) => {
      const emailAttr = attrs && attrs.find(a => a.Name === 'email');
      updateNavbarAuth({ email: emailAttr ? emailAttr.Value : currentUser.getUsername() });
    });
  });
}

// ─────────────────────────────────────────────────────
//  REGISTER
// ─────────────────────────────────────────────────────
function cognitoSignUp(name, email, password) {
  clearError('reg-error');
  setLoading('register-submit-btn', true);

  const attributeList = [
    new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email }),
    new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'name',  Value: name  }),
  ];

  cognitoUserPool.signUp(email, password, attributeList, null, (err, result) => {
    setLoading('register-submit-btn', false);
    if (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      showError('reg-error', msg);
      return;
    }
    // Move to OTP step
    pendingEmail = email;
    document.getElementById('otp-email-display').textContent = email;
    document.getElementById('register-step-1').style.display = 'none';
    document.getElementById('register-step-2').style.display = 'block';
    // Clear OTP boxes
    document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled'); });
    document.querySelectorAll('.otp-box')[0].focus();
  });
}

// ─────────────────────────────────────────────────────
//  CONFIRM OTP
// ─────────────────────────────────────────────────────
function cognitoConfirmOTP() {
  clearError('otp-error');
  const code = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value.trim()).join('');
  if (code.length < 6) { showError('otp-error', 'Please enter the full 6-digit code.'); return; }

  setLoading('otp-verify-btn', true);
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: pendingEmail,
    Pool:     cognitoUserPool,
  });

  cognitoUser.confirmRegistration(code, true, (err) => {
    setLoading('otp-verify-btn', false);
    if (err) { showError('otp-error', err.message || 'Invalid code. Try again.'); return; }
    closeAllModals();
    showToast('🎉 Account verified! You can now log in.', 'success');
    setTimeout(() => openModal('login-modal'), 800);
  });
}

// ─────────────────────────────────────────────────────
//  RESEND OTP
// ─────────────────────────────────────────────────────
function cognitoResendOTP() {
  if (!pendingEmail) return;
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: pendingEmail, Pool: cognitoUserPool });
  cognitoUser.resendConfirmationCode((err) => {
    if (err) { showError('otp-error', err.message || 'Failed to resend. Try again.'); return; }
    showToast('📧 New code sent to ' + pendingEmail, 'success');
  });
}

// ─────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────
function cognitoSignIn(email, password) {
  clearError('login-error');
  setLoading('login-submit-btn', true);

  const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: cognitoUserPool });

  cognitoUser.authenticateUser(authDetails, {
    onSuccess(session) {
      setLoading('login-submit-btn', false);
      closeAllModals();
      const idToken = session.getIdToken().decodePayload();
      updateNavbarAuth({ email: idToken.email || email });
      showToast('👋 Welcome back, ' + (idToken.name || email.split('@')[0]) + '!', 'success');
    },
    onFailure(err) {
      setLoading('login-submit-btn', false);
      let msg = err.message || 'Login failed.';
      if (err.code === 'UserNotConfirmedException') {
        msg = 'Account not verified. Please check your email for the OTP.';
        pendingEmail = email;
        closeAllModals();
        document.getElementById('register-step-1').style.display = 'none';
        document.getElementById('register-step-2').style.display = 'block';
        document.getElementById('otp-email-display').textContent = email;
        openModal('register-modal');
      }
      showError('login-error', msg);
    },
    newPasswordRequired() {
      setLoading('login-submit-btn', false);
      showError('login-error', 'New password required. Please contact support.');
    },
  });
}

// ─────────────────────────────────────────────────────
//  LOGOUT
// ─────────────────────────────────────────────────────
function cognitoSignOut() {
  const currentUser = cognitoUserPool.getCurrentUser();
  if (currentUser) currentUser.signOut();
  updateNavbarAuth(null);
  showToast('👋 Logged out successfully.', 'success');
}


// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');

  // Active nav link
  const sections = document.querySelectorAll('section[id]');
  const scrollY = window.scrollY + 100;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (link) {
      if (scrollY >= top && scrollY < top + height) link.classList.add('active');
      else link.classList.remove('active');
    }
  });

  // Back to top
  const btt = document.getElementById('btt');
  if (btt) {
    if (window.scrollY > 400) btt.classList.add('show');
    else btt.classList.remove('show');
  }
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// ===== BACK TO TOP =====
const btt = document.getElementById('btt');
if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===== COUNTER ANIMATION =====
function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-count'));
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString();
  }, 16);
}

// ===== SCROLL REVEAL =====
const revealEls = document.querySelectorAll(
  '.svc-card, .port-card, .team-card, .testi-card, .about-inner > *, .hero-content, .hero-visual, .check-item'
);
revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

revealEls.forEach(el => observer.observe(el));

// ===== COUNTER OBSERVER =====
const counterEls = document.querySelectorAll('.snum');
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
counterEls.forEach(el => counterObs.observe(el));

// ===== PROGRESS BAR ANIMATION =====
const barFills = document.querySelectorAll('.bar-fill');
const barObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const w = entry.target.getAttribute('data-w');
      entry.target.style.width = w + '%';
      barObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
barFills.forEach(el => barObs.observe(el));

// ===== CONTACT FORM =====
const form = document.getElementById('contact-form');
const formOk = document.getElementById('form-ok');
const submitBtn = document.getElementById('submit-btn');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fname').value.trim();
    const email = document.getElementById('femail').value.trim();
    const msg = document.getElementById('fmsg').value.trim();
    if (!name || !email || !msg) {
      alert('Please fill in all required fields.');
      return;
    }
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    setTimeout(() => {
      submitBtn.textContent = '✅ Sent!';
      if (formOk) { formOk.style.display = 'block'; }
      form.reset();
      setTimeout(() => {
        submitBtn.textContent = 'Send Message ✈️';
        submitBtn.disabled = false;
        if (formOk) formOk.style.display = 'none';
      }, 4000);
    }, 1500);
  });
}

// ===== SMOOTH HOVER TILT on service cards =====
document.querySelectorAll('.svc-card, .port-card, .team-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
    card.style.transform = `translateY(-6px) rotateX(${y}deg) rotateY(${x}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ===== NAVBAR SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

console.log('%c NexaCore Technologies Website Loaded! 🚀', 'color:#2563EB;font-size:14px;font-weight:bold;');

// =============================================
//  MODAL HELPERS
// =============================================
function openModal(id) {
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById(id);
  if (!overlay || !modal) return;
  overlay.classList.add('active');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAllModals() {
  document.querySelectorAll('.auth-modal').forEach(m => m.classList.remove('active'));
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// =============================================
//  DOM READY — Wire up all auth UI events
// =============================================
document.addEventListener('DOMContentLoaded', () => {

  // ─── Session restore ───
  checkSession();

  // ─── Open modals ───
  document.getElementById('open-login-btn')?.addEventListener('click', () => {
    clearError('login-error');
    openModal('login-modal');
  });
  document.getElementById('open-register-btn')?.addEventListener('click', () => {
    clearError('reg-error');
    document.getElementById('register-step-1').style.display = 'block';
    document.getElementById('register-step-2').style.display = 'none';
    openModal('register-modal');
  });

  // ─── Close modals ───
  document.getElementById('close-register')?.addEventListener('click', closeAllModals);
  document.getElementById('close-login')?.addEventListener('click', closeAllModals);
  document.getElementById('modal-overlay')?.addEventListener('click', closeAllModals);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });

  // ─── Switch between modals ───
  document.getElementById('switch-to-login-from-reg')?.addEventListener('click', e => {
    e.preventDefault(); closeAllModals();
    setTimeout(() => { clearError('login-error'); openModal('login-modal'); }, 200);
  });
  document.getElementById('switch-to-register-from-login')?.addEventListener('click', e => {
    e.preventDefault(); closeAllModals();
    setTimeout(() => {
      clearError('reg-error');
      document.getElementById('register-step-1').style.display = 'block';
      document.getElementById('register-step-2').style.display = 'none';
      openModal('register-modal');
    }, 200);
  });

  // ─── REGISTER form submit ───
  document.getElementById('register-submit-btn')?.addEventListener('click', () => {
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pw    = document.getElementById('reg-password').value;
    if (!name)  { showError('reg-error', 'Please enter your full name.');     return; }
    if (!email) { showError('reg-error', 'Please enter your email address.');  return; }
    if (!pw || pw.length < 8) { showError('reg-error', 'Password must be at least 8 characters.'); return; }
    cognitoSignUp(name, email, pw);
  });

  // ─── OTP verify ───
  document.getElementById('otp-verify-btn')?.addEventListener('click', cognitoConfirmOTP);

  // ─── Resend OTP ───
  document.getElementById('resend-otp-btn')?.addEventListener('click', e => {
    e.preventDefault();
    cognitoResendOTP();
  });

  // ─── LOGIN form submit ───
  document.getElementById('login-submit-btn')?.addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    const pw    = document.getElementById('login-password').value;
    if (!email) { showError('login-error', 'Please enter your email address.'); return; }
    if (!pw)    { showError('login-error', 'Please enter your password.'); return; }
    cognitoSignIn(email, pw);
  });

  // Enter key on login inputs
  ['login-email', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('login-submit-btn')?.click();
    });
  });

  // ─── LOGOUT ───
  document.getElementById('logout-btn')?.addEventListener('click', cognitoSignOut);

  // ─── Password strength meter ───
  document.getElementById('reg-password')?.addEventListener('input', function () {
    const val = this.value;
    const bar = document.getElementById('pw-bar');
    const lbl = document.getElementById('pw-label');
    if (!bar || !lbl) return;
    bar.className = 'pw-bar';
    lbl.className = 'pw-label';
    if (!val) { bar.style.width = '0'; lbl.textContent = ''; return; }
    const hasUpper = /[A-Z]/.test(val);
    const hasNum   = /[0-9]/.test(val);
    const hasSpec  = /[^A-Za-z0-9]/.test(val);
    const score = (val.length >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpec ? 1 : 0);
    if (score <= 1)      { bar.classList.add('weak');   lbl.classList.add('weak');   lbl.textContent = '⚠️ Weak'; }
    else if (score <= 3) { bar.classList.add('medium'); lbl.classList.add('medium'); lbl.textContent = '👍 Medium'; }
    else                 { bar.classList.add('strong'); lbl.classList.add('strong'); lbl.textContent = '✅ Strong'; }
  });

  // ─── OTP box auto-tab & backspace ───
  const otpBoxes = document.querySelectorAll('.otp-box');
  otpBoxes.forEach((box, i) => {
    box.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(-1);
      if (this.value) {
        this.classList.add('filled');
        if (i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
        // Auto verify when all filled
        if (Array.from(otpBoxes).every(b => b.value)) cognitoConfirmOTP();
      } else {
        this.classList.remove('filled');
      }
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !this.value && i > 0) {
        otpBoxes[i - 1].value = '';
        otpBoxes[i - 1].classList.remove('filled');
        otpBoxes[i - 1].focus();
      }
    });
    box.addEventListener('paste', function (e) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      text.split('').forEach((ch, j) => {
        if (otpBoxes[j]) { otpBoxes[j].value = ch; otpBoxes[j].classList.add('filled'); }
      });
      if (text.length === 6) { otpBoxes[5].focus(); cognitoConfirmOTP(); }
      else if (otpBoxes[text.length]) otpBoxes[text.length].focus();
    });
  });

  // ─── Show / hide password toggle ───
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', function () {
      const input = document.getElementById(this.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      this.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

});

