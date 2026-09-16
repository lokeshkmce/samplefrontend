// ===== AWS COGNITO CONFIGURATION =====
const awsConfig = {
  region: 'ap-southeast-1',              // Singapore
  userPoolId: 'ap-southeast-1_WYFK7E7to',
  clientId: '4p5cb41uasdnfdhh53ogg3629j',
};

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
