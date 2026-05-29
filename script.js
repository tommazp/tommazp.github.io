// ============================================================
//  LO QUIERO! — Catálogo | script.js
// ============================================================

const ADMIN_PASS = 'carina123';
const WA_NUMBER  = '5493445440326';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/TU_ID_AQUI/exec';

// ==================== STATE ====================
let products  = JSON.parse(localStorage.getItem('lq_products') || '[]');
let favorites = JSON.parse(localStorage.getItem('lq_favs')     || '[]');
// Recently viewed: array of product IDs, max 10, ordered newest first
let recentlyViewed = JSON.parse(localStorage.getItem('lq_recent') || '[]');

let selectedTags   = [];
let uploadedImages = [];
let activeCategory = 'all';
let activeStatus   = 'all';
let activeStock    = 'all';

// Whether any filter/search is active (hides special sections)
let isFiltering = false;

const carouselOffsets = {};

// ==================== SAMPLE DATA ====================
if (products.length === 0) {
  products = [
    { id:1,  name:'Auriculares Inalámbricos Pro',  desc:'Sonido envolvente, cancelación de ruido activa, 30hs de batería.',     tags:['Tecnología'], price:18500, isNew:true,  inStock:true,  imgs:[] },
    { id:2,  name:'Sartén de Cerámica 28cm',       desc:'Antiadherente 100%, libre de PFOA, apta para horno hasta 200°C.',      tags:['Cocina'],     price:5200,  isNew:false, inStock:true,  imgs:[] },
    { id:3,  name:'Juego de Sábanas 2 Plazas',     desc:'Algodón peinado 300 hilos, suaves y resistentes, lavado a 60°.',       tags:['Sábanas'],    price:7800,  isNew:true,  inStock:true,  imgs:[] },
    { id:4,  name:'Zapatillas Urbanas',             desc:'Suela de goma antideslizante, tallas del 36 al 44, varios colores.',   tags:['Calzado'],    price:22000, isNew:true,  inStock:false, imgs:[] },
    { id:5,  name:'Organizador de Baño Bambú',      desc:'Set de 3 piezas, resistente al agua, diseño minimalista natural.',     tags:['Baño'],       price:3400,  isNew:false, inStock:true,  imgs:[] },
    { id:6,  name:'Mochila Casual Impermeable',     desc:'Bolsillo USB, 20L de capacidad, refuerzo en costuras.',                tags:['Accesorios'], price:11900, isNew:true,  inStock:true,  imgs:[] },
    { id:7,  name:'Colchón Memory Foam',            desc:'Alta densidad, 3 zonas de confort, 25cm de altura.',                   tags:['Hogar'],      price:45000, isNew:true,  inStock:true,  imgs:[] },
    { id:8,  name:'Vestido Floral Verano',          desc:'Tela liviana, amplio escote, varios talles disponibles.',               tags:['Vestimenta'], price:8900,  isNew:true,  inStock:true,  imgs:[] },
    { id:9,  name:'Smart TV 50" 4K',               desc:'Android TV, HDR, 3 puertos HDMI, control por voz.',                    tags:['Tecnología'], price:89000, isNew:true,  inStock:true,  imgs:[] },
    { id:10, name:'Juego de Ollas x5',             desc:'Acero inoxidable triple capa, mangos ergonómicos, apta inducción.',     tags:['Cocina'],     price:14200, isNew:false, inStock:true,  imgs:[] },
  ];
  saveProducts();
}

function saveProducts()  { localStorage.setItem('lq_products', JSON.stringify(products)); }
function saveFavs()      { localStorage.setItem('lq_favs',     JSON.stringify(favorites)); }
function saveRecent()    { localStorage.setItem('lq_recent',   JSON.stringify(recentlyViewed)); }

// ==================== GOOGLE SHEETS ====================
async function registrarEnSheets(tipo, producto='', precio='', detalle='') {
  if (!GOOGLE_SHEETS_URL || GOOGLE_SHEETS_URL.includes('TU_ID_AQUI')) return;
  const payload = { timestamp: new Date().toLocaleString('es-AR'), tipo, producto, precio: precio ? `$${Number(precio).toLocaleString('es-AR')}` : '', detalle, userAgent: navigator.userAgent.substring(0,80) };
  try { await fetch(GOOGLE_SHEETS_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); } catch(e){}
}
function showToast(msg, type='info', duration=3000) {
  const old = document.getElementById('gsToast'); if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'gsToast'; t.className = `gs-toast ${type}`;
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.4s'; setTimeout(()=>t.remove(),400); }, duration);
}

// ==================== CATEGORY ICONS ====================
const CATEGORY_ICONS = {
  'Tecnología': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  'Hogar':      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  'Cocina':     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
  'Baño':       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" y1="5" x2="8" y2="7"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
  'Vestimenta': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>`,
  'Sábanas':    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  'Juguetes':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  'Calzado':    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 18v-6c0-1 .5-2 1.3-2.6L9 5l1 1-5 4h4l5.3-3.3a2 2 0 0 1 2.8.6l.4.6A2 2 0 0 1 17 10h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5H4a2 2 0 0 1-2-2z"/></svg>`,
  'Accesorios': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  'Otro':       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
};
function categoryIcon(tags) { return CATEGORY_ICONS[tags[0]] || CATEGORY_ICONS['Otro']; }

// ==================== CARD BUILDER ====================
function buildCard(p) {
  const isFav = favorites.includes(p.id);
  const badge = !p.inStock
    ? `<span class="card-badge-nostock">Sin stock</span>`
    : (p.isNew ? `<span class="card-badge-new">Nuevo</span>` : '');
  const imgContent = p.imgs && p.imgs.length > 0
    ? `<img src="${p.imgs[0]}" alt="${p.name}" />`
    : `<div class="card-img-placeholder">${categoryIcon(p.tags)}</div>`;
  const WA_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  const orderBtn = p.inStock
    ? `<button class="btn-order" onclick="orderProduct(event,${p.id})">${WA_SVG} Encargar</button>`
    : `<button class="btn-order-nostock" disabled>Sin stock</button>`;
  const STAR_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  return `<div class="product-card${!p.inStock?' out-of-stock':''}" onclick="openDetail(${p.id})">
    <div class="card-img-wrap">
      ${imgContent}${badge}
      <button class="btn-fav${isFav?' active':''}" onclick="toggleFav(event,${p.id})" title="${isFav?'Quitar':'Guardar'}">${STAR_SVG}</button>
    </div>
    <div class="card-body">
      <div class="card-category">${categoryIcon(p.tags)} ${p.tags.join(' · ')}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-desc">${p.desc}</div>
      <div class="card-footer">
        <div class="card-price">$${p.price.toLocaleString('es-AR')}</div>
        ${orderBtn}
      </div>
    </div>
  </div>`;
}

// ==================== GENERIC CAROUSEL RENDERER ====================
function buildCarouselBlock({ id, title, titleIcon, items, accentColor }) {
  carouselOffsets[id] = carouselOffsets[id] || 0;
  const iconColor = accentColor || 'var(--orange)';
  return `
    <div class="carousel-block" id="block-${id}">
      <div class="carousel-header">
        <div class="carousel-title" style="--carousel-accent:${iconColor}">
          <span class="carousel-title-icon" style="color:${iconColor}">${titleIcon}</span>
          ${title}
        </div>
      </div>
      <div class="carousel-container">
        <button class="carousel-btn carousel-btn-prev" onclick="scrollCarousel('${id}',-1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="carousel-track-wrap">
          <div class="carousel-track" id="track-${id}">
            ${items.map(p => buildCard(p)).join('')}
          </div>
        </div>
        <button class="carousel-btn carousel-btn-next" onclick="scrollCarousel('${id}',1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>`;
}

function scrollCarousel(id, dir) {
  const track = document.getElementById('track-' + id);
  if (!track) return;
  const cardW = 240 + 12;
  const visibleW = track.parentElement.offsetWidth;
  const total = track.children.length;
  const maxOffset = Math.max(0, total * cardW - visibleW);
  carouselOffsets[id] = Math.min(Math.max(0, (carouselOffsets[id]||0) + dir * cardW * 2), maxOffset);
  track.style.transform = `translateX(-${carouselOffsets[id]}px)`;
}

// Mejorar carruseles para touch en móvil
function initMobileCarousels() {
  if (window.innerWidth <= 768) {
    document.querySelectorAll('.carousel-track-wrap').forEach(wrap => {
      let isDragging = false;
      let startX, scrollLeft;
      
      wrap.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - wrap.offsetLeft;
        scrollLeft = wrap.scrollLeft;
      });
      
      wrap.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.touches[0].pageX - wrap.offsetLeft;
        const walk = (x - startX) * 1.5;
        wrap.scrollLeft = scrollLeft - walk;
      });
      
      wrap.addEventListener('touchend', () => {
        isDragging = false;
      });
    });
  }
}

// Llamar después de renderizar
document.addEventListener('DOMContentLoaded', initMobileCarousels);

// ==================== SPECIAL SECTIONS ====================
// Recommended: mix of top-priced in-stock + products from categories user viewed most
function getRecommended() {
  // Get categories from recently viewed
  const catCounts = {};
  recentlyViewed.forEach(id => {
    const p = products.find(x => x.id === id);
    if (p) p.tags.forEach(t => { catCounts[t] = (catCounts[t]||0) + 1; });
  });
  const topCats = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  let pool = [];
  if (topCats.length > 0) {
    // Products from user's favourite categories, in stock, not recently viewed
    pool = products.filter(p => p.inStock && !recentlyViewed.includes(p.id) && p.tags.some(t=>topCats.includes(t)));
  }
  if (pool.length < 4) {
    // Fallback: highest-priced in-stock products not already in pool
    const extra = products.filter(p => p.inStock && !pool.find(x=>x.id===p.id)).sort((a,b)=>b.price-a.price);
    pool = [...pool, ...extra];
  }
  return pool.slice(0, 8);
}

// ==================== MASTER RENDER ====================
// Decides which sections to show based on filtering state
function renderAll(filtered) {
  const catalogArea   = document.getElementById('catalogArea');
  const carouselsWrap = document.getElementById('carouselsSection');
  const specialWrap   = document.getElementById('specialSections');
  const allSection    = document.getElementById('allProductsSection');

  if (isFiltering) {
    // Hide carousels + special sections entirely while filtering
    carouselsWrap.style.display = 'none';
    specialWrap.style.display   = 'none';
    allSection.style.display    = 'block';
    renderGrid(filtered);
  } else {
    // Show everything
    carouselsWrap.style.display = 'block';
    specialWrap.style.display   = 'block';
    allSection.style.display    = 'block';
    renderCarousels(filtered);
    renderSpecialSections();
    renderGrid(filtered);
  }
}

// ==================== CATEGORY CAROUSELS ====================
function renderCarousels(filtered) {
  const section = document.getElementById('carouselsSection');
  // Only show categories present in the current filtered set
  const cats = [...new Set(filtered.flatMap(p => p.tags))].filter(cat => filtered.filter(p=>p.tags.includes(cat)).length >= 1);
  if (cats.length === 0) { section.innerHTML = ''; return; }
  section.innerHTML = cats.map(cat => {
    const catProds = filtered.filter(p => p.tags.includes(cat));
    return buildCarouselBlock({
      id: 'cat_' + cat.replace(/[^a-z0-9]/gi,'_'),
      title: cat,
      titleIcon: categoryIcon([cat]),
      items: catProds,
    });
  }).join('');
}

// ==================== SPECIAL SECTIONS ====================
function renderSpecialSections() {
  const wrap = document.getElementById('specialSections');
  let html = '';

  // ── NUEVOS ──
  const newProds = products.filter(p => p.isNew === true);
  if (newProds.length > 0) {
    html += buildCarouselBlock({
      id: 'special_nuevos',
      title: 'Nuevos',
      titleIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      items: newProds,
      accentColor: '#FFA800',
    });
  }

  // ── RECIÉN VISTOS ──
  const recentProds = recentlyViewed.map(id => products.find(p=>p.id===id)).filter(Boolean);
  if (recentProds.length > 0) {
    html += buildCarouselBlock({
      id: 'special_recientes',
      title: 'Recién vistos',
      titleIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      items: recentProds,
      accentColor: '#7c3aed',
    });
  }

  // ── RECOMENDADOS ──
  const recommended = getRecommended();
  if (recommended.length > 0) {
    html += buildCarouselBlock({
      id: 'special_recomendados',
      title: 'Recomendados para vos',
      titleIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
      items: recommended,
      accentColor: '#0ea5e9',
    });
  }

  wrap.innerHTML = html;
}

// ==================== SEARCH + FILTER ====================
// Search autocomplete
const searchInput = document.getElementById('searchInput');
let searchDebounce = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    renderSuggestions(searchInput.value.trim());
    applyFilters();
  }, 120);
});
searchInput.addEventListener('focus', () => { if (searchInput.value) renderSuggestions(searchInput.value); });
document.addEventListener('click', e => { if (!e.target.closest('.header-search')) closeSuggestions(); });
searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') closeSuggestions(); });

function renderSuggestions(q) {
  let box = document.getElementById('searchSuggestions');
  if (!box) {
    box = document.createElement('div');
    box.id = 'searchSuggestions';
    box.className = 'search-suggestions';
    searchInput.parentElement.appendChild(box);
  }
  if (!q) { box.innerHTML = ''; box.classList.remove('open'); return; }
  const matches = products.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(q.toLowerCase())) ||
    p.desc.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 6);

  if (matches.length === 0) { box.innerHTML = '<div class="suggestion-empty">Sin resultados para "<strong>' + q + '</strong>"</div>'; box.classList.add('open'); return; }

  box.innerHTML = matches.map(p => {
    const highlight = str => str.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'), '<mark>$1</mark>');
    const imgEl = p.imgs && p.imgs.length > 0
      ? `<img src="${p.imgs[0]}" class="sug-img" />`
      : `<div class="sug-img sug-img-placeholder">${categoryIcon(p.tags)}</div>`;
    return `<div class="suggestion-item" onclick="selectSuggestion(${p.id})">
      ${imgEl}
      <div class="sug-info">
        <div class="sug-name">${highlight(p.name)}</div>
        <div class="sug-meta">${p.tags[0]} · $${p.price.toLocaleString('es-AR')}</div>
      </div>
      <div class="sug-arrow">→</div>
    </div>`;
  }).join('');
  box.classList.add('open');
}

function selectSuggestion(id) {
  closeSuggestions();
  searchInput.value = '';
  applyFilters();
  openDetail(id);
}
function closeSuggestions() {
  const box = document.getElementById('searchSuggestions');
  if (box) { box.classList.remove('open'); box.innerHTML = ''; }
}

function filterByCategory(btn) {
  document.querySelectorAll('[data-cat]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); activeCategory = btn.dataset.cat; applyFilters();
}
function filterByStatus(btn) {
  document.querySelectorAll('[data-status]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); activeStatus = btn.dataset.status; applyFilters();
}
function filterByStock(btn) {
  document.querySelectorAll('[data-stock]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); activeStock = btn.dataset.stock; applyFilters();
}

function applyFilters() {
  const q    = searchInput.value.toLowerCase().trim();
  const minP = parseFloat(document.getElementById('priceMin').value) || 0;
  const maxP = parseFloat(document.getElementById('priceMax').value) || Infinity;
  const sort = document.getElementById('sortSelect').value;

  // Determine if anything is actively filtering
  isFiltering = !!(q || activeCategory !== 'all' || activeStatus !== 'all' || activeStock !== 'all' || minP > 0 || maxP < Infinity);

  let filtered = products.filter(p => {
    const matchQ      = !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.tags.some(t=>t.toLowerCase().includes(q));
    const matchCat    = activeCategory === 'all' || p.tags.includes(activeCategory);
    const matchStatus = activeStatus === 'all'   || (activeStatus === 'nuevo' ? p.isNew : !p.isNew);
    const matchStock  = activeStock  === 'all'   || (activeStock  === '1'     ? p.inStock : !p.inStock);
    const matchPrice  = p.price >= minP && p.price <= maxP;
    return matchQ && matchCat && matchStatus && matchStock && matchPrice;
  });

  if (sort === 'price-asc')       filtered.sort((a,b)=>a.price-b.price);
  else if (sort === 'price-desc') filtered.sort((a,b)=>b.price-a.price);
  else if (sort === 'name-asc')   filtered.sort((a,b)=>a.name.localeCompare(b.name));

  renderAll(filtered);
}

// ==================== RENDER GRID ====================
function renderGrid(list) {
  const grid = document.getElementById('productsGrid');
  document.getElementById('resultCount').textContent =
    `${list.length} producto${list.length!==1?'s':''} encontrado${list.length!==1?'s':''}`;
  if (list.length === 0) {
    grid.innerHTML = `<div class="no-results">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <p>No encontramos productos con esos filtros.</p>
    </div>`; return;
  }
  grid.innerHTML = list.map(p=>buildCard(p)).join('');
}

// ==================== FAVORITES ====================
function toggleFav(e, id) {
  e.stopPropagation();
  const idx = favorites.indexOf(id);
  const p   = products.find(x=>x.id===id);
  if (idx===-1) { favorites.push(id); registrarEnSheets('favorito_agregado', p?.name, p?.price); }
  else          { favorites.splice(idx,1); registrarEnSheets('favorito_quitado', p?.name, p?.price); }
  saveFavs(); applyFilters(); renderFavs(); updateFavBadge();
}
function renderFavs() {
  const list = document.getElementById('favList');
  const favProds = products.filter(p=>favorites.includes(p.id));
  if (favProds.length === 0) {
    list.innerHTML = `<div class="fav-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><p>Todavía no guardaste favoritos.<br/>¡Tocá la estrella de un producto!</p></div>`;
    return;
  }
  list.innerHTML = favProds.map(p => {
    const imgEl = p.imgs && p.imgs.length > 0
      ? `<img src="${p.imgs[0]}" style="width:48px;height:48px;border-radius:4px;object-fit:cover;" />`
      : `<div class="fav-img">${categoryIcon(p.tags)}</div>`;
    return `<div class="fav-item">${imgEl}
      <div class="fav-info"><p>${p.name}</p><span>$${p.price.toLocaleString('es-AR')}</span></div>
      <button class="fav-remove" onclick="toggleFav(event,${p.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button></div>`;
  }).join('');
}
function updateFavBadge() { document.getElementById('favBadge').textContent = favorites.length; }

// ==================== SIDEBAR ====================
function switchSidebarTab(name) {
  document.querySelectorAll('.sidebar-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.sidebar-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  document.getElementById('panel-'+name).classList.add('active');
  if (name==='favs') renderFavs();
}

// ==================== COMMENT ====================
function sendComment() {
  const name = document.getElementById('commentName').value.trim() || 'Anónimo';
  const text = document.getElementById('commentText').value.trim();
  if (!text) { alert('¡Escribí tu mensaje antes de enviarlo!'); return; }
  registrarEnSheets('comentario','','',`${name}: ${text.substring(0,120)}`);
  const msg = encodeURIComponent(`💬 *Comentario para LO QUIERO!*\n👤 ${name}\n\n${text}`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`,'_blank');
  document.getElementById('commentText').value = '';
  document.getElementById('commentName').value = '';
  const ok = document.getElementById('commentSuccess');
  ok.style.display='flex'; setTimeout(()=>ok.style.display='none',4000);
}

// ==================== ADMIN ====================
function openAdmin() {
  document.getElementById('adminModal').classList.add('open');
  document.getElementById('adminPass').value = '';
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authScreen').style.display = 'block';
  document.getElementById('adminForm').style.display  = 'none';
}
function closeAdmin() {
  document.getElementById('adminModal').classList.remove('open');
  selectedTags=[]; uploadedImages=[];
  document.getElementById('previewImgs').innerHTML='';
  ['prodName','prodDesc','prodPrice'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('chkNuevo').checked=false;
  document.getElementById('chkUsado').checked=false;
  document.querySelectorAll('.tag-option').forEach(t=>t.classList.remove('selected'));
}
function checkAuth() {
  if (document.getElementById('adminPass').value === ADMIN_PASS) {
    document.getElementById('authScreen').style.display='none';
    document.getElementById('adminForm').style.display='block';
    switchAdminTab(1);
  } else {
    document.getElementById('authError').style.display='block';
    document.getElementById('adminPass').select();
  }
}
function switchAdminTab(n) {
  document.getElementById('adminTab1').classList.toggle('active',n===1);
  document.getElementById('adminTab2').classList.toggle('active',n===2);
  document.getElementById('adminAddPanel').style.display    = n===1?'block':'none';
  document.getElementById('adminManagePanel').style.display = n===2?'block':'none';
  if (n===2) renderManageList();
}
function toggleTag(btn,tag) {
  btn.classList.toggle('selected');
  const idx=selectedTags.indexOf(tag);
  if(idx===-1) selectedTags.push(tag); else selectedTags.splice(idx,1);
}
function previewImages() {
  const files=document.getElementById('photoUpload').files;
  const container=document.getElementById('previewImgs');
  Array.from(files).forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const dataUrl=e.target.result;
      uploadedImages.push(dataUrl);
      const wrap=document.createElement('div'); wrap.className='preview-wrap'; wrap.dataset.idx=uploadedImages.length-1;
      const img=document.createElement('img'); img.src=dataUrl; img.className='preview-img';
      const del=document.createElement('button'); del.className='preview-delete'; del.innerHTML='✕'; del.title='Eliminar foto';
      del.onclick=()=>{ uploadedImages.splice(parseInt(wrap.dataset.idx),1); wrap.remove(); container.querySelectorAll('.preview-wrap').forEach((w,i)=>w.dataset.idx=i); };
      wrap.appendChild(img); wrap.appendChild(del); container.appendChild(wrap);
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('photoUpload').value='';
}
function addProduct() {
  const name=document.getElementById('prodName').value.trim();
  const desc=document.getElementById('prodDesc').value.trim();
  const price=parseFloat(document.getElementById('prodPrice').value);
  const inStockVal=document.querySelector('input[name="prodStock"]:checked').value==='1';
  const chkNuevo=document.getElementById('chkNuevo').checked;
  const chkUsado=document.getElementById('chkUsado').checked;
  const isNewVal=chkNuevo ? true : (chkUsado ? false : null);
  if (!name)                    {alert('El nombre del producto es obligatorio.');return;}
  if (!price||price<=0)         {alert('Ingresá un precio válido.');return;}
  if (selectedTags.length===0)  {alert('Seleccioná al menos una categoría.');return;}
  const newProd={id:Date.now(),name,desc,tags:[...selectedTags],price,isNew:isNewVal,inStock:inStockVal,imgs:[...uploadedImages]};
  products.unshift(newProd); saveProducts(); applyFilters(); closeAdmin();
  registrarEnSheets('producto_nuevo',name,price,`Categorías: ${selectedTags.join(', ')}`);
  showToast('Producto publicado 🎉','success');
}
function renderManageList() {
  const list=document.getElementById('manageList');
  if(products.length===0){list.innerHTML='<p style="color:var(--gray);font-size:0.82rem;text-align:center;padding:1rem">No hay productos cargados.</p>';return;}
  list.innerHTML=products.map(p=>{
    const imgEl=p.imgs&&p.imgs.length>0?`<img src="${p.imgs[0]}" style="width:42px;height:42px;border-radius:4px;object-fit:cover;" />`:`<div class="manage-item-img">${categoryIcon(p.tags)}</div>`;
    return `<div class="manage-item">${imgEl}
      <div class="manage-item-info"><p>${p.name}</p><span>$${p.price.toLocaleString('es-AR')} · ${p.tags.join(', ')}</span></div>
      <button class="btn-delete-prod" onclick="deleteProduct(${p.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button></div>`;
  }).join('');
}
function deleteProduct(id) {
  if(!confirm('¿Eliminar este producto?'))return;
  const p=products.find(x=>x.id===id);
  registrarEnSheets('producto_eliminado',p?.name,p?.price);
  products=products.filter(x=>x.id!==id);
  favorites=favorites.filter(fid=>fid!==id);
  recentlyViewed=recentlyViewed.filter(rid=>rid!==id);
  saveProducts(); saveFavs(); saveRecent(); renderManageList(); applyFilters(); updateFavBadge();
}

// ==================== PRODUCT DETAIL (gallery + zoom) ====================
let detailCurrentImg = 0; // active image index in the open detail

function openDetail(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  registrarEnSheets('vista_producto', p.name, p.price);

  // Track recently viewed
  recentlyViewed = recentlyViewed.filter(rid => rid !== id);
  recentlyViewed.unshift(id);
  if (recentlyViewed.length > 10) recentlyViewed = recentlyViewed.slice(0, 10);
  saveRecent();

  detailCurrentImg = 0;
  const imgs = p.imgs && p.imgs.length > 0 ? p.imgs : [];

  // ── Gallery HTML ──
  let galleryHtml = '';
  if (imgs.length > 0) {
    const thumbs = imgs.map((src, i) =>
      `<img class="detail-thumb${i===0?' active':''}" src="${src}" data-idx="${i}" onclick="detailGoTo(${i})" />`
    ).join('');

    const prevBtn = `<button class="detail-nav-btn prev" id="detailPrev" onclick="event.stopPropagation();detailNav(-1)" ${imgs.length<=1?'disabled':''}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>`;
    const nextBtn = `<button class="detail-nav-btn next" id="detailNext" onclick="event.stopPropagation();detailNav(1)" ${imgs.length<=1?'disabled':''}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
    const zoomHint = `<div class="zoom-hint">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      Zoom
    </div>`;

    const dots = imgs.length > 1
      ? `<div class="detail-dots">${imgs.map((_,i)=>`<div class="detail-dot${i===0?' active':''}" id="dot-${i}"></div>`).join('')}</div>`
      : '';

    const thumbCol = imgs.length > 1
      ? `<div class="detail-thumbs" id="detailThumbs">${thumbs}</div>`
      : '';

    galleryHtml = `
      <div class="detail-gallery">
        ${thumbCol}
        <div class="detail-main-wrap">
          <div class="detail-main-img-container" id="detailImgContainer" onclick="detailToggleZoom(this)">
            <img class="detail-main-img" id="detailMainImg" src="${imgs[0]}" />
            ${prevBtn}
            ${nextBtn}
            ${zoomHint}
          </div>
          ${dots}
        </div>
      </div>`;
  } else {
    galleryHtml = `<div class="prod-detail-placeholder">${categoryIcon(p.tags)}</div>`;
  }

  // ── Badges ──
  const waMsg  = encodeURIComponent(`Hola! Estoy interesado/a en: *${p.name}* ($${p.price.toLocaleString('es-AR')}). ¿Está disponible?`);
  const waLink = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;
  const stockBadge = p.inStock
    ? `<span style="background:#e8f5e9;color:#2e7d32;padding:0.28rem 0.75rem;border-radius:3px;font-size:0.78rem;font-weight:800;display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> En stock</span>`
    : `<span style="background:#eee;color:var(--gray);padding:0.28rem 0.75rem;border-radius:3px;font-size:0.78rem;font-weight:800;">Sin stock</span>`;
  let newBadge = '';
  if (p.isNew === true)  newBadge = `<span style="background:var(--orange-pale);color:var(--orange);padding:0.28rem 0.75rem;border-radius:3px;font-size:0.78rem;font-weight:800;">Nuevo</span>`;
  if (p.isNew === false) newBadge = `<span style="background:#f5f5f5;color:var(--gray);padding:0.28rem 0.75rem;border-radius:3px;font-size:0.78rem;font-weight:800;">Usado</span>`;

  const orderBtn = p.inStock
    ? `<a href="${waLink}" target="_blank" style="display:flex;width:100%;text-decoration:none"><button class="btn-order-big" style="width:100%"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>ENCARGAR POR WHATSAPP</button></a>`
    : `<button class="btn-order-nostock" style="width:100%;padding:0.8rem;font-size:0.95rem;" disabled>Sin stock por el momento</button>`;

  document.getElementById('detailContent').innerHTML = `
    ${galleryHtml}
    <div class="prod-detail-tags">
      ${p.tags.map(t=>`<span class="prod-detail-tag">${t}</span>`).join('')}
      ${newBadge}${stockBadge}
    </div>
    <div class="prod-detail-name">${p.name}</div>
    <div class="prod-detail-desc">${p.desc || 'Sin descripción.'}</div>
    <div class="prod-detail-price">$${p.price.toLocaleString('es-AR')}</div>
    ${orderBtn}`;

  document.getElementById('detailModal').classList.add('open');
  // store imgs on modal for navigation
  document.getElementById('detailModal').dataset.imgs = JSON.stringify(imgs);
}

// Navigate gallery arrows
function detailNav(dir) {
  const imgs = JSON.parse(document.getElementById('detailModal').dataset.imgs || '[]');
  detailCurrentImg = Math.min(Math.max(0, detailCurrentImg + dir), imgs.length - 1);
  detailGoTo(detailCurrentImg);
}

// Jump to specific image
function detailGoTo(idx) {
  const imgs = JSON.parse(document.getElementById('detailModal').dataset.imgs || '[]');
  if (!imgs.length) return;
  detailCurrentImg = idx;

  // Main image
  const mainImg = document.getElementById('detailMainImg');
  if (mainImg) {
    mainImg.src = imgs[idx];
    // Reset zoom on image change
    const container = document.getElementById('detailImgContainer');
    if (container) {
      container.classList.remove('zoomed');
      mainImg.classList.remove('zoomed');
    }
  }

  // Thumbnails active state
  document.querySelectorAll('.detail-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });

  // Dots
  document.querySelectorAll('.detail-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });

  // Scroll active thumb into view
  const activethumb = document.querySelector('.detail-thumb.active');
  if (activethumb) activethumb.scrollIntoView({ block:'nearest', behavior:'smooth' });

  // Enable/disable arrow buttons
  const prev = document.getElementById('detailPrev');
  const next = document.getElementById('detailNext');
  if (prev) prev.disabled = idx === 0;
  if (next) next.disabled = idx === imgs.length - 1;
}

// Toggle zoom on main image
function detailToggleZoom(container) {
  const img = container.querySelector('.detail-main-img');
  if (!img) return;
  const isZoomed = img.classList.toggle('zoomed');
  container.classList.toggle('zoomed', isZoomed);

  // Pan-on-hover when zoomed
  if (isZoomed) {
    container.onmousemove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 100;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 100;
      img.style.transformOrigin = `${50 + x * 0.6}% ${50 + y * 0.6}%`;
    };
    container.onmouseleave = () => { img.style.transformOrigin = 'center center'; };
  } else {
    container.onmousemove = null;
    container.onmouseleave = null;
    img.style.transformOrigin = 'center center';
  }
}
function orderProduct(e,id) {
  e.stopPropagation();
  const p=products.find(x=>x.id===id); if(!p||!p.inStock)return;
  registrarEnSheets('encargo_whatsapp',p.name,p.price);
  const msg=encodeURIComponent(`Hola! Estoy interesado/a en: *${p.name}* ($${p.price.toLocaleString('es-AR')}). ¿Está disponible?`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`,'_blank');
}
function closeDetail() { document.getElementById('detailModal').classList.remove('open'); }

document.getElementById('adminModal').addEventListener('click',function(e){if(e.target===this)closeAdmin();});
document.getElementById('detailModal').addEventListener('click',function(e){if(e.target===this)closeDetail();});

// ==================== SIDEBAR TOGGLE ====================
let sidebarOpen=false;
function toggleSidebar() {
  sidebarOpen=!sidebarOpen;
  const sidebar=document.getElementById('mainSidebar');
  const btn=document.getElementById('sidebarToggle');
  sidebar.classList.toggle('collapsed',!sidebarOpen);
  btn.classList.toggle('collapsed-btn',!sidebarOpen);
  btn.title=sidebarOpen?'Ocultar panel':'Mostrar panel';
}

// ==================== BOOT ====================
applyFilters();
updateFavBadge();
renderFavs();
registrarEnSheets('visita_pagina','','',new Date().toLocaleString('es-AR'));
