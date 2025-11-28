/* Analytics with charts (Chart.js) */
(async function(){
    async function loadData(){
        const orders = await (window.loadOrders ? window.loadOrders() : (window.getOrders ? window.getOrders() : []));
        const menu = await (window.getMenuItems ? window.getMenuItems() : []);
        const users = await (window.loadUsers ? window.loadUsers() : []);
        // attempt to load reviews (product reviews) and rider reviews
        let reviews = [];
        let riderReviews = [];
        try {
            if (typeof window.loadReviews === 'function') {
                reviews = await window.loadReviews();
            } else if (orders && orders.length) {
                (orders || []).forEach(o => { try { (o.reviews || []).forEach(r => reviews.push(r)); } catch(e){} });
            }
            // rider reviews can be loaded via dedicated API or from orders
            if (typeof window.loadRiderReviews === 'function') {
                riderReviews = await window.loadRiderReviews();
            } else if (orders && orders.length) {
                (orders || []).forEach(o => { try { (o.riderReviews || []).forEach(r => riderReviews.push(r)); } catch(e){} });
            }
        } catch (e) { reviews = []; }

        return { orders: orders || [], menu: menu || [], users: users || [], reviews: reviews || [], riderReviews: riderReviews || [] };
    }

    function formatCurrency(n){ return Number(n || 0).toFixed(2); }

    function renderSummary(orders){
        const totalOrders = orders.length;
        const completed = orders.filter(o => o.status === 'delivered').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const revenue = orders.reduce((sum, o) => {
            if (o.status === 'cancelled') return sum;
            return sum + (Number(o.total || 0));
        }, 0);
        // compute average order: use non-cancelled orders as denominator so average reflects revenue-generating orders
        const nonCancelledCount = (orders || []).filter(o => (o.status || '').toLowerCase() !== 'cancelled').length || 0;
        const avgOrder = nonCancelledCount ? (revenue / nonCancelledCount) : 0;

        const totalOrdersEl = document.getElementById('stat-total-orders');
        const completedEl = document.getElementById('stat-completed');
        const cancelledEl = document.getElementById('stat-cancelled');
        const revenueEl = document.getElementById('stat-revenue');
        const avgOrderEl = document.getElementById('stat-avg-order');

        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (completedEl) completedEl.textContent = completed;
        if (cancelledEl) cancelledEl.textContent = cancelled;
        if (revenueEl) revenueEl.textContent = `₱${formatCurrency(revenue)}`;
        if (avgOrderEl) avgOrderEl.textContent = `₱${formatCurrency(avgOrder)}`;
    }

    function computeTopItems(orders){
        const counts = {};
        orders.forEach(o => {
            if (o.status === 'cancelled') return;
            (o.items || []).forEach(it => {
                counts[it.name] = (counts[it.name] || 0) + (it.quantity || 1);
            });
        });
        return Object.entries(counts).sort((a,b)=> b[1]-a[1]).slice(0,10);
    }

    function computeRevenueByDate(orders){
        // Aggregate revenue by order date (YYYY-MM-DD)
        const map = {};
        orders.forEach(o=>{
            if (o.status === 'cancelled') return;
            const d = new Date(o.orderTime || o.placedTime || Date.now());
            const key = d.toISOString().slice(0,10);
            map[key] = (map[key] || 0) + (Number(o.total || 0));
        });
        const entries = Object.entries(map).sort((a,b)=> a[0].localeCompare(b[0]));
        return entries;
    }

    let topChart = null;
    let revenueChart = null;
    let productRatingsChart = null;
    let riderRatingsChart = null;

    function getChartColors() {
        const docStyle = getComputedStyle(document.documentElement);
        const labelColor = docStyle.getPropertyValue('--text-color')?.trim() || '#1b1b1b';
        const primary = docStyle.getPropertyValue('--primary-color')?.trim() || 'rgba(60,141,13,1)';
        const secondary = docStyle.getPropertyValue('--secondary-color')?.trim() || 'rgba(166,124,0,1)';
        const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const axisColor = labelColor;
        return { labelColor: axisColor, gridColor, primary, secondary, isDark };
    }

    function hexToRgba(col, alpha){
        try {
            col = (col || '').trim();
            if (!col) return `rgba(0,0,0,${alpha})`;
            if (col.startsWith('rgba') || col.startsWith('rgb')) {
                return col.replace(/rgba?\(([^)]+)\)/, (m, parts) => {
                    const nums = parts.split(',').map(s=>s.trim());
                    return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
                });
            }
            if (col[0] === '#') {
                const hex = col.substring(1);
                const bigint = parseInt(hex.length===3 ? hex.split('').map(c=>c+c).join('') : hex, 16);
                const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255;
                return `rgba(${r},${g},${b},${alpha})`;
            }
            return `rgba(0,0,0,${alpha})`;
        } catch(e) { return `rgba(0,0,0,${alpha})`; }
    }

    function renderCharts(orders){
        const top = computeTopItems(orders);
        const revenueEntries = computeRevenueByDate(orders);

        // Top items bar chart
        const topItemsCtx = document.getElementById('chart-top-items').getContext('2d');
        const labels = top.map(t=>t[0]);
        const data = top.map(t=>t[1]);
        const colors = getChartColors();
        const commonOptions = (opts = {}) => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: Object.assign({
                    backgroundColor: colors.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                    titleColor: colors.labelColor,
                    bodyColor: colors.labelColor,
                    borderColor: colors.gridColor,
                    borderWidth: 1,
                    padding: 8,
                }, opts.tooltip || {}),
            },
            layout: { padding: { top: 6, bottom: 18, left: 6, right: 6 } },
            scales: Object.assign({}, opts.scales || {})
        });
        if (topChart) topChart.destroy();
        topChart = new Chart(topItemsCtx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Quantity sold', data, backgroundColor: colors.primary }] },
            options: Object.assign(commonOptions({ tooltip: { callbacks: { label: (ctx) => `Quantity sold: ${ctx.parsed.y}` } } }), {
                scales: { x: { ticks: { color: colors.labelColor, autoSkip: true, maxRotation: 45, minRotation: 0, padding: 6 }, grid: { color: colors.gridColor } }, y: { beginAtZero:true, ticks: { color: colors.labelColor }, grid: { color: colors.gridColor } } }
            })
        });

        // Revenue line chart
        const revCtx = document.getElementById('chart-revenue').getContext('2d');
        const revLabels = revenueEntries.map(r=>r[0]);
        const revData = revenueEntries.map(r=> r[1]);
        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(revCtx, {
            type: 'line',
            data: { labels: revLabels, datasets: [{ label: 'Revenue', data: revData, borderColor: colors.secondary, backgroundColor: hexToRgba(colors.secondary,0.12), tension:0.25 }] },
            options: Object.assign(commonOptions({ tooltip: { callbacks: { label: (ctx) => `₱${formatCurrency(ctx.parsed.y)}` } } }), { scales:{ x: { ticks: { color: colors.labelColor, autoSkip: true, maxRotation: 45, minRotation: 0, padding: 6 }, grid: { color: colors.gridColor } }, y: { beginAtZero:true, ticks: { color: colors.labelColor }, grid: { color: colors.gridColor } } } })
        });

        // end renderCharts
    }

    function renderRatingsCharts(menu, reviews, users, riderReviews) {
        // Build a small helper to reuse common chart options
        const colors = getChartColors();
        const optionsFor = (extra = {}) => Object.assign({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: Object.assign({
                    backgroundColor: colors.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                    titleColor: colors.labelColor,
                    bodyColor: colors.labelColor,
                    borderColor: colors.gridColor,
                    borderWidth: 1,
                    padding: 8
                }, (extra.tooltip || {}))
            },
            layout: { padding: { top: 6, bottom: 18, left: 6, right: 6 } },
        }, extra.common || {});

        // Product ratings chart (avg rating)
        try {
            const prod = computeProductRatings(menu, reviews).filter(p => p.avg != null);
            // sort from highest average rating to lowest; tie-breaker: highest count
            prod.sort((a,b) => {
                if ((b.avg||0) !== (a.avg||0)) return (b.avg||0) - (a.avg||0);
                return (b.count||0) - (a.count||0);
            });
            const prodLabels = prod.map(p => p.name);
            const prodData = prod.map(p => Number(p.avg));
            const pEl = document.getElementById('chart-product-ratings');
            const pCtx = pEl ? pEl.getContext('2d') : null;
                if (productRatingsChart) productRatingsChart.destroy();
                if (pCtx) {
                    // detect Chart.js major version to choose horizontal rendering strategy
                    let chartType = 'bar';
                    let chartOptions = optionsFor({ tooltip: { callbacks: { label: (ctx) => `Average rating: ${ctx.parsed && (ctx.parsed.x != null ? ctx.parsed.x : ctx.parsed.y) } / 5` } } });
                    try {
                        const ver = (Chart && Chart.version) ? String(Chart.version) : null;
                        const major = ver ? parseInt(ver.split('.')[0], 10) : null;
                        if (major && major < 3) {
                            // Chart.js v2: use 'horizontalBar' type
                            chartType = 'horizontalBar';
                            // v2 uses scales: { xAxes: [...], yAxes: [...] }
                            chartOptions.scales = { xAxes: [{ ticks: { beginAtZero: true, max: 5, stepSize: 1, fontColor: colors.labelColor }, gridLines: { color: colors.gridColor } }], yAxes: [{ ticks: { fontColor: colors.labelColor }, gridLines: { color: colors.gridColor } }] };
                        } else {
                            // Chart.js v3+: use indexAxis:'y' and updated scales
                            chartType = 'bar';
                            chartOptions = Object.assign(chartOptions, { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 5, ticks: { stepSize: 1, color: colors.labelColor }, grid: { color: colors.gridColor } }, y: { ticks: { color: colors.labelColor }, grid: { color: colors.gridColor } } } });
                        }
                    } catch (e) {
                        // fallback to indexAxis approach
                        chartOptions = Object.assign(chartOptions, { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 5, ticks: { stepSize: 1, color: colors.labelColor }, grid: { color: colors.gridColor } }, y: { ticks: { color: colors.labelColor }, grid: { color: colors.gridColor } } } });
                    }
                    console.debug('analytics: product ratings - Chart.version=', (Chart && Chart.version), 'type=', chartType, 'labels=', prodLabels, 'data=', prodData);
                    productRatingsChart = new Chart(pCtx, {
                        type: chartType,
                        data: { labels: prodLabels, datasets: [{ label: 'Average Rating', data: prodData, backgroundColor: colors.primary }] },
                        options: chartOptions
                    });
                }
        } catch(e){ console.error('Failed to render product ratings chart', e); }

        // Rider ratings chart
        try {
            const riders = computeRiderRatings(users, riderReviews).filter(r => r.avg != null);
            // sort riders by descending average rating, then by review count
            riders.sort((a,b) => {
                if ((b.avg||0) !== (a.avg||0)) return (b.avg||0) - (a.avg||0);
                return (b.count||0) - (a.count||0);
            });
            const rLabels = riders.map(r => {
                const user = (users||[]).find(u=> u.username === r.username) || {};
                return user.fullName || r.username;
            });
            const rData = riders.map(r => Number(r.avg));
            const rEl = document.getElementById('chart-rider-ratings');
            const rCtx = rEl ? rEl.getContext('2d') : null;
            if (riderRatingsChart) riderRatingsChart.destroy();
            if (rCtx) {
                // detect Chart.js version to render horizontal bars appropriately
                let rChartType = 'bar';
                let rChartOptions = optionsFor({ tooltip: { callbacks: { label: (ctx) => `Average rating: ${ctx.parsed && (ctx.parsed.x != null ? ctx.parsed.x : ctx.parsed.y) } / 5` } } });
                try {
                    const ver = (Chart && Chart.version) ? String(Chart.version) : null;
                    const major = ver ? parseInt(ver.split('.')[0], 10) : null;
                    if (major && major < 3) {
                        rChartType = 'horizontalBar';
                        rChartOptions.scales = { xAxes: [{ ticks: { beginAtZero: true, max: 5, stepSize: 1, fontColor: colors.labelColor }, gridLines: { color: colors.gridColor } }], yAxes: [{ ticks: { fontColor: colors.labelColor }, gridLines: { color: colors.gridColor } }] };
                    } else {
                        rChartType = 'bar';
                        rChartOptions = Object.assign(rChartOptions, { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 5, ticks: { stepSize: 1, color: colors.labelColor }, grid: { color: colors.gridColor } }, y: { ticks: { color: colors.labelColor }, grid: { color: colors.gridColor } } } });
                    }
                } catch(e) {
                    rChartOptions = Object.assign(rChartOptions, { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 5, ticks: { stepSize: 1, color: colors.labelColor }, grid: { color: colors.gridColor } }, y: { ticks: { color: colors.labelColor }, grid: { color: colors.gridColor } } } });
                }
                console.debug('analytics: rider ratings - Chart.version=', (Chart && Chart.version), 'type=', rChartType, 'labels=', rLabels, 'data=', rData);
                riderRatingsChart = new Chart(rCtx, {
                    type: rChartType,
                    data: { labels: rLabels, datasets: [{ label: 'Average Rating', data: rData, backgroundColor: colors.secondary }] },
                    options: rChartOptions
                });
            }
        } catch(e){ console.error('Failed to render rider ratings chart', e); }
    }

    function renderRiderPerformance(orders, users){
        const riders = (users || []).filter(u=> u.role === 'rider');
        const counts = {};
        (orders || []).forEach(o => {
            if (!o.assignedRider) return;
            if (o.status === 'cancelled') return;
            counts[o.assignedRider] = (counts[o.assignedRider] || 0) + 1;
        });
        const container = document.getElementById('rider-performance');
        container.innerHTML = '';
        if (!riders || riders.length === 0) {
            container.innerHTML = '<p>No riders registered</p>';
            return;
        }
        const ul = document.createElement('ul');
        riders.forEach(r => {
            const li = document.createElement('li');
            const c = counts[r.username] || 0;
            li.textContent = `${r.fullName || r.username} — ${c} deliveries assigned/delivered`;
            ul.appendChild(li);
        });
        container.appendChild(ul);
    }

    function computeRiderRatings(users, riderReviews) {
        // Build map { riderUsername: { sum, count } }
        const map = {};
        (users || []).forEach(u => { if ((u.role||'') === 'rider') map[u.username] = { sum:0, count:0 }; });
        (riderReviews || []).forEach(rr => {
            if (!rr || !rr.rider) return;
            if (!map[rr.rider]) map[rr.rider] = { sum:0, count:0 };
            const v = Number(rr.rating || 0);
            if (!isNaN(v) && v > 0) { map[rr.rider].sum += v; map[rr.rider].count += 1; }
        });
        // round averages to nearest integer (ratings only 1..5)
        return Object.entries(map).map(([username, s]) => ({ username, avg: s.count ? Math.min(5, Math.max(1, Math.round(s.sum / s.count))) : null, count: s.count }));
    }

    // removed table-based rider ratings; charts are used instead (renderRatingsCharts)

    function computeProductRatings(menu, reviews) {
        const map = {};
        (menu || []).forEach(m => { map[m.name] = { sum:0, count:0 }; });
        (reviews || []).forEach(r => {
            if (!r || !r.product) return;
            if (!map[r.product]) map[r.product] = { sum:0, count:0 };
            const v = Number(r.rating || 0);
            if (!isNaN(v) && v > 0) { map[r.product].sum += v; map[r.product].count += 1; }
        });
        // produce array of { name, avg, count }
        // round averages to nearest integer (ratings only 1..5)
        return Object.entries(map).map(([name, s]) => ({ name, avg: s.count ? Math.min(5, Math.max(1, Math.round(s.sum / s.count))) : null, count: s.count }));
    }

    // removed table-based product ratings; charts are used instead (renderRatingsCharts)

    // Boot
    const data = await loadData();
    renderSummary(data.orders);
    renderCharts(data.orders);
    renderRiderPerformance(data.orders, data.users);
    // render charts for ratings as graphs as well
    try { renderRatingsCharts(data.menu, data.reviews, data.users, data.riderReviews); } catch(e) { console.error('Failed to render ratings charts', e); }

    // Auto-refresh on storage changes so admin sees updates across tabs
    window.addEventListener('storage', async (e)=>{
        if (['kitchencraft_orders','kitchencraft_menu','kitchencraft_users','kitchencraft_reviews','kitchencraft_rider_reviews'].includes(e.key)){
            const d = await loadData();
            renderSummary(d.orders);
            renderCharts(d.orders);
            renderRiderPerformance(d.orders, d.users);
                        // rating tables removed; update charts instead
                        try { renderRatingsCharts(d.menu, d.reviews, d.users, d.riderReviews); } catch(e) {}
        }
    });

    // Re-style charts when theme changes (data-theme attribute on <html>) so dark-mode charts are readable
    const themeObserver = new MutationObserver((mutations)=>{
        let changed = false;
        mutations.forEach(m => { if (m.type === 'attributes' && m.attributeName === 'data-theme') changed = true; });
        if (changed) {
            // re-apply chart colors from CSS variables
            try {
                // only update if charts exist
                if (topChart || revenueChart || productRatingsChart || riderRatingsChart) {
                    // re-render charts with current orders/menu/users data
                    const d = loadData().then(d => {
                        try { renderCharts(d.orders); } catch(e) {}
                        try { renderRatingsCharts(d.menu, d.reviews, d.users, d.riderReviews); } catch(e) {}
                    }).catch(()=>{});
                }
            } catch(e) {}
        }
    });
    try { themeObserver.observe(document.documentElement, { attributes: true }); } catch(e) {}
})();
