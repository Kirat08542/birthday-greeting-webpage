/* js/guest.js - minimal behavior to power the invitation page */
const Guest = (function(){
  // read attributes
  const audioSrc = document.body.getAttribute('data-audio') || '';
  const eventTimeStr = document.body.getAttribute('data-time') || '';
  const confettiEnabled = document.body.getAttribute('data-confetti') === 'true';

  // audio
  let audio = null;
  let audioPlaying = false;

  // comments (client-side memory)
  const comments = [];

  // helpers
  const $ = (id) => document.getElementById(id);

  function init() {
    // init audio
    if (audioSrc) {
      try {
        audio = new Audio(audioSrc);
        audio.loop = true;
      } catch (e) {
        console.warn('Audio init failed', e);
      }
    }

    // init countdown
    if (eventTimeStr && $('day')) startCountdown(eventTimeStr);

    // init dev badge for file://
    try {
      if (!window.isSecureContext) {
        const dev = document.getElementById('dev-badge');
        if (dev) dev.style.display = 'block';
      }
    } catch (e) {}

    // make root visible (simple boot)
    const root = document.getElementById('root');
    if (root) {
      root.classList.remove('opacity-0');
      root.style.opacity = 1;
    }

    // load any images with data-src (already done in index, but ensure)
    document.querySelectorAll('img[data-src]').forEach(img => {
      if (!img.src || img.src.endsWith('placeholder.webp')) {
        const ds = img.getAttribute('data-src');
        if (ds) img.src = ds;
      }
    });

    // init carousel (Bootstrap auto handles with data-bs-ride)
    // bind modal triggers
    document.querySelectorAll('[onclick^="Guest.modalImage"]').forEach(el => {
      // nothing else needed; modalImage will use the clicked element
    });
  }

  // Countdown
  function startCountdown(dateStr) {
    let target;
    try {
      // normalize: accept 'YYYY-MM-DD HH:MM:SS' or ISO
      const iso = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
      // if no timezone, assume local
      target = new Date(iso);
      if (isNaN(target)) target = new Date(); // fallback
    } catch (e) {
      target = new Date();
    }

    function tick() {
      const now = new Date();
      let diff = Math.max(0, target.getTime() - now.getTime());
      const days = Math.floor(diff / (1000*60*60*24));
      diff -= days * (1000*60*60*24);
      const hours = Math.floor(diff / (1000*60*60));
      diff -= hours * (1000*60*60);
      const mins = Math.floor(diff / (1000*60));
      diff -= mins * (1000*60);
      const secs = Math.floor(diff / 1000);

      if ($('day')) $('day').textContent = String(days);
      if ($('hour')) $('hour').textContent = String(hours).padStart(2,'0');
      if ($('minute')) $('minute').textContent = String(mins).padStart(2,'0');
      if ($('second')) $('second').textContent = String(secs).padStart(2,'0');

      if (target.getTime() - now.getTime() <= 0) {
        // event passed — stop updating
        clearInterval(timerId);
      }
    }

    tick();
    const timerId = setInterval(tick, 1000);
  }

  // Modal show image (pass element)
  function modalImage(el){
    if (!el) return;
    const modalImg = document.getElementById('modal-image-el');
    if (!modalImg) return;
    const src = el.getAttribute('data-src') || el.src || el.getAttribute('src');
    if (src) modalImg.src = src;
    // show bootstrap modal
    const modal = new bootstrap.Modal(document.getElementById('modalImage'));
    modal.show();
  }

  // toggle audio
  function toggleAudio(){
    if (!audio) return;
    if (!audioPlaying) {
      audio.play().catch(()=>{});
      audioPlaying = true;
      const b = document.getElementById('btn-audio'); if (b) b.textContent = 'Pause Music';
    } else {
      audio.pause();
      audioPlaying = false;
      const b = document.getElementById('btn-audio'); if (b) b.textContent = 'Play Music';
    }
  }

  // simple add-to-calendar (opens Google Calendar with event)
  function addToCalendar(){
    const title = encodeURIComponent('Abigail — Birthday Celebration');
    const start = encodeURIComponent(new Date((document.body.getAttribute('data-time')||'')).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z');
    // quick fallback: use event day only if parsing failed
    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`;
    try {
      const t = new Date(document.body.getAttribute('data-time').replace(' ', 'T'));
      if (!isNaN(t)) {
        const end = new Date(t.getTime() + (3*60*60*1000)); // 3 hours default
        const ds = t.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
        const de = end.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
        url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${ds}/${de}`;
      }
    } catch(e){}
    window.open(url, '_blank');
  }

  // send comment (client-side only)
  function sendComment(){
    const name = (document.getElementById('form-name')||{value:''}).value.trim();
    const presence = (document.getElementById('form-presence')||{value:'0'}).value;
    const msg = (document.getElementById('form-comment')||{value:''}).value.trim();
    if (!name || name.length < 2) {
      alert('Please enter your name (at least 2 characters).'); return;
    }
    if (!msg || msg.length < 1) {
      alert('Please enter your message.'); return;
    }
    const obj = {name, presence, msg, time: new Date().toLocaleString()};
    comments.unshift(obj);
    renderComments();
    // clear
    (document.getElementById('form-comment')||{}).value = '';
    (document.getElementById('form-presence')||{}).value = '0';
    alert('Thank you! Your message is saved locally (client-only).');
  }

  function renderComments(){
    const el = document.getElementById('comments');
    if (!el) return;
    el.innerHTML = '';
    for (const c of comments) {
      const wrap = document.createElement('div');
      wrap.className = 'mb-2 p-2 bg-white-black rounded-3';
      wrap.innerHTML = `<strong>${escapeHtml(c.name)}</strong> <small class="text-muted">・${c.time}</small><div class="mt-1">${escapeHtml(c.msg)}</div>`;
      el.appendChild(wrap);
    }
  }

  // small HTML esc
  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Expose public API
  return {
    init,
    modalImage,
    toggleAudio,
    addToCalendar,
    sendComment,
    // alias to global usage
    commentSend: sendComment
  };
})();

// Auto-initialize when DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  try { Guest.init(); } catch(e){ console.error('Guest init failed', e); }
});




// 



// === Audio autoplay + Play/Pause button integration ===
(function(){
  const audioSrc = document.body.getAttribute('data-audio') || './assets/music/happy-birthday.mp3';
  const pageAudio = new Audio(audioSrc);
  pageAudio.loop = true;
  pageAudio.preload = 'auto';

  // Try to autoplay, fallback to first interaction
  function tryAutoPlay() {
    const btn = document.getElementById('btn-audio');
    pageAudio.play().then(()=>{
      if (btn) btn.textContent = 'Pause Music';
    }).catch(()=>{
      // autoplay failed; wait for first user action
      const start = () => {
        pageAudio.play().then(()=>{ if (btn) btn.textContent = 'Pause Music'; }).catch(()=>{});
        window.removeEventListener('pointerdown', start);
        window.removeEventListener('touchstart', start);
        window.removeEventListener('keydown', start);
      };
      window.addEventListener('pointerdown', start, {once:true});
      window.addEventListener('touchstart', start, {once:true});
      window.addEventListener('keydown', start, {once:true});
    });
  }

  function attachButton() {
    const btn = document.getElementById('btn-audio');
    if (!btn) return;
    btn.addEventListener('click', ()=>{
      if (pageAudio.paused) {
        pageAudio.play().then(()=>{ btn.textContent = 'Pause Music'; }).catch(()=>{});
      } else {
        pageAudio.pause();
        btn.textContent = 'Play Music';
      }
    });
  }

  // expose for other scripts
  window._pageAudio = pageAudio;

  // init
  setTimeout(()=>{ tryAutoPlay(); attachButton(); }, 120);
})();

// === Carousel init guard ===
(function(){
  function ensureSingleActive() {
    const gallery = document.getElementById('carouselGallery');
    if (!gallery) return;
    const items = gallery.querySelectorAll('.carousel-item');
    let found = false;
    items.forEach((it, idx)=>{
      if (it.classList.contains('active')) {
        if (!found) found = true;
        else it.classList.remove('active');
      }
    });
    if (!found && items.length) items[0].classList.add('active');
  }

  function initSafeCarousel() {
    const gallery = document.getElementById('carouselGallery');
    if (!gallery || !window.bootstrap) return;
    ensureSingleActive();
    try { if (gallery._bs_carousel) gallery._bs_carousel.dispose(); } catch(e){}
    gallery._bs_carousel = new bootstrap.Carousel(gallery, {
      interval: parseInt(gallery.getAttribute('data-bs-interval')||3500,10),
      ride: 'carousel', pause: 'hover', wrap: true
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    ensureSingleActive();
    window.addEventListener('load', initSafeCarousel);
    setTimeout(initSafeCarousel, 600);
  } else {
    window.addEventListener('DOMContentLoaded', ()=>{ ensureSingleActive(); window.addEventListener('load', initSafeCarousel); setTimeout(initSafeCarousel,600); });
  }
})();




// === Audio sync enforcement (single source & button sync) ===
(function(){
  // Use existing page audio if present or create one
  const audioSrc = document.body.getAttribute('data-audio') || './assets/music/happy-birthday.mp3';
  const pageAudio = window._pageAudio || new Audio(audioSrc);
  pageAudio.loop = true;
  pageAudio.preload = 'auto';
  // make sure global reference exists
  window._pageAudio = pageAudio;

  function setupControls() {
    const btn = document.getElementById('btn-audio');
    function updateBtnText() {
      if (!btn) return;
      btn.textContent = pageAudio.paused ? 'Play Music' : 'Pause Music';
    }
    // keep button text synced with actual playback
    pageAudio.addEventListener('play', updateBtnText);
    pageAudio.addEventListener('pause', updateBtnText);
    pageAudio.addEventListener('ended', updateBtnText);
    // attach click handler (idempotent)
    if (btn && !btn._audioSyncAttached) {
      btn.addEventListener('click', (e)=>{
        if (pageAudio.paused) {
          pageAudio.play().catch(()=>{});
        } else {
          pageAudio.pause();
        }
        updateBtnText();
      });
      btn._audioSyncAttached = true;
    }
    // initial label update
    updateBtnText();
  }

  // Attempt autoplay, then ensure controls are wired after DOM ready
  function tryStart() {
    pageAudio.play().then(()=>{}).catch(()=>{});
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    tryStart();
    setTimeout(setupControls, 120);
  } else {
    window.addEventListener('DOMContentLoaded', ()=>{ tryStart(); setTimeout(setupControls, 120); });
  }

  // If Guest global exists, override its toggleAudio to use this single audio source
  try {
    if (window.Guest && typeof window.Guest.toggleAudio === 'function') {
      window.Guest.toggleAudio = function(){
        if (pageAudio.paused) pageAudio.play().catch(()=>{}); else pageAudio.pause();
        // update button immediately
        const btn = document.getElementById('btn-audio'); if (btn) btn.textContent = pageAudio.paused ? 'Play Music' : 'Pause Music';
      };
    }
  } catch(e){ console.error('override Guest.toggleAudio failed', e); }
})();

// --- Minimal safe audio controller (added by assistant) ---
(function(){
  const btn = document.getElementById && document.getElementById('btn-audio');
  const audioSrc = document.body && document.body.getAttribute ? document.body.getAttribute('data-audio') : './assets/music/happy-birthday.mp3';
  // single audio instance
  const pageAudio = window._pageAudio || new Audio(audioSrc || './assets/music/happy-birthday.mp3');
  pageAudio.loop = true;
  pageAudio.preload = 'auto';
  window._pageAudio = pageAudio;

  function updateBtn() {
    if (!btn) return;
    try { btn.textContent = pageAudio.paused ? 'Play Music' : 'Pause Music'; } catch(e){}
  }

  // keep label in sync
  try { pageAudio.addEventListener('play', updateBtn); pageAudio.addEventListener('pause', updateBtn); pageAudio.addEventListener('ended', updateBtn); } catch(e){}

  // attach button handler once (idempotent)
  function attach() {
    if (!btn || btn._audioAttached) return;
    btn.addEventListener('click', function(e){
      e && e.preventDefault && e.preventDefault();
      if (pageAudio.paused) pageAudio.play().catch(()=>{});
      else pageAudio.pause();
      updateBtn();
    });
    btn._audioAttached = true;
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') attach(); else document.addEventListener('DOMContentLoaded', attach);

  // try to autoplay (non-blocking)
  setTimeout(function(){ pageAudio.play().catch(function(){}); updateBtn(); }, 120);

  // Expose for debugging
  window._pageAudio = pageAudio;
})();



// === Assistant safe guard: non-blocking init & audio sync ===
(function(){
  try {
    // Ensure single audio instance and attach button safely
    var btn = document.getElementById && document.getElementById('btn-audio');
    var audioSrc = (document.body && document.body.getAttribute && document.body.getAttribute('data-audio')) || './assets/music/happy-birthday.mp3';
    var pageAudio = window._pageAudio || new Audio(audioSrc);
    pageAudio.loop = true;
    pageAudio.preload = 'auto';
    window._pageAudio = pageAudio;
    function updateBtn(){ try{ if (btn) btn.textContent = pageAudio.paused ? 'Play Music' : 'Pause Music'; }catch(e){} }
    try{ pageAudio.addEventListener('play', updateBtn); pageAudio.addEventListener('pause', updateBtn); }catch(e){}
    function attachBtn(){ if (!btn || btn._attached) return; btn.addEventListener('click', function(e){ e && e.preventDefault && e.preventDefault(); if (pageAudio.paused) pageAudio.play().catch(function(){}); else pageAudio.pause(); updateBtn(); }); btn._attached = true; updateBtn(); }
    if (document.readyState === 'complete' || document.readyState === 'interactive') attachBtn(); else document.addEventListener('DOMContentLoaded', attachBtn);
    // try autoplay but do not block
    setTimeout(function(){ try{ pageAudio.play().catch(function(){}); updateBtn(); }catch(e){} }, 150);
  } catch(e){ console.error('safe guard audio init failed', e); }
})();



// Robust modal navigation: rebuilds image list on modal show and keeps arrows in sync
(function(){
  if (window._modalNavInstalled) return;
  window._modalNavInstalled = true;

  function collectGalleryImages() {
    var nodes = Array.from(document.querySelectorAll('#carouselGallery .carousel-item img, #gallery img'));
    var seen = new Set(), out = [];
    nodes.forEach(function(img){
      if (!img) return;
      var src = img.getAttribute('src') || img.dataset.src || img.currentSrc || img.src;
      if (!src) return;
      if (!seen.has(src)) { seen.add(src); out.push(src); }
    });
    return out;
  }

  function setModalImageByIndex(idx) {
    var imgs = collectGalleryImages();
    if (!imgs.length) return;
    var next = ((idx % imgs.length) + imgs.length) % imgs.length;
    var modalImg = document.getElementById('modal-image-el');
    if (!modalImg) return;
    modalImg.src = imgs[next];
    modalImg.dataset.galleryIndex = next;
    modalImg.dataset.galleryLen = imgs.length;
    var counter = document.getElementById('modal-counter');
    if (counter) counter.textContent = (next + 1) + ' / ' + imgs.length;
  }

  function findIndexOfSrc(src){
    var imgs = collectGalleryImages();
    return imgs.indexOf(src);
  }

  function openModalWithSrc(src){
    var modalImg = document.getElementById('modal-image-el');
    var modalEl = document.getElementById('modalImage');
    if (!modalImg || !modalEl) return;
    var imgs = collectGalleryImages();
    var idx = imgs.indexOf(src);
    if (idx === -1) idx = 0;
    setModalImageByIndex(idx);
    try { var m = bootstrap.Modal.getOrCreateInstance(modalEl); m.show(); } catch(e){}
  }

  window.Guest = window.Guest || {};
  var prevGuestModal = window.Guest.modalImage;
  window.Guest.modalImage = function(el){
    try {
      var src = el.getAttribute('src') || el.dataset.src || el.getAttribute('data-src') || el.src;
      if (src) openModalWithSrc(src);
      else if (typeof prevGuestModal === 'function') prevGuestModal(el);
    } catch(e){ if (typeof prevGuestModal === 'function') prevGuestModal(el); }
  };

  function showByOffset(offset){
    var modalImg = document.getElementById('modal-image-el');
    if (!modalImg) return;
    var idx = parseInt(modalImg.dataset.galleryIndex || '0', 10);
    setModalImageByIndex(idx + offset);
  }

  function wireModalControls(){
    var prev = document.getElementById('modal-prev'), next = document.getElementById('modal-next');
    if (prev && !prev._modalHook) { prev.addEventListener('click', function(e){ e.preventDefault(); showByOffset(-1); }); prev._modalHook = true; }
    if (next && !next._modalHook) { next.addEventListener('click', function(e){ e.preventDefault(); showByOffset(1); }); next._modalHook = true; }

    if (!document._modalKeysHooked) {
      document.addEventListener('keydown', function(e){
        var modalEl = document.getElementById('modalImage');
        if (!modalEl) return;
        var open = modalEl.classList.contains('show') || document.body.classList.contains('modal-open');
        if (!open) return;
        if (e.key === 'ArrowLeft') { showByOffset(-1); e.preventDefault(); }
        if (e.key === 'ArrowRight') { showByOffset(1); e.preventDefault(); }
      });
      document._modalKeysHooked = true;
    }

    var modalBody = document.querySelector('#modalImage .modal-body');
    if (modalBody && !modalBody._modalClickHook) {
      modalBody.addEventListener('click', function(e){
        if (e.target.closest('#modal-prev') || e.target.closest('#modal-next') || e.target.closest('[data-bs-dismiss]')) return;
        var w = modalBody.clientWidth;
        var x = e.clientX - modalBody.getBoundingClientRect().left;
        if (x < w * 0.35) showByOffset(-1);
        else if (x > w * 0.65) showByOffset(1);
      });
      modalBody._modalClickHook = true;
    }
  }

  function initModalLifecycle(){
    var modalEl = document.getElementById('modalImage');
    if (!modalEl) return;
    wireModalControls();
    modalEl.addEventListener('show.bs.modal', function(){
      setTimeout(function(){
        var modalImg = document.getElementById('modal-image-el');
        if (modalImg) {
          var src = modalImg.getAttribute('src') || modalImg.dataset.src;
          var idx = findIndexOfSrc(src);
          if (idx === -1) idx = 0;
          setModalImageByIndex(idx);
        } else {
          setModalImageByIndex(0);
        }
      }, 10);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initModalLifecycle, 50);
  } else {
    document.addEventListener('DOMContentLoaded', initModalLifecycle);
  }
})();