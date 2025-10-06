// Admin logic: Auth gate, roles, Firestore reads, Chart.js rendering

async function ensureFirebase() {
    if (window.firebaseReady) return true;
    await new Promise(r => setTimeout(r, 200));
    return !!window.firebaseReady;
}

function currencyBRL(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function fetchRole(uid) {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const ref = doc(window.firebaseDb, 'roles', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { role: 'viewer' };
}

function can(role, permission) {
    const matrix = {
        admin: ['view_all', 'manage_products', 'edit_content'],
        manager: ['view_all', 'manage_products'],
        editor: ['edit_content'],
        viewer: []
    };
    return (matrix[role?.role] || []).includes(permission);
}

async function loadKPIs() {
    const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const ordersCol = collection(window.firebaseDb, 'orders');

    // Today sales (sum)
    const today = new Date();
    today.setHours(0,0,0,0);
    const qToday = query(ordersCol, where('createdAt', '>=', today));
    const todaySnap = await getDocs(qToday);
    let sumToday = 0;
    todaySnap.forEach(d => sumToday += Number(d.data().amount || 0));
    document.getElementById('kpiToday').textContent = currencyBRL(sumToday);

    // Month sales
    const firstMonth = new Date();
    firstMonth.setDate(1); firstMonth.setHours(0,0,0,0);
    const qMonth = query(ordersCol, where('createdAt', '>=', firstMonth));
    const monthSnap = await getDocs(qMonth);
    let sumMonth = 0, receivable = 0;
    monthSnap.forEach(d => {
        const data = d.data();
        const val = Number(data.amount || 0);
        sumMonth += val;
        if (data.status === 'pending') receivable += val;
    });
    document.getElementById('kpiMonth').textContent = currencyBRL(sumMonth);
    document.getElementById('kpiReceivable').textContent = currencyBRL(receivable);
}

async function loadCharts() {
    const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const ordersCol = collection(window.firebaseDb, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);

    const byDay = new Map();
    const top = new Map();
    snap.forEach(d => {
        const data = d.data();
        const day = (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()).toISOString().slice(0,10);
        byDay.set(day, (byDay.get(day) || 0) + Number(data.amount || 0));
        const name = data.itemName || 'Produto';
        top.set(name, (top.get(name) || 0) + Number(data.amount || 0));
    });

    const labels = Array.from(byDay.keys()).sort();
    const values = labels.map(k => byDay.get(k));

    const topEntries = Array.from(top.entries()).sort((a,b) => b[1]-a[1]).slice(0,5);
    const topLabels = topEntries.map(e => e[0]);
    const topValues = topEntries.map(e => e[1]);

    const salesCtx = document.getElementById('salesChart');
    new Chart(salesCtx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Vendas (R$)', data: values, borderColor: '#4a90e2', backgroundColor: 'rgba(74,144,226,0.15)', tension: 0.3 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const topCtx = document.getElementById('topProductsChart');
    new Chart(topCtx, {
        type: 'bar',
        data: { labels: topLabels, datasets: [{ label: 'Faturamento', data: topValues, backgroundColor: '#4a90e2' }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

async function loadTables(canManageProducts) {
    const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    // Orders
    const ordersCol = collection(window.firebaseDb, 'orders');
    const qOrders = query(ordersCol, orderBy('createdAt', 'desc'), limit(20));
    const snapOrders = await getDocs(qOrders);
    const ordersTbody = document.getElementById('ordersTbody');
    ordersTbody.innerHTML = '';
    let count = 0;
    snapOrders.forEach(docu => {
        const o = docu.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="py-2">${docu.id.slice(0,6)}</td>
        <td class="py-2">${o.customerName || '-'}</td>
        <td class="py-2">${o.itemName || '-'}</td>
        <td class="py-2">${currencyBRL(Number(o.amount||0))}</td>
        <td class="py-2">${o.status || '-'}</td>`;
        ordersTbody.appendChild(tr);
        count++;
    });
    document.getElementById('ordersCount').textContent = `${count} pedidos`;

    // Products
    const productsCol = collection(window.firebaseDb, 'products');
    const qProd = query(productsCol, orderBy('name'), limit(50));
    const snapProd = await getDocs(qProd);
    const productsTbody = document.getElementById('productsTbody');
    productsTbody.innerHTML = '';
    snapProd.forEach(docu => {
        const p = docu.data();
        const canEdit = canManageProducts;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="py-2">${p.name || '-'}</td>
        <td class="py-2">${currencyBRL(Number(p.price||0))}</td>
        <td class="py-2">${p.type || '-'}</td>
        <td class="py-2 space-x-2">${canEdit ? '<button data-id="'+docu.id+'" class="text-blue-600">Editar</button>' : '<span class="text-gray-400">-</span>'}</td>`;
        productsTbody.appendChild(tr);
    });
}

async function main() {
    const ok = await ensureFirebase();
    const gate = document.getElementById('authGate');
    const dash = document.getElementById('dashboard');
    const emailForm = document.getElementById('emailLoginForm');
    const btnLogout = document.getElementById('btnLogout');
    const nameEl = document.getElementById('adminUserName');
    const roleBadge = document.getElementById('roleBadge');

    gate.classList.add('hidden');
    dash.classList.add('hidden');

    if (!ok) {
        gate.classList.remove('hidden');
        return;
    }

    const { onAuthStateChanged, signInWithEmailAndPassword, signOut } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');

    emailForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        try {
            await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        } catch (err) {
            alert('Credenciais inválidas.');
        }
    });

    btnLogout?.addEventListener('click', async () => {
        try { await signOut(window.firebaseAuth); } catch {}
    });

    onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (!user) {
            gate.classList.remove('hidden');
            dash.classList.add('hidden');
            return;
        }
        nameEl.textContent = user.displayName || user.email || 'Usuário';
        const role = await fetchRole(user.uid);
        roleBadge.textContent = `Permissões: ${role.role || 'viewer'}`;

        gate.classList.add('hidden');
        dash.classList.remove('hidden');

        await loadKPIs();
        await loadCharts();
        await loadTables(can(role, 'manage_products'));
    });
}

main();


