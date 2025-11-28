// Simple localStorage-backed store for KitchenCraft
// Exposes functions used by the frontend to load/save users, menu, carts, and orders.
(function(){
    const KEY_USERS = 'kitchencraft_users';
    const KEY_USER_REQUESTS = 'kitchencraft_user_requests';
    const KEY_MENU = 'kitchencraft_menu';
    const KEY_ORDERS = 'kitchencraft_orders';
    const KEY_REVIEWS = 'kitchencraft_reviews';
    const KEY_RIDER_REVIEWS = 'kitchencraft_rider_reviews';

    // Initial seed data for products (Minecraft-themed kitchen items)
    const defaultMenu = [
        // Essentials (more affordable prices)
        {
            category: 'essentials',
            name: 'Chefs Knife',
            sizes: { '6"': 160, '8"': 240, '10"': 320 },
            image: '/static/images/knife.png',
            stock: 12
        },
        { category: 'essentials', name: 'Wood Cutting Board', price: 180, image: '/static/images/cuttingboard.png', stock: 8 },
        {
            category: 'essentials',
            name: 'Nonstick Frying Pan',
            sizes: { '8"': 180, '10"': 240, '12"': 300 },
            image: '/static/images/fryingpan.png',
            stock: 6
        },
        { category: 'essentials', name: 'Measuring Cups (set)', price: 140, image: '/static/images/measuringcups.png', stock: 10 },
        { category: 'essentials', name: 'Spoons (set)', price: 100, image: '/static/images/spoons.png', stock: 14 },

        // Small Appliances (reduced)
        { category: 'appliances', name: 'Air Fryer', price: 900, image: '/static/images/airfryer.png', stock: 4 },
        { category: 'appliances', name: 'Blender', price: 900, image: '/static/images/blender.png', stock: 5 },
        { category: 'appliances', name: 'Electric Kettle', price: 600, image: '/static/images/kettle.png', stock: 8 },
        { category: 'appliances', name: 'Toaster Oven', price: 900, image: '/static/images/toasteroven.png', stock: 3 },
        { category: 'appliances', name: 'Coffee Maker', price: 900, image: '/static/images/coffeemaker.png', stock: 6 },

        // Gadgets & Tools
        { category: 'gadgets', name: 'Digital Instant-Read Thermometer', price: 340, image: '/static/images/thermometer.png', stock: 9 },
        { category: 'gadgets', name: 'Tongs', price: 88, image: '/static/images/tong.png', stock: 16 },
        { category: 'gadgets', name: 'Whisk', price: 72, image: '/static/images/whisk.png', stock: 12 },
        { category: 'gadgets', name: 'Microplane Zester', price: 240, image: '/static/images/zester.png', stock: 7 },
        { category: 'gadgets', name: 'Vegetable Peeler', price: 56, image: '/static/images/peeler.png', stock: 20 },

        // Storage & Cleaning
        {
            category: 'storage',
            name: 'Airtight Food Storage Container Set',
            sizes: { 'Small': 140, 'Medium': 200, 'Large': 280 },
            image: '/static/images/container.png',
            stock: 10
        },
        {
            category: 'storage',
            name: 'Glass Storage Jars',
            sizes: { 'Small': 100, 'Medium': 140, 'Large': 180 },
            image: '/static/images/jar.png',
            stock: 12
        },
        { category: 'storage', name: 'Dish Drying Rack', price: 260, image: '/static/images/rack.png', stock: 6 },
        { category: 'storage', name: 'Sponge', price: 24, image: '/static/images/sponge.png', stock: 40 }
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
            email: 'valenciafaithmaramot05@gmail.com',
            password: 'peyt1105',
            role: 'customer',
            address: 'San Pedro, Bauan, Batangas',
            contactNumber: '09938564676'
        },
        {
            fullName: 'Anna Reyes',
            username: 'anna',
            email: 'anna.reyes@example.com',
            password: 'anna123',
            role: 'customer',
            address: 'Brgy. Mabini, Batangas',
            contactNumber: '09170000003'
        },
        {
            fullName: 'Benito Garcia',
            username: 'ben',
            email: 'ben.garcia@example.com',
            password: 'ben123',
            role: 'customer',
            address: 'Brgy. San Isidro, Batangas',
            contactNumber: '09170000004'
        },
        {
            fullName: 'Carla Mendoza',
            username: 'carla',
            email: 'carla.mendoza@example.com',
            password: 'carla123',
            role: 'customer',
            address: 'Brgy. San Roque, Batangas',
            contactNumber: '09170000005'
        },
        {
            fullName: 'Diego Ramos',
            username: 'diego',
            email: 'diego.ramos@example.com',
            password: 'diego123',
            role: 'customer',
            address: 'Brgy. Maligaya, Batangas',
            contactNumber: '09170000006'
        },
        {
            fullName: 'Emma Lopez',
            username: 'emma',
            email: 'emma.lopez@example.com',
            password: 'emma123',
            role: 'customer',
            address: 'Brgy. San Luis, Batangas',
            contactNumber: '09170000007'
        }
        ,
        {
            fullName: 'Ramon Santos',
            username: 'rider1',
            email: 'ramon@gmail.com',
            password: 'riderpass1',
            role: 'rider',
            address: 'Local Depot',
            contactNumber: '09170000001'
        },
        {
            fullName: 'Liza Cruz',
            username: 'rider2',
            email: 'liza@gmail.com',
            password: 'riderpass2',
            role: 'rider',
            address: 'Rider Hub',
            contactNumber: '09170000002'
        },
        
    ];

    const defaultOrders = [
        {
            id: 'FC1001',
            customer: 'faith',
            items: [
                { name: 'Chefs Knife', price: 160, quantity: 1 },
                { name: 'Measuring Cups (set)', price: 140, quantity: 1 }
            ],
            subtotal: 300,
            shippingFee: 15,
            total: 390,
            status: 'delivered',
            orderTime: new Date().toISOString(),
            placedTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
            deliveredTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
            assignedRider: 'rider1',
            deliveryAddress: 'San Pedro, Bauan, Batangas',
            contactNumber: '09938564676',
            reviews: [
                { id: 'R-FC1001-1', orderId: 'FC1001', product: 'Chefs Knife', customer: 'faith', rating: 5, comment: 'Great balance and sharpness — love it!', time: new Date(Date.now() - 1000*60*60*24*2).toISOString() },
                { id: 'R-FC1001-2', orderId: 'FC1001', product: 'Measuring Cups (set)', customer: 'faith', rating: 4, comment: 'Handy set, good quality for the price.', time: new Date(Date.now() - 1000*60*60*24*2).toISOString() }
            ],
            riderReviews: [
                { id: 'RR-FC1001-1', orderId: 'FC1001', rider: 'rider1', customer: 'faith', rating: 5, comment: 'Rider was punctual and courteous.', time: new Date(Date.now() - 1000*60*60*24*2).toISOString() }
            ]
        },
        {
            id: 'FC1002',
            customer: 'faith',
            items: [ { name: 'Air Fryer', price: 900, quantity: 1 } ],
            subtotal: 900,
            shippingFee: 30,
            total: 930,
            status: 'cancelled',
            orderTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
            placedTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
            cancelledTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
            assignedRider: 'rider1',
            deliveryAddress: 'San Pedro, Bauan, Batangas',
            contactNumber: '09938564676',
            reviews: [],
            riderReviews: []
        },
        {
            id: 'FC1003', customer: 'ben', items: [ { name: 'Blender', price: 900, quantity: 1 } ],
            subtotal: 900, shippingFee: 15, total: 915, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*2).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*2).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*1).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1003-1', orderId: 'FC1003', product: 'Blender', customer: 'ben', rating: 4, comment: 'Powerful enough for smoothies.', time: new Date(Date.now() - 1000*60*60*24*1).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1003-1', orderId: 'FC1003', rider: 'rider2', customer: 'ben', rating: 4, comment: 'Delivered quickly.', time: new Date(Date.now() - 1000*60*60*24*1).toISOString() } ]
        },
        {
            id: 'FC1004', customer: 'carla', items: [ { name: 'Chefs Knife', price: 240, quantity: 1 }, { name: 'Tongs', price: 88, quantity: 2 } ],
            subtotal: 416, shippingFee: 15, total: 431, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*4).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*4).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*3).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1004-1', orderId: 'FC1004', product: 'Chefs Knife', customer: 'carla', rating: 5, comment: 'Excellent knife.', time: new Date(Date.now() - 1000*60*60*24*3).toISOString() }, { id: 'R-FC1004-2', orderId: 'FC1004', product: 'Tongs', customer: 'carla', rating: 4, comment: 'Good grip.', time: new Date(Date.now() - 1000*60*60*24*3).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1004-1', orderId: 'FC1004', rider: 'rider1', customer: 'carla', rating: 5, comment: 'Friendly and careful handling.', time: new Date(Date.now() - 1000*60*60*24*3).toISOString() } ]
        },
        {
            id: 'FC1005', customer: 'faith', items: [ { name: 'Nonstick Frying Pan', price: 240, quantity: 1 } ],
            subtotal: 240, shippingFee: 15, total: 255, status: 'cancelled',
            orderTime: new Date(Date.now() - 1000*60*60*24*6).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*6).toISOString(), cancelledTime: new Date(Date.now() - 1000*60*60*24*5).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [], riderReviews: []
        },
        {
            id: 'FC1006', customer: 'diego', items: [ { name: 'Digital Instant-Read Thermometer', price: 340, quantity: 1 }, { name: 'Whisk', price: 72, quantity: 1 } ],
            subtotal: 412, shippingFee: 15, total: 427, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*8).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*8).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*7).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1006-1', orderId: 'FC1006', product: 'Digital Instant-Read Thermometer', customer: 'diego', rating: 5, comment: 'Accurate and fast.', time: new Date(Date.now() - 1000*60*60*24*6).toISOString() }, { id: 'R-FC1006-2', orderId: 'FC1006', product: 'Whisk', customer: 'diego', rating: 4, comment: 'Nice and sturdy.', time: new Date(Date.now() - 1000*60*60*24*6).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1006-1', orderId: 'FC1006', rider: 'rider2', customer: 'diego', rating: 5, comment: 'Fast delivery.', time: new Date(Date.now() - 1000*60*60*24*6).toISOString() } ]
        },
        {
            id: 'FC1007', customer: 'emma', items: [ { name: 'Airtight Food Storage Container Set', price: 200, quantity: 2 } ],
            subtotal: 400, shippingFee: 15, total: 415, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*10).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*10).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*9).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1007-1', orderId: 'FC1007', product: 'Airtight Food Storage Container Set', customer: 'emma', rating: 4, comment: 'Useful set for pantry.', time: new Date(Date.now() - 1000*60*60*24*9).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1007-1', orderId: 'FC1007', rider: 'rider1', customer: 'emma', rating: 5, comment: 'Delivered carefully.', time: new Date(Date.now() - 1000*60*60*24*9).toISOString() } ]
        },
        {
            id: 'FC1008', customer: 'ben', items: [ { name: 'Glass Storage Jars', price: 140, quantity: 3 } ],
            subtotal: 420, shippingFee: 15, total: 435, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*12).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*12).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*11).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1008-1', orderId: 'FC1008', product: 'Glass Storage Jars', customer: 'ben', rating: 4, comment: 'Good quality glass.', time: new Date(Date.now() - 1000*60*60*24*11).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1008-1', orderId: 'FC1008', rider: 'rider2', customer: 'ben', rating: 4, comment: 'On time.', time: new Date(Date.now() - 1000*60*60*24*11).toISOString() } ]
        },
        {
            id: 'FC1009', customer: 'carla', items: [ { name: 'Spoons (set)', price: 100, quantity: 1 }, { name: 'Measuring Cups (set)', price: 140, quantity: 1 } ],
            subtotal: 240, shippingFee: 15, total: 255, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*14).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*14).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*13).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1009-1', orderId: 'FC1009', product: 'Spoons (set)', customer: 'carla', rating: 4, comment: 'Useful set.', time: new Date(Date.now() - 1000*60*60*24*13).toISOString() }, { id: 'R-FC1009-2', orderId: 'FC1009', product: 'Measuring Cups (set)', customer: 'carla', rating: 4, comment: 'Works well.', time: new Date(Date.now() - 1000*60*60*24*13).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1009-1', orderId: 'FC1009', rider: 'rider1', customer: 'carla', rating: 5, comment: 'Very polite rider.', time: new Date(Date.now() - 1000*60*60*24*13).toISOString() } ]
        },
        {
            id: 'FC1010', customer: 'diego', items: [ { name: 'Coffee Maker', price: 900, quantity: 1 } ],
            subtotal: 900, shippingFee: 15, total: 915, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*16).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*16).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*15).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1010-1', orderId: 'FC1010', product: 'Coffee Maker', customer: 'diego', rating: 5, comment: 'Great brewer.', time: new Date(Date.now() - 1000*60*60*24*15).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1010-1', orderId: 'FC1010', rider: 'rider2', customer: 'diego', rating: 5, comment: 'Quick delivery.', time: new Date(Date.now() - 1000*60*60*24*15).toISOString() } ]
        },
        {
            id: 'FC1011', customer: 'anna', items: [ { name: 'Vegetable Peeler', price: 56, quantity: 2 }, { name: 'Tongs', price: 88, quantity: 1 } ],
            subtotal: 200, shippingFee: 15, total: 215, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*18).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*18).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*17).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1011-1', orderId: 'FC1011', product: 'Vegetable Peeler', customer: 'anna', rating: 4, comment: 'Sharp and convenient.', time: new Date(Date.now() - 1000*60*60*24*17).toISOString() }, { id: 'R-FC1011-2', orderId: 'FC1011', product: 'Tongs', customer: 'anna', rating: 4, comment: 'Nice grip.', time: new Date(Date.now() - 1000*60*60*24*17).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1011-1', orderId: 'FC1011', rider: 'rider1', customer: 'anna', rating: 5, comment: 'Timely and careful.', time: new Date(Date.now() - 1000*60*60*24*17).toISOString() } ]
        },
        {
            id: 'FC1012', customer: 'faith', items: [ { name: 'Dish Drying Rack', price: 260, quantity: 1 } ],
            subtotal: 260, shippingFee: 15, total: 275, status: 'cancelled',
            orderTime: new Date(Date.now() - 1000*60*60*24*20).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*20).toISOString(), cancelledTime: new Date(Date.now() - 1000*60*60*24*19).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [], riderReviews: []
        },
        {
            id: 'FC1013', customer: 'emma', items: [ { name: 'Air Fryer', price: 900, quantity: 1 }, { name: 'Sponge', price: 24, quantity: 5 } ],
            subtotal: 1020, shippingFee: 15, total: 1035, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*22).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*22).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*21).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1013-1', orderId: 'FC1013', product: 'Air Fryer', customer: 'emma', rating: 5, comment: 'Very useful appliance.', time: new Date(Date.now() - 1000*60*60*24*21).toISOString() }, { id: 'R-FC1013-2', orderId: 'FC1013', product: 'Sponge', customer: 'emma', rating: 4, comment: 'Good absorbency.', time: new Date(Date.now() - 1000*60*60*24*21).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1013-1', orderId: 'FC1013', rider: 'rider1', customer: 'emma', rating: 5, comment: 'Fast and polite.', time: new Date(Date.now() - 1000*60*60*24*21).toISOString() } ]
        },
        {
            id: 'FC1014', customer: 'ben', items: [ { name: 'Microplane Zester', price: 240, quantity: 1 }, { name: 'Whisk', price: 72, quantity: 2 } ],
            subtotal: 384, shippingFee: 15, total: 399, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*24).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*24).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*23).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1014-1', orderId: 'FC1014', product: 'Microplane Zester', customer: 'ben', rating: 4, comment: 'Great zest.', time: new Date(Date.now() - 1000*60*60*24*23).toISOString() }, { id: 'R-FC1014-2', orderId: 'FC1014', product: 'Whisk', customer: 'ben', rating: 4, comment: 'Works well.', time: new Date(Date.now() - 1000*60*60*24*23).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1014-1', orderId: 'FC1014', rider: 'rider2', customer: 'ben', rating: 4, comment: 'Good service.', time: new Date(Date.now() - 1000*60*60*24*23).toISOString() } ]
        },
        {
            id: 'FC1015', customer: 'carla', items: [ { name: 'Chefs Knife', price: 320, quantity: 1 }, { name: 'Nonstick Frying Pan', price: 300, quantity: 1 } ],
            subtotal: 620, shippingFee: 15, total: 635, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*26).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*26).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*25).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1015-1', orderId: 'FC1015', product: 'Chefs Knife', customer: 'carla', rating: 5, comment: 'Very sharp and durable.', time: new Date(Date.now() - 1000*60*60*24*25).toISOString() }, { id: 'R-FC1015-2', orderId: 'FC1015', product: 'Nonstick Frying Pan', customer: 'carla', rating: 4, comment: 'Good nonstick coating.', time: new Date(Date.now() - 1000*60*60*24*25).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1015-1', orderId: 'FC1015', rider: 'rider1', customer: 'carla', rating: 5, comment: 'Excellent delivery.', time: new Date(Date.now() - 1000*60*60*24*25).toISOString() } ]
        },
        {
            id: 'FC1016', customer: 'diego', items: [ { name: 'Glass Storage Jars', price: 180, quantity: 1 }, { name: 'Airtight Food Storage Container Set', price: 280, quantity: 1 } ],
            subtotal: 460, shippingFee: 15, total: 475, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*28).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*28).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*27).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1016-1', orderId: 'FC1016', product: 'Glass Storage Jars', customer: 'diego', rating: 4, comment: 'Sturdy jars.', time: new Date(Date.now() - 1000*60*60*24*27).toISOString() }, { id: 'R-FC1016-2', orderId: 'FC1016', product: 'Airtight Food Storage Container Set', customer: 'diego', rating: 4, comment: 'Seals well.', time: new Date(Date.now() - 1000*60*60*24*27).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1016-1', orderId: 'FC1016', rider: 'rider2', customer: 'diego', rating: 4, comment: 'Good timing.', time: new Date(Date.now() - 1000*60*60*24*27).toISOString() } ]
        },
        {
            id: 'FC1017', customer: 'anna', items: [ { name: 'Electric Kettle', price: 600, quantity: 1 } ],
            subtotal: 600, shippingFee: 15, total: 615, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*30).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*30).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*29).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1017-1', orderId: 'FC1017', product: 'Electric Kettle', customer: 'anna', rating: 5, comment: 'Boils quickly.', time: new Date(Date.now() - 1000*60*60*24*29).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1017-1', orderId: 'FC1017', rider: 'rider1', customer: 'anna', rating: 5, comment: 'Smooth delivery.', time: new Date(Date.now() - 1000*60*60*24*29).toISOString() } ]
        },
        {
            id: 'FC1018', customer: 'emma', items: [ { name: 'Toaster Oven', price: 900, quantity: 1 }, { name: 'Tongs', price: 88, quantity: 1 } ],
            subtotal: 988, shippingFee: 15, total: 1003, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*32).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*32).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*31).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1018-1', orderId: 'FC1018', product: 'Toaster Oven', customer: 'emma', rating: 5, comment: 'Great performance.', time: new Date(Date.now() - 1000*60*60*24*31).toISOString() }, { id: 'R-FC1018-2', orderId: 'FC1018', product: 'Tongs', customer: 'emma', rating: 4, comment: 'Useful tool.', time: new Date(Date.now() - 1000*60*60*24*31).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1018-1', orderId: 'FC1018', rider: 'rider2', customer: 'emma', rating: 5, comment: 'Friendly rider.', time: new Date(Date.now() - 1000*60*60*24*31).toISOString() } ]
        },
        {
            id: 'FC1019', customer: 'ben', items: [ { name: 'Coffee Maker', price: 900, quantity: 1 }, { name: 'Spoons (set)', price: 100, quantity: 1 } ],
            subtotal: 1000, shippingFee: 15, total: 1015, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*34).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*34).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*33).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1019-1', orderId: 'FC1019', product: 'Coffee Maker', customer: 'ben', rating: 5, comment: 'Brews great coffee.', time: new Date(Date.now() - 1000*60*60*24*33).toISOString() }, { id: 'R-FC1019-2', orderId: 'FC1019', product: 'Spoons (set)', customer: 'ben', rating: 4, comment: 'Nice spoons.', time: new Date(Date.now() - 1000*60*60*24*33).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1019-1', orderId: 'FC1019', rider: 'rider1', customer: 'ben', rating: 5, comment: 'On-time delivery.', time: new Date(Date.now() - 1000*60*60*24*33).toISOString() } ]
        },
        {
            id: 'FC1020', customer: 'carla', items: [ { name: 'Measuring Cups (set)', price: 140, quantity: 2 } ],
            subtotal: 280, shippingFee: 15, total: 295, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*36).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*36).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*35).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1020-1', orderId: 'FC1020', product: 'Measuring Cups (set)', customer: 'carla', rating: 4, comment: 'Good value.', time: new Date(Date.now() - 1000*60*60*24*35).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1020-1', orderId: 'FC1020', rider: 'rider2', customer: 'carla', rating: 4, comment: 'Delivered safely.', time: new Date(Date.now() - 1000*60*60*24*35).toISOString() } ]
        },
        {
            id: 'FC1021', customer: 'diego', items: [ { name: 'Microplane Zester', price: 240, quantity: 1 }, { name: 'Vegetable Peeler', price: 56, quantity: 2 } ],
            subtotal: 352, shippingFee: 15, total: 367, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*38).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*38).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*37).toISOString(), assignedRider: 'rider1', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1021-1', orderId: 'FC1021', product: 'Microplane Zester', customer: 'diego', rating: 4, comment: 'Very handy.', time: new Date(Date.now() - 1000*60*60*24*37).toISOString() }, { id: 'R-FC1021-2', orderId: 'FC1021', product: 'Vegetable Peeler', customer: 'diego', rating: 4, comment: 'Works well.', time: new Date(Date.now() - 1000*60*60*24*37).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1021-1', orderId: 'FC1021', rider: 'rider1', customer: 'diego', rating: 4, comment: 'Good service.', time: new Date(Date.now() - 1000*60*60*24*37).toISOString() } ]
        },
        {
            id: 'FC1022', customer: 'anna', items: [ { name: 'Chefs Knife', price: 160, quantity: 1 }, { name: 'Glass Storage Jars', price: 140, quantity: 1 } ],
            subtotal: 300, shippingFee: 15, total: 315, status: 'delivered',
            orderTime: new Date(Date.now() - 1000*60*60*24*40).toISOString(), placedTime: new Date(Date.now() - 1000*60*60*24*40).toISOString(), deliveredTime: new Date(Date.now() - 1000*60*60*24*39).toISOString(), assignedRider: 'rider2', deliveryAddress: 'San Pedro', contactNumber: '09938564676',
            reviews: [ { id: 'R-FC1022-1', orderId: 'FC1022', product: 'Chefs Knife', customer: 'anna', rating: 5, comment: 'Nice knife for home use.', time: new Date(Date.now() - 1000*60*60*24*39).toISOString() }, { id: 'R-FC1022-2', orderId: 'FC1022', product: 'Glass Storage Jars', customer: 'anna', rating: 4, comment: 'Good for storage.', time: new Date(Date.now() - 1000*60*60*24*39).toISOString() } ],
            riderReviews: [ { id: 'RR-FC1022-1', orderId: 'FC1022', rider: 'rider2', customer: 'anna', rating: 5, comment: 'Quick handover.', time: new Date(Date.now() - 1000*60*60*24*39).toISOString() } ]
        }
    ];

    // Default seeded product and rider reviews: take inline reviews embedded in defaultOrders
    const defaultReviews = [];
    const defaultRiderReviews = [];
    try {
        (defaultOrders || []).forEach((order) => {
            try {
                // collect only reviews explicitly defined on each order
                (order.reviews || []).forEach(r => { defaultReviews.push(r); });
                (order.riderReviews || []).forEach(rr => { defaultRiderReviews.push(rr); });
            } catch (e) { /* ignore individual order failures */ }
        });
    } catch (e) { /* ignore flattening errors */ }

    // Use sessionStorage so data resets when the browser/session is closed.
    function read(key) {
        try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch(e) { return null; }
    }
    function write(key, value) { sessionStorage.setItem(key, JSON.stringify(value)); }

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
        if (!read(KEY_ORDERS)) write(KEY_ORDERS, defaultOrders);
        // Reviews (product & rider): initialize if missing — seed with sample reviews
        if (!read(KEY_REVIEWS)) write(KEY_REVIEWS, defaultReviews);
        if (!read(KEY_RIDER_REVIEWS)) write(KEY_RIDER_REVIEWS, defaultRiderReviews);
        // User requests: initialize if missing
        if (!read(KEY_USER_REQUESTS)) write(KEY_USER_REQUESTS, []);
    }

    const store = {
        init: function(){ ensureSeed(); },

        // Reset store to seeded defaults (developer helper)
        async resetToDefaults() {
            try {
                write(KEY_MENU, defaultMenu);
                write(KEY_USERS, defaultUsers);
                write(KEY_ORDERS, defaultOrders);
                // reset reviews as well
                write(KEY_REVIEWS, defaultReviews);
                write(KEY_RIDER_REVIEWS, defaultRiderReviews);
                return true;
            } catch (e) { return false; }
        },

        // Users
        async loadUsers() { ensureSeed(); return read(KEY_USERS) || []; },
        async saveUsers(users) { write(KEY_USERS, users); return true; },
        // User requests (pending role requests from registrations)
        async loadUserRequests() { ensureSeed(); return read(KEY_USER_REQUESTS) || []; },
        async saveUserRequests(reqs) { write(KEY_USER_REQUESTS, reqs); return true; },

        // Menu
        async loadMenu() { ensureSeed(); return read(KEY_MENU) || []; },
        async saveMenu(menu) { write(KEY_MENU, menu); return true; },

        // Orders
        async loadOrders() { ensureSeed(); return read(KEY_ORDERS) || []; },
        async saveOrders(orders) { write(KEY_ORDERS, orders); return true; },

        // Product reviews
        async loadReviews() { ensureSeed(); return read(KEY_REVIEWS) || []; },
        async saveReviews(reviews) { write(KEY_REVIEWS, reviews); return true; },
        async addReview(review) {
            if (!review) return false;
            const reviews = await this.loadReviews();
            if (!review.id) review.id = `R-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            reviews.push(review);
            await this.saveReviews(reviews);
            return true;
        },

        // Rider reviews
        async loadRiderReviews() { ensureSeed(); return read(KEY_RIDER_REVIEWS) || []; },
        async saveRiderReviews(reviews) { write(KEY_RIDER_REVIEWS, reviews); return true; },
        async addRiderReview(review) {
            if (!review) return false;
            const reviews = await this.loadRiderReviews();
            if (!review.id) review.id = `RR-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            reviews.push(review);
            await this.saveRiderReviews(reviews);
            return true;
        },

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

            // Decrement inventory for each item in the order where a matching menu item exists
            try {
                const menu = await this.loadMenu();
                order.items.forEach(oi => {
                    // Match by base name: menu item name equals or is prefix of order item name
                    const menuIdx = menu.findIndex(mi => oi.name === mi.name || oi.name.startsWith(mi.name + ' ') || oi.name.startsWith(mi.name + '('));
                    if (menuIdx !== -1) {
                        const mi = menu[menuIdx];
                        // ensure stock exists
                        if (typeof mi.stock === 'number') {
                            mi.stock = Math.max(0, mi.stock - (oi.quantity || 1));
                        }
                    }
                });
                await this.saveMenu(menu);
            } catch (e) {
                console.warn('Failed to decrement menu stock on addOrder:', e);
            }

            await this.saveOrders(orders);
            return true;
        },

        // Update order status
        async updateOrderStatus(orderId, newStatus) {
            const orders = await this.loadOrders();
            // Compare as strings to tolerate numeric vs string id formats
            const idx = orders.findIndex(o => String(o.id) === String(orderId));
            if (idx === -1) return false;
            const prevStatus = orders[idx].status;
            orders[idx].status = newStatus;
            orders[idx][`${newStatus}Time`] = new Date().toISOString();

            // If the order has just been cancelled (and wasn't cancelled before), restore inventory
            if (String(newStatus).toLowerCase() === 'cancelled' && String(prevStatus).toLowerCase() !== 'cancelled') {
                try {
                    const menu = await this.loadMenu();
                    const order = orders[idx];
                    if (order && Array.isArray(order.items)) {
                        order.items.forEach(oi => {
                            const menuIdx = menu.findIndex(mi => oi.name === mi.name || oi.name.startsWith(mi.name + ' ') || oi.name.startsWith(mi.name + '('));
                            if (menuIdx !== -1) {
                                const mi = menu[menuIdx];
                                if (typeof mi.stock === 'number') {
                                    mi.stock = Math.max(0, mi.stock + (oi.quantity || 1));
                                }
                            }
                        });
                        await this.saveMenu(menu);
                    }
                } catch (e) {
                    console.warn('Failed to restore menu stock on order cancellation:', e);
                }
            }

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
    // User requests helpers
    window.loadUserRequests = store.loadUserRequests.bind(store);
    window.saveUserRequests = store.saveUserRequests.bind(store);
    // Expose reset helper so developers can re-seed localStorage after editing this file
    window.resetToDefaults = store.resetToDefaults.bind(store);
    window.resetStore = store.resetToDefaults.bind(store);

    // Reviews APIs
    window.loadReviews = store.loadReviews.bind(store);
    window.saveReviews = store.saveReviews.bind(store);
    window.addReview = store.addReview.bind(store);
    window.loadRiderReviews = store.loadRiderReviews.bind(store);
    window.saveRiderReviews = store.saveRiderReviews.bind(store);
    window.addRiderReview = store.addRiderReview.bind(store);

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
