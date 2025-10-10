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
      // Gerente: vê financeiro, exceto fluxo total mensal e gráfico de Vendas 30d
      const kpiMonthCard = document.getElementById('kpiMonth')?.closest('.bg-white');
      if (kpiMonthCard) kpiMonthCard.classList.add('hidden');
      if (salesChartCard) salesChartCard.classList.add('hidden');
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

  // Submissão manual de equipe/cadastro rápido (confirma vaga sem pagamento)
  async function submitAddTeam(e){
  	try{
  	  e?.preventDefault();
  	  const hourEl = document.getElementById('addHour');
  	  const teamEl = document.getElementById('addTeamName');
  	  const contactEl = document.getElementById('addContact');
  	  const personEl = document.getElementById('addPerson');
  	  const notesEl = document.getElementById('addNotes');
  	  const msgEl = document.getElementById('addTeamMsg');
  	  const dateEl = document.getElementById('boardDate');
  	  const typeEl = document.getElementById('boardEventType');
  	  const schedule = (hourEl?.value || '').trim();
  	  const teamName = (teamEl?.value || '').trim();
  	  const contact = (contactEl?.value || '').trim();
  	  const person = (personEl?.value || '').trim();
  	  const notes = (notesEl?.value || '').trim();
  	  const date = (dateEl?.value || '').trim();
  	  const eventType = (typeEl?.value || '').trim();
  	  if (!teamName || !contact){
  	    alert('Informe ao menos Time/Org e Contato.');
  	    return;
  	  }
  	  if (!date){
  	    alert('Selecione uma data no painel de horários.');
  	    return;
  	  }
  	  // Se horário não estiver definido, cria sem horário específico
  	  const payload = {
  	    teamName,
  	    contact,
  	    person: person || null,
  	    notes: notes || null,
  	    date,
  	    schedule: schedule || '—',
  	    eventType: eventType || null,
  	    status: 'confirmed'
  	  };
  	  try{
  	    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
  	    await addDoc(collection(window.firebaseDb,'registrations'), { ...payload, createdAt: serverTimestamp() });
  	    if (msgEl) msgEl.textContent = 'Time adicionado com sucesso!';
  	    // limpar campos
  	    if (teamEl) teamEl.value = '';
  	    if (contactEl) contactEl.value = '';
  	    if (personEl) personEl.value = '';
  	    if (notesEl) notesEl.value = '';
  	    // Atualiza quadro e pendências
  	    try { await loadBoard(); } catch(_){}
  	    try { await loadPending(true); } catch(_){}
  	  }catch(err){
  	    alert('Falha ao salvar time.');
  	  }
  	}catch(_){ }
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
    window.adminRoleLower = roleLower;
    try { await loadUsersTable(isManager, isCeo); } catch(_){}
    // bind filtros e export
    const btnApply = document.getElementById('btnApplyFilter');
    if (btnApply) btnApply.onclick = applyFilter;
    const btnOrd = document.getElementById('btnExportOrdersCsv');
    if (btnOrd) btnOrd.onclick = exportOrdersCsv;
    const btnSch = document.getElementById('btnExportSchedulesCsv');
    if (btnSch) btnSch.onclick = exportSchedulesCsv;
    const btnLoadBoard = document.getElementById('btnLoadBoard');
    if (btnLoadBoard) btnLoadBoard.onclick = loadBoard;
    const formAddTeam = document.getElementById('formAddTeam');
    if (formAddTeam) formAddTeam.onsubmit = submitAddTeam;
    if (isManager){
      await loadReports();
      await loadRecentSchedules();
      await loadPending(true);
    } else {
      await loadRecentOrders().catch(()=>{});
      await loadPending(false);
    }
  });

  // ---- Relatórios ----
  let charts = {};
  let period = { from: null, to: null };

  // Unifica pedidos: orders + registrations
  async function fetchUnifiedOrders() {
    const items = [];
    try {
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      // Orders
      try{
        const snap = await getDocs(collection(window.firebaseDb,'orders'));
        snap.forEach(d => {
          const o = d.data();
          const ts = new Date(o.createdAt || o.timestamp || 0);
          items.push({ ts, amount: Number(o.amount||o.total||0), item: (o.item||o.productName||'Pedido'), customer:(o.customer||o.buyerEmail||'-'), status:(o.status||'') });
        });
      }catch(_){}
      // Registrations
      try{
        const regs = await getDocs(collection(window.firebaseDb,'registrations'));
        regs.forEach(d => {
          const r = d.data();
          const ts = (r.createdAt?.toDate ? r.createdAt.toDate() : (r.timestamp? new Date(r.timestamp) : new Date()));
          items.push({ ts, amount: Number(r.price||0), item:(r.title||r.eventType||'Reserva'), customer:(r.email||'-'), status:(r.status||'') });
        });
      }catch(_){}
    } catch(_){}
    return items;
  }

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

    const all = await fetchUnifiedOrders();
    let totalToday = 0, totalMonth = 0, receivable = 0;
    all.forEach(o => {
      const ts = o.ts;
      const amount = Number(o.amount||0);
      if (ts >= startOfDay && (o.status||'').toLowerCase()==='paid') totalToday += amount;
      if (ts >= startOfMonth && (o.status||'').toLowerCase()==='paid') totalMonth += amount;
      if ((o.status||'').toLowerCase()==='pending') receivable += amount;
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
    const all = await fetchUnifiedOrders();
    // agrega últimos 30 dias
    const days = [...Array(30)].map((_,i)=>{ const d = new Date(); d.setDate(d.getDate()-(29-i)); return d;});
    const labels = days.map(d=>d.toLocaleDateString('pt-BR'));
    const dataMap = Object.fromEntries(labels.map(l=>[l,0]));
    all.forEach(o => {
      const ts = o.ts;
      if (period.from && ts < period.from) return;
      if (period.to && ts > period.to) return;
      const label = ts.toLocaleDateString('pt-BR');
      if (dataMap[label] !== undefined && (o.status||'').toLowerCase()==='paid') dataMap[label] += Number(o.amount||0);
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
    const all = await fetchUnifiedOrders();
    const map = {};
    all.forEach(o=>{ if ((o.status||'').toLowerCase()!=='paid') return; const name=(o.item||'Item'); map[name]=(map[name]||0)+Number(o.amount||0); });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    try { if (charts.top) { charts.top.destroy(); } } catch(_){}
    charts.top = new Chart(canvas.getContext('2d'), { type:'bar', data:{ labels: entries.map(e=>e[0]), datasets:[{label:'Receita', data: entries.map(e=>e[1]), backgroundColor:'#60a5fa'}] }, options:{plugins:{legend:{display:false}}} });
  }

  // Atualiza todos os componentes do dashboard
  async function refreshDashboard(){
    try { await loadKpis(); } catch(_){ }
    try { await renderSalesChart(); } catch(_){ }
    try { await renderTopProducts(); } catch(_){ }
    try { await loadRecentOrders(); } catch(_){ }
  }

  async function loadRecentOrders(){
    const tbody = document.getElementById('ordersTbody');
    const count = document.getElementById('ordersCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    const items = [];
    // Orders
    const snap = await getDocs(collection(window.firebaseDb,'orders'));
    snap.forEach(d=>{ const o=d.data(); const ts=new Date(o.createdAt||o.timestamp||0); if (period.from&&ts<period.from) return; if (period.to&&ts>period.to) return; items.push({ ts, client: (o.customer||o.buyerEmail||''), item: (o.item||o.productName||''), value: Number(o.amount||o.total||0), status: (o.status||'—') }); });
    // Registrations pagas também contam como pedido
    try{
      const regsSnap = await getDocs(collection(window.firebaseDb,'registrations'));
      regsSnap.forEach(d=>{ const r=d.data(); const status=(r.status||'').toLowerCase(); if (status!=='paid') return; const ts = (r.createdAt?.toDate ? r.createdAt.toDate() : (r.timestamp? new Date(r.timestamp) : new Date())); if (period.from&&ts<period.from) return; if (period.to&&ts>period.to) return; items.push({ ts, client:(r.email||''), item:(r.title||r.eventType||'Reserva'), value:Number(r.price||0), status:'paid' }); });
    }catch(_){ }
    // ordenar por data desc e renderizar
    items.sort((a,b)=> b.ts - a.ts);
    let i=1; items.forEach(row=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td class="py-2">${i++}</td><td class="py-2">${row.client}</td><td class="py-2">${row.item}</td><td class="py-2">${brl(row.value)}</td><td class="py-2">${row.status}</td>`; tbody.appendChild(tr); });
    if (count) count.textContent = `${items.length} pedidos`;
  }
  // Pendências (orders.status === 'pending' OU registrations.status === 'pending')
  async function loadPending(isManager){
    const tbody = document.getElementById('pendingTbody');
    const countEl = document.getElementById('pendingCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    let total = 0;
    try{
      const clauses = [ where('status','==','pending') ];
      if (!isManager && window.firebaseAuth?.currentUser?.uid){
        clauses.push(where('ownerId','==', window.firebaseAuth.currentUser.uid));
      }
      const ordSnap = await getDocs(query(collection(window.firebaseDb,'orders'), ...clauses));
      ordSnap.forEach(d=>{
        const o = d.data();
        const tr = document.createElement('tr');
        const created = new Date(o.createdAt||o.timestamp||Date.now()).toLocaleString('pt-BR');
        tr.innerHTML = `
          <td class="py-2">${o.customer||o.buyerEmail||'-'}</td>
          <td class="py-2">${o.item||o.productName||'-'}</td>
          <td class="py-2">${brl(Number(o.amount||o.total||0))}</td>
          <td class="py-2">${created}</td>
          <td class="py-2 space-x-2">
            <button class="px-2 py-1 bg-green-600 text-white rounded text-xs" data-approve="${d.id}">Aprovar</button>
            <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" data-remove="${d.id}">Remover</button>
          </td>`;
        tbody.appendChild(tr); total++;
      });
    }catch(_){}
    try{
      const regClauses = [ where('status','==','pending') ];
      if (!isManager && window.firebaseAuth?.currentUser?.uid){
        regClauses.push(where('userId','==', window.firebaseAuth.currentUser.uid));
      }
      const regSnap = await getDocs(query(collection(window.firebaseDb,'registrations'), ...regClauses));
      regSnap.forEach(d=>{
        const r = d.data();
        const tr = document.createElement('tr');
        const created = new Date(r.createdAt?.toDate ? r.createdAt.toDate() : (r.timestamp||Date.now())).toLocaleString('pt-BR');
        tr.innerHTML = `
          <td class="py-2">${r.email||'-'}</td>
          <td class="py-2">${r.title||r.eventType||'-'}</td>
          <td class="py-2">${brl(Number(r.price||0))}</td>
          <td class="py-2">${created}</td>
          <td class="py-2 space-x-2">
            <button class="px-2 py-1 bg-green-600 text-white rounded text-xs" data-approve-reg="${d.id}">Aprovar</button>
            <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" data-remove-reg="${d.id}">Remover</button>
          </td>`;
        tbody.appendChild(tr); total++;
      });
    }catch(_){ }
    if (countEl) countEl.textContent = `${total} pendentes`;
    tbody.addEventListener('click', async (e)=>{
      const approve = e.target.closest('[data-approve]');
      const approveReg = e.target.closest('[data-approve-reg]');
      const remove = e.target.closest('[data-remove]');
      const removeReg = e.target.closest('[data-remove-reg]');
      try{
        if (approve){
          const id = approve.getAttribute('data-approve');
          const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
          await setDoc(doc(collection(window.firebaseDb,'orders'), id), { status:'paid', updatedAt: Date.now() }, { merge:true });
          approve.closest('tr')?.remove();
          // atualizar métricas e recentes
          await refreshDashboard();
        } else if (approveReg){
          const id = approveReg.getAttribute('data-approve-reg');
          const { doc, setDoc, collection, getDoc, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
          // marca registro como pago
          await setDoc(doc(collection(window.firebaseDb,'registrations'), id), { status:'paid', paidAt: Date.now() }, { merge:true });
          // cria um pedido em 'orders' para alimentar métricas e lista
          try{
            const snap = await getDoc(doc(collection(window.firebaseDb,'registrations'), id));
            if (snap.exists()){
              const r = snap.data();
              await addDoc(collection(window.firebaseDb,'orders'), {
                itemName: r.title || r.eventType || 'Reserva',
                amount: Number(r.price||0),
                customerName: r.email || '-',
                ownerId: r.userId || null,
                status: 'paid',
                createdAt: serverTimestamp()
              });
            }
          }catch(_){ }
          approveReg.closest('tr')?.remove();
          await refreshDashboard();
        } else if (remove){
          const id = remove.getAttribute('data-remove');
          const { doc, deleteDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
          await deleteDoc(doc(collection(window.firebaseDb,'orders'), id));
          remove.closest('tr')?.remove();
          await refreshDashboard();
        } else if (removeReg){
          const id = removeReg.getAttribute('data-remove-reg');
          const { doc, deleteDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
          await deleteDoc(doc(collection(window.firebaseDb,'registrations'), id));
          removeReg.closest('tr')?.remove();
          await refreshDashboard();
        }
      }catch(_){ alert('Ação falhou'); }
    });
  }

  async function loadRecentSchedules(){
    const tbody = document.getElementById('schedulesTbody');
    const count = document.getElementById('schedulesCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    const snap = await getDocs(collection(window.firebaseDb,'schedules'));
    let i=1; let total=0; snap.forEach(d=>{ const s=d.data(); const ts=new Date(s.createdAt||s.timestamp||s.date||0); if (period.from&&ts<period.from) return; if (period.to&&ts>period.to) return; total++; const tr=document.createElement('tr'); tr.innerHTML=`<td class="py-2">${i++}</td><td class="py-2">${s.eventType||''}</td><td class="py-2">${s.date||''}</td><td class="py-2">${s.hour||''}</td><td class="py-2">${s.name||s.email||''}</td>`; tbody.appendChild(tr); });
    if (count) count.textContent = `${total} inscrições`;
  }
  function parsePeriod(){
    const sel = document.getElementById('reportPeriod');
    const fromEl = document.getElementById('dateFrom');
    const toEl = document.getElementById('dateTo');
    const v = sel?.value || 'today';
    const now = new Date();
    if (v==='today'){ period.from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); period.to = null; }
    else if (v==='7d'){ const d=new Date(); d.setDate(d.getDate()-7); period.from = d; period.to = null; }
    else if (v==='30d'){ const d=new Date(); d.setDate(d.getDate()-30); period.from = d; period.to = null; }
    else { period.from = fromEl?.value? new Date(fromEl.value) : null; period.to = toEl?.value? new Date(toEl.value) : null; }
  }

  async function applyFilter(){ parsePeriod(); await loadReports(); }

  async function exportOrdersCsv(){
    const all = await fetchUnifiedOrders();
    const rows = [['data','cliente','item','valor','status']];
    all.forEach(o=>{ const ts=o.ts; if (period.from&&ts<period.from) return; if (period.to&&ts>period.to) return; rows.push([ts.toISOString(), o.customer||'', o.item||'', String(o.amount||0), o.status||'']); });
    downloadCsv('vendas.csv', rows);
  }

  async function exportSchedulesCsv(){
    const regs = await getDocs(collection(window.firebaseDb,'registrations'));
    const rows = [['id','data','evento','dia','hora','cliente']];
    regs.forEach(d=>{ const r=d.data(); const ts=(r.createdAt?.toDate ? r.createdAt.toDate() : (r.timestamp? new Date(r.timestamp) : new Date())); if (period.from&&ts<period.from) return; if (period.to&&ts>period.to) return; const schedule=String(r.schedule||''); const m=schedule.match(/(\d{1,2})h/); const hora=m?`${m[1]}h`:schedule; rows.push([d.id, ts.toISOString(), r.eventType||r.title||'Reserva', r.date||'', hora, r.email||'']); });
    downloadCsv('inscricoes.csv', rows);
  }

  function downloadCsv(filename, rows){
    const csv = rows.map(r=>r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function renderPopularHours(){
    const canvas = document.getElementById('popularHoursChart');
    if (!canvas) return;
    const regs = await getDocs(collection(window.firebaseDb,'registrations'));
    const hours = ['14','15','16','17','18','19','20','21','22','23'];
    const map = Object.fromEntries(hours.map(h=>[h,0]));
    regs.forEach(d=>{ const r=d.data(); if ((r.status||'').toLowerCase()!=='paid') return; const schedule=String(r.schedule||''); const m=schedule.match(/(\d{1,2})h/); const h=(m?m[1]:schedule).toString().padStart(2,'0'); if (map[h]!==undefined) map[h]++; });
    const data = hours.map(h=>map[h]);
    try { if (charts.hours) { charts.hours.destroy(); } } catch(_){ }
    charts.hours = new Chart(canvas.getContext('2d'), { type:'bar', data:{ labels: hours.map(h=>`${h}h`), datasets:[{label:'Agendamentos', data, backgroundColor:'#34d399'}] }, options:{plugins:{legend:{display:false}}} });
  }

  // Carrega quadro de horários por data/evento
  async function loadBoard(){
    try{
      const dateEl = document.getElementById('boardDate');
      const typeEl = document.getElementById('boardEventType');
      const tbody = document.getElementById('boardTbody');
      if (!dateEl || !typeEl || !tbody) return;
      const date = dateEl.value;
      const eventType = typeEl.value;
      tbody.innerHTML = '';
      if (!date) return;
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      const regs = collection(window.firebaseDb,'registrations');
      // status pago/confirmado para computar ocupação
      const q = query(regs, where('date','==', date), where('status','in',['paid','confirmed']));
      const snap = await getDocs(q);
      const map = {};
      snap.forEach(d=>{
        const r = d.data();
        // filtro por tipo (aceita contains, case-insensitive)
        if (eventType && r.eventType && !String(r.eventType).toLowerCase().includes(String(eventType).toLowerCase())) return;
        const key = r.schedule || r.hour || '—';
        map[key] = (map[key]||0) + 1;
      });
      const entries = Object.entries(map).sort((a,b)=>{
        const na = parseInt(String(a[0]).replace(/\D/g,''))||0;
        const nb = parseInt(String(b[0]).replace(/\D/g,''))||0;
        return na-nb;
      });
      entries.forEach(([hour, cnt])=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="py-2">${hour}</td><td class="py-2">${cnt}/12</td><td class="py-2 space-x-2">
          <button class="px-2 py-1 bg-blue-600 text-white rounded text-xs" data-add-hour="${hour}">Adicionar</button>
          <button class="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs" data-manage-hour="${hour}">Gerenciar</button>
        </td>`;
        tbody.appendChild(tr);
      });
      // Bind actions para adicionar/gerenciar
      tbody.addEventListener('click', (e)=>{
        const btnAdd = e.target.closest('[data-add-hour]');
        const btnManage = e.target.closest('[data-manage-hour]');
        if (btnAdd){
          const h = btnAdd.getAttribute('data-add-hour');
          const modal = document.getElementById('modalAddTeam');
          const hourInput = document.getElementById('addHour');
          if (hourInput) hourInput.value = h;
          if (modal) modal.classList.remove('hidden');
        } else if (btnManage){
          const h = btnManage.getAttribute('data-manage-hour');
          openManageHourModal(date, eventType, h);
        }
      }, { once: true });

      if (entries.length===0){
        const tr = document.createElement('tr');
        tr.innerHTML = '<td class="py-2" colspan="3">Sem reservas para esta data.</td>';
        tbody.appendChild(tr);
      }
    }catch(e){ console.error('loadBoard error', e); }
  }

  async function openManageHourModal(date, eventType, hour){
    try{
      const title = document.getElementById('manageHourTitle');
      const list = document.getElementById('manageHourList');
      const modal = document.getElementById('modalManageHour');
      if (!list || !modal) return;
      if (title) title.textContent = `Gerenciar ${hour} — ${date}`;
      list.innerHTML = '<div class="text-sm text-gray-500">Carregando...</div>';
      const { collection, query, where, getDocs, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
      const regs = collection(window.firebaseDb,'registrations');
      const clauses = [ where('date','==', date), where('schedule','==', hour) ];
      if (eventType) clauses.push(where('eventType','==', eventType));
      const snap = await getDocs(query(regs, ...clauses));
      list.innerHTML = '';
      if (snap.empty){ list.innerHTML = '<div class="text-sm text-gray-500">Nenhum time neste horário.</div>'; }
      snap.forEach(d=>{
        const r = d.data();
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between border-b py-2';
        row.innerHTML = `<div class="text-sm"><div class="font-semibold">${r.teamName||r.email||'-'}</div><div class="text-gray-500">${r.contact||r.phone||''}</div></div>
          <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" data-remove-reg-id="${d.id}">Remover</button>`;
        list.appendChild(row);
      });
      list.addEventListener('click', async (e)=>{
        const btn = e.target.closest('[data-remove-reg-id]');
        if (!btn) return;
        const id = btn.getAttribute('data-remove-reg-id');
        try{
          await deleteDoc(doc(collection(window.firebaseDb,'registrations'), id));
          btn.closest('.flex')?.remove();
          try{ await loadBoard(); }catch(_){ }
        }catch(_){ alert('Falha ao remover.'); }
      }, { once: true });
      modal.classList.remove('hidden');
    }catch(e){ console.error('openManageHourModal error', e); }
  }

  // Usuários ativos nos últimos 7 dias (baseado em lastLogin em users)
  async function renderActiveUsers(){
  	try{
  	  const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
  	  const snap = await getDocs(collection(window.firebaseDb,'users'));
  	  const weekAgo = Date.now() - 7*24*60*60*1000;
  	  let active = 0; snap.forEach(d=>{ const u=d.data(); if (Number(u.lastLogin||0) >= weekAgo) active++; });
  	  const kpiActiveEl = document.getElementById('kpiActiveUsers');
  	  if (kpiActiveEl) kpiActiveEl.textContent = String(active);
  	}catch(e){ console.log('Erro ativos', e); }
  }

  // [removido duplicado]
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
    const { doc, getDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    // 1) tentativa direta por docId == uid
    const ref = doc(collection(window.firebaseDb,'users'), uid);
    let snap = await getDoc(ref);
    if (snap.exists()) return { role: (snap.data().role || 'Usuario') };
    // 2) fallback: procurar por campo uid
    try{
        const q = query(collection(window.firebaseDb,'users'), where('uid','==', uid));
        const res = await getDocs(q);
        let found = null;
        res.forEach(d=>{ if (!found) found = d.data(); });
        if (found) return { role: (found.role || 'Usuario') };
    }catch(_){ }
    return { role: 'Usuario' };
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
    const roleStr = String(currentRole || '').toLowerCase();
    const canEditRoles = ['ceo','gerente'].includes(roleStr);
    const isCeo = roleStr==='ceo';
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


