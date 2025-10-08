// Admin RBAC and dashboards
(async function(){
  // Wait firebase
  const waitReady = () => new Promise(res => {
    const tick = () => window.firebaseReady ? res() : setTimeout(tick, 50);
    tick();
  });
  await waitReady();

  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
  const { collection, getDocs, doc, updateDoc, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  const authGate = document.getElementById('authGate');
  const dashboard = document.getElementById('dashboard');
  const roleBadge = document.getElementById('roleBadge');

  function setView(authRole){
    const role = (authRole||'').toLowerCase();
    roleBadge.textContent = `Permissão: ${authRole||'desconhecida'}`;
    // Controle de visão
    const kpiCards = document.querySelectorAll('#kpiToday, #kpiMonth, #kpiReceivable');
    const productsCard = document.getElementById('popularHoursChart')?.closest('.bg-white');
    const salesChartCard = document.getElementById('salesChart')?.closest('.bg-white');
    const topProductsCard = document.getElementById('topProductsChart')?.closest('.bg-white');
    if (role === 'vendedor'){
      // Vendedor: vê pedidos recentes e chat (futuro). Esconde KPIs e gestão de produtos.
      kpiCards.forEach(e => e && (e.closest('.bg-white').classList.add('hidden')));
      if (productsCard) productsCard.classList.add('hidden');
      if (salesChartCard) salesChartCard.classList.add('hidden');
      if (topProductsCard) topProductsCard.classList.add('hidden');
    } else if (role === 'gerente'){
      // Gerente: tudo, exceto "Fluxo total de vendas" (usaremos kpiReceivable como proxy)
      const receivableCard = document.getElementById('kpiReceivable')?.closest('.bg-white');
      if (receivableCard) receivableCard.classList.add('hidden');
    }
  }

  async function loadUsersTable(isManager, isCeo){
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
               ${isCeo?`<option ${ (u.role||'').toLowerCase()==='ceo'?'selected':''}>Ceo</option>`:''}
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

    console.log('ADMIN UID:', uid, 'ROLE:', role);
    if (!['ceo','gerente','vendedor'].includes((role||'').toLowerCase())){
      authGate.classList.remove('hidden');
      dashboard.classList.add('hidden');
      return;
    }
    authGate.classList.add('hidden');
    dashboard.classList.remove('hidden');
    setView(role);
    const roleLower = (role||'').toLowerCase();
    const isManager = ['ceo','gerente'].includes(roleLower);
    const isCeo = roleLower==='ceo';
    await loadUsersTable(isManager, isCeo);
    if (isManager){
      await loadReports();
      await loadRecentSchedules();
    } else {
      await loadRecentOrders().catch(()=>{});
    }
  });

  // ---- Relatórios ----
  let charts = {};

  async function loadReports(){
    try{
      await loadKpis().catch(()=>{});
      await loadRecentOrders().catch(()=>{});
      await renderSalesChart().catch(()=>{});
      await renderTopProducts().catch(()=>{});
      await renderPopularHours().catch(()=>{});
      await renderActiveUsers().catch(()=>{});
    }catch(e){ console.error('Erro ao carregar relatórios', e); }
  }

  function brl(n){ try {return n.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})} catch(_) {return `R$ ${Number(n||0).toFixed(2)}`;} }

  async function loadKpis(){
    const kpiTodayEl = document.getElementById('kpiToday');
    const kpiMonthEl = document.getElementById('kpiMonth');
    const kpiRecEl = document.getElementById('kpiReceivable');
    const kpiActiveEl = document.getElementById('kpiActiveUsers');
    if (!kpiTodayEl || !kpiMonthEl || !kpiRecEl) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const ordersSnap = await getDocs(collection(window.firebaseDb,'orders'));
    let totalToday = 0, totalMonth = 0, receivable = 0;
    ordersSnap.forEach(d => {
      const o = d.data();
      const ts = new Date(o.createdAt || o.timestamp || 0);
      const amount = Number(o.amount || o.total || 0);
      if (ts >= startOfDay) totalToday += amount;
      if (ts >= startOfMonth) totalMonth += amount;
      if ((o.status||'').toLowerCase() === 'pending') receivable += amount;
    });
    kpiTodayEl.textContent = brl(totalToday);
    kpiMonthEl.textContent = brl(totalMonth);
    kpiRecEl.textContent = brl(receivable);

    if (kpiActiveEl){
      try{
        const usersSnap = await getDocs(collection(window.firebaseDb,'users'));
        const weekAgo = Date.now() - 7*24*60*60*1000;
        let active = 0; usersSnap.forEach(d=>{ const u=d.data(); if (Number(u.lastLogin||0) >= weekAgo) active++; });
        kpiActiveEl.textContent = String(active);
      }catch(_){ kpiActiveEl.textContent = '—'; }
    }
  }

  async function renderSalesChart(){
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ordersSnap = await getDocs(collection(window.firebaseDb,'orders'));
    // agrega últimos 30 dias
    const days = [...Array(30)].map((_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-(29-i)); return d;});
    const labels = days.map(d=>d.toLocaleDateString('pt-BR'));
    const dataMap = Object.fromEntries(labels.map(l=>[l,0]));
    ordersSnap.forEach(d => {
      const o = d.data(); const ts = new Date(o.createdAt || o.timestamp || 0);
      const label = ts.toLocaleDateString('pt-BR');
      if (dataMap[label] !== undefined) dataMap[label] += Number(o.amount || o.total || 0);
    });
    const data = labels.map(l=>dataMap[l]);
    try { if (charts.sales) { charts.sales.destroy(); } } catch(_){}
    charts.sales = new Chart(canvas.getContext('2d'), {
      type: 'line', data: { labels, datasets: [{label:'Vendas', data, borderColor:'#2563eb', tension:.3}]}, options:{plugins:{legend:{display:false}}}
    });
  }

  async function renderTopProducts(){
    const canvas = document.getElementById('topProductsChart');
    if (!canvas) return;
    const snap = await getDocs(collection(window.firebaseDb,'orders'));
    const map = {};
    snap.forEach(d=>{ const o=d.data(); const name=(o.item||o.productName||'Outro'); map[name]=(map[name]||0)+Number(o.amount||o.total||0); });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    try { if (charts.top) { charts.top.destroy(); } } catch(_){}
    charts.top = new Chart(canvas.getContext('2d'), { type:'bar', data:{ labels: entries.map(e=>e[0]), datasets:[{label:'Receita', data: entries.map(e=>e[1]), backgroundColor:'#60a5fa'}] }, options:{plugins:{legend:{display:false}}} });
  }

  async function loadRecentOrders(){
    const tbody = document.getElementById('ordersTbody');
    const count = document.getElementById('ordersCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    const snap = await getDocs(collection(window.firebaseDb,'orders'));
    let i=1; let total=0; snap.forEach(d=>{ const o=d.data(); total++; const tr=document.createElement('tr'); tr.innerHTML=`<td class="py-2">${i++}</td><td class="py-2">${o.customer||o.buyerEmail||''}</td><td class="py-2">${o.item||o.productName||''}</td><td class="py-2">${brl(Number(o.amount||o.total||0))}</td><td class="py-2">${o.status||'—'}</td>`; tbody.appendChild(tr); });
    if (count) count.textContent = `${total} pedidos`;
  }

  async function loadRecentSchedules(){
    const tbody = document.getElementById('schedulesTbody');
    const count = document.getElementById('schedulesCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    const snap = await getDocs(collection(window.firebaseDb,'schedules'));
    let i=1; let total=0; snap.forEach(d=>{ const s=d.data(); total++; const tr=document.createElement('tr'); tr.innerHTML=`<td class="py-2">${i++}</td><td class="py-2">${s.eventType||''}</td><td class="py-2">${s.date||''}</td><td class="py-2">${s.hour||''}</td><td class="py-2">${s.name||s.email||''}</td>`; tbody.appendChild(tr); });
    if (count) count.textContent = `${total} inscrições`;
  }

  async function renderPopularHours(){
    const canvas = document.getElementById('popularHoursChart');
    if (!canvas) return;
    const snap = await getDocs(collection(window.firebaseDb,'schedules'));
    const hours = ['14','15','16','17','18','19','20','21','22','23'];
    const map = Object.fromEntries(hours.map(h=>[h,0]));
    snap.forEach(d=>{ const s=d.data(); const h=(s.hour||'').toString().padStart(2,'0'); if (map[h]!==undefined) map[h]++; });
    const data = hours.map(h=>map[h]);
    try { if (charts.hours) { charts.hours.destroy(); } } catch(_){}
    charts.hours = new Chart(canvas.getContext('2d'), { type:'bar', data:{ labels: hours.map(h=>`${h}h`), datasets:[{label:'Agendamentos', data, backgroundColor:'#34d399'}] }, options:{plugins:{legend:{display:false}}} });
  }

  // Usuários ativos nos últimos 7 dias (baseado em lastLogin em users)
  async function renderActiveUsers(){
    const kpi = document.getElementById('kpiToday'); // placeholder: não há slot dedicado; opcional mover para outro card
    try{
      const snap = await getDocs(collection(window.firebaseDb,'users'));
      const weekAgo = Date.now() - 7*24*60*60*1000;
      let active = 0; snap.forEach(d=>{ const u=d.data(); if (Number(u.lastLogin||0) >= weekAgo) active++; });
      // Apenas loga por enquanto
      console.log('Usuários ativos (7d):', active);
    }catch(e){ console.log('Erro ativos', e); }
  }

  async function renderActiveUsers(){
    // Placeholder: poderemos mostrar no futuro um gráfico em outra aba
    return;
  }
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
    if (!ordersTbody) return; // card não existe nesta visão
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
    const ordersCountEl = document.getElementById('ordersCount');
    if (ordersCountEl) ordersCountEl.textContent = `${count} pedidos`;

    // Products
    const productsTbody = document.getElementById('productsTbody');
    if (productsTbody) {
        const productsCol = collection(window.firebaseDb, 'products');
        const qProd = query(productsCol, orderBy('name'), limit(50));
        const snapProd = await getDocsFromServer(qProd);
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
    const canEditRoles = ['ceo','gerente'].includes((currentRole||'').toLowerCase());
    const isCeo = (currentRole||'').toLowerCase()==='ceo';
    const { collection, getDocsFromServer, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const usersCol = collection(window.firebaseDb, 'users');
    const snapUsers = await getDocsFromServer(usersCol);

    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    snapUsers.forEach(u => {
        const data = u.data();
        const role = (data.role || 'Vendedor');
        const tr = document.createElement('tr');
        const selectHtml = `<select class="border border-gray-300 rounded px-2 py-1" data-uid="${u.id}" ${canEditRoles ? '' : 'disabled'}>
            <option value="Vendedor" ${role==='Vendedor'?'selected':''}>Vendedor</option>
            <option value="Gerente" ${role==='Gerente'?'selected':''}>Gerente</option>
            ${isCeo?`<option value="Ceo" ${role==='Ceo'?'selected':''}>Ceo</option>`:''}
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
                await setDoc(doc(window.firebaseDb, 'users', uid), { role: sel.value }, { merge: true });
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


