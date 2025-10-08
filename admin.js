// Admin RBAC and dashboards
(async function(){
  // Wait firebase
  const waitReady = () => new Promise(res => {
    const tick = () => window.firebaseReady ? res() : setTimeout(tick, 50);
    tick();
  });
  await waitReady();

  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
  const { collection, getDocs, doc, updateDoc, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  const authGate = document.getElementById('authGate');
  const dashboard = document.getElementById('dashboard');
  const roleBadge = document.getElementById('roleBadge');

  function setView(authRole){
    const role = (authRole||'').toLowerCase();
    roleBadge.textContent = `Permissão: ${authRole||'desconhecida'}`;
    // Hide sections for vendedor
    if (role === 'vendedor'){
      // hide KPIs and products mgmt
      const products = document.getElementById('productsTable')?.closest('.bg-white');
      if (products) products.classList.add('hidden');
    }
  }

  async function loadUsersTable(isManager){
    const usersBody = document.getElementById('usersTbody');
    if (!usersBody) return;
    usersBody.innerHTML = '';
    try{
      const snap = await getDocs(collection(window.firebaseDb,'users'));
      snap.forEach(d => {
        const u = d.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="py-2">${u.email||''}</td>
          <td class="py-2">${d.id}</td>
          <td class="py-2">${u.role||'Vendedor'}</td>
          <td class="py-2">${isManager?`<select data-uid="${d.id}" class="roleSelect border rounded px-2 py-1 text-sm">
               <option ${ (u.role||'').toLowerCase()==='vendedor'?'selected':''}>Vendedor</option>
               <option ${ (u.role||'').toLowerCase()==='gerente'?'selected':''}>Gerente</option>
               <option ${ (u.role||'').toLowerCase()==='ceo'?'selected':''}>Ceo</option>
             </select>`:''}</td>`;
        usersBody.appendChild(tr);
      });
      if (isManager){
        usersBody.querySelectorAll('.roleSelect').forEach(sel => {
          sel.addEventListener('change', async (e) => {
            const uid = sel.getAttribute('data-uid');
            const newRole = sel.value;
            await updateDoc(doc(collection(window.firebaseDb,'users'), uid), { role: newRole });
            alert('Permissão atualizada');
          });
        });
      }
    }catch(e){ console.error('Erro ao carregar usuários', e); }
  }

  onAuthStateChanged(window.firebaseAuth, async (user) => {
    if (!user){
      authGate.classList.remove('hidden');
      dashboard.classList.add('hidden');
      return;
    }
    // fetch role
    const uid = user.uid;
    let role = 'Vendedor';
    try{
      const { getDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      const { doc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      const ref = doc(collection(window.firebaseDb,'users'), uid);
      const snap = await getDoc(ref);
      if (snap.exists()) role = (snap.data().role)||'Vendedor';
    }catch(e){}

    if (!['ceo','gerente','vendedor'].includes((role||'').toLowerCase())){
      authGate.classList.remove('hidden');
      dashboard.classList.add('hidden');
      return;
    }
    authGate.classList.add('hidden');
    dashboard.classList.remove('hidden');
    setView(role);
    await loadUsersTable(['ceo','gerente'].includes((role||'').toLowerCase()));
  });
})();

// Admin logic: Auth gate, roles, Firestore reads, Chart.js rendering

async function ensureFirebase(maxWaitMs = 5000) {
    const start = Date.now();
    while (!window.firebaseReady && Date.now() - start < maxWaitMs) {
        await new Promise(r => setTimeout(r, 150));
    }
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
    const { collection, query, where, orderBy, limit, getDocsFromServer } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const ordersCol = collection(window.firebaseDb, 'orders');

    // Today sales (sum)
    const today = new Date();
    today.setHours(0,0,0,0);
    const qToday = query(ordersCol, where('createdAt', '>=', today));
    const todaySnap = await getDocsFromServer(qToday);
    let sumToday = 0;
    todaySnap.forEach(d => sumToday += Number(d.data().amount || 0));
    document.getElementById('kpiToday').textContent = currencyBRL(sumToday);

    // Month sales
    const firstMonth = new Date();
    firstMonth.setDate(1); firstMonth.setHours(0,0,0,0);
    const qMonth = query(ordersCol, where('createdAt', '>=', firstMonth));
    const monthSnap = await getDocsFromServer(qMonth);
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
    const { collection, query, orderBy, limit, getDocsFromServer } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const ordersCol = collection(window.firebaseDb, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocsFromServer(q);

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
    const { collection, query, orderBy, limit, getDocsFromServer } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    // Orders
    const ordersCol = collection(window.firebaseDb, 'orders');
    const qOrders = query(ordersCol, orderBy('createdAt', 'desc'), limit(20));
    const snapOrders = await getDocsFromServer(qOrders);
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
    const snapProd = await getDocsFromServer(qProd);
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

async function upsertUserProfile(user) {
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    try {
        await setDoc(doc(window.firebaseDb, 'users', user.uid), {
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            lastLoginAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        console.error('user profile upsert error', e);
    }
}

async function loadUsersAndRoles(currentRole) {
    const canEditRoles = can(currentRole, 'view_all');
    const { collection, getDocsFromServer, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const usersCol = collection(window.firebaseDb, 'users');
    const rolesCol = collection(window.firebaseDb, 'roles');
    const snapUsers = await getDocsFromServer(usersCol);
    const snapRoles = await getDocsFromServer(rolesCol);

    const uidToRole = new Map();
    snapRoles.forEach(r => uidToRole.set(r.id, (r.data()||{}).role || 'viewer'));

    const tbody = document.getElementById('usersTbody');
    tbody.innerHTML = '';
    snapUsers.forEach(u => {
        const data = u.data();
        const role = uidToRole.get(u.id) || 'viewer';
        const tr = document.createElement('tr');
        const selectHtml = `<select class="border border-gray-300 rounded px-2 py-1" data-uid="${u.id}" ${canEditRoles ? '' : 'disabled'}>
            <option value="admin" ${role==='admin'?'selected':''}>admin</option>
            <option value="manager" ${role==='manager'?'selected':''}>manager</option>
            <option value="editor" ${role==='editor'?'selected':''}>editor</option>
            <option value="viewer" ${role==='viewer'?'selected':''}>viewer</option>
        </select>`;
        tr.innerHTML = `<td class="py-2">${data.email||'-'}</td>
        <td class="py-2">${u.id}</td>
        <td class="py-2">${selectHtml}</td>
        <td class="py-2">${canEditRoles ? '<button class="text-blue-600" data-save-role="'+u.id+'">Salvar</button>' : '<span class="text-gray-400">-</span>'}</td>`;
        tbody.appendChild(tr);
    });

    if (canEditRoles) {
        tbody.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-save-role]');
            if (!btn) return;
            const uid = btn.getAttribute('data-save-role');
            const sel = tbody.querySelector(`select[data-uid="${uid}"]`);
            if (!sel) return;
            try {
                await setDoc(doc(window.firebaseDb, 'roles', uid), { role: sel.value }, { merge: true });
                btn.textContent = 'Salvo';
                setTimeout(() => btn.textContent = 'Salvar', 1200);
            } catch (err) {
                alert('Erro ao salvar role');
            }
        }, { once: true });
    }
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
        let role = { role: 'viewer' };
        try {
            role = await fetchRole(user.uid);
        } catch {}
        roleBadge.textContent = `Permissões: ${role.role || 'viewer'}`;

        // Mostra o dashboard imediatamente, independentemente de erros posteriores
        gate.classList.add('hidden');
        dash.classList.remove('hidden');

        try { await loadKPIs(); } catch (e) { console.error('KPIs error', e); }
        try { await loadCharts(); } catch (e) { console.error('Charts error', e); }
        try { await loadTables(can(role, 'manage_products')); } catch (e) { console.error('Tables error', e); }
        try { await upsertUserProfile(user); } catch {}
        try { await loadUsersAndRoles(role); } catch (e) { console.error('Users error', e); }
    });
}

main();


