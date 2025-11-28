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
        // Modal event handlers
        try { this.setupReviewModalHandlers(); } catch (e) {}
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

                // Get the most recent order that's not delivered or cancelled
                const activeOrders = userOrders.filter(order => 
                    order.status !== 'delivered' && order.status !== 'cancelled'
                );
        
        console.log('Active orders:', activeOrders);

            // If there are active orders, render ALL active orders as smaller cards in the tracking section
            if (activeOrders.length > 0) {
                console.log('Active orders to display:', activeOrders);
                this.activeOrders = activeOrders; // Store active orders for rendering
                this.displayAllActiveOrders();
            } else {
                this.currentOrder = null;
                console.log('No active orders to display.');
                this.showNoOrdersMessage();
            }
    }

        // Render all active orders as smaller full-detail cards inside the tracking section
        displayAllActiveOrders() {
            const trackingSection = document.querySelector('.tracking-section');
            if (!trackingSection) return;

            // Clear existing content (we will re-render all active order cards and order history below)
            trackingSection.innerHTML = '';

            // Create a portrait container for active orders so cards are displayed vertically (portrait)
            const activeContainer = document.createElement('div');
            activeContainer.id = 'active-orders-portrait';

            // For each active order, create a small tracking card
            (this.activeOrders || []).forEach(o => {
                const card = document.createElement('div');
                card.className = 'tracking-card small';

                // Header
                const header = document.createElement('div');
                header.className = 'tracking-header';
                header.innerHTML = `<h3>Order</h3><div class="order-number">#${o.id}</div>`;

                // Status badge
                const statusBadge = document.createElement('div');
                statusBadge.className = 'order-status';
                statusBadge.style.cssText = 'display:inline-block; margin-top:8px; padding:6px 10px; border-radius:12px; font-size:12px; font-weight:700;';
                statusBadge.textContent = o.status.charAt(0).toUpperCase() + o.status.slice(1);
                if (o.status === 'cancelled') statusBadge.style.background = '#f8d7da', statusBadge.style.color = '#721c24';
                else if (o.status === 'delivered') statusBadge.style.background = '#d4edda', statusBadge.style.color = '#155724';
                    // 'completed' status removed; delivered covers finished orders
                else if (o.status === 'pickedup') statusBadge.style.background = '#007bff', statusBadge.style.color = '#fff';
                else if (o.status === 'ready') statusBadge.style.background = '#28a745', statusBadge.style.color = '#fff';
                else statusBadge.style.background = '#ffc107', statusBadge.style.color = '#000';

                // Items
                const details = document.createElement('div');
                details.className = 'order-details';
                let itemsHTML = '<h4>Order Details</h4>';
                itemsHTML += '<div class="order-items-list">';
                let total = 0;
                (o.items || []).forEach(item => {
                    const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                    total += itemTotal;
                    itemsHTML += `\n<div class="order-item"><span class="item-name">${item.quantity}x ${item.name}</span><span class="item-price">₱${itemTotal.toFixed(2)}</span></div>`;
                });
                itemsHTML += '</div>';
                itemsHTML += `<div class="order-total"><strong>Total: ₱${total.toFixed(2)}</strong></div>`;
                details.innerHTML = itemsHTML;

                // Delivery info
                const delivery = document.createElement('div');
                delivery.className = 'delivery-info';
                delivery.innerHTML = `\n<h4>Delivery Information</h4>\n<div class="info-grid">\n<div class="info-item"><span class="info-label">Delivery Address:</span><span>${o.deliveryAddress || '-'}</span></div>\n<div class="info-item"><span class="info-label">Contact Number:</span><span>${o.contactNumber || '-'}</span></div>\n<div class="info-item"><span class="info-label">Rider:</span><span>${o.assignedRider || (o.status === 'ready' ? 'Assigning rider...' : '-')}</span></div>\n</div>`;

                // Estimated delivery note for customers
                const estNote = document.createElement('div');
                estNote.className = 'estimated-delivery-note';
                estNote.style.cssText = 'margin-top:8px; font-size:0.95rem; color:var(--muted-color,#666);';
                estNote.textContent = 'Estimated Delivery: 3-7 days.';

                // Actions
                const actions = document.createElement('div');
                actions.style.cssText = 'display:flex; gap:8px; margin-top:10px;';

                const viewBtn = document.createElement('button');
                viewBtn.className = 'btn btn-secondary';
                viewBtn.textContent = 'View receipt';
                viewBtn.addEventListener('click', () => this.viewReceipt(o.id));
                actions.appendChild(viewBtn);

                // Cancel button if allowed (allow until and including 'ready')
                if (o.status === 'placed' || o.status === 'preparing' || o.status === 'ready') {
                    const cancelBtn = document.createElement('button');
                    cancelBtn.className = 'btn btn-danger';
                    cancelBtn.textContent = 'Cancel Order';
                    cancelBtn.style.cssText = 'background:#c0392b; color:#fff; border:none; padding:8px 12px;';
                    cancelBtn.addEventListener('click', async () => {
                        if (!confirm('Are you sure you want to cancel this order?')) return;
                        try {
                            await updateOrderStatus(o.id, 'cancelled');
                            await this.loadOrders();
                            this.loadCurrentOrder();
                            this.displayOrderHistory();
                        } catch (err) { console.error('Error cancelling order', err); alert('Failed to cancel order.'); }
                    });
                    actions.appendChild(cancelBtn);
                }

                // If picked up allow confirm received
                if (o.status === 'pickedup') {
                    const recvBtn = document.createElement('button');
                    recvBtn.className = 'btn btn-primary';
                    recvBtn.textContent = 'Confirm Received';
                    recvBtn.addEventListener('click', async () => {
                        if (!confirm('Confirm you received the order? This will mark the order as delivered.')) return;
                        try {
                            await updateOrderStatus(o.id, 'delivered');
                            await this.loadOrders();
                            this.loadCurrentOrder();
                            this.displayOrderHistory();
                        } catch (err) { console.error('Error confirming received', err); alert('Failed to update order.'); }
                    });
                    actions.appendChild(recvBtn);
                }

                // Assemble
                header.appendChild(statusBadge);
                card.appendChild(header);
                card.appendChild(details);
                card.appendChild(delivery);
                // append estimated note before actions/buttons
                card.appendChild(estNote);
                card.appendChild(actions);

                activeContainer.appendChild(card);
            });
            // Append the portrait container to the tracking section
            trackingSection.appendChild(activeContainer);

            // After rendering all active orders, render order history below
            const historyWrapper = document.createElement('div');
            historyWrapper.className = 'order-history';
            historyWrapper.innerHTML = '<h2>Order History</h2><div id="order-history-list"></div>';
            trackingSection.appendChild(historyWrapper);

            // Populate history (uses existing method)
            this.displayOrderHistory();
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
        
        // (Removed legacy 'completed' button) — terminal state is 'delivered'
        // Add received button if picked up
        this.addReceivedButton();
        // Add cancel button if order still cancellable
        this.addCancelButton();
        // Add view receipt button for current order
        this.addViewReceiptButton();
    }

    // Adds a Cancel button when the order is still cancellable.
    // Cancellation is allowed up to and including 'ready' (customer can cancel while order is Ready for Pickup),
    // but not once it's 'pickedup', 'delivered', 'completed', or 'cancelled'.
    addCancelButton() {
        if (!this.currentOrder) return;

        const status = this.currentOrder.status;

        // Determine cancellable statuses: allow cancel while order is placed, preparing, or ready
        const cancellable = (status === 'placed' || status === 'preparing' || status === 'ready');

        // If not cancellable, remove any existing cancel button and exit
        const existing = document.getElementById('cancel-order-btn');
        if (!cancellable) {
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
            const existingContainer = document.querySelector('.cancel-button-container');
            if (existingContainer && existingContainer.parentNode) existingContainer.parentNode.removeChild(existingContainer);
            return;
        }

        // Avoid adding duplicate
        if (existing) return;

        const deliveryInfo = document.querySelector('.delivery-info');
        if (!deliveryInfo) return;

        // ensure estimated delivery note is present before buttons
        try {
            if (!deliveryInfo.querySelector('.estimated-delivery-note')) {
                const en = document.createElement('div');
                en.className = 'estimated-delivery-note';
                en.style.cssText = 'margin-top:8px; font-size:0.95rem; color:var(--muted-color,#666);';
                en.textContent = 'Estimated Delivery: 3-7 days.';
                deliveryInfo.appendChild(en);
            }
        } catch(e) {}

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'cancel-button-container';
        buttonContainer.style.cssText = 'margin-top: 12px; text-align: center;';

        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-order-btn';
        cancelBtn.className = 'btn btn-danger';
        cancelBtn.textContent = 'Cancel Order';
        cancelBtn.style.cssText = 'padding: 10px 20px; font-size: 14px; background:#c0392b; color:#fff; border:none; cursor:pointer;';

        cancelBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;

            try {
                // Update status via central helper
                await updateOrderStatus(this.currentOrder.id, 'cancelled');

                // Update local object and timestamp
                this.currentOrder.status = 'cancelled';
                this.currentOrder.cancelledTime = new Date().toISOString();

                // Persist change
                const orders = await getOrders();
                const idx = orders.findIndex(o => String(o.id) === String(this.currentOrder.id));
                if (idx !== -1) {
                    orders[idx] = this.currentOrder;
                    await saveOrdersToStorage(orders);
                }

                alert('Your order has been cancelled.');

                // Refresh UI
                this.currentOrder = null;
                await this.loadOrders();
                this.showNoOrdersMessage();
                this.displayOrderHistory();
            } catch (err) {
                console.error('Error cancelling order:', err);
                alert('Failed to cancel order. Please try again.');
            }
        });

        buttonContainer.appendChild(cancelBtn);
        deliveryInfo.parentNode.insertBefore(buttonContainer, deliveryInfo.nextSibling);
    }

    addViewReceiptButton() {
        if (!this.currentOrder) return;
        // Avoid duplicate
        if (document.getElementById('view-receipt-btn')) return;

        const deliveryInfo = document.querySelector('.delivery-info');
        if (!deliveryInfo) return;

        // ensure estimated delivery note is present before buttons
        try {
            if (!deliveryInfo.querySelector('.estimated-delivery-note')) {
                const en = document.createElement('div');
                en.className = 'estimated-delivery-note';
                en.style.cssText = 'margin-top:8px; font-size:0.95rem; color:var(--muted-color,#666);';
                en.textContent = 'Estimated Delivery: 3-7 days.';
                deliveryInfo.appendChild(en);
            }
        } catch(e) {}

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

    // legacy completed button removed; terminal state is 'delivered'

        // When order is 'pickedup', allow customer to mark as received -> delivered
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
            if (!confirm('Confirm you received the order? This will mark the order as delivered.')) return;

            try {
                // Mark delivered
                await updateOrderStatus(this.currentOrder.id, 'delivered');

                // Update local object and timestamps
                this.currentOrder.status = 'delivered';
                this.currentOrder.deliveredTime = new Date().toISOString();

                // Persist change
                const orders = await getOrders();
                const orderIndex = orders.findIndex(o => String(o.id) === String(this.currentOrder.id));
                if (orderIndex !== -1) {
                    orders[orderIndex] = this.currentOrder;
                    await saveOrdersToStorage(orders);
                }

                alert('Order marked as delivered. Thank you!');

                // Refresh UI
                this.currentOrder = null;
                await this.loadOrders();
                this.showNoOrdersMessage();
                this.displayOrderHistory();
            } catch (err) {
                console.error('Error marking order as delivered from received button:', err);
                alert('Failed to mark order as delivered. Please try again.');
            }
        });

        buttonContainer.appendChild(recvBtn);
        deliveryInfo.parentNode.insertBefore(buttonContainer, deliveryInfo.nextSibling);
    }

    async completeOrder() {
        if (!this.currentOrder) return;
        
        try {
            // Update order status to delivered
            await updateOrderStatus(this.currentOrder.id, 'delivered');
            
            // Mark delivered time
            this.currentOrder.status = 'delivered';
            this.currentOrder.deliveredTime = new Date().toISOString();
            
            // Save updated orders
            const orders = await getOrders();
            // tolerate id type differences (string vs number)
            const orderIndex = orders.findIndex(o => String(o.id) === String(this.currentOrder.id));
            if (orderIndex !== -1) {
                orders[orderIndex] = this.currentOrder;
                await saveOrdersToStorage(orders);
            }
            
            alert('Order marked as delivered! Thank you for your order.');
            
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

    async displayOrderHistory() {
        const completedList = document.getElementById('delivered-orders-list');
        const cancelledList = document.getElementById('cancelled-orders-list');
        if (!completedList || !cancelledList) return;

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

        // Sort orders by most recent first
        const sortedOrders = userOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));

        let completedHTML = '';
        let cancelledHTML = '';
        sortedOrders.forEach(order => {
            if (order.status === 'delivered') {
                completedHTML += this.createOrderHistoryCard(order, true);
            } else if (order.status === 'cancelled') {
                cancelledHTML += this.createOrderHistoryCard(order, false);
            }
            // other terminal statuses are ignored
        });

        completedList.innerHTML = completedHTML || '<p class="no-orders">No delivered orders yet.</p>';
        cancelledList.innerHTML = cancelledHTML || '<p class="no-orders">No cancelled orders.</p>';

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
        const statusClass = order.status === 'cancelled' ? 'cancelled' : order.status === 'delivered' ? 'delivered' : (order.status || 'other');
        const statusText = order.status === 'cancelled' ? 'Cancelled' : order.status === 'delivered' ? 'Delivered' : (order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Unknown');
        
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
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="order-total">₱${total.toFixed(2)}</span>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn btn-small" onclick="viewReceipt('${order.id}')">View receipt</button>
                        ${ order.status === 'delivered' ? `<button class="btn btn-small" onclick="window.__deliveryTracker.openReviewModal('${order.id}')">Add Review</button>` : '' }
                    </div>
                </div>
            </div>
        `;
    }

    // Build and show the review modal for a delivered order
    async openReviewModal(orderId) {
        try {
            const orders = await getOrders();
            const order = (orders || []).find(o => String(o.id) === String(orderId));
            if (!order) return alert('Order not found');
            const currentUser = getCurrentUser();
            if (!currentUser || currentUser.username !== order.customer) return alert('You can only review your own orders.');

            // only allow reviews for delivered orders
            if (order.status !== 'delivered') return alert('Reviews are only allowed for delivered orders.');

            const modal = document.getElementById('reviewModal');
            const body = document.getElementById('reviewModalBody');
            const title = document.getElementById('reviewModalTitle');
            title.textContent = `Add reviews for Order ${order.id}`;
            body.innerHTML = '';

            // For each product, add a row with clickable stars and comment
            (order.items || []).forEach((it, idx) => {
                const row = document.createElement('div');
                row.className = 'review-row';
                row.style.cssText = 'margin-bottom:12px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.05);';

                const label = document.createElement('div');
                label.textContent = `${it.quantity}x ${it.name}`;
                label.style.fontWeight = '600';

                const stars = document.createElement('div');
                stars.className = 'review-stars';
                stars.style.cssText = 'display:inline-block; margin-top:6px;';
                // create 5 star spans
                for (let s = 1; s <= 5; s++) {
                    const span = document.createElement('span');
                    span.className = 'star muted';
                    span.style.cssText = 'font-size:20px; margin-right:6px;';
                    span.dataset.value = s;
                    span.textContent = '★';
                    // make clickable and keyboard accessible
                    span.tabIndex = 0;
                    span.setAttribute('role','button');
                    const setRating = function(el){
                        const parent = el.parentNode;
                        const val = Number(el.dataset.value);
                        Array.from(parent.children).forEach(ch => {
                            const v = Number(ch.dataset.value);
                            if (v <= val) { ch.classList.remove('muted'); ch.classList.add('star'); }
                            else { ch.classList.remove('star'); ch.classList.add('muted'); }
                        });
                        parent.dataset.rating = val;
                    };
                    span.addEventListener('click', function(){ setRating(this); });
                    span.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setRating(this); } });
                    stars.appendChild(span);
                }

                const comment = document.createElement('textarea');
                comment.placeholder = 'Optional comment';
                comment.style.cssText = 'width:100%; margin-top:8px; height:60px; padding:8px;';

                // hidden inputs to identify product and order
                row.appendChild(label);
                row.appendChild(stars);
                row.appendChild(comment);

                // attach product meta
                row.dataset.product = it.name;
                body.appendChild(row);
            });

            // Rider review row
            if (order.assignedRider) {
                const rRow = document.createElement('div');
                rRow.className = 'review-row';
                rRow.style.cssText = 'margin-top:8px; padding:8px 0;';
                const rLabel = document.createElement('div');
                rLabel.textContent = `Rider: ${order.assignedRider}`;
                rLabel.style.fontWeight = '600';
                const rStars = document.createElement('div');
                rStars.className = 'review-stars rider';
                rStars.style.cssText = 'display:inline-block; margin-top:6px;';
                for (let s=1;s<=5;s++){
                    const span = document.createElement('span');
                    span.className = 'star muted';
                    span.style.cssText = 'font-size:20px; margin-right:6px;';
                    span.dataset.value = s;
                    span.textContent = '★';
                    span.tabIndex = 0;
                    span.setAttribute('role','button');
                    span.addEventListener('click', function(){
                        const parent = this.parentNode; const val = Number(this.dataset.value);
                        Array.from(parent.children).forEach(ch => { const v=Number(ch.dataset.value); if (v<=val){ ch.classList.remove('muted'); ch.classList.add('star'); } else { ch.classList.remove('star'); ch.classList.add('muted'); } });
                        parent.dataset.rating = val;
                    });
                    span.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.click(); } });
                    rStars.appendChild(span);
                }
                const rComment = document.createElement('textarea');
                rComment.placeholder = 'Optional comment for rider';
                rComment.style.cssText = 'width:100%; margin-top:8px; height:60px; padding:8px;';
                rRow.appendChild(rLabel);
                rRow.appendChild(rStars);
                rRow.appendChild(rComment);
                rRow.dataset.rider = order.assignedRider;
                body.appendChild(rRow);
            }

            // Prefill any existing reviews for this order (product reviews and rider reviews)
            try {
                const existing = (typeof loadReviews === 'function') ? await loadReviews() : [];
                const existingRiders = (typeof loadRiderReviews === 'function') ? await loadRiderReviews() : [];
                const rowsNow = Array.from(body.querySelectorAll('.review-row'));
                rowsNow.forEach(r => {
                    if (r.dataset.product) {
                        const rev = (existing || []).find(x => String(x.orderId) === String(order.id) && x.product === r.dataset.product && x.customer === currentUser.username);
                        if (rev) {
                            const starsEl = r.querySelector('.review-stars');
                            if (starsEl) {
                                starsEl.dataset.rating = rev.rating;
                                Array.from(starsEl.children).forEach(ch => {
                                    const v = Number(ch.dataset.value);
                                    if (v <= Number(rev.rating)) { ch.classList.remove('muted'); ch.classList.add('star'); }
                                    else { ch.classList.remove('star'); ch.classList.add('muted'); }
                                });
                            }
                            const ta = r.querySelector('textarea'); if (ta) ta.value = rev.comment || '';
                        }
                    } else if (r.dataset.rider) {
                        const rrev = (existingRiders || []).find(x => String(x.orderId) === String(order.id) && x.rider === r.dataset.rider && x.customer === currentUser.username);
                        if (rrev) {
                            const starsEl = r.querySelector('.review-stars.rider');
                            if (starsEl) {
                                starsEl.dataset.rating = rrev.rating;
                                Array.from(starsEl.children).forEach(ch => {
                                    const v = Number(ch.dataset.value);
                                    if (v <= Number(rrev.rating)) { ch.classList.remove('muted'); ch.classList.add('star'); }
                                    else { ch.classList.remove('star'); ch.classList.add('muted'); }
                                });
                            }
                            const rta = r.querySelector('textarea'); if (rta) rta.value = rrev.comment || '';
                        }
                    }
                });
            } catch (e) { console.error('prefill reviews error', e); }

            // show modal
            modal.style.display = 'block';
            // attach order id to modal element
            modal.dataset.orderId = order.id;
        } catch (e) { console.error('openReviewModal error', e); alert('Unable to open review modal'); }
    }

    setupReviewModalHandlers() {
        // close, cancel, save
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('reviewModal');
            if (!modal) return;
            if (e.target && e.target.id === 'reviewModalClose') modal.style.display = 'none';
            if (e.target && e.target.id === 'reviewModalCancel') modal.style.display = 'none';
            if (e.target && e.target.id === 'reviewModalSave') {
                this.saveReviewsFromModal();
            }
        });
        // close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('reviewModal');
            if (!modal) return;
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    async saveReviewsFromModal() {
        try {
            const modal = document.getElementById('reviewModal');
            if (!modal) return;
            const orderId = modal.dataset.orderId;
            const rows = Array.from(document.querySelectorAll('#reviewModalBody .review-row'));
            const currentUser = getCurrentUser();
            if (!currentUser) return alert('Please login');

            for (const row of rows) {
                // product rows have data-product, rider row has data-rider
                if (row.dataset.product) {
                    const product = row.dataset.product;
                    const rating = Number(row.querySelector('.review-stars')?.dataset.rating) || 0;
                    const comment = row.querySelector('textarea')?.value || '';
                    if (rating > 0) {
                        if (typeof addReview === 'function') {
                            await addReview({ orderId, product, customer: currentUser.username, rating, comment, time: new Date().toISOString() });
                        }
                    }
                } else if (row.dataset.rider) {
                    const rider = row.dataset.rider;
                    const rating = Number(row.querySelector('.review-stars.rider')?.dataset.rating) || 0;
                    const comment = row.querySelector('textarea')?.value || '';
                    if (rating > 0) {
                        if (typeof addRiderReview === 'function') {
                            await addRiderReview({ orderId, rider, customer: currentUser.username, rating, comment, time: new Date().toISOString() });
                        }
                    }
                }
            }

            // close and refresh
            modal.style.display = 'none';
            await this.loadOrders();
            this.displayOrderHistory();
            alert('Your reviews have been saved. Thank you!');
        } catch (e) { console.error('saveReviewsFromModal error', e); alert('Failed to save reviews.'); }
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