// Simple localStorage-backed store for KitchenCraft
// Exposes functions used by the frontend to load/save users, menu, carts, and orders.
(function(){
    const KEY_USERS = 'kitchencraft_users';
    const KEY_MENU = 'kitchencraft_menu';
    const KEY_ORDERS = 'kitchencraft_orders';

    // Initial seed data for products (Minecraft-themed kitchen items)
    const defaultMenu = [
        // Essentials
        {
            category: 'essentials',
            name: 'Chef\u2019s Knife',
            sizes: { '6"': 400, '8"': 600, '10"': 800 },
            image: '/static/images/knife.png'
        },
        { category: 'essentials', name: 'Wood Cutting Board', price: 450, image: '/static/images/cuttingboard.png' },
        {
            category: 'essentials',
            name: 'Nonstick Frying Pan',
            sizes: { '8"': 450, '10"': 600, '12"': 750 },
            image: '/static/images/fryingpan.png'
        },
        { category: 'essentials', name: 'Measuring Cups (set)', price: 350, image: '/static/images/measuringcups.png' },
        { category: 'essentials', name: 'Spoons (set)', price: 250, image: '/static/images/spoons.png' },

        // Small Appliances
        { category: 'appliances', name: 'Air Fryer', price: 5200, image: '/static/images/airfryer.png' },
        { category: 'appliances', name: 'Blender', price: 3200, image: '/static/images/blender.png' },
        { category: 'appliances', name: 'Electric Kettle', price: 1500, image: '/static/images/kettle.png' },
        { category: 'appliances', name: 'Toaster Oven', price: 4200, image: '/static/images/toasteroven.png' },
        { category: 'appliances', name: 'Coffee Maker', price: 2800, image: '/static/images/coffeemaker.png' },

        // Gadgets & Tools
        { category: 'gadgets', name: 'Digital Instant-Read Thermometer', price: 850, image: '/static/images/thermometer.png' },
        { category: 'gadgets', name: 'Tongs', price: 220, image: '/static/images/tong.png' },
        { category: 'gadgets', name: 'Whisk', price: 180, image: '/static/images/whisk.png' },
        { category: 'gadgets', name: 'Microplane Zester', price: 600, image: '/static/images/zester.png' },
        { category: 'gadgets', name: 'Vegetable Peeler', price: 140, image: '/static/images/peeler.png' },

        // Storage & Cleaning
        {
            category: 'storage',
            name: 'Airtight Food Storage Container Set',
            sizes: { 'Small': 350, 'Medium': 500, 'Large': 700 },
            image: '/static/images/container.png'
        },
        {
            category: 'storage',
            name: 'Glass Storage Jars',
            sizes: { 'Small': 250, 'Medium': 350, 'Large': 450 },
            image: '/static/images/jar.png'
        },
        { category: 'storage', name: 'Dish Drying Rack', price: 650, image: '/static/images/rack.png' },
        { category: 'storage', name: 'Sponge', price: 60, image: '/static/images/sponge.png' }
    ];

    // Default users - admin and a customer
    const defaultUsers = [
        {
            fullName: 'Admin',
            username: 'admin',
            email: 'faithm.valencia5@gmail.com',
            password: 'admin123',
            role: 'admin',
            address: 'San Pedro, Bauan, Batangas',
            contactNumber: '09938564677'
        },
        {
            fullName: 'Faith Valencia',
            username: 'faith',
            email: 'faithmaramotvalencia05@gmail.com',
            password: 'faith123',
            role: 'customer',
            address: 'San Pedro, Bauan, Batangas',
            contactNumber: '09938564676'
        }
        ,
        {
            fullName: 'Ramon Santos',
            username: 'rider1',
            email: 'ramon@gmail.com',
            role: 'rider',
            address: 'Local Depot',
            contactNumber: '09170000001'
        },
        {
            fullName: 'Liza Cruz',
            username: 'rider2',
            email: 'liza@gmail.com',
            role: 'rider',
            address: 'Rider Hub',
            contactNumber: '09170000002'
        },
        {
            fullName: 'Pedro Reyes',
            username: 'rider3',
            email: 'pedro@gmail.com',
            role: 'rider',
            address: 'Central Station',
            contactNumber: '09170000003'
        }
    ];

    function read(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; }
    }
    function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

    // Simple deterministic hash for seed objects (djb2 variant) -> hex string
    function computeSeedHash(obj) {
        try {
            const s = JSON.stringify(obj || '');
            let h = 5381;
            for (let i = 0; i < s.length; i++) {
                h = ((h << 5) + h) + s.charCodeAt(i);
                // keep in signed 32-bit range
                h = h & 0xFFFFFFFF;
            }
            // return as unsigned hex string
            return (h >>> 0).toString(16);
        } catch (e) {
            return '';
        }
    }

    function ensureSeed() {
        // Menu: seed if missing OR if the seed embedded in this file changed.
        // Developers can opt-out by setting localStorage.kitchencraft_preserve_menu = 'true'
        try {
            const preserveMenu = localStorage.getItem('kitchencraft_preserve_menu') === 'true';
            const storedMenu = read(KEY_MENU);
            const currentMenuHash = computeSeedHash(defaultMenu);
            const storedMenuHash = localStorage.getItem('kitchencraft_menu_seedHash') || '';

            if (!storedMenu) {
                write(KEY_MENU, defaultMenu);
                localStorage.setItem('kitchencraft_menu_seedHash', currentMenuHash);
            } else if (!preserveMenu && storedMenuHash !== currentMenuHash) {
                // overwrite stored menu when the file seed changed (dev convenience)
                write(KEY_MENU, defaultMenu);
                localStorage.setItem('kitchencraft_menu_seedHash', currentMenuHash);
            }
        } catch (e) {
            if (!read(KEY_MENU)) write(KEY_MENU, defaultMenu);
        }

        // Users: seed if missing OR if the seed embedded in this file changed.
        // Developers can opt-out by setting localStorage.kitchencraft_preserve_users = 'true'
        try {
            const preserveUsers = localStorage.getItem('kitchencraft_preserve_users') === 'true';
            const storedUsers = read(KEY_USERS);
            const currentSeedHash = computeSeedHash(defaultUsers);
            const storedSeedHash = localStorage.getItem('kitchencraft_users_seedHash') || '';

            if (!storedUsers) {
                // first-time seed
                write(KEY_USERS, defaultUsers);
                localStorage.setItem('kitchencraft_users_seedHash', currentSeedHash);
            } else if (!preserveUsers && storedSeedHash !== currentSeedHash) {
                // A new seed was deployed in the file — automatically update the stored users
                // This is intended for development convenience; set kitchencraft_preserve_users to 'true' to prevent this.
                write(KEY_USERS, defaultUsers);
                localStorage.setItem('kitchencraft_users_seedHash', currentSeedHash);
            }
        } catch (e) {
            // If anything goes wrong, fall back to conservative behavior: ensure key exists
            if (!read(KEY_USERS)) write(KEY_USERS, defaultUsers);
        }

        // Orders: seed if missing
        if (!read(KEY_ORDERS)) write(KEY_ORDERS, []);
    }

    const store = {
        init: function(){ ensureSeed(); },

        // Reset store to seeded defaults (developer helper)
        async resetToDefaults() {
            try {
                write(KEY_MENU, defaultMenu);
                write(KEY_USERS, defaultUsers);
                write(KEY_ORDERS, []);
                return true;
            } catch (e) { return false; }
        },

        // Users
        async loadUsers() { ensureSeed(); return read(KEY_USERS) || []; },
        async saveUsers(users) { write(KEY_USERS, users); return true; },

        // Menu
        async loadMenu() { ensureSeed(); return read(KEY_MENU) || []; },
        async saveMenu(menu) { write(KEY_MENU, menu); return true; },

        // Orders
        async loadOrders() { ensureSeed(); return read(KEY_ORDERS) || []; },
        async saveOrders(orders) { write(KEY_ORDERS, orders); return true; },

        // Convenience helpers used by existing frontend
        async getOrders() { return await this.loadOrders(); },
        async saveOrdersToStorage(orders) { return await this.saveOrders(orders); },
        async getMenuItems() { return await this.loadMenu(); },
        async saveMenuItems(menu) { return await this.saveMenu(menu); },

        // Add/update/delete menu
        async addMenuItem(item) {
            const menu = await this.loadMenu();
            menu.push(item);
            await this.saveMenu(menu);
            return true;
        },
        async updateMenuItem(itemName, updatedItem) {
            const menu = await this.loadMenu();
            const idx = menu.findIndex(m => m.name === itemName);
            if (idx === -1) return false;
            menu[idx] = updatedItem;
            await this.saveMenu(menu);
            return true;
        },
        async deleteMenuItem(itemName) {
            let menu = await this.loadMenu();
            menu = menu.filter(m => m.name !== itemName);
            await this.saveMenu(menu);
            return true;
        },

        // Delete user
        async deleteUser(username) {
            let users = await this.loadUsers();
            users = users.filter(u => u.username !== username);
            await this.saveUsers(users);
            return true;
        },

        // Place an order
        async addOrder(order) {
            const orders = await this.loadOrders();
            orders.push(order);
            await this.saveOrders(orders);
            return true;
        },

        // Update order status
        async updateOrderStatus(orderId, newStatus) {
            const orders = await this.loadOrders();
            // Compare as strings to tolerate numeric vs string id formats
            const idx = orders.findIndex(o => String(o.id) === String(orderId));
            if (idx === -1) return false;
            orders[idx].status = newStatus;
            orders[idx][`${newStatus}Time`] = new Date().toISOString();
            await this.saveOrders(orders);
            return true;
        }
    };

    // Expose to global so existing scripts can call functions directly (backwards compatible)
    window.store = store;
    // also expose commonly-used function names for minimal changes in existing code
    window.loadUsers = store.loadUsers.bind(store);
    window.saveUsers = store.saveUsers.bind(store);
    window.loadMenu = store.loadMenu.bind(store);
    window.saveMenu = store.saveMenu.bind(store);
    window.loadOrders = store.loadOrders.bind(store);
    window.saveOrders = store.saveOrders.bind(store);
    window.getOrders = store.getOrders.bind(store);
    window.saveOrdersToStorage = store.saveOrdersToStorage.bind(store);
    window.getMenuItems = store.getMenuItems.bind(store);
    window.saveMenuItems = store.saveMenuItems.bind(store);
    window.addMenuItem = store.addMenuItem.bind(store);
    window.updateMenuItem = store.updateMenuItem.bind(store);
    window.deleteMenuItem = store.deleteMenuItem.bind(store);
    window.deleteUser = store.deleteUser.bind(store);
    window.addOrder = store.addOrder.bind(store);
    window.updateOrderStatus = store.updateOrderStatus.bind(store);
    // Expose reset helper so developers can re-seed localStorage after editing this file
    window.resetToDefaults = store.resetToDefaults.bind(store);
    window.resetStore = store.resetToDefaults.bind(store);

    // Synchronous helpers for templates that expect immediate data (legacy compatibility)
    window.getMenuItemsSync = function(){ try { return JSON.parse(localStorage.getItem('kitchencraft_menu') || '[]'); } catch(e){ return []; } };
    window.getUsersSync = function(){ try { return JSON.parse(localStorage.getItem('kitchencraft_users') || '[]'); } catch(e){ return []; } };
    // Make getMenuItems behave synchronously for legacy templates (await still works)
    window.getMenuItems = window.getMenuItemsSync;

    // Initialize seed
    store.init();
    // Compatibility shim for older templates using 'users' key
    try {
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify(JSON.parse(localStorage.getItem(KEY_USERS) || '[]')));
        }
    } catch (e) { /* ignore */ }
})();
