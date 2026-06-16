/* ============================================================
   LO QUIERO! — script_admin.js
   CONFIGURACIÓN: reemplazá con tus datos de Supabase
   ============================================================ */

const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';   // ← cambiá
const SUPABASE_KEY = 'TU_ANON_KEY';                       // ← cambiá

// ── Estado global ──
let sb, currentUser = null;
let products = [], categories = [], carousels = [], sections = [], announcements = [], discounts = [], orders = [], configs = [];
let currentPage = 'dashboard';

// ── Init ──
window.addEventListener('DOMContentLoaded', () => {
  if (window.supabase) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  initLogin();
  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => { e.preventDefault(); navigateTo(item.dataset.page); closeSidebar(); });
  });
});

// ── AUTH ──
function initLogin() {
  const savedUser = sessionStorage.getItem('lq_admin_user');
  if (savedUser) { currentUser = JSON.parse(savedUser); showApp(); return; }
  document.getElementById('loginScreen').style.display = 'flex';
  const form = document.getElementById('loginForm');
  const btn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  document.getElementById('togglePassword').addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  form.addEventListener('submit', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return;
    btn.textContent = 'Verificando…'; btn.disabled = true; errorEl.style.display = 'none';
    try {
      // Check SiteConfig for admin credentials (same logic as React app)
      let authorized = false;
      if (sb) {
        const { data: cfgs } = await sb.from('SiteConfig').select('*');
        const adminEmail = cfgs?.find(c => c.key === 'admin_email')?.value;
        const adminPwd = cfgs?.find(c => c.key === 'admin_password')?.value;
        if (adminEmail && adminPwd) {
          authorized = email.toLowerCase() === adminEmail.toLowerCase() && password === adminPwd;
        } else {
          authorized = true; // No config set — allow any login for first setup
        }
      } else {
        // Demo mode
        authorized = (email === 'admin@demo.com' && password === 'demo123');
      }
      if (!authorized) throw new Error('Credenciales incorrectas');
      currentUser = { email };
      sessionStorage.setItem('lq_admin_user', JSON.stringify(currentUser));
      showApp();
    } catch (err) {
      errorEl.textContent = err.message || 'Credenciales incorrectas';
      errorEl.style.display = 'block';
      btn.textContent = 'Entrar'; btn.disabled = false;
    }
  });
}

function logout() {
  sessionStorage.removeItem('lq_admin_user');
  location.reload();
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';
  await loadAll();
  navigateTo('dashboard');
}

// ── Data ──
async function loadAll() {
  if (!sb) { renderCounts(); return; }
  const [p, c, b, s, a, d, o, cfg] = await Promise.all([
    sb.from('Product').select('*').order('created_date', { ascending: false }),
    sb.from('Category').select('*').order('sort_order'),
    sb.from('CarouselBanner').select('*').order('sort_order'),
    sb.from('HomeSection').select('*').order('sort_order'),
    sb.from('Announcement').select('*').order('created_date', { ascending: false }),
    sb.from('DiscountCode').select('*').order('created_date', { ascending: false }),
    sb.from('Order').select('*').order('created_date', { ascending: false }),
    sb.from('SiteConfig').select('*'),
  ]);
  products = p.data || []; categories = c.data || []; carousels = b.data || [];
  sections = s.data || []; announcements = a.data || []; discounts = d.data || [];
  orders = o.data || []; configs = cfg.data || [];
  renderCounts();
}

function renderCounts() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) { el.textContent = val; el.style.display = val ? 'inline' : 'none'; } };
  set('countProducts', products.length || '');
  set('countCategories', categories.length || '');
  set('countDiscounts', discounts.length || '');
  set('countOrders', orders.filter(o => o.status === 'pending').length || '');
}

function getConfig(key, def = '') { return configs.find(c => c.key === key)?.value || def; }

async function saveConfig(key, value) {
  const existing = configs.find(c => c.key === key);
  if (!sb) return;
  if (existing) { await sb.from('SiteConfig').update({ value }).eq('id', existing.id); }
  else { await sb.from('SiteConfig').insert({ key, value }); }
}

// ── Navigation ──
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  const renders = { dashboard: renderDashboard, products: renderProducts, categories: renderCategories, carousels: renderCarousels, sections: renderSections, announcements: renderAnnouncements, discounts: renderDiscounts, orders: renderOrders, settings: renderSettings };
  const fn = renders[page];
  if (fn) fn();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── Render helpers ──
function pc(html) { document.getElementById('pageContent').innerHTML = html; }
function fmtPrice(n) { return '$' + Number(n || 0).toLocaleString('es-AR'); }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }); }
function pill(color, text) { return `<span class="pill pill-${color}">${text}</span>`; }
function actionBtns(id, editFn, deleteFn, extra = '') {
  return `<div style="display:flex;gap:6px;justify-content:flex-end">${extra}<button class="btn btn-outline btn-sm btn-icon" onclick="${editFn}('${id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn btn-danger btn-sm btn-icon" onclick="${deleteFn}('${id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div>`;
}

// ── DASHBOARD ──
function renderDashboard() {
  const activeProds = products.filter(p => p.is_active).length;
  const noStock = products.filter(p => p.stock === 0).length;
  const activeCats = categories.filter(c => c.active).length;
  const recent = products.slice(0, 6);
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Dashboard</h1><p>Resumen general del catálogo</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" onclick="navigateTo('products')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo producto</button></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon" style="background:#fff0e8;color:#E85002"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div><div><div class="stat-value">${activeProds}</div><div class="stat-label">Productos activos</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#f0fdf4;color:#16a34a"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg></div><div><div class="stat-value">${orders.length}</div><div class="stat-label">Pedidos recibidos</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#fffbeb;color:#d97706"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg></div><div><div class="stat-value">${activeCats}</div><div class="stat-label">Categorías activas</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#fef2f2;color:#dc2626"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="stat-value">${noStock}</div><div class="stat-label">Sin stock</div></div></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Últimos productos agregados</span><button class="btn btn-ghost btn-sm" onclick="navigateTo('products')">Ver todos</button></div>
      ${recent.length === 0 ? '<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg><strong>Sin productos</strong></div>' : `
      <div>${recent.map(p => `
        <div style="display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:1px solid var(--border)">
          ${p.images?.[0] ? `<img class="prod-thumb" src="${p.images[0]}" alt="">` : '<div class="prod-thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>'}
          <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div><div style="font-size:.76rem;color:var(--text-3)">${p.category_name || 'Sin categoría'}</div></div>
          ${p.is_new ? pill('amber','Nuevo') : ''}
          <div style="font-weight:800;color:var(--accent);font-family:var(--font-display);white-space:nowrap">${fmtPrice(p.price)}</div>
          <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">Editar</button>
        </div>`).join('')}</div>`}
    </div>`);
}

// ── PRODUCTS ──
let prodSearch = '', prodCatFilter = 'all', prodStatusFilter = 'all';
function renderProducts() {
  const filtered = products.filter(p => {
    if (prodSearch && !p.name.toLowerCase().includes(prodSearch.toLowerCase())) return false;
    if (prodCatFilter !== 'all' && p.category_name !== prodCatFilter) return false;
    if (prodStatusFilter === 'active' && !p.is_active) return false;
    if (prodStatusFilter === 'inactive' && p.is_active) return false;
    if (prodStatusFilter === 'nostock' && p.stock !== 0) return false;
    return true;
  });
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Productos</h1><p>Administrá tu catálogo completo</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" onclick="openProductDrawer(null)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo producto</button></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:center">
      <div style="position:relative;flex:1;min-width:200px;max-width:320px">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-3)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input class="form-input" style="padding-left:34px" value="${prodSearch}" oninput="prodSearch=this.value;renderProducts()" placeholder="Buscar producto…" />
      </div>
      <select class="form-input" style="width:auto" onchange="prodCatFilter=this.value;renderProducts()">
        <option value="all" ${prodCatFilter==='all'?'selected':''}>Todas las categorías</option>
        ${categories.map(c=>`<option value="${c.name}" ${prodCatFilter===c.name?'selected':''}>${c.name}</option>`).join('')}
      </select>
      <select class="form-input" style="width:auto" onchange="prodStatusFilter=this.value;renderProducts()">
        <option value="all">Todos</option>
        <option value="active" ${prodStatusFilter==='active'?'selected':''}>Activos</option>
        <option value="inactive" ${prodStatusFilter==='inactive'?'selected':''}>Inactivos</option>
        <option value="nostock" ${prodStatusFilter==='nostock'?'selected':''}>Sin stock</option>
      </select>
      <span style="font-size:.78rem;color:var(--text-3)">${filtered.length} producto${filtered.length!==1?'s':''}</span>
    </div>
    <div class="card">
      ${filtered.length === 0 ? '<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg><strong>No hay productos</strong><span>Creá tu primer producto</span></div>' : `
      <div class="overflow-x"><table>
        <thead><tr><th>Img</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead>
        <tbody>${filtered.map(p=>`<tr>
          <td>${p.images?.[0]?`<img class="prod-thumb" src="${p.images[0]}" alt="">`:'<div class="prod-thumb-placeholder"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>'}</td>
          <td><div style="font-weight:600;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>${p.is_new?pill('amber','Nuevo'):''}</td>
          <td style="color:var(--text-2)">${p.category_name||'—'}</td>
          <td style="font-weight:800;color:var(--accent);font-family:var(--font-display)">${fmtPrice(p.price)}</td>
          <td>${p.stock===0?pill('red','Sin stock'):p.stock===-1?pill('green','Ilimitado'):pill('green',p.stock)}</td>
          <td>${p.is_active?pill('green','Activo'):pill('gray','Oculto')}</td>
          <td><div style="display:flex;gap:6px;justify-content:flex-end">
            <button class="btn btn-outline btn-sm btn-icon" onclick="editProduct('${p.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-outline btn-sm btn-icon" onclick="toggleProductActive('${p.id}')" title="${p.is_active?'Ocultar':'Mostrar'}">${p.is_active?'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteProduct('${p.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`);
}

function editProduct(id) { openProductDrawer(products.find(p => p.id === id)); }

async function toggleProductActive(id) {
  if (!sb) return;
  const p = products.find(x => x.id === id);
  await sb.from('Product').update({ is_active: !p.is_active }).eq('id', id);
  p.is_active = !p.is_active;
  showToast(p.is_active ? 'Producto visible' : 'Producto oculto', 'success');
  renderProducts();
}

function deleteProduct(id) {
  showConfirm('¿Eliminar este producto?', 'Esta acción es irreversible.', async () => {
    if (sb) await sb.from('Product').delete().eq('id', id);
    products = products.filter(p => p.id !== id);
    showToast('Producto eliminado', 'success');
    renderCounts(); renderProducts();
  });
}

function openProductDrawer(product) {
  const cats = categories.map(c => `<option value="${c.id}" data-name="${c.name}" ${product?.category_id===c.id?'selected':''}>${c.name}</option>`).join('');
  const imgs = (product?.images || []);
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="drawer-overlay open" id="prodOverlay"></div>
    <div class="drawer open" id="prodDrawer">
      <div class="drawer-header">
        <span class="drawer-title">${product ? 'Editar producto' : 'Nuevo producto'}</span>
        <button class="btn btn-ghost btn-icon modal-close-btn" onclick="closeDrawer()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="drawer-body">
        <!-- Images -->
        <div class="form-group">
          <label class="form-label">Fotos del producto</label>
          <div class="img-upload-grid" id="imgGrid">
            ${imgs.map((src,i)=>`<div class="img-thumb"><img src="${src}"><span class="img-thumb-label">${i===0?'Principal':''}</span><button class="img-thumb-remove" onclick="removeImg(${i})"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`).join('')}
            <label class="img-upload-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg><span>Subir</span><input type="file" accept="image/*" multiple style="display:none" onchange="handleImgUpload(event)"></label>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Nombre <span class="req">*</span></label><input class="form-input" id="pName" value="${product?.name||''}" placeholder="Ej: Auriculares Bluetooth Pro" /></div>
        <div class="form-group"><label class="form-label">Descripción</label><textarea class="form-input" id="pDesc" placeholder="Materiales, medidas, etc.">${product?.description||''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Categoría</label><select class="form-input" id="pCat"><option value="">Sin categoría</option>${cats}</select></div>
          <div class="form-group"><label class="form-label">Etiquetas</label><input class="form-input" id="pTags" value="${Array.isArray(product?.tags)?product.tags.join(', '):(product?.tags||'')}" placeholder="hogar, oferta…" /></div>
        </div>
        <div class="form-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="form-group"><label class="form-label">Precio <span class="req">*</span></label><input class="form-input" id="pPrice" type="number" value="${product?.price||''}" min="0" step="0.01" /></div>
          <div class="form-group"><label class="form-label">Precio original</label><input class="form-input" id="pCompare" type="number" value="${product?.compare_price||''}" min="0" step="0.01" /></div>
          <div class="form-group"><label class="form-label">Descuento %</label><input class="form-input" id="pDiscount" type="number" value="${product?.discount_pct||0}" min="0" max="100" /></div>
        </div>
        <div class="form-group" style="max-width:160px"><label class="form-label">Stock</label><input class="form-input" id="pStock" type="number" value="${product?.stock??-1}" min="-1" /><p class="form-hint">-1 = ilimitado, 0 = sin stock</p></div>
        <div style="display:flex;flex-direction:column;gap:12px;padding:14px;background:var(--muted-bg);border-radius:var(--r-md)">
          <div class="toggle-row"><span style="font-size:.85rem;font-weight:600">Marcar como NUEVO</span><label class="toggle-wrap"><input type="checkbox" id="pNew" ${product?.is_new!==false?'checked':''}><span class="toggle-slider"></span></label></div>
          <div class="toggle-row"><span style="font-size:.85rem;font-weight:600">Producto destacado</span><label class="toggle-wrap"><input type="checkbox" id="pFeatured" ${product?.is_featured?'checked':''}><span class="toggle-slider"></span></label></div>
          <div class="toggle-row"><span style="font-size:.85rem;font-weight:600">Visible en catálogo</span><label class="toggle-wrap"><input type="checkbox" id="pActive" ${product?.is_active!==false?'checked':''}><span class="toggle-slider"></span></label></div>
        </div>
      </div>
      <div class="drawer-footer">
        <button class="btn btn-outline" onclick="closeDrawer()">Cancelar</button>
        <button class="btn btn-primary" id="saveProdBtn" onclick="saveProduct('${product?.id||''}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar producto</button>
      </div>
    </div>`;
  document.getElementById('prodOverlay').addEventListener('click', closeDrawer);
  window._drawerImgs = [...(product?.images || [])];
}

window._drawerImgs = [];

async function handleImgUpload(e) {
  if (!sb) return;
  for (const file of e.target.files) {
    if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} supera 5MB`, 'error'); continue; }
    const ext = file.name.split('.').pop();
    const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data } = await sb.storage.from('public').upload(path, file, { upsert: true });
    if (data) {
      const { data: urlData } = sb.storage.from('public').getPublicUrl(path);
      window._drawerImgs.push(urlData.publicUrl);
    }
  }
  refreshImgGrid();
}

function removeImg(i) { window._drawerImgs.splice(i, 1); refreshImgGrid(); }
function refreshImgGrid() {
  const grid = document.getElementById('imgGrid');
  if (!grid) return;
  grid.innerHTML = window._drawerImgs.map((src,i) => `<div class="img-thumb"><img src="${src}"><span class="img-thumb-label">${i===0?'Principal':''}</span><button class="img-thumb-remove" onclick="removeImg(${i})"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`).join('') +
    `<label class="img-upload-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg><span>Subir</span><input type="file" accept="image/*" multiple style="display:none" onchange="handleImgUpload(event)"></label>`;
}

async function saveProduct(existingId) {
  const name = document.getElementById('pName').value.trim();
  const price = parseFloat(document.getElementById('pPrice').value);
  if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
  if (!price || price < 0) { showToast('Ingresá un precio válido', 'error'); return; }
  const catEl = document.getElementById('pCat');
  const catOpt = catEl.options[catEl.selectedIndex];
  const payload = {
    name, price,
    description: document.getElementById('pDesc').value,
    category_id: catEl.value || null,
    category_name: catEl.value ? catOpt.dataset.name : null,
    tags: document.getElementById('pTags').value.split(',').map(t=>t.trim()).filter(Boolean),
    compare_price: parseFloat(document.getElementById('pCompare').value) || null,
    discount_pct: parseInt(document.getElementById('pDiscount').value) || 0,
    stock: parseInt(document.getElementById('pStock').value) ?? -1,
    is_new: document.getElementById('pNew').checked,
    is_featured: document.getElementById('pFeatured').checked,
    is_active: document.getElementById('pActive').checked,
    images: window._drawerImgs,
  };
  const btn = document.getElementById('saveProdBtn');
  btn.disabled = true; btn.textContent = 'Guardando…';
  if (sb) {
    if (existingId) { await sb.from('Product').update(payload).eq('id', existingId); }
    else { await sb.from('Product').insert(payload); }
  }
  await loadAll();
  closeDrawer();
  showToast(existingId ? 'Producto actualizado' : 'Producto creado', 'success');
  renderProducts();
}

// ── CATEGORIES ──
function renderCategories() {
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Categorías</h1><p>Creá, editá y activá/desactivá categorías</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" onclick="openCatModal(null)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nueva categoría</button></div>
    </div>
    ${categories.length === 0 ? '<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg><strong>No hay categorías</strong></div>' : `
    <div class="cat-grid">${categories.map(c=>`
      <div class="cat-card">
        <div class="cat-icon ${c.active?'':'inactive'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
        <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.9rem">${c.name}</div><div style="font-size:.75rem;color:var(--text-3)">${c.slug||''}</div></div>
        <label class="toggle-wrap"><input type="checkbox" ${c.active?'checked':''} onchange="toggleCatActive('${c.id}')"><span class="toggle-slider"></span></label>
        <button class="btn btn-outline btn-sm btn-icon" onclick="openCatModal('${c.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCat('${c.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
      </div>`).join('')}</div>`}`);
}

function openCatModal(id) {
  const cat = id ? categories.find(c => c.id === id) : null;
  showModal(`${cat?'Editar':'Nueva'} categoría`, `
    <div class="form-group"><label class="form-label">Nombre <span class="req">*</span></label><input class="form-input" id="cName" value="${cat?.name||''}" placeholder="Ej: Blanquería" /></div>
    <div class="form-group"><label class="form-label">Slug</label><input class="form-input" id="cSlug" value="${cat?.slug||''}" placeholder="blanqueria" /></div>`,
    async () => {
      const name = document.getElementById('cName').value.trim();
      if (!name) { showToast('El nombre es obligatorio', 'error'); return false; }
      const slug = document.getElementById('cSlug').value.trim() || name.toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w-]/g,'');
      if (sb) {
        if (id) { await sb.from('Category').update({ name, slug }).eq('id', id); }
        else { await sb.from('Category').insert({ name, slug, active: true, sort_order: categories.length }); }
      }
      await loadAll();
      showToast(id?'Categoría actualizada':'Categoría creada','success');
      renderCategories();
    });
}

async function toggleCatActive(id) {
  if (!sb) return;
  const cat = categories.find(c => c.id === id);
  await sb.from('Category').update({ active: !cat.active }).eq('id', id);
  cat.active = !cat.active;
  showToast(cat.active?'Categoría activada':'Categoría desactivada','success');
  renderCategories();
}

function deleteCat(id) {
  showConfirm('¿Eliminar categoría?', 'Los productos quedarán sin categoría.', async () => {
    if (sb) await sb.from('Category').delete().eq('id', id);
    categories = categories.filter(c => c.id !== id);
    showToast('Categoría eliminada','success');
    renderCounts(); renderCategories();
  });
}

// ── CAROUSELS ──
function renderCarousels() {
  const cats = categories.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Carruseles</h1><p>Banners del hero y carruseles de productos</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" onclick="openCarouselModal(null)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo banner</button></div>
    </div>
    ${carousels.length === 0 ? '<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><strong>No hay banners</strong></div>' : `
    <div style="display:flex;flex-direction:column;gap:12px">${carousels.map(b=>`
      <div class="card" style="overflow:visible">
        <div class="banner-preview" style="background:${b.image_url?'#1C0F00':(b.bg_color||'#E85002')}">
          ${b.image_url?`<img src="${b.image_url}" alt="" style="opacity:.7">`:''}
          <span class="banner-preview-title">${b.title}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;flex-wrap:wrap">
          <div style="flex:1;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${b.active?pill('green','Activo'):pill('gray','Oculto')}
            ${b.filter_type?pill('blue','Carrusel productos · '+b.filter_type):''}
            ${b.subtitle?`<span style="font-size:.78rem;color:var(--text-3)">${b.subtitle}</span>`:''}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="openCarouselModal('${b.id}')">Editar</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCarousel('${b.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
          </div>
        </div>
      </div>`).join('')}</div>`}`);
}

function openCarouselModal(id) {
  const b = id ? carousels.find(x => x.id === id) : null;
  const isProduct = !!b?.filter_type;
  const cats = categories.map(c=>`<option value="${c.name}" ${b?.filter_value===c.name?'selected':''}>${c.name}</option>`).join('');
  showModal(`${b?'Editar':'Nuevo'} banner`,`
    <div class="form-group"><label class="form-label">Tipo</label>
      <select class="form-input" id="bType" onchange="toggleCarouselType()">
        <option value="image" ${!isProduct?'selected':''}>Banner imagen / color</option>
        <option value="products" ${isProduct?'selected':''}>Carrusel de productos</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Título <span class="req">*</span></label><input class="form-input" id="bTitle" value="${b?.title||''}" /></div>
    <div class="form-group"><label class="form-label">Subtítulo</label><input class="form-input" id="bSubtitle" value="${b?.subtitle||''}" /></div>
    <div id="bImageSection" style="${isProduct?'display:none':''}">
      <div class="form-group"><label class="form-label">URL de imagen</label><input class="form-input" id="bImg" value="${b?.image_url||''}" placeholder="https://…" /></div>
      <div class="form-group"><label class="form-label">Color de fondo</label>
        <div class="color-pick-wrap"><input type="color" class="form-input" id="bColor" value="${b?.bg_color||'#E85002'}" oninput="document.getElementById('bColorPreview').style.background=this.value" /><div class="color-pick-preview" id="bColorPreview" style="background:${b?.bg_color||'#E85002'}"></div></div>
      </div>
    </div>
    <div id="bProductSection" style="${!isProduct?'display:none':''}">
      <div class="form-group"><label class="form-label">Filtrar por</label>
        <select class="form-input" id="bFilterType" onchange="toggleCarouselFilter()">
          <option value="featured" ${b?.filter_type==='featured'?'selected':''}>Destacados</option>
          <option value="new" ${b?.filter_type==='new'?'selected':''}>Nuevos</option>
          <option value="category" ${b?.filter_type==='category'?'selected':''}>Categoría</option>
          <option value="tag" ${b?.filter_type==='tag'?'selected':''}>Etiqueta</option>
        </select>
      </div>
      <div id="bFilterValueWrap" style="${(b?.filter_type!=='category'&&b?.filter_type!=='tag')?'display:none':''}">
        <div class="form-group" id="bCatWrap" style="${b?.filter_type!=='category'?'display:none':''}"><label class="form-label">Categoría</label><select class="form-input" id="bCatVal"><option value="">Seleccioná</option>${cats}</select></div>
        <div class="form-group" id="bTagWrap" style="${b?.filter_type!=='tag'?'display:none':''}"><label class="form-label">Etiqueta</label><input class="form-input" id="bTagVal" value="${b?.filter_value||''}" placeholder="ej: oferta" /></div>
      </div>
    </div>
    <div class="toggle-row"><span class="form-label">Visible en catálogo</span><label class="toggle-wrap"><input type="checkbox" id="bActive" ${b?.active!==false?'checked':''}><span class="toggle-slider"></span></label></div>`,
    async () => {
      const title = document.getElementById('bTitle').value.trim();
      if (!title) { showToast('El título es obligatorio','error'); return false; }
      const type = document.getElementById('bType').value;
      const payload = {
        title, subtitle: document.getElementById('bSubtitle').value,
        active: document.getElementById('bActive').checked,
        bg_color: document.getElementById('bColor')?.value || '#E85002',
        image_url: type==='image' ? (document.getElementById('bImg')?.value||'') : '',
        filter_type: type==='products' ? document.getElementById('bFilterType').value : '',
        filter_value: type==='products' ? (document.getElementById('bCatVal')?.value||document.getElementById('bTagVal')?.value||'') : '',
      };
      if (sb) {
        if (id) { await sb.from('CarouselBanner').update(payload).eq('id',id); }
        else { await sb.from('CarouselBanner').insert({ ...payload, sort_order: carousels.length }); }
      }
      await loadAll();
      showToast(id?'Banner actualizado':'Banner creado','success');
      renderCarousels();
    });
}

function toggleCarouselType() {
  const t = document.getElementById('bType').value;
  document.getElementById('bImageSection').style.display = t==='image'?'':'none';
  document.getElementById('bProductSection').style.display = t==='products'?'':'none';
}
function toggleCarouselFilter() {
  const v = document.getElementById('bFilterType').value;
  document.getElementById('bFilterValueWrap').style.display = (v==='category'||v==='tag')?'':'none';
  document.getElementById('bCatWrap').style.display = v==='category'?'':'none';
  document.getElementById('bTagWrap').style.display = v==='tag'?'':'none';
}

function deleteCarousel(id) {
  showConfirm('¿Eliminar este banner?','',async()=>{
    if(sb) await sb.from('CarouselBanner').delete().eq('id',id);
    carousels = carousels.filter(x=>x.id!==id);
    showToast('Banner eliminado','success'); renderCarousels();
  });
}

// ── SECTIONS ──
function renderSections() {
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Secciones</h1><p>Secciones de la página de inicio</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" onclick="openSectionModal(null)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nueva sección</button></div>
    </div>
    ${sections.length===0?'<div class="empty-state"><strong>No hay secciones</strong></div>':`
    <div class="card"><div class="overflow-x"><table>
      <thead><tr><th>Título</th><th>Tipo</th><th>Filtro</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead>
      <tbody>${sections.map(s=>`<tr>
        <td style="font-weight:600">${s.title}</td>
        <td style="color:var(--text-2)">${s.type}</td>
        <td style="color:var(--text-2)">${s.filter_type}${s.filter_value?' · '+s.filter_value:''}</td>
        <td>${s.active?pill('green','Activo'):pill('gray','Oculto')}</td>
        <td>${actionBtns(s.id,'editSection','deleteSection')}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`}`);
}

function editSection(id) { openSectionModal(sections.find(s=>s.id===id)); }
function openSectionModal(sec) {
  showModal(`${sec?'Editar':'Nueva'} sección`,`
    <div class="form-group"><label class="form-label">Título <span class="req">*</span></label><input class="form-input" id="sTitle" value="${sec?.title||''}" /></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Tipo</label><select class="form-input" id="sType"><option value="grid" ${sec?.type==='grid'?'selected':''}>Grid</option><option value="carousel" ${sec?.type==='carousel'?'selected':''}>Carrusel</option><option value="featured" ${sec?.type==='featured'?'selected':''}>Destacados</option></select></div>
      <div class="form-group"><label class="form-label">Filtrar por</label><select class="form-input" id="sFilterType"><option value="new" ${sec?.filter_type==='new'?'selected':''}>Nuevos</option><option value="featured" ${sec?.filter_type==='featured'?'selected':''}>Destacados</option><option value="category" ${sec?.filter_type==='category'?'selected':''}>Categoría</option><option value="tag" ${sec?.filter_type==='tag'?'selected':''}>Etiqueta</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Valor del filtro</label><input class="form-input" id="sFilterVal" value="${sec?.filter_value||''}" placeholder="ej: nombre de categoría o etiqueta" /></div>
    <div class="toggle-row"><span class="form-label">Activa</span><label class="toggle-wrap"><input type="checkbox" id="sActive" ${sec?.active!==false?'checked':''}><span class="toggle-slider"></span></label></div>`,
    async () => {
      const title = document.getElementById('sTitle').value.trim();
      if (!title) { showToast('El título es obligatorio','error'); return false; }
      const payload = { title, type: document.getElementById('sType').value, filter_type: document.getElementById('sFilterType').value, filter_value: document.getElementById('sFilterVal').value, active: document.getElementById('sActive').checked };
      if (sb) {
        if (sec) { await sb.from('HomeSection').update(payload).eq('id',sec.id); }
        else { await sb.from('HomeSection').insert({ ...payload, sort_order: sections.length }); }
      }
      await loadAll();
      showToast(sec?'Sección actualizada':'Sección creada','success'); renderSections();
    });
}
function deleteSection(id) { showConfirm('¿Eliminar sección?','',async()=>{ if(sb) await sb.from('HomeSection').delete().eq('id',id); sections=sections.filter(s=>s.id!==id); showToast('Sección eliminada','success'); renderSections(); }); }

// ── ANNOUNCEMENTS ──
function renderAnnouncements() {
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Anuncios</h1><p>Barra de anuncios en el catálogo</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" onclick="openAnnModal(null)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo anuncio</button></div>
    </div>
    ${announcements.length===0?'<div class="empty-state"><strong>No hay anuncios</strong></div>':`
    <div style="display:flex;flex-direction:column;gap:10px">${announcements.map(a=>`
      <div class="card">
        <div style="padding:12px 16px;border-radius:12px 12px 0 0;font-weight:700;font-size:.9rem" style="background:${a.bg_color};color:${a.text_color}">${a.text}</div>
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
          <div style="flex:1">${a.active?pill('green','Activo'):pill('gray','Oculto')}</div>
          ${actionBtns(a.id,'editAnn','deleteAnn')}
        </div>
      </div>`).join('')}</div>`}`);
}
function editAnn(id) { openAnnModal(announcements.find(a=>a.id===id)); }
function openAnnModal(ann) {
  showModal(`${ann?'Editar':'Nuevo'} anuncio`,`
    <div class="form-group"><label class="form-label">Texto <span class="req">*</span></label><input class="form-input" id="aText" value="${ann?.text||''}" placeholder="¡Envío gratis por compras mayores a $5000!" /></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Color de fondo</label><div class="color-pick-wrap"><input type="color" class="form-input" id="aBg" value="${ann?.bg_color||'#1C0F00'}" /><div class="color-pick-preview" style="background:${ann?.bg_color||'#1C0F00'}"></div></div></div>
      <div class="form-group"><label class="form-label">Color de texto</label><div class="color-pick-wrap"><input type="color" class="form-input" id="aTxt" value="${ann?.text_color||'#FFD166'}" /><div class="color-pick-preview" style="background:${ann?.text_color||'#FFD166'}"></div></div></div>
    </div>
    <div class="toggle-row"><span class="form-label">Activo</span><label class="toggle-wrap"><input type="checkbox" id="aActive" ${ann?.active!==false?'checked':''}><span class="toggle-slider"></span></label></div>`,
    async () => {
      const text = document.getElementById('aText').value.trim();
      if (!text) { showToast('El texto es obligatorio','error'); return false; }
      const payload = { text, bg_color: document.getElementById('aBg').value, text_color: document.getElementById('aTxt').value, active: document.getElementById('aActive').checked };
      if (sb) { if (ann) { await sb.from('Announcement').update(payload).eq('id',ann.id); } else { await sb.from('Announcement').insert(payload); } }
      await loadAll(); showToast(ann?'Anuncio actualizado':'Anuncio creado','success'); renderAnnouncements();
    });
}
function deleteAnn(id) { showConfirm('¿Eliminar anuncio?','',async()=>{ if(sb) await sb.from('Announcement').delete().eq('id',id); announcements=announcements.filter(a=>a.id!==id); showToast('Anuncio eliminado','success'); renderAnnouncements(); }); }

// ── DISCOUNTS ──
function renderDiscounts() {
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Descuentos</h1><p>Creá y gestioná cupones para tus clientes</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" onclick="openDiscountModal(null)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo código</button></div>
    </div>
    <div class="card">
      ${discounts.length===0?'<div class="empty-state"><strong>No hay códigos de descuento</strong></div>':`
      <div class="overflow-x"><table>
        <thead><tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Usos</th><th>Mínimo</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead>
        <tbody>${discounts.map(d=>`<tr>
          <td><span class="mono">${d.code}</span></td>
          <td style="color:var(--text-2)">${d.type==='percent'?'Porcentaje':'Monto fijo'}</td>
          <td style="font-weight:700">${d.type==='percent'?d.value+'%':'$'+d.value}</td>
          <td style="color:var(--text-2)">${d.used_count||0}${d.max_uses>0?' / '+d.max_uses:''}</td>
          <td style="color:var(--text-2)">${d.min_purchase>0?'$'+d.min_purchase:'—'}</td>
          <td>${d.active?pill('green','Activo'):pill('gray','Inactivo')}</td>
          <td>${actionBtns(d.id,'editDiscount','deleteDiscount')}</td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`);
}
function editDiscount(id) { openDiscountModal(discounts.find(d=>d.id===id)); }
function openDiscountModal(d) {
  showModal(`${d?'Editar':'Nuevo'} código`,`
    <div class="form-group"><label class="form-label">Código <span class="req">*</span></label><input class="form-input" id="dCode" value="${d?.code||''}" placeholder="VERANO20" style="text-transform:uppercase;font-family:'Courier New',monospace;font-weight:700;letter-spacing:.1em" /></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Tipo</label><select class="form-input" id="dType"><option value="percent" ${d?.type==='percent'?'selected':''}>Porcentaje (%)</option><option value="fixed" ${d?.type==='fixed'?'selected':''}>Monto fijo ($)</option></select></div>
      <div class="form-group"><label class="form-label">Valor <span class="req">*</span></label><input class="form-input" id="dValue" type="number" value="${d?.value||''}" min="0" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Compra mínima</label><input class="form-input" id="dMin" type="number" value="${d?.min_purchase||0}" min="0" /></div>
      <div class="form-group"><label class="form-label">Usos máx. (-1=∞)</label><input class="form-input" id="dMaxUses" type="number" value="${d?.max_uses??-1}" min="-1" /></div>
    </div>
    <div class="toggle-row"><span class="form-label">Activo</span><label class="toggle-wrap"><input type="checkbox" id="dActive" ${d?.active!==false?'checked':''}><span class="toggle-slider"></span></label></div>`,
    async () => {
      const code = document.getElementById('dCode').value.trim().toUpperCase();
      const value = parseFloat(document.getElementById('dValue').value);
      if (!code || !value) { showToast('Código y valor son obligatorios','error'); return false; }
      const payload = { code, type: document.getElementById('dType').value, value, min_purchase: parseFloat(document.getElementById('dMin').value)||0, max_uses: parseInt(document.getElementById('dMaxUses').value)??-1, active: document.getElementById('dActive').checked };
      if (sb) {
        if (d) { await sb.from('DiscountCode').update(payload).eq('id',d.id); }
        else { await sb.from('DiscountCode').insert({ ...payload, used_count: 0 }); }
      }
      await loadAll(); showToast(d?'Código actualizado':'Código creado','success'); renderDiscounts();
    });
}
function deleteDiscount(id) { showConfirm('¿Eliminar código?','',async()=>{ if(sb) await sb.from('DiscountCode').delete().eq('id',id); discounts=discounts.filter(d=>d.id!==id); showToast('Código eliminado','success'); renderCounts(); renderDiscounts(); }); }

// ── ORDERS ──
let ordSearch='', ordStatusFilter='all';
function renderOrders() {
  const filtered = orders.filter(o=>{
    if (ordSearch && !String(o.order_number||'').includes(ordSearch) && !String(o.customer_name||'').toLowerCase().includes(ordSearch.toLowerCase())) return false;
    if (ordStatusFilter!=='all' && o.status!==ordStatusFilter) return false;
    return true;
  });
  const statusLabels = { pending:'Pendiente', confirmed:'Confirmado', cancelled:'Cancelado' };
  const statusColors = { pending:'amber', confirmed:'green', cancelled:'red' };
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Pedidos</h1><p>Historial de encargos enviados por WhatsApp</p></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div style="position:relative;flex:1;min-width:200px;max-width:320px">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-3)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input class="form-input" style="padding-left:34px" value="${ordSearch}" oninput="ordSearch=this.value;renderOrders()" placeholder="Buscar por # o cliente…" />
      </div>
      <select class="form-input" style="width:auto" onchange="ordStatusFilter=this.value;renderOrders()">
        <option value="all">Todos los estados</option>
        <option value="pending" ${ordStatusFilter==='pending'?'selected':''}>Pendiente</option>
        <option value="confirmed" ${ordStatusFilter==='confirmed'?'selected':''}>Confirmado</option>
        <option value="cancelled" ${ordStatusFilter==='cancelled'?'selected':''}>Cancelado</option>
      </select>
    </div>
    <div class="card">
      ${filtered.length===0?'<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg><strong>No hay pedidos registrados</strong></div>':`
      <div class="overflow-x"><table>
        <thead><tr><th>#</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead>
        <tbody>${filtered.map(o=>`<tr>
          <td style="font-weight:700">#${o.order_number||o.id?.slice(0,6)}</td>
          <td style="font-size:.78rem;color:var(--text-3)">${fmtDate(o.created_date)}</td>
          <td style="color:var(--text-2)">${(o.items||[]).length} prod.</td>
          <td style="font-weight:800;color:var(--accent);font-family:var(--font-display)">${fmtPrice(o.total)}</td>
          <td>${pill(statusColors[o.status]||'gray',statusLabels[o.status]||o.status)}</td>
          <td><div style="display:flex;gap:6px;justify-content:flex-end">
            <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${o.id}','confirmed')">✓ Confirmar</button>
            <button class="btn btn-danger btn-sm" onclick="updateOrderStatus('${o.id}','cancelled')">✕ Cancelar</button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`);
}
async function updateOrderStatus(id, status) {
  if (sb) await sb.from('Order').update({ status }).eq('id', id);
  const o = orders.find(x=>x.id===id);
  if (o) o.status = status;
  showToast(`Pedido ${status==='confirmed'?'confirmado':'cancelado'}`, 'success');
  renderCounts(); renderOrders();
}

// ── SETTINGS ──
function renderSettings() {
  pc(`
    <div class="page-header">
      <div class="page-header-text"><h1>Configuración</h1><p>Ajustes generales del sitio</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" id="btnSaveSettings"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar cambios</button></div>
    </div>
    <div style="max-width:640px;display:flex;flex-direction:column;gap:16px">
      <div class="form-section">
        <div class="form-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Acceso al admin</div>
        <p style="font-size:.78rem;color:var(--text-3);margin-bottom:14px">Solo esta cuenta puede iniciar sesión en el panel admin.</p>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="form-group"><label class="form-label">Email de acceso <span class="req">*</span></label><input class="form-input" id="cfgEmail" type="email" value="${getConfig('admin_email')}" placeholder="admin@loquiero.com" /></div>
          <div class="form-group"><label class="form-label">Contraseña</label><div class="input-icon-wrap"><input class="form-input" id="cfgPwd" type="password" placeholder="Mínimo 6 caracteres" /><button type="button" class="input-icon-btn" onclick="togglePwd()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div><p class="form-hint">Dejá en blanco para no cambiar.</p></div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Contacto y redes</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">WhatsApp <span class="req">*</span></label><input class="form-input" id="cfgWa" value="${getConfig('wa_number')}" placeholder="5493445440326" /><p class="form-hint">Con código de país, sin + ni espacios</p></div>
          <div class="form-group"><label class="form-label">Instagram</label><input class="form-input" id="cfgIg" value="${getConfig('instagram')}" placeholder="loquiero.tienda" /></div>
        </div>
        <div class="form-group" style="margin-top:12px"><label class="form-label">Nombre del sitio</label><input class="form-input" id="cfgName" value="${getConfig('site_name')}" placeholder="LO QUIERO!" /></div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Exportar datos</div>
        <p style="font-size:.78rem;color:var(--text-3);margin-bottom:14px">Descargá todos los datos en formato CSV compatible con Excel.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="exportCSV('products')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar productos</button>
          <button class="btn btn-outline" onclick="exportCSV('orders')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar pedidos</button>
        </div>
      </div>
    </div>`);
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
}

function togglePwd() { const el=document.getElementById('cfgPwd'); el.type=el.type==='password'?'text':'password'; }

async function saveSettings() {
  const email = document.getElementById('cfgEmail').value.trim();
  const pwd = document.getElementById('cfgPwd').value;
  if (!email) { showToast('El email de acceso es obligatorio','error'); return; }
  if (pwd && pwd.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres','error'); return; }
  const btn = document.getElementById('btnSaveSettings');
  btn.disabled=true; btn.textContent='Guardando…';
  await Promise.all([
    saveConfig('admin_email', email),
    saveConfig('wa_number', document.getElementById('cfgWa').value),
    saveConfig('instagram', document.getElementById('cfgIg').value),
    saveConfig('site_name', document.getElementById('cfgName').value),
    ...(pwd ? [saveConfig('admin_password', pwd)] : []),
  ]);
  await loadAll();
  btn.disabled=false; btn.textContent='Guardar cambios';
  showToast('Configuración guardada','success');
}

function exportCSV(type) {
  let rows, headers;
  if (type==='products') {
    headers=['ID','Nombre','Categoría','Precio','Stock','Activo','Nuevo','Destacado'];
    rows=products.map(p=>[p.id,p.name,p.category_name||'',p.price,p.stock,p.is_active?'Sí':'No',p.is_new?'Sí':'No',p.is_featured?'Sí':'No']);
  } else {
    headers=['#','Fecha','Productos','Total','Estado'];
    rows=orders.map(o=>[o.order_number||o.id,o.created_date,(o.items||[]).length,o.total,o.status]);
  }
  const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`lo-quiero-${type}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV descargado','success');
}

// ── UI HELPERS ──
function closeDrawer() { document.getElementById('modalContainer').innerHTML = ''; }

function showModal(title, bodyHtml, onConfirm) {
  document.getElementById('modalContainer').innerHTML = `
    <div class="modal-backdrop open" id="modalBackdrop">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="modal-close-btn" onclick="closeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-primary" id="modalSaveBtn">Guardar</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('modalSaveBtn').addEventListener('click', async () => {
    const result = await onConfirm();
    if (result !== false) closeModal();
  });
}

function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

function showConfirm(title, desc, onConfirm) {
  document.getElementById('modalContainer').innerHTML = `
    <div class="modal-backdrop open" id="confirmBackdrop">
      <div class="modal" style="max-width:360px" onclick="event.stopPropagation()">
        <div class="modal-body" style="padding-top:24px;text-align:center">
          <div class="confirm-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></div>
          <div style="font-family:var(--font-display);font-size:1rem;font-weight:800;margin-bottom:6px">${title}</div>
          ${desc?`<div style="font-size:.83rem;color:var(--text-2)">${desc}</div>`:''}
        </div>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-danger" id="confirmOk">Eliminar</button>
        </div>
      </div>
    </div>`;
  document.getElementById('confirmBackdrop').addEventListener('click', closeModal);
  document.getElementById('confirmOk').addEventListener('click', async () => { closeModal(); await onConfirm(); });
}

function showToast(msg, type = '') {
  const c = document.getElementById('toastContainer');
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = msg;
  c.appendChild(div);
  setTimeout(() => { div.style.opacity='0'; div.style.transform='translateY(4px)'; div.style.transition='.3s'; setTimeout(()=>div.remove(),300); }, 3000);
}
