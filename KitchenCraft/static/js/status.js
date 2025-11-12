// Delivery Status Tracking System
class DeliveryTracker {
    constructor() {
        this.currentOrder = null;
        this.orders = [];
        this.init();
    }

    async init() {
        await this.loadOrders();
        this.loadCurrentOrder();
        this.displayOrderHistory();
        this.startAutoRefresh();
        // Expose tracker for global actions (e.g., view receipt from inline handlers)
        try { window.__deliveryTracker = this; } catch (e) {}
    }

    async loadOrders() {
        try {
            // Load from cache (which persists during session)
            this.orders = await getOrders();
            console.log('Loaded orders from cache for customer:', this.orders);
        } catch (error) {
            console.error('Error loading orders:', error);
            this.orders = [];
        }
    }

    loadCurrentOrder() {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            this.showNoOrdersMessage();
            return;
        }

        console.log('Current user:', currentUser.username);
        console.log('All orders:', this.orders);

        // Get orders for current user
        const userOrders = this.orders.filter(order => order.customer === currentUser.username);
        console.log('User orders:', userOrders);
        
        if (userOrders.length === 0) {
            this.showNoOrdersMessage();
            return;
        }

            // Get the most recent order that's not delivered, completed, or cancelled
            const activeOrders = userOrders.filter(order => 
                order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'cancelled'
            );
        
        console.log('Active orders:', activeOrders);

        // Only show most recent ACTIVE order; if none, show no active orders
        if (activeOrders.length > 0) {
            this.currentOrder = activeOrders.reduce((latest, order) =>
                new Date(order.orderTime) > new Date(latest.orderTime) ? order : latest
            );
            console.log('Current active order to display:', this.currentOrder);
            this.displayCurrentOrder();
        } else {
            this.currentOrder = null;
            console.log('No active orders to display.');
            this.showNoOrdersMessage();
        }
    }

    displayCurrentOrder() {
        if (!this.currentOrder) {
            this.showNoOrdersMessage();
            return;
        }

        console.log('Displaying current order:', this.currentOrder);

        // Update order number
        const orderNumberElement = document.getElementById('current-order-number');
        if (orderNumberElement) {
            orderNumberElement.textContent = this.currentOrder.id;
        }
        
        // Update order items
        this.displayOrderItems();
        
        // Update delivery information
        this.updateDeliveryInfo();
        
        // Update progress steps
        this.updateProgressSteps();
        
        // Update ETA
        this.updateETA();
        
        // Add completed button if delivered
        this.addCompletedButton();
        // Add received button if picked up
        this.addReceivedButton();
        // Add view receipt button for current order
        this.addViewReceiptButton();
    }

    addViewReceiptButton() {
        if (!this.currentOrder) return;
        // Avoid duplicate
        if (document.getElementById('view-receipt-btn')) return;

        const deliveryInfo = document.querySelector('.delivery-info');
        if (!deliveryInfo) return;

        const btn = document.createElement('button');
        btn.id = 'view-receipt-btn';
        btn.className = 'btn';
        btn.textContent = 'View receipt';
        btn.style.cssText = 'margin-top:12px; padding:8px 14px;';

        btn.addEventListener('click', async () => {
            try {
                // find fresh order object
                const orders = await getOrders();
                const order = (orders || []).find(o => String(o.id) === String(this.currentOrder.id));
                if (!order) return alert('Order not found');

                // try to resolve customer info
                let customer = null;
                try {
                    const users = await loadUsers();
                    customer = (users || []).find(u => u.username === order.customer) || getCurrentUser();
                } catch (e) { customer = getCurrentUser(); }

                if (typeof openReceiptWindow === 'function') {
                    openReceiptWindow(order, customer);
                } else {
                    alert(buildOrderReceiptText(order));
                }
            } catch (err) {
                console.error('Error opening receipt:', err);
                alert('Unable to open receipt');
            }
        });

        deliveryInfo.appendChild(btn);
    }

    displayOrderItems() {
        const itemsList = document.getElementById('order-items-list');
        const totalAmount = document.getElementById('order-total-amount');
        
        if (!itemsList || !this.currentOrder) return;

        let itemsHTML = '';
        let total = 0;

        this.currentOrder.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            itemsHTML += `
                <div class="order-item">
                    <span class="item-name">${item.quantity}x ${item.name}</span>
                    <span class="item-price">₱${itemTotal.toFixed(2)}</span>
                </div>
            `;
        });

        itemsList.innerHTML = itemsHTML;
        if (totalAmount) {
            totalAmount.textContent = total.toFixed(2);
        }
    }

    updateDeliveryInfo() {
        const user = getCurrentUser();
        
        if (user) {
            const deliveryAddress = document.getElementById('delivery-address');
            const contactNumber = document.getElementById('contact-number');
            
            if (deliveryAddress) {
                deliveryAddress.textContent = this.currentOrder.deliveryAddress || user.address || 'Not specified';
            }
            if (contactNumber) {
                contactNumber.textContent = this.currentOrder.contactNumber || user.contactNumber || 'Not specified';
            }
        }

        // Show rider info if assigned — admin stores `assignedRider` as a username
        const riderName = document.getElementById('rider-name');
        const riderContact = document.getElementById('rider-contact');

        if (riderName && riderContact) {
            // Prefer a synchronous users shim if available for immediate lookup
            if (this.currentOrder.assignedRider) {
                try {
                    let user = null;
                    if (typeof getUsersSync === 'function') {
                        const users = getUsersSync() || [];
                        user = users.find(u => String(u.username) === String(this.currentOrder.assignedRider));
                    }

                    if (user) {
                        riderName.textContent = user.fullName || user.username;
                        riderContact.textContent = user.contactNumber || user.contact || '-';
                    } else {
                        // Fallback: show the raw username while admin user info may not be available in sync shim
                        riderName.textContent = String(this.currentOrder.assignedRider) || 'Assigning rider...';
                        riderContact.textContent = '-';

                        // Try async lookup as a best-effort update if getUsersSync isn't populated
                        try {
                            loadUsers().then(usersAsync => {
                                const u2 = (usersAsync || []).find(x => String(x.username) === String(this.currentOrder.assignedRider));
                                if (u2) {
                                    riderName.textContent = u2.fullName || u2.username;
                                    riderContact.textContent = u2.contactNumber || u2.contact || '-';
                                }
                            }).catch(()=>{});
                        } catch (e) { /* ignore */ }
                    }
                } catch (err) {
                    console.error('Error resolving assignedRider:', err);
                    riderName.textContent = String(this.currentOrder.assignedRider) || 'Assigning rider...';
                    riderContact.textContent = '-';
                }
            } else if (this.currentOrder.status === 'ready' || this.currentOrder.status === 'pickedup' || this.currentOrder.status === 'delivered') {
                riderName.textContent = 'Assigning rider...';
                riderContact.textContent = '-';
            } else {
                riderName.textContent = 'Rider will be assigned when order is ready';
                riderContact.textContent = '-';
            }
        }
    }

    updateProgressSteps() {
        if (!this.currentOrder) return;

        const status = this.currentOrder.status;
        const steps = ['placed', 'preparing', 'ready', 'pickedup', 'delivered'];
        
        steps.forEach((step, index) => {
            const stepElement = document.getElementById(`step-${step}`);
            const timeElement = document.getElementById(`step${index + 1}-time`);
            
            if (stepElement) {
                if (steps.indexOf(status) >= index) {
                    stepElement.classList.add('active');
                    if (this.currentOrder[`${step}Time`]) {
                        timeElement.textContent = this.formatTime(this.currentOrder[`${step}Time`]);
                    } else {
                        timeElement.textContent = '-';
                    }
                } else {
                    stepElement.classList.remove('active');
                    timeElement.textContent = '-';
                }
            }
        });
    }

    updateETA() {
        if (!this.currentOrder) return;

        const status = this.currentOrder.status;
        let eta = '15-20 minutes';
        
        switch(status) {
            case 'placed':
                eta = '15-20 minutes';
                break;
            case 'preparing':
                eta = '10-15 minutes';
                break;
            case 'ready':
                eta = '5-10 minutes';
                break;
            case 'pickedup':
                eta = 'Arriving soon';
                break;
            case 'delivered':
                eta = 'Delivered';
                break;
        }
        
        const etaElement = document.getElementById('eta-time');
        if (etaElement) {
            etaElement.textContent = eta;
        }
    }

    addCompletedButton() {
        if (!this.currentOrder || this.currentOrder.status !== 'delivered') return;
        
        // Check if button already exists
        if (document.getElementById('complete-order-btn')) return;
        
        // Find the delivery info section to add button after it
        const deliveryInfo = document.querySelector('.delivery-info');
        if (!deliveryInfo) return;
        
        // Create completed button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'completed-button-container';
        buttonContainer.style.cssText = 'margin-top: 20px; text-align: center;';
        
        const completeBtn = document.createElement('button');
        completeBtn.id = 'complete-order-btn';
        completeBtn.className = 'btn btn-primary';
        completeBtn.textContent = 'Mark as Completed';
        completeBtn.style.cssText = 'padding: 12px 30px; font-size: 16px;';
        
        completeBtn.addEventListener('click', async () => {
            if (confirm('Mark this order as completed? This will move it to your order history.')) {
                await this.completeOrder();
            }
        });
        
        buttonContainer.appendChild(completeBtn);
        deliveryInfo.parentNode.insertBefore(buttonContainer, deliveryInfo.nextSibling);
    }

    // When order is 'pickedup', allow customer to mark as received -> completed
    addReceivedButton() {
        if (!this.currentOrder || this.currentOrder.status !== 'pickedup') return;

        // Check if button already exists
        if (document.getElementById('received-order-btn')) return;

        const deliveryInfo = document.querySelector('.delivery-info');
        if (!deliveryInfo) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'received-button-container';
        buttonContainer.style.cssText = 'margin-top: 20px; text-align: center;';

        const recvBtn = document.createElement('button');
        recvBtn.id = 'received-order-btn';
        recvBtn.className = 'btn btn-primary';
        recvBtn.textContent = 'Confirm Received';
        recvBtn.style.cssText = 'padding: 12px 30px; font-size: 16px;';

        recvBtn.addEventListener('click', async () => {
            // Confirm to avoid accidental clicks
            if (!confirm('Confirm you received the order? This will mark the order as completed.')) return;

            try {
                // Use existing flow to mark completed (updates store and timestamps)
                await updateOrderStatus(this.currentOrder.id, 'completed');

                // Update local object and timestamps similar to completeOrder
                this.currentOrder.status = 'completed';
                this.currentOrder.completedTime = new Date().toISOString();

                // Persist change
                const orders = await getOrders();
                const orderIndex = orders.findIndex(o => String(o.id) === String(this.currentOrder.id));
                if (orderIndex !== -1) {
                    orders[orderIndex] = this.currentOrder;
                    await saveOrdersToStorage(orders);
                }

                alert('Order marked as completed. Thank you!');

                // Refresh UI
                this.currentOrder = null;
                await this.loadOrders();
                this.showNoOrdersMessage();
                this.displayOrderHistory();
            } catch (err) {
                console.error('Error marking order as completed from received button:', err);
                alert('Failed to mark order as completed. Please try again.');
            }
        });

        buttonContainer.appendChild(recvBtn);
        deliveryInfo.parentNode.insertBefore(buttonContainer, deliveryInfo.nextSibling);
    }

    async completeOrder() {
        if (!this.currentOrder) return;
        
        try {
            // Update order status to completed
            await updateOrderStatus(this.currentOrder.id, 'completed');
            
            // Mark completed time
            this.currentOrder.status = 'completed';
            this.currentOrder.completedTime = new Date().toISOString();
            
            // Save updated orders
            const orders = await getOrders();
            // tolerate id type differences (string vs number)
            const orderIndex = orders.findIndex(o => String(o.id) === String(this.currentOrder.id));
            if (orderIndex !== -1) {
                orders[orderIndex] = this.currentOrder;
                await saveOrdersToStorage(orders);
            }
            
            alert('Order marked as completed! Thank you for your order.');
            
            // Refresh UI without full reload: clear current order and show no active orders
            this.currentOrder = null;
            await this.loadOrders();
            this.showNoOrdersMessage();
            this.displayOrderHistory();
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Failed to complete order. Please try again.');
        }
    }

    displayOrderHistory() {
        const historyList = document.getElementById('order-history-list');
        if (!historyList) return;

        const currentUser = getCurrentUser();
        if (!currentUser) {
            historyList.innerHTML = '<p class="no-orders">Please login to view order history.</p>';
            return;
        }

        // Filter orders for current user
        const userOrders = this.orders.filter(order => order.customer === currentUser.username);

        if (userOrders.length === 0) {
            historyList.innerHTML = '<p class="no-orders">No previous orders found.</p>';
            return;
        }

        let historyHTML = '';
        
        // Sort orders by most recent first
        const sortedOrders = userOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
        
        sortedOrders.forEach(order => {
            // Only show delivered, completed, or cancelled orders in history
            if (order.status === 'delivered' || order.status === 'completed' || order.status === 'cancelled') {
                historyHTML += this.createOrderHistoryCard(order);
            }
        });

        historyList.innerHTML = historyHTML || '<p class="no-orders">No completed orders yet.</p>';

        // Attach handlers for view receipt buttons (if any) via global helper
        // Provide a simple global function that delegates to this tracker instance
        try {
            window.viewReceipt = function(orderId) {
                try { window.__deliveryTracker.viewReceipt(orderId); } catch (e) { console.error(e); }
            };
        } catch (e) {}
    }

    createOrderHistoryCard(order) {
        const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const statusClass = order.status === 'cancelled' ? 'cancelled' : order.status === 'completed' ? 'completed' : 'delivered';
        const statusText = order.status === 'cancelled' ? 'Cancelled' : order.status === 'completed' ? 'Completed' : 'Delivered';
        
        return `
            <div class="order-history-card ${statusClass}">
                <div class="history-card-header">
                    <span class="order-id">Order #${order.id}</span>
                    <span class="order-date">${new Date(order.orderTime).toLocaleDateString()}</span>
                </div>
                <div class="history-items">
                    ${order.items.slice(0, 2).map(item => 
                        `<span class="history-item">${item.quantity}x ${item.name}</span>`
                    ).join('')}
                    ${order.items.length > 2 ? `<span class="more-items">+${order.items.length - 2} more</span>` : ''}
                </div>
                <div class="history-footer">
                    <span class="order-total">₱${total.toFixed(2)}</span>
                    <span class="order-status ${statusClass}">${statusText}</span>
                    <button class="btn btn-small" onclick="viewReceipt('${order.id}')">View receipt</button>
                </div>
            </div>
        `;
    }

    async viewReceipt(orderId) {
        try {
            const orders = await getOrders();
            const order = (orders || []).find(o => String(o.id) === String(orderId));
            if (!order) return alert('Order not found');

            let customer = null;
            try { const users = await loadUsers(); customer = (users || []).find(u => u.username === order.customer) || getCurrentUser(); } catch (e) { customer = getCurrentUser(); }

            if (typeof openReceiptWindow === 'function') {
                openReceiptWindow(order, customer);
            } else {
                alert(buildOrderReceiptText(order));
            }
        } catch (err) { console.error('viewReceipt error', err); alert('Unable to open receipt'); }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showNoOrdersMessage() {
        const trackingSection = document.querySelector('.tracking-section');
        if (trackingSection) {
            trackingSection.innerHTML = `
                <div class="no-orders-message">
                    <div class="no-orders-icon">📦</div>
                    <h3>No Active Orders</h3>
                    <p>You don't have any active orders at the moment.</p>
                    <a href="products.html" class="btn">Order Now</a>
                </div>
            `;
        }
    }

    // Add auto-refresh to check for status updates from admin/order management
    startAutoRefresh() {
        // Refresh orders every 10 seconds to check for updates from admin/order management
        setInterval(async () => {
            console.log('Auto-refreshing orders...');
            await this.loadOrders();
            this.loadCurrentOrder();
            this.displayOrderHistory();
        }, 10000);
    }
}

// Initialize delivery tracker when page loads
document.addEventListener('DOMContentLoaded', function() {
    new DeliveryTracker();
});