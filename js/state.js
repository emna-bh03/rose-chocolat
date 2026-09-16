/* ==========================================================================
   Rose Chocolat State Management Store (LocalStorage, Remote Sync & PIN Auth)
   ========================================================================== */

import { INITIAL_MP, INITIAL_RECIPES, INITIAL_ORDERS, INITIAL_EXPENSES, INITIAL_SETTINGS } from './mockData.js';

const STORAGE_KEYS = {
  MP: 'rose_chocolat_mp_v1',
  RECIPES: 'rose_chocolat_recipes_v1',
  ORDERS: 'rose_chocolat_orders_v1',
  EXPENSES: 'rose_chocolat_expenses_v1',
  SETTINGS: 'rose_chocolat_settings_v1',
  AUTH: 'rose_chocolat_auth_v1'
};

class Store {
  constructor() {
    this.subscribers = [];
    this.activeTab = 'dashboard';
    this.searchQuery = '';

    // Authentication State
    const storedAuthPin = localStorage.getItem(STORAGE_KEYS.AUTH);
    this.isAuthenticated = !!storedAuthPin;

    // Load Local Data
    this.mp = this.load(STORAGE_KEYS.MP, INITIAL_MP);
    this.recipes = this.load(STORAGE_KEYS.RECIPES, INITIAL_RECIPES);
    this.orders = this.load(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    this.expenses = this.load(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    this.settings = this.load(STORAGE_KEYS.SETTINGS, { ...INITIAL_SETTINGS, currency: 'TND', pinCode: '2026' });

    document.documentElement.setAttribute('data-theme', 'light');

    // Fetch initial remote data & start auto-sync polling
    this.fetchRemoteData();
    this.startAutoSync();
  }

  load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEYS.MP, JSON.stringify(this.mp));
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(this.recipes));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(this.expenses));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Error saving local storage', e);
    }
  }

  async fetchRemoteData() {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        let changed = false;

        if (Array.isArray(data.mp) && JSON.stringify(data.mp) !== JSON.stringify(this.mp)) {
          this.mp = data.mp;
          changed = true;
        }
        if (Array.isArray(data.recipes) && JSON.stringify(data.recipes) !== JSON.stringify(this.recipes)) {
          this.recipes = data.recipes;
          changed = true;
        }
        if (Array.isArray(data.orders) && JSON.stringify(data.orders) !== JSON.stringify(this.orders)) {
          this.orders = data.orders;
          changed = true;
        }
        if (Array.isArray(data.expenses) && JSON.stringify(data.expenses) !== JSON.stringify(this.expenses)) {
          this.expenses = data.expenses;
          changed = true;
        }
        if (data.settings && JSON.stringify(data.settings) !== JSON.stringify(this.settings)) {
          this.settings = { ...this.settings, ...data.settings };
          changed = true;
        }

        if (changed) {
          this.saveLocal();
          this.notify();
        }
      }
    } catch (e) {
      // Running offline or fallback to localStorage
    }
  }

  async syncToServer() {
    this.saveLocal();
    try {
      const payload = {
        mp: this.mp,
        recipes: this.recipes,
        orders: this.orders,
        expenses: this.expenses,
        settings: this.settings
      };
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Server sync offline:', e);
    }
    this.notify();
  }

  startAutoSync() {
    setInterval(() => {
      this.fetchRemoteData();
    }, 4000);

    window.addEventListener('focus', () => {
      this.fetchRemoteData();
    });
  }

  /* --- AUTHENTICATION --- */
  async login(pin) {
    const cleanPin = String(pin).trim();
    const correctPin = String(this.settings.pinCode || '2026').trim();

    if (cleanPin === correctPin) {
      this.isAuthenticated = true;
      localStorage.setItem(STORAGE_KEYS.AUTH, cleanPin);
      this.notify();
      return { success: true };
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin })
      });
      if (res.ok) {
        this.isAuthenticated = true;
        localStorage.setItem(STORAGE_KEYS.AUTH, cleanPin);
        this.notify();
        return { success: true };
      }
    } catch (e) {}

    return { success: false, error: 'Code PIN incorrect' };
  }

  logout() {
    this.isAuthenticated = false;
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    this.notify();
  }

  subscribe(listener) {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== listener);
    };
  }

  notify() {
    this.subscribers.forEach(listener => listener(this));
  }

  /* --- TAB NAVIGATION --- */
  setActiveTab(tab) {
    this.activeTab = tab;
    this.notify();
  }

  setSearchQuery(query) {
    this.searchQuery = query;
    this.notify();
  }

  /* --- MODULE 1: MATIÈRES PREMIÈRES (MP) --- */
  addMP(item) {
    const newItem = {
      ...item,
      id: 'mp_' + Date.now(),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    this.mp.unshift(newItem);
    this.syncToServer();
    return newItem;
  }

  quickAdjustStock(id, delta) {
    this.mp = this.mp.map(item => {
      if (item.id === id) {
        const current = parseFloat(item.stockQty) || 0;
        const updated = Math.max(0, current + delta);
        return {
          ...item,
          stockQty: Math.round(updated * 100) / 100,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    });
    this.syncToServer();
  }

  updateMP(id, updatedFields) {
    this.mp = this.mp.map(item => item.id === id ? {
      ...item,
      ...updatedFields,
      lastUpdated: new Date().toISOString().split('T')[0]
    } : item);
    this.syncToServer();
  }

  deleteMP(id) {
    this.mp = this.mp.filter(item => item.id !== id);
    this.syncToServer();
  }

  /* --- MODULE 2: RECETTES --- */
  addRecipe(recipe) {
    const newRecipe = {
      ...recipe,
      id: 'rec_' + Date.now()
    };
    this.recipes.unshift(newRecipe);
    this.syncToServer();
    return newRecipe;
  }

  updateRecipe(id, updatedFields) {
    this.recipes = this.recipes.map(r => r.id === id ? { ...r, ...updatedFields } : r);
    this.syncToServer();
  }

  deleteRecipe(id) {
    this.recipes = this.recipes.filter(r => r.id !== id);
    this.syncToServer();
  }

  /* --- MODULE 3: COMMANDES CLIENTS --- */
  addOrder(order) {
    const newOrder = {
      ...order,
      id: 'ord_' + Math.floor(100 + Math.random() * 900),
      stockDeducted: order.stockDeducted || false
    };
    this.orders.unshift(newOrder);
    this.syncToServer();
    return newOrder;
  }

  updateOrder(id, updatedFields) {
    this.orders = this.orders.map(o => o.id === id ? { ...o, ...updatedFields } : o);
    this.syncToServer();
  }

  deleteOrder(id) {
    this.orders = this.orders.filter(o => o.id !== id);
    this.syncToServer();
  }

  updateOrderStockDeduction(orderId, newMpList, newStatus = 'Ready', costMPSnapshot = null) {
    this.mp = newMpList;
    this.orders = this.orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          stockDeducted: true,
          status: newStatus || o.status,
          costMPSnapshot: typeof costMPSnapshot === 'number' ? costMPSnapshot : o.costMPSnapshot
        };
      }
      return o;
    });
    this.syncToServer();
  }

  restoreOrderStock(orderId, newMpList) {
    this.mp = newMpList;
    this.orders = this.orders.map(o => o.id === orderId ? { ...o, stockDeducted: false } : o);
    this.syncToServer();
  }

  /* --- MODULE 4: EXPENSES --- */
  addExpense(expense) {
    const newExpense = {
      ...expense,
      id: 'exp_' + Date.now()
    };
    this.expenses.unshift(newExpense);
    this.syncToServer();
    return newExpense;
  }

  deleteExpense(id) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.syncToServer();
  }

  /* --- SETTINGS --- */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.syncToServer();
  }

  clearAllData() {
    this.mp = [];
    this.recipes = [];
    this.orders = [];
    this.expenses = [];
    this.syncToServer();
  }
}

export const store = new Store();
