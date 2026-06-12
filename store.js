// ============================================
// js/store.js — Client-side state (cart, favs)
// ============================================

const CART_KEY = 'lq_cart';
const FAVS_KEY = 'lq_favs';
const WA_NUMBER = '5493445440326';

// ---- CART ----
export const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  },
  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    Cart._emit();
  },
  add(product, qty = 1, variant = null) {
    const items = Cart.get();
    const key = variant ? `${product.id}__${JSON.stringify(variant)}` : product.id;
    const existing = items.find(i => i._key === key);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        _key: key,
        id: product.id,
        name: product.name,
        price: product.price,
        compare_price: product.compare_price,
        image: product.images?.[0] || null,
        variant,
        qty,
        category: product.category_name || ''
      });
    }
    Cart.save(items);
  },
  remove(key) {
    Cart.save(Cart.get().filter(i => i._key !== key));
  },
  updateQty(key, qty) {
    if (qty <= 0) return Cart.remove(key);
    const items = Cart.get();
    const item = items.find(i => i._key === key);
    if (item) { item.qty = qty; Cart.save(items); }
  },
  clear() { Cart.save([]); },
  count() { return Cart.get().reduce((sum, i) => sum + i.qty, 0); },
  subtotal() { return Cart.get().reduce((sum, i) => sum + i.price * i.qty, 0); },

  applyDiscount(code, discountData) {
    // Returns { amount, type, value }
    if (!discountData) return null;
    const sub = Cart.subtotal();
    if (discountData.min_purchase && sub < discountData.min_purchase) return null;
    const amount = discountData.type === 'percent'
      ? sub * (discountData.value / 100)
      : Math.min(discountData.value, sub);
    return { amount: Math.round(amount * 100) / 100, code, ...discountData };
  },

  // Build WhatsApp message
  buildWaMessage(discount = null) {
    const items = Cart.get();
    if (!items.length) return null;
    const lines = items.map(i => {
      const variantStr = i.variant ? ` (${Object.values(i.variant).join(', ')})` : '';
      return `• ${i.qty}x ${i.name}${variantStr} — $${(i.price * i.qty).toLocaleString('es-AR')}`;
    });
    const subtotal = Cart.subtotal();
    const discountLine = discount ? `\n🏷️ Descuento (${discount.code}): -$${discount.amount.toLocaleString('es-AR')}` : '';
    const total = discount ? subtotal - discount.amount : subtotal;
    const msg = `🛍️ *Hola! Quiero encargar:*\n\n${lines.join('\n')}\n${discountLine}\n\n💰 *Total: $${total.toLocaleString('es-AR')}*\n\n¿Está disponible?`;
    return encodeURIComponent(msg);
  },

  openWa(discount = null) {
    const msg = Cart.buildWaMessage(discount);
    if (!msg) return;
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  },

  // Event system
  _listeners: [],
  onChange(fn) { Cart._listeners.push(fn); },
  _emit() { Cart._listeners.forEach(fn => fn(Cart.get())); }
};

// ---- FAVORITES ----
export const Favs = {
  get() {
    try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); }
    catch { return []; }
  },
  save(ids) {
    localStorage.setItem(FAVS_KEY, JSON.stringify(ids));
    Favs._emit();
  },
  toggle(id) {
    const favs = Favs.get();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id);
    else favs.splice(idx, 1);
    Favs.save(favs);
    return idx === -1; // returns true if added
  },
  has(id) { return Favs.get().includes(id); },
  count() { return Favs.get().length; },
  _listeners: [],
  onChange(fn) { Favs._listeners.push(fn); },
  _emit() { Favs._listeners.forEach(fn => fn(Favs.get())); }
};

// ---- SINGLE PRODUCT ORDER (quick WA) ----
export function orderSingleProduct(product, qty, variant, discountAmount = 0) {
  const variantStr = variant ? ` (${Object.values(variant).join(', ')})` : '';
  const subtotal = product.price * qty;
  const total = subtotal - discountAmount;
  const msg = encodeURIComponent(
    `🛍️ *Hola! Quiero encargar:*\n\n• ${qty}x ${product.name}${variantStr} — $${total.toLocaleString('es-AR')}\n\n¿Está disponible?`
  );
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

export { WA_NUMBER };
