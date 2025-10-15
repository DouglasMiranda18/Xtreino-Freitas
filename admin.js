// Admin RBAC and dashboards - Enhanced Security
(async function(){
  // Security: Check if running in admin context
  if (!window.location.pathname.includes('admin.html') && !window.location.pathname.includes('admin')) {
    console.warn('Admin script loaded outside admin context');
    return;
  }

  // Wait firebase
  const waitReady = () => new Promise(res => {
    const tick = () => window.firebaseReady ? res() : setTimeout(tick, 50);
    tick();
  });
  await waitReady();

  const { onAuthStateChanged, signInWithEmailAndPassword, signOut } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
  const { collection, getDocs, doc, updateDoc, query, where, orderBy, getDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  // Security: Admin email whitelist (configure these)
  const ADMIN_EMAILS = [
    'cleitondouglass@gmail.com',
    'cleitondouglass123@hotmail.com'
  ];

  // Security: Session timeout (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  let sessionTimer = null;

  const authGate = document.getElementById('authGate');
  const dashboard = document.getElementById('dashboard');
  const roleBadge = document.getElementById('roleBadge');
  const loginError = document.getElementById('loginError');

  // Security: Check if user is authorized admin
  async function isAuthorizedAdmin(user) {
    if (!user || !user.email) return false;
    
    // Check email whitelist
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.warn('Unauthorized admin access attempt:', user.email);
      return false;
    }

    // Check user role in Firestore
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      const role = (userData.role || '').toLowerCase();
      
      return ['admin', 'gerente', 'vendedor'].includes(role);
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  // Security: Session management
  function startSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
      console.log('Session timeout - logging out');
      logout();
    }, SESSION_TIMEOUT);
  }

  function resetSessionTimer() {
    startSessionTimer();
  }

  // Security: Enhanced logout
  async function logout() {
    try {
      await signOut(auth);
      sessionStorage.removeItem('adminSession');
      localStorage.removeItem('adminSession');
      if (sessionTimer) clearTimeout(sessionTimer);
      showAuthGate();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Security: Show login form
  function showAuthGate() {
    authGate.classList.remove('hidden');
    dashboard.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  // Security: Show dashboard
  function showDashboard(userRole) {
    authGate.classList.add('hidden');
    dashboard.classList.remove('hidden');
    setView(userRole);
    startSessionTimer();
  }

  // Security: Show login error
  function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
    setTimeout(() => {
      loginError.classList.add('hidden');
    }, 5000);
  }

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

  // Variáveis de paginação
  let usuariosData = [];
  let usuariosPage = 1;
  const usuariosPerPage = 5;
  
  let tokensData = [];
  let tokensPage = 1;
  const tokensPerPage = 3;
  
  let tokenUsageData = [];
  let tokenUsagePage = 1;
  const tokenUsagePerPage = 3;
  
  let confirmedOrdersData = [];
  let confirmedOrdersPage = 1;
  const confirmedOrdersPerPage = 5;

  // Função para carregar usuários do Firestore
  async function carregarUsuarios() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    try {
      // Buscar usuários no Firestore
      const usersRef = collection(window.firebaseDb, 'users');
      const snapshot = await getDocs(usersRef);
      
      // Armazenar todos os dados
      usuariosData = [];
      snapshot.forEach(doc => {
        usuariosData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Atualizar contador
      document.getElementById('usersCount').textContent = `${usuariosData.length} usuários`;
      
      // Mostrar primeira página
      mostrarUsuariosPagina(1);
      
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      tbody.innerHTML = '<tr><td colspan="2" class="py-6 text-center text-red-500">Erro ao carregar usuários</td></tr>';
    }
  }

  // Função para mostrar usuários da página específica
  function mostrarUsuariosPagina(pagina) {
    const tbody = document.getElementById('usersTableBody');
    const startIndex = (pagina - 1) * usuariosPerPage;
    const endIndex = startIndex + usuariosPerPage;
    const usuariosPagina = usuariosData.slice(startIndex, endIndex);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Adicionar usuários da página
    usuariosPagina.forEach(user => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-100 hover:bg-gray-50';
      
      row.innerHTML = `
        <td class="py-2 px-2">${user.email || 'Email não informado'}</td>
        <td class="py-2 px-2">
          <select class="role-select border border-gray-300 rounded px-2 py-1 text-xs" data-uid="${user.id}">
            <option value="Vendedor" ${user.role === 'Vendedor' ? 'selected' : ''}>Vendedor</option>
            <option value="Gerente" ${user.role === 'Gerente' ? 'selected' : ''}>Gerente</option>
            <option value="Ceo" ${user.role === 'Ceo' ? 'selected' : ''}>Ceo</option>
          </select>
        </td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Atualizar informações de paginação
    const totalPages = Math.ceil(usuariosData.length / usuariosPerPage);
    document.getElementById('usersPageInfo').textContent = `Página ${pagina} de ${totalPages}`;
    
    // Gerar botões de paginação
    gerarBotoesPaginacao('usersPagination', pagina, totalPages, (p) => mostrarUsuariosPagina(p));
    
    // Adicionar event listener para mudanças de role
    tbody.addEventListener('change', alterarRole);
  }

  // Função para gerar botões de paginação
  function gerarBotoesPaginacao(containerId, paginaAtual, totalPaginas, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPaginas <= 1) return;
    
    // Botão anterior
    if (paginaAtual > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '«';
      prevBtn.className = 'px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded';
      prevBtn.onclick = () => callback(paginaAtual - 1);
      container.appendChild(prevBtn);
    }
    
    // Números das páginas
    const startPage = Math.max(1, paginaAtual - 2);
    const endPage = Math.min(totalPaginas, paginaAtual + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.className = `px-2 py-1 text-xs rounded ${i === paginaAtual ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`;
      pageBtn.onclick = () => callback(i);
      container.appendChild(pageBtn);
    }
    
    // Botão próximo
    if (paginaAtual < totalPaginas) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = '»';
      nextBtn.className = 'px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded';
      nextBtn.onclick = () => callback(paginaAtual + 1);
      container.appendChild(nextBtn);
    }
  }

  // Função para alterar role do usuário
  async function alterarRole(event) {
    if (!event.target.classList.contains('role-select')) return;
    
    const select = event.target;
    const uid = select.getAttribute('data-uid');
    const novoRole = select.value;
    const email = select.closest('tr').querySelector('td:first-child').textContent;
    
    // Desabilitar select durante a operação
    select.disabled = true;
    select.style.opacity = '0.6';
    
    try {
      // Atualizar no Firestore
      const userRef = doc(window.firebaseDb, 'users', uid);
      await updateDoc(userRef, { role: novoRole });
      
      // Mostrar sucesso
      alert(`Role de ${email} alterado para ${novoRole} com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao alterar role:', error);
      alert('Erro ao alterar role. Tente novamente.');
      
      // Reverter select para valor anterior
      select.value = select.getAttribute('data-original-value') || 'Vendedor';
    } finally {
      // Reabilitar select
      select.disabled = false;
      select.style.opacity = '1';
    }
  }

  // Função para carregar dados de tokens
  async function carregarDadosTokens() {
    try {
      console.log('🔍 Carregando dados de tokens...');
      // Buscar pedidos de tokens
      const ordersRef = collection(window.firebaseDb, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      console.log('📊 Total de pedidos encontrados:', ordersSnapshot.size);
      
      tokensData = [];
      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        const status = String(order.status || '').toLowerCase();
        const descriptorRaw = order.description || order.item || order.itemName || order.title || '';
        const descriptor = String(descriptorRaw).toLowerCase();
        console.log('🔍 Analisando pedido:', {
          id: doc.id,
          item: order.item,
          itemName: order.itemName,
          title: order.title,
          description: order.description,
          status,
          customer: order.customer || order.customerName || order.buyerEmail
        });
        // Considera tokens se houver menção a "token" em qualquer campo descritivo
        if (descriptor.includes('token')) {
          // Apenas pedidos pagos/confirmados entram nas compras
          if (['paid','approved','confirmed'].includes(status)) {
            const originalDate = order.createdAt ? (order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt)) : new Date(order.timestamp || 0);
            // Tenta extrair quantidade de tokens do texto
            const m = String(descriptorRaw).match(/(\d+)\s*token/i);
            const tokenQty = m ? parseInt(m[1]) : (order.tokens || 1);
            tokensData.push({
              id: doc.id,
              cliente: order.customer || order.customerName || order.buyerEmail || 'Cliente não informado',
              pacote: order.item || order.itemName || order.title || 'Pacote de Tokens',
              tokens: tokenQty,
              valor: order.amount || order.total || 0,
              data: originalDate.toLocaleDateString('pt-BR'),
              originalDate: originalDate
            });
          }
        }
      });
      
      // Ordenar por data (mais recentes primeiro) - usar timestamp original
      tokensData.sort((a, b) => {
        const dateA = a.originalDate || new Date(0);
        const dateB = b.originalDate || new Date(0);
        return dateB - dateA;
      });
      
      // Atualizar contador
      document.getElementById('tokensCount').textContent = `${tokensData.length} compras`;
      document.getElementById('totalTokensPurchased').textContent = tokensData.length;
      console.log('✅ Tokens carregados:', tokensData.length);
      
      // Mostrar primeira página
      mostrarTokensPagina(1);
      
    } catch (error) {
      console.error('Erro ao carregar dados de tokens:', error);
    }
  }

  // Função para mostrar tokens da página específica
  function mostrarTokensPagina(pagina) {
    const tbody = document.getElementById('tokensTbody');
    const startIndex = (pagina - 1) * tokensPerPage;
    const endIndex = startIndex + tokensPerPage;
    const tokensPagina = tokensData.slice(startIndex, endIndex);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Adicionar tokens da página
    tokensPagina.forEach(token => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-100 hover:bg-gray-50';
      
      row.innerHTML = `
        <td class="py-1 px-1 text-xs">${token.cliente}</td>
        <td class="py-1 px-1 text-xs">${token.pacote}</td>
        <td class="py-1 px-1 text-xs">${token.tokens}</td>
        <td class="py-1 px-1 text-xs">${token.valor}</td>
        <td class="py-1 px-1 text-xs">${token.data}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Atualizar informações de paginação
    const totalPages = Math.ceil(tokensData.length / tokensPerPage);
    document.getElementById('tokensPageInfo').textContent = `Página ${pagina} de ${totalPages}`;
    
    // Gerar botões de paginação
    gerarBotoesPaginacao('tokensPagination', pagina, totalPages, (p) => mostrarTokensPagina(p));
  }

  // Função para carregar dados de uso de tokens
  async function carregarDadosUsoTokens() {
    try {
      // Buscar registros de uso de tokens
      const registrationsRef = collection(window.firebaseDb, 'registrations');
      const registrationsSnapshot = await getDocs(registrationsRef);
      
      tokenUsageData = [];
      registrationsSnapshot.forEach(doc => {
        const reg = doc.data();
        if (reg.paidWithTokens) {
          const originalDate = reg.createdAt ? (reg.createdAt.seconds ? new Date(reg.createdAt.seconds * 1000) : new Date(reg.createdAt)) : new Date(0);
          tokenUsageData.push({
            id: doc.id,
            cliente: reg.email || 'Cliente não informado',
            evento: reg.eventType || reg.title || 'Evento',
            tokens: reg.tokensUsed || '1',
            data: originalDate.toLocaleString('pt-BR'),
            originalDate: originalDate
          });
        }
      });
      
      // Ordenar por data (mais recentes primeiro) - usar timestamp original
      tokenUsageData.sort((a, b) => {
        const dateA = a.originalDate || new Date(0);
        const dateB = b.originalDate || new Date(0);
        return dateB - dateA;
      });
      
      // Atualizar contador
      document.getElementById('totalTokensUsed').textContent = tokenUsageData.length;
      
      // Mostrar primeira página
      mostrarUsoTokensPagina(1);
      
    } catch (error) {
      console.error('Erro ao carregar dados de uso de tokens:', error);
    }
  }

  // Função para mostrar uso de tokens da página específica
  function mostrarUsoTokensPagina(pagina) {
    const tbody = document.getElementById('tokenUsageTbody');
    const startIndex = (pagina - 1) * tokenUsagePerPage;
    const endIndex = startIndex + tokenUsagePerPage;
    const tokenUsagePagina = tokenUsageData.slice(startIndex, endIndex);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Adicionar uso de tokens da página
    tokenUsagePagina.forEach(usage => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-100 hover:bg-gray-50';
      
      row.innerHTML = `
        <td class="py-1 px-1 text-xs">${usage.cliente}</td>
        <td class="py-1 px-1 text-xs">${usage.evento}</td>
        <td class="py-1 px-1 text-xs">${usage.tokens}</td>
        <td class="py-1 px-1 text-xs">${usage.data}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Atualizar informações de paginação
    const totalPages = Math.ceil(tokenUsageData.length / tokenUsagePerPage);
    
    // Gerar botões de paginação
    gerarBotoesPaginacao('tokenUsagePagination', pagina, totalPages, (p) => mostrarUsoTokensPagina(p));
  }

  // Função para carregar pedidos confirmados
  async function carregarPedidosConfirmados() {
    try {
      console.log('🔍 Carregando pedidos confirmados...');
      // Buscar pedidos confirmados
      const ordersRef = collection(window.firebaseDb, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      console.log('📊 Total de pedidos encontrados:', ordersSnapshot.size);
      
      confirmedOrdersData = [];
      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        console.log('🔍 Analisando pedido confirmado:', {
          id: doc.id,
          status: order.status,
          item: order.item,
          title: order.title,
          customer: order.customer
        });
        if (['paid','approved','confirmed'].includes(String(order.status||'').toLowerCase())) {
          const originalDate = order.createdAt ? (order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt)) : new Date(0);
          confirmedOrdersData.push({
            id: doc.id,
            cliente: order.customer || order.customerName || order.buyerEmail || 'Cliente não informado',
            item: order.title || order.item || order.productName || 'Item não informado',
            valor: order.amount || order.total || 0,
            data: originalDate.toLocaleDateString('pt-BR'),
            originalDate: originalDate
          });
        }
      });
      
      // Ordenar por data (mais recentes primeiro)
      confirmedOrdersData.sort((a, b) => {
        const dateA = a.originalDate || new Date(0);
        const dateB = b.originalDate || new Date(0);
        return dateB - dateA;
      });
      
      // Atualizar contador
      document.getElementById('confirmedCount').textContent = `${confirmedOrdersData.length} pedidos`;
      console.log('✅ Pedidos confirmados carregados:', confirmedOrdersData.length);
      
      // Mostrar primeira página
      mostrarPedidosConfirmadosPagina(1);
      
    } catch (error) {
      console.error('Erro ao carregar pedidos confirmados:', error);
    }
  }

  // Função para mostrar pedidos confirmados da página específica
  function mostrarPedidosConfirmadosPagina(pagina) {
    const tbody = document.getElementById('confirmedTbody');
    const startIndex = (pagina - 1) * confirmedOrdersPerPage;
    const endIndex = startIndex + confirmedOrdersPerPage;
    const pedidosPagina = confirmedOrdersData.slice(startIndex, endIndex);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Adicionar pedidos da página
    pedidosPagina.forEach(pedido => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-100 hover:bg-gray-50';
      
      row.innerHTML = `
        <td class="py-1 px-1 text-xs">${pedido.cliente}</td>
        <td class="py-1 px-1 text-xs">${pedido.item}</td>
        <td class="py-1 px-1 text-xs">${pedido.valor}</td>
        <td class="py-1 px-1 text-xs">${pedido.data}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Atualizar informações de paginação
    const totalPages = Math.ceil(confirmedOrdersData.length / confirmedOrdersPerPage);
    document.getElementById('confirmedPageInfo').textContent = `Página ${pagina} de ${totalPages}`;
    
    // Gerar botões de paginação
    gerarBotoesPaginacao('confirmedPagination', pagina, totalPages, (p) => mostrarPedidosConfirmadosPagina(p));
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
    try { 
      console.log('🔍 Carregando dados...');
      await carregarUsuarios(); 
      console.log('✅ Usuários carregados');
      await carregarDadosTokens();
      console.log('✅ Tokens carregados');
      await carregarDadosUsoTokens();
      console.log('✅ Uso de tokens carregado');
      await carregarPedidosConfirmados();
      console.log('✅ Pedidos confirmados carregados');
    } catch(e){
      console.error('❌ Erro ao carregar dados:', e);
    }
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
      await loadReports(); // Reabilitado - loadTokensData foi desabilitado dentro
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
      // await loadTokensData().catch(()=>{}); // Desabilitado - usando novas funções de paginação
      await renderSalesChart().catch(()=>{});
      await renderTopProducts().catch(()=>{});
      await renderPopularHours().catch(()=>{});
      await renderActiveUsers().catch(()=>{});
    }catch(e){ console.error('Erro ao carregar relatórios', e); }
  }

  // Funções para gerenciar tokens
  async function loadTokensData() {
    console.log('🔍 Loading tokens data...');
    try {
      await loadTokenPurchases();
      await loadTokenUsage();
      await updateTokenStats();
    } catch (error) {
      console.error('❌ Error loading tokens data:', error);
    }
  }

  async function loadTokenPurchases() {
    console.log('🔍 Loading token purchases...');
    try {
      const ordersSnap = await getDocs(collection(window.firebaseDb, 'orders'));
      const orders = [];
      
      ordersSnap.forEach(doc => {
        const data = doc.data();
        if (data.item && (data.item.includes('Token') || data.item.includes('token'))) {
          orders.push({
            id: doc.id,
            ...data
          });
        }
      });

      console.log('🔍 Found token orders:', orders.length);
      
      // Ordenar por data mais recente
      orders.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.timestamp || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      // Mostrar apenas os últimos 10
      const recentOrders = orders.slice(0, 10);
      
      const tbody = document.getElementById('tokensTbody');
      if (tbody) {
        tbody.innerHTML = '';
        
        recentOrders.forEach(order => {
          const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.timestamp || 0);
          const formattedDate = date.toLocaleDateString('pt-BR');
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="px-4 py-2">${order.customer || order.customerEmail || '-'}</td>
            <td class="px-4 py-2">${order.item || '-'}</td>
            <td class="px-4 py-2">${extractTokenQuantity(order.item)}</td>
            <td class="px-4 py-2">${brl(order.amount || order.total || 0)}</td>
            <td class="px-4 py-2">${formattedDate}</td>
          `;
          tbody.appendChild(row);
        });
      }
    } catch (error) {
      console.error('❌ Error loading token purchases:', error);
    }
  }

  async function loadTokenUsage() {
    console.log('🔍 Loading token usage...');
    try {
      const regsSnap = await getDocs(collection(window.firebaseDb, 'registrations'));
      const usages = [];
      
      regsSnap.forEach(doc => {
        const data = doc.data();
        if (data.paidWithTokens === true) {
          usages.push({
            id: doc.id,
            ...data
          });
        }
      });

      console.log('🔍 Found token usages:', usages.length);
      
      // Ordenar por data mais recente
      usages.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.timestamp || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      // Mostrar apenas os últimos 10
      const recentUsages = usages.slice(0, 10);
      
      const tbody = document.getElementById('tokenUsageTbody');
      if (tbody) {
        tbody.innerHTML = '';
        
        recentUsages.forEach(usage => {
          const date = usage.createdAt?.toDate ? usage.createdAt.toDate() : new Date(usage.timestamp || 0);
          const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="px-4 py-2">${usage.email || '-'}</td>
            <td class="px-4 py-2">${usage.eventType || '-'}</td>
            <td class="px-4 py-2">${getTokenCountForEvent(usage.eventType)}</td>
            <td class="px-4 py-2">${formattedDate}</td>
          `;
          tbody.appendChild(row);
        });
      }
    } catch (error) {
      console.error('❌ Error loading token usage:', error);
    }
  }

  async function updateTokenStats() {
    console.log('🔍 Updating token stats...');
    try {
      // Calcular tokens comprados
      const ordersSnap = await getDocs(collection(window.firebaseDb, 'orders'));
      let totalTokensPurchased = 0;
      
      ordersSnap.forEach(doc => {
        const data = doc.data();
        if (data.item && (data.item.includes('Token') || data.item.includes('token'))) {
          totalTokensPurchased += extractTokenQuantity(data.item);
        }
      });

      // Calcular tokens usados
      const regsSnap = await getDocs(collection(window.firebaseDb, 'registrations'));
      let totalTokensUsed = 0;
      
      regsSnap.forEach(doc => {
        const data = doc.data();
        if (data.paidWithTokens === true) {
          totalTokensUsed += getTokenCountForEvent(data.eventType);
        }
      });

      console.log('🔍 Token stats:', { totalTokensPurchased, totalTokensUsed });

      // Atualizar UI
      const purchasedEl = document.getElementById('totalTokensPurchased');
      const usedEl = document.getElementById('totalTokensUsed');
      
      if (purchasedEl) purchasedEl.textContent = totalTokensPurchased;
      if (usedEl) usedEl.textContent = totalTokensUsed;
    } catch (error) {
      console.error('❌ Error updating token stats:', error);
    }
  }

  function extractTokenQuantity(item) {
    const match = item.match(/(\d+)\s*Token/i);
    return match ? parseInt(match[1]) : 1;
  }

  function getTokenCountForEvent(eventType) {
    // Todos os eventos usam 1 token
    return 1;
  }

  function brl(n){ try {return n.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})} catch(_) {return `R$ ${Number(n||0).toFixed(2)}`;} }

  async function loadKpis(){
    const kpiTodayEl = document.getElementById('kpiToday');
    const kpiMonthEl = document.getElementById('kpiMonth');
    const kpiRecEl = document.getElementById('kpiReceivable');
    const kpiActiveEl = document.getElementById('kpiActiveUsers');
    if (!kpiTodayEl || !kpiMonthEl || !kpiRecEl) return;

    console.log('🔍 loadKpis: Calculando vendas...');

    // Usar a mesma lógica da loadKPIs() que está funcionando corretamente
    const { collection, query, where, getDocsFromServer } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    const ordersCol = collection(window.firebaseDb, 'orders');

    // Today sales (sum) - apenas pedidos pagos
    const today = new Date();
    today.setHours(0,0,0,0);
    const qToday = query(ordersCol, where('createdAt', '>=', today));
    const todaySnap = await getDocsFromServer(qToday);
    let sumToday = 0;
    todaySnap.forEach(d => {
        const data = d.data();
        const status = (data.status || '').toLowerCase();
        if (status === 'paid' || status === 'approved' || status === 'confirmed') {
            sumToday += Number(data.amount || 0);
        }
    });

    // Month sales - apenas pedidos pagos
    const firstMonth = new Date();
    firstMonth.setDate(1); firstMonth.setHours(0,0,0,0);
    const qMonth = query(ordersCol, where('createdAt', '>=', firstMonth));
    const monthSnap = await getDocsFromServer(qMonth);
    let sumMonth = 0, receivable = 0;
    monthSnap.forEach(d => {
        const data = d.data();
        const val = Number(data.amount || 0);
        const status = (data.status || '').toLowerCase();
        
        // Apenas pedidos pagos para o total do mês
        if (status === 'paid' || status === 'approved' || status === 'confirmed') {
            sumMonth += val;
        }
        
        // Pedidos pendentes para receber
        if (status === 'pending') {
            receivable += val;
        }
    });
    
    console.log('📊 loadKpis - Vendas hoje:', sumToday, 'Vendas mês:', sumMonth, 'A receber:', receivable);
    
    kpiTodayEl.textContent = brl(sumToday);
    kpiMonthEl.textContent = brl(sumMonth);
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
    try { await loadTokensData(); } catch(_){ }
  }

  async function loadRecentOrders(){
    const tbody = document.getElementById('ordersTbody');
    const count = document.getElementById('ordersCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    const items = [];
    
    // Orders - apenas pedidos com dados completos
    try {
    const snap = await getDocs(collection(window.firebaseDb,'orders'));
      snap.forEach(d=>{ 
        const o = d.data(); 
        const ts = new Date(o.createdAt||o.timestamp||0); 
        if (period.from && ts < period.from) return; 
        if (period.to && ts > period.to) return; 
        
        // Só adiciona se tiver dados essenciais
        const client = o.customer || o.buyerEmail || '';
        const item = o.item || o.productName || '';
        const value = Number(o.amount || o.total || 0);
        const status = o.status || '—';
        
        if (client && item && value > 0) {
          items.push({ 
            ts, 
            client, 
            item, 
            value, 
            status,
            id: d.id 
          }); 
        }
      });
    } catch(e) { console.error('Erro ao carregar orders:', e); }
    
    // Registrations pagas - apenas com dados completos
    try{
      const regsSnap = await getDocs(collection(window.firebaseDb,'registrations'));
      regsSnap.forEach(d=>{ 
        const r = d.data(); 
        const status = (r.status || '').toLowerCase(); 
        if (status !== 'paid') return; 
        
        const ts = (r.createdAt?.toDate ? r.createdAt.toDate() : (r.timestamp ? new Date(r.timestamp) : new Date())); 
        if (period.from && ts < period.from) return; 
        if (period.to && ts > period.to) return; 
        
        // Só adiciona se tiver dados essenciais
        const client = r.email || '';
        const item = r.title || r.eventType || '';
        const value = Number(r.price || 0);
        
        if (client && item && value > 0) {
          items.push({ 
            ts, 
            client, 
            item, 
            value, 
            status: 'paid',
            id: d.id 
          }); 
        }
      });
    } catch(e) { console.error('Erro ao carregar registrations:', e); }
    
    // ordenar por data desc e renderizar
    items.sort((a,b)=> b.ts - a.ts);
    
    // Limitar a 20 pedidos mais recentes
    const recentItems = items.slice(0, 20);
    
    recentItems.forEach((row, index) => { 
      const tr = document.createElement('tr'); 
      tr.innerHTML = `
        <td class="py-2 font-mono text-xs">${row.id ? row.id.substring(0, 6) : index + 1}</td>
        <td class="py-2">${row.client}</td>
        <td class="py-2">${row.item}</td>
        <td class="py-2 font-semibold">${brl(row.value)}</td>
        <td class="py-2">
          <span class="px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
            ${row.status}
          </span>
        </td>
      `; 
      tbody.appendChild(tr); 
    });
    
    if (count) count.textContent = `${recentItems.length} pedidos`;
  }

  // Nova função para carregar dados de tokens
  async function loadTokensData(){
    try {
      console.log('=== DEBUG: Carregando dados de tokens ===');
      
      // Debug: mostrar todos os orders
      const ordersSnap = await getDocs(collection(window.firebaseDb,'orders'));
      console.log('Total orders:', ordersSnap.size);
      ordersSnap.forEach(d => {
        const o = d.data();
        console.log('Order:', {
          id: d.id,
          description: o.description,
          item: o.item,
          status: o.status,
          customer: o.customer || o.buyerEmail
        });
      });
      
      // Debug: mostrar todas as registrations
      const regsSnap = await getDocs(collection(window.firebaseDb,'registrations'));
      console.log('Total registrations:', regsSnap.size);
      regsSnap.forEach(d => {
        const r = d.data();
        console.log('Registration:', {
          id: d.id,
          email: r.email,
          eventType: r.eventType,
          paidWithTokens: r.paidWithTokens,
          status: r.status
        });
      });
      
      // Carregar compras de tokens
      await loadTokenPurchases();
      // Carregar uso de tokens
      await loadTokenUsage();
      // Atualizar estatísticas gerais
      await updateTokenStats();
    } catch(e) { 
      console.error('Erro ao carregar dados de tokens:', e); 
    }
  }

  // Carregar compras de tokens
  async function loadTokenPurchases(){
    const tbody = document.getElementById('tokensTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    try {
      const snap = await getDocs(collection(window.firebaseDb,'orders'));
      const tokenPurchases = [];
      
      snap.forEach(d => {
        const o = d.data();
        const description = o.description || o.item || '';
        
        // Verifica se é uma compra de tokens (mais flexível)
        if (description.toLowerCase().includes('token') || 
            description.toLowerCase().includes('xtreino') ||
            (o.item && o.item.toLowerCase().includes('token'))) {
          const ts = new Date(o.createdAt || o.timestamp || 0);
          if (period.from && ts < period.from) return;
          if (period.to && ts > period.to) return;
          
          // Extrai quantidade de tokens da descrição (mais flexível)
          const tokenMatch = description.match(/(\d+)\s*token/i) || 
                           description.match(/token[:\s]*(\d+)/i) ||
                           description.match(/(\d+)\s*xtreino/i);
          const tokenCount = tokenMatch ? parseInt(tokenMatch[1]) : 1;
          
          console.log('Token purchase found:', {
            description,
            tokenCount,
            client: o.customer || o.buyerEmail,
            status: o.status
          });
          
          tokenPurchases.push({
            ts,
            client: o.customer || o.buyerEmail || '',
            package: description,
            tokens: tokenCount,
            value: Number(o.amount || o.total || 0),
            id: d.id
          });
        }
      });
      
      // Ordenar por data desc e mostrar últimos 10
      tokenPurchases.sort((a,b) => b.ts - a.ts);
      const recentPurchases = tokenPurchases.slice(0, 10);
      
      recentPurchases.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="py-2">${row.client}</td>
          <td class="py-2">${row.package}</td>
          <td class="py-2 font-semibold text-green-600">${row.tokens}</td>
          <td class="py-2 font-semibold">${brl(row.value)}</td>
          <td class="py-2 text-gray-500">${row.ts.toLocaleDateString('pt-BR')}</td>
        `;
        tbody.appendChild(tr);
      });
      
    } catch(e) { 
      console.error('Erro ao carregar compras de tokens:', e); 
    }
  }

  // Carregar uso de tokens
  async function loadTokenUsage(){
    const tbody = document.getElementById('tokenUsageTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    try {
      const snap = await getDocs(collection(window.firebaseDb,'registrations'));
      const tokenUsage = [];
      
      snap.forEach(d => {
        const r = d.data();
        
        // Verifica se foi pago com tokens
        if (r.paidWithTokens === true) {
          console.log('Token usage found:', {
            client: r.email,
            event: r.title || r.eventType,
            paidWithTokens: r.paidWithTokens,
            status: r.status
          });
          const ts = (r.createdAt?.toDate ? r.createdAt.toDate() : (r.timestamp ? new Date(r.timestamp) : new Date()));
          if (period.from && ts < period.from) return;
          if (period.to && ts > period.to) return;
          
          // Determina quantidade de tokens baseado no tipo de evento
          let tokenCount = 1; // padrão
          const eventType = (r.eventType || '').toLowerCase();
          if (eventType.includes('modo liga')) tokenCount = 3;
          else if (eventType.includes('semanal')) tokenCount = 3.5;
          else if (eventType.includes('final semanal')) tokenCount = 7;
          else if (eventType.includes('camp')) tokenCount = 5;
          
          tokenUsage.push({
            ts,
            client: r.email || '',
            event: r.title || r.eventType || 'Evento',
            tokens: tokenCount,
            schedule: r.schedule || '',
            id: d.id
          });
        }
      });
      
      // Ordenar por data desc e mostrar últimos 10
      tokenUsage.sort((a,b) => b.ts - a.ts);
      const recentUsage = tokenUsage.slice(0, 10);
      
      recentUsage.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="py-2">${row.client}</td>
          <td class="py-2">${row.event}</td>
          <td class="py-2 font-semibold text-blue-600">${row.tokens}</td>
          <td class="py-2 text-gray-500">${row.ts.toLocaleDateString('pt-BR')} ${row.schedule}</td>
        `;
        tbody.appendChild(tr);
      });
      
    } catch(e) { 
      console.error('Erro ao carregar uso de tokens:', e); 
    }
  }

  // Atualizar estatísticas gerais de tokens
  async function updateTokenStats(){
    try {
      let totalPurchased = 0;
      let totalUsed = 0;
      
      // Contar tokens comprados
      const ordersSnap = await getDocs(collection(window.firebaseDb,'orders'));
      ordersSnap.forEach(d => {
        const o = d.data();
        const description = o.description || o.item || '';
        
        if ((description.toLowerCase().includes('token') || 
             description.toLowerCase().includes('xtreino') ||
             (o.item && o.item.toLowerCase().includes('token'))) && 
            o.status === 'paid') {
          const tokenMatch = description.match(/(\d+)\s*token/i);
          const tokenCount = tokenMatch ? parseInt(tokenMatch[1]) : 1;
          totalPurchased += tokenCount;
        }
      });
      
      // Contar tokens usados
      const regsSnap = await getDocs(collection(window.firebaseDb,'registrations'));
      regsSnap.forEach(d => {
        const r = d.data();
        
        if (r.paidWithTokens === true) {
          const eventType = (r.eventType || '').toLowerCase();
          let tokenCount = 1;
          if (eventType.includes('modo liga')) tokenCount = 3;
          else if (eventType.includes('semanal')) tokenCount = 3.5;
          else if (eventType.includes('final semanal')) tokenCount = 7;
          else if (eventType.includes('camp')) tokenCount = 5;
          
          totalUsed += tokenCount;
        }
      });
      
      // Atualizar elementos
      const purchasedEl = document.getElementById('totalTokensPurchased');
      const usedEl = document.getElementById('totalTokensUsed');
      
      if (purchasedEl) purchasedEl.textContent = totalPurchased;
      if (usedEl) usedEl.textContent = totalUsed;
      
    } catch(e) { 
      console.error('Erro ao atualizar estatísticas de tokens:', e); 
    }
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
      });

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
      // Busca todas as reservas do dia; filtra por eventType e hora com normaliza e7 e3o (schedule ou hour)
      const snap = await getDocs(query(regs, where('date','==', date)));
      list.innerHTML = '';
      let any = false;
      const evLower = String(eventType||'').toLowerCase();
      const hourDigits = (String(hour).match(/\d+/g)||[]).join('');
      snap.forEach(d=>{
        const r = d.data();
        if (evLower && r.eventType && !String(r.eventType).toLowerCase().includes(evLower)) return;
        const schedStr = String(r.schedule||'');
        const hourStr = String(r.hour||'');
        const combined = `${schedStr} ${hourStr}`.toLowerCase();
        const combinedDigits = (combined.match(/\d+/g)||[]).join('');
        const matches = combined.includes(String(hour).toLowerCase()) || (!!hourDigits && combinedDigits.includes(hourDigits));
        if (!matches) return;
        any = true;
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between border-b py-2';
        row.innerHTML = `<div class="text-sm"><div class="font-semibold">${r.teamName||r.email||'-'}</div><div class="text-gray-500">${r.contact||r.phone||''}</div></div>
          <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" data-remove-reg-id="${d.id}">Remover</button>`;
        list.appendChild(row);
      });
      if (!any){ list.innerHTML = '<div class="text-sm text-gray-500">Nenhum time neste horário.</div>'; }
      list.addEventListener('click', async (e)=>{
        const btn = e.target.closest('[data-remove-reg-id]');
        if (!btn) return;
        const id = btn.getAttribute('data-remove-reg-id');
        try{
          await deleteDoc(doc(collection(window.firebaseDb,'registrations'), id));
          btn.closest('.flex')?.remove();
          try{ await loadBoard(); }catch(_){ }
        }catch(_){ alert('Falha ao remover.'); }
      });
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

    console.log('🔍 loadKPIs: Calculando vendas...');

    // Today sales (sum) - apenas pedidos pagos
    const today = new Date();
    today.setHours(0,0,0,0);
    const qToday = query(ordersCol, where('createdAt', '>=', today));
    const todaySnap = await getDocsFromServer(qToday);
    let sumToday = 0;
    todaySnap.forEach(d => {
        const data = d.data();
        const status = (data.status || '').toLowerCase();
        if (status === 'paid' || status === 'approved' || status === 'confirmed') {
            sumToday += Number(data.amount || 0);
        }
    });
    document.getElementById('kpiToday').textContent = currencyBRL(sumToday);
    console.log('📊 Vendas hoje:', sumToday);

    // Month sales - apenas pedidos pagos
    const firstMonth = new Date();
    firstMonth.setDate(1); firstMonth.setHours(0,0,0,0);
    const qMonth = query(ordersCol, where('createdAt', '>=', firstMonth));
    const monthSnap = await getDocsFromServer(qMonth);
    let sumMonth = 0, receivable = 0;
    monthSnap.forEach(d => {
        const data = d.data();
        const val = Number(data.amount || 0);
        const status = (data.status || '').toLowerCase();
        
        // Apenas pedidos pagos para o total do mês
        if (status === 'paid' || status === 'approved' || status === 'confirmed') {
            sumMonth += val;
        }
        
        // Pedidos pendentes para receber
        if (status === 'pending') {
            receivable += val;
        }
    });
    document.getElementById('kpiMonth').textContent = currencyBRL(sumMonth);
    document.getElementById('kpiReceivable').textContent = currencyBRL(receivable);
    console.log('📊 Vendas mês:', sumMonth, 'A receber:', receivable);
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
        try { await loadPendingOrders(); } catch (e) { console.error('Pending orders error', e); }
        // try { await loadConfirmedOrders(); } catch (e) { console.error('Confirmed orders error', e); } // Desabilitado - usando nova função com paginação
    });
}

// Função para carregar pedidos confirmados
async function loadConfirmedOrders() {
    try {
        const { collection, getDocs, query, where, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        
        // Buscar pedidos com status 'paid' ou 'approved' - sem orderBy para evitar erro de índice
        const ordersRef = collection(window.firebaseDb, 'orders');
        const q = query(
            ordersRef,
            where('status', 'in', ['paid', 'approved', 'confirmed']),
            limit(50)
        );
        
        const snapshot = await getDocs(q);
        const confirmedTbody = document.getElementById('confirmedTbody');
        const confirmedCount = document.getElementById('confirmedCount');
        
        if (confirmedTbody) {
            confirmedTbody.innerHTML = '';
            
            if (snapshot.empty) {
                confirmedTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Nenhum pedido confirmado encontrado</td></tr>';
            } else {
                // Ordenar manualmente por data
                const orders = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    orders.push({ id: doc.id, ...data });
                });
                
                orders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
                
                orders.forEach(order => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="py-2">${order.customerName || order.customer || '-'}</td>
                        <td class="py-2">${order.title || order.item || '-'}</td>
                        <td class="py-2">R$ ${(order.amount || order.total || 0).toFixed(2)}</td>
                        <td class="py-2">${order.createdAt ? new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                    `;
                    confirmedTbody.appendChild(row);
                });
            }
        }
        
        if (confirmedCount) {
            confirmedCount.textContent = `${snapshot.size} pedidos`;
        }
        
    } catch (error) {
        console.error('Erro ao carregar pedidos confirmados:', error);
    }
}

// Função para carregar pedidos pendentes
async function loadPendingOrders() {
    try {
        const { collection, getDocs, query, where, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        
        // Buscar pedidos com status 'pending' - sem orderBy para evitar erro de índice
        const ordersRef = collection(window.firebaseDb, 'orders');
        const q = query(
            ordersRef,
            where('status', '==', 'pending'),
            limit(50)
        );
        
        const snapshot = await getDocs(q);
        const pendingTbody = document.getElementById('pendingTbody');
        const pendingCount = document.getElementById('pendingCount');
        
        if (pendingTbody) {
            pendingTbody.innerHTML = '';
            
            if (snapshot.empty) {
                pendingTbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Nenhum pedido pendente encontrado</td></tr>';
            } else {
                // Ordenar manualmente por data
                const orders = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    orders.push({ id: doc.id, ...data });
                });
                
                orders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
                
                orders.forEach(order => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="py-2">${order.customerName || order.customer || '-'}</td>
                        <td class="py-2">${order.title || order.item || '-'}</td>
                        <td class="py-2">R$ ${(order.amount || order.total || 0).toFixed(2)}</td>
                        <td class="py-2">${order.createdAt ? new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                        <td class="py-2">
                            <button onclick="approveOrder('${order.id}')" class="text-green-600 hover:text-green-800 text-sm">Aprovar</button>
                        </td>
                    `;
                    pendingTbody.appendChild(row);
                });
            }
        }
        
        if (pendingCount) {
            pendingCount.textContent = `${snapshot.size} pedidos`;
        }
        
    } catch (error) {
        console.error('Erro ao carregar pedidos pendentes:', error);
    }
}

// Função para aprovar pedido
async function approveOrder(orderId) {
    try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const orderRef = doc(window.firebaseDb, 'orders', orderId);
        await updateDoc(orderRef, { status: 'approved' });
        
        alert('Pedido aprovado com sucesso!');
        
        // Recarregar as listas
        await loadPendingOrders();
        await loadConfirmedOrders();
        
    } catch (error) {
        console.error('Erro ao aprovar pedido:', error);
        alert('Erro ao aprovar pedido');
    }
}

// Função para dar tokens a um usuário
async function giveTokensToUser(userEmail, tokenAmount) {
    try {
        const { collection, getDocs, query, where, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        
        // Buscar usuário por email
        const usersRef = collection(window.firebaseDb, 'users');
        const q = query(usersRef, where('email', '==', userEmail));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            alert('Usuário não encontrado com este email');
            return;
        }
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const currentTokens = userData.tokens || 0;
        const newTokens = currentTokens + tokenAmount;
        
        // Atualizar tokens do usuário
        await updateDoc(doc(window.firebaseDb, 'users', userDoc.id), {
            tokens: newTokens
        });
        
        alert(`✅ ${tokenAmount} token(s) adicionado(s) ao usuário ${userEmail}. Novo saldo: ${newTokens} tokens`);
        
    } catch (error) {
        console.error('Erro ao dar tokens:', error);
        alert('Erro ao dar tokens ao usuário');
    }
}

// Função para mostrar modal de dar tokens
function showGiveTokensModal() {
    const email = prompt('Digite o email do usuário:');
    if (!email) return;
    
    const amount = prompt('Quantos tokens dar?');
    if (!amount || isNaN(amount) || amount <= 0) {
        alert('Quantidade inválida');
        return;
    }
    
    if (confirm(`Dar ${amount} token(s) para ${email}?`)) {
        giveTokensToUser(email, parseInt(amount));
    }
}

// ===== GERENCIAMENTO DE DESTAQUES =====

let highlightsData = {};
let highlightCounter = 1;

// ===== GERENCIAMENTO DE NOTÍCIAS =====

let newsData = {};
let newsCounter = 1;

// Carregar destaques do Firestore
async function loadHighlights() {
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const highlightsRef = collection(window.firebaseDb, 'highlights');
        const snapshot = await getDocs(highlightsRef);
        
        highlightsData = {};
        snapshot.forEach(doc => {
            highlightsData[doc.id] = doc.data();
        });
        
        // Se não existem destaques, criar os padrão
        if (Object.keys(highlightsData).length === 0) {
            highlightsData = {
                highlight1: {
                    title: 'Modo Liga - Estratégia',
                    subtitle: 'Treinos competitivos',
                    description: 'Treinos competitivos com pontuação e ranking.',
                    image: '',
                    action: "openPurchaseModal('estrategia')",
                    hasRedirect: false,
                    redirectUrl: ''
                },
                highlight2: {
                    title: 'Campeonato Semanal',
                    subtitle: 'Etapas semanais',
                    description: 'Etapas semanais com premiações.',
                    image: '',
                    action: "openPurchaseModal('planilhas')",
                    hasRedirect: false,
                    redirectUrl: ''
                },
                highlight3: {
                    title: 'Camp de Fases',
                    subtitle: 'Eliminatórias',
                    description: 'Eliminatórias com melhores confrontos.',
                    image: '',
                    action: "openPurchaseModal('camp-fases')",
                    hasRedirect: false,
                    redirectUrl: ''
                }
            };
            
            // Salvar destaques padrão
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            for (const [id, data] of Object.entries(highlightsData)) {
                await setDoc(doc(window.firebaseDb, 'highlights', id), data);
            }
        }
        
        // Atualizar preview
        updateHighlightsPreview(highlightsData);
        
        return highlightsData;
    } catch (error) {
        console.error('Erro ao carregar destaques:', error);
        return {};
    }
}

// Atualizar preview dos destaques
function updateHighlightsPreview(highlights) {
    const preview = document.getElementById('highlightsPreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    Object.keys(highlights).forEach((key, index) => {
        const highlight = highlights[key];
        if (highlight) {
            const div = document.createElement('div');
            div.className = 'border border-gray-200 rounded-lg p-3';
            div.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-sm">Destaque ${index + 1}</h4>
                    <span class="text-xs text-gray-500">${highlight.title}</span>
                </div>
                <p class="text-xs text-gray-600 mb-1">${highlight.subtitle}</p>
                <p class="text-xs text-gray-500">${highlight.description}</p>
                ${highlight.hasRedirect ? `<p class="text-xs text-blue-600 mt-1"><i class="fas fa-link mr-1"></i>Redireciona para: ${highlight.redirectUrl}</p>` : ''}
            `;
            preview.appendChild(div);
        }
    });
}

// Abrir modal de edição
function openHighlightsModal() {
    const modal = document.getElementById('modalHighlights');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Carregar dados atuais e renderizar formulários
    loadHighlights().then(() => {
        renderHighlightsForm();
    });
}

// Renderizar formulário de destaques
function renderHighlightsForm() {
    const container = document.getElementById('highlightsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(highlightsData).forEach((key, index) => {
        const highlight = highlightsData[key];
        const highlightDiv = createHighlightForm(key, highlight, index + 1);
        container.appendChild(highlightDiv);
    });
}

// Criar formulário para um destaque
function createHighlightForm(key, highlight, index) {
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-lg p-4';
    div.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h4 class="font-semibold text-lg">Destaque ${index}</h4>
            <button onclick="removeHighlight('${key}')" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                <i class="fas fa-trash mr-1"></i>Remover
            </button>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium mb-2">Título</label>
                <input id="${key}Title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Ex: Modo Liga - Estratégia" value="${highlight.title || ''}">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Subtítulo</label>
                <input id="${key}Subtitle" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Ex: Treinos competitivos" value="${highlight.subtitle || ''}">
            </div>
            <div class="md:col-span-2">
                <label class="block text-sm font-medium mb-2">Descrição</label>
                <textarea id="${key}Description" class="w-full border border-gray-300 rounded-lg px-3 py-2" rows="2" placeholder="Ex: Treinos competitivos com pontuação e ranking.">${highlight.description || ''}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">URL da Imagem</label>
                <input id="${key}Image" type="url" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="https://exemplo.com/imagem.jpg" value="${highlight.image || ''}">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Ação do Botão</label>
                <select id="${key}Action" class="w-full border border-gray-300 rounded-lg px-3 py-2" onchange="toggleCustomLinkField('${key}')">
                    <option value="openPurchaseModal('estrategia')" ${highlight.action === "openPurchaseModal('estrategia')" ? 'selected' : ''}>Abrir Modal de Compra</option>
                    <option value="scrollToSection('xtreinos')" ${highlight.action === "scrollToSection('xtreinos')" ? 'selected' : ''}>Ir para XTreinos</option>
                    <option value="scrollToSection('loja')" ${highlight.action === "scrollToSection('loja')" ? 'selected' : ''}>Ir para Loja</option>
                    <option value="openScheduleModal('modo-liga')" ${highlight.action === "openScheduleModal('modo-liga')" ? 'selected' : ''}>Abrir Agendamento</option>
                    <option value="openScheduleModal('semanal-freitas')" ${highlight.action === "openScheduleModal('semanal-freitas')" ? 'selected' : ''}>Abrir Agendamento Semanal</option>
                    <option value="openScheduleModal('camp-freitas')" ${highlight.action === "openScheduleModal('camp-freitas')" ? 'selected' : ''}>Abrir Agendamento Camp</option>
                    <option value="custom_link" ${highlight.action === "custom_link" ? 'selected' : ''}>Ir para Link</option>
                </select>
            </div>
            <div id="${key}CustomLinkField" class="mt-3 ${highlight.action === 'custom_link' ? '' : 'hidden'}">
                <label class="block text-sm font-medium mb-2">URL do Link</label>
                <input id="${key}CustomLinkUrl" type="url" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="https://exemplo.com" value="${highlight.customLinkUrl || ''}">
            </div>
            <div class="md:col-span-2">
                <div class="flex items-center gap-3">
                    <label class="flex items-center">
                        <input id="${key}HasRedirect" type="checkbox" class="mr-2" ${highlight.hasRedirect ? 'checked' : ''} onchange="toggleRedirectField('${key}')">
                        <span class="text-sm font-medium">Imagem com link de redirecionamento</span>
                    </label>
                </div>
                <div id="${key}RedirectField" class="mt-3 ${highlight.hasRedirect ? '' : 'hidden'}">
                    <label class="block text-sm font-medium mb-2">URL de Redirecionamento</label>
                    <input id="${key}RedirectUrl" type="url" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="https://exemplo.com" value="${highlight.redirectUrl || ''}">
                </div>
            </div>
        </div>
    `;
    return div;
}

// Fechar modal
function closeHighlightsModal() {
    const modal = document.getElementById('modalHighlights');
    if (modal) modal.classList.add('hidden');
}

// Adicionar novo destaque
function addHighlight() {
    const newKey = `highlight${Date.now()}`;
    const newHighlight = {
        title: '',
        subtitle: '',
        description: '',
        image: '',
        action: "openPurchaseModal('estrategia')",
        hasRedirect: false,
        redirectUrl: ''
    };
    
    highlightsData[newKey] = newHighlight;
    renderHighlightsForm();
}

// Remover destaque
function removeHighlight(key) {
    if (Object.keys(highlightsData).length <= 1) {
        alert('❌ Deve haver pelo menos um destaque!');
        return;
    }
    
    if (confirm('Tem certeza que deseja remover este destaque?')) {
        delete highlightsData[key];
        renderHighlightsForm();
    }
}

// Toggle campo de redirecionamento
function toggleRedirectField(key) {
    const checkbox = document.getElementById(`${key}HasRedirect`);
    const field = document.getElementById(`${key}RedirectField`);
    
    if (checkbox.checked) {
        field.classList.remove('hidden');
    } else {
        field.classList.add('hidden');
    }
}

// Toggle campo de link personalizado
function toggleCustomLinkField(key) {
    const select = document.getElementById(`${key}Action`);
    const field = document.getElementById(`${key}CustomLinkField`);
    
    if (select.value === 'custom_link') {
        field.classList.remove('hidden');
    } else {
        field.classList.add('hidden');
    }
}

// Salvar destaques
async function saveHighlights() {
    try {
        // Coletar dados dos formulários
        const highlights = {};
        
        Object.keys(highlightsData).forEach(key => {
            const title = document.getElementById(`${key}Title`)?.value.trim();
            const subtitle = document.getElementById(`${key}Subtitle`)?.value.trim();
            const description = document.getElementById(`${key}Description`)?.value.trim();
            const image = document.getElementById(`${key}Image`)?.value.trim();
            const action = document.getElementById(`${key}Action`)?.value;
            const hasRedirect = document.getElementById(`${key}HasRedirect`)?.checked || false;
            const redirectUrl = document.getElementById(`${key}RedirectUrl`)?.value.trim() || '';
            const customLinkUrl = document.getElementById(`${key}CustomLinkUrl`)?.value.trim() || '';
            
            if (title) { // Só salvar se tiver título
                highlights[key] = {
                    title,
                    subtitle,
                    description,
                    image,
                    action,
                    hasRedirect,
                    redirectUrl,
                    customLinkUrl,
                    updatedAt: new Date().toISOString()
                };
            }
        });
        
        // Limpar coleção atual
        const { collection, getDocs, deleteDoc, setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const highlightsRef = collection(window.firebaseDb, 'highlights');
        const snapshot = await getDocs(highlightsRef);
        snapshot.forEach(doc => {
            deleteDoc(doc.ref);
        });
        
        // Salvar novos destaques
        for (const [id, data] of Object.entries(highlights)) {
            await setDoc(doc(window.firebaseDb, 'highlights', id), data);
        }
        
        // Atualizar dados locais
        highlightsData = highlights;
        
        // Atualizar preview
        updateHighlightsPreview(highlights);
        
        // Fechar modal
        closeHighlightsModal();
        
        alert('✅ Destaques salvos com sucesso!');
        
    } catch (error) {
        console.error('Erro ao salvar destaques:', error);
        alert('❌ Erro ao salvar destaques');
    }
}

// Tornar funções globais
window.approveOrder = approveOrder;
window.showGiveTokensModal = showGiveTokensModal;
window.openHighlightsModal = openHighlightsModal;
window.closeHighlightsModal = closeHighlightsModal;
window.saveHighlights = saveHighlights;
window.addHighlight = addHighlight;
window.removeHighlight = removeHighlight;
window.toggleRedirectField = toggleRedirectField;
window.toggleCustomLinkField = toggleCustomLinkField;

// ===== FUNÇÕES DE NOTÍCIAS =====

// Carregar notícias do Firestore
async function loadNews() {
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const newsRef = collection(window.firebaseDb, 'news');
        const snapshot = await getDocs(newsRef);
        
        newsData = {};
        snapshot.forEach(doc => {
            newsData[doc.id] = doc.data();
        });
        
        // Se não existem notícias, criar as padrão
        if (Object.keys(newsData).length === 0) {
            newsData = {
                news1: {
                    title: 'Evento: Treinos Modo Liga Especial',
                    content: 'Vagas limitadas às 19h e 21h. Garanta sua inscrição.',
                    image: '',
                    date: new Date().toISOString(),
                    author: 'Equipe XTreino'
                },
                news2: {
                    title: 'Pausa em feriado',
                    content: 'Sem atividades nos dias 24 e 25. Retorno do semanal na semana seguinte.',
                    image: '',
                    date: new Date().toISOString(),
                    author: 'Equipe XTreino'
                },
                news3: {
                    title: 'Convidado verificado no próximo camp',
                    content: 'Participação especial em nosso campeonato de fases.',
                    image: '',
                    date: new Date().toISOString(),
                    author: 'Equipe XTreino'
                }
            };
            
            // Salvar notícias padrão
            const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            for (const [id, data] of Object.entries(newsData)) {
                await setDoc(doc(window.firebaseDb, 'news', id), data);
            }
        }
        
        // Atualizar preview
        updateNewsPreview(newsData);
        
        return newsData;
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        return {};
    }
}

// Atualizar preview das notícias
function updateNewsPreview(news) {
    const preview = document.getElementById('newsPreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    Object.keys(news).forEach((key, index) => {
        const newsItem = news[key];
        if (newsItem) {
            const div = document.createElement('div');
            div.className = 'border border-gray-200 rounded-lg p-3';
            div.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-sm">Notícia ${index + 1}</h4>
                    <span class="text-xs text-gray-500">${newsItem.title}</span>
                </div>
                <p class="text-xs text-gray-600 mb-1">${newsItem.content}</p>
                <p class="text-xs text-gray-500">Por: ${newsItem.author}</p>
            `;
            preview.appendChild(div);
        }
    });
}

// Abrir modal de edição de notícias
function openNewsModal() {
    const modal = document.getElementById('modalNews');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Carregar dados atuais e renderizar formulários
    loadNews().then(() => {
        renderNewsForm();
    });
}

// Renderizar formulário de notícias
function renderNewsForm() {
    const container = document.getElementById('newsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(newsData).forEach((key, index) => {
        const newsItem = newsData[key];
        const newsDiv = createNewsForm(key, newsItem, index + 1);
        container.appendChild(newsDiv);
    });
}

// Criar formulário para uma notícia
function createNewsForm(key, newsItem, index) {
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-lg p-4';
    div.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h4 class="font-semibold text-lg">Notícia ${index}</h4>
            <button onclick="removeNews('${key}')" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                <i class="fas fa-trash mr-1"></i>Remover
            </button>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium mb-2">Título</label>
                <input id="${key}Title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Ex: Novo Sistema de Tokens" value="${newsItem.title || ''}">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Autor</label>
                <input id="${key}Author" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Ex: Equipe XTreino" value="${newsItem.author || ''}">
            </div>
            <div class="md:col-span-2">
                <label class="block text-sm font-medium mb-2">Conteúdo</label>
                <textarea id="${key}Content" class="w-full border border-gray-300 rounded-lg px-3 py-2" rows="3" placeholder="Ex: Agora você pode comprar tokens e usar para participar dos XTreinos!">${newsItem.content || ''}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">URL da Imagem</label>
                <input id="${key}Image" type="url" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="https://exemplo.com/imagem.jpg" value="${newsItem.image || ''}">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Data</label>
                <input id="${key}Date" type="datetime-local" class="w-full border border-gray-300 rounded-lg px-3 py-2" value="${newsItem.date ? new Date(newsItem.date).toISOString().slice(0, 16) : ''}">
            </div>
        </div>
    `;
    return div;
}

// Fechar modal de notícias
function closeNewsModal() {
    const modal = document.getElementById('modalNews');
    if (modal) modal.classList.add('hidden');
}

// Adicionar nova notícia
function addNews() {
    const newKey = `news${Date.now()}`;
    const newNews = {
        title: '',
        content: '',
        image: '',
        date: new Date().toISOString(),
        author: 'Equipe XTreino'
    };
    
    newsData[newKey] = newNews;
    renderNewsForm();
}

// Remover notícia
function removeNews(key) {
    if (Object.keys(newsData).length <= 1) {
        alert('❌ Deve haver pelo menos uma notícia!');
        return;
    }
    
    if (confirm('Tem certeza que deseja remover esta notícia?')) {
        delete newsData[key];
        renderNewsForm();
    }
}

// Salvar notícias
async function saveNews() {
    try {
        // Coletar dados dos formulários
        const news = {};
        
        Object.keys(newsData).forEach(key => {
            const title = document.getElementById(`${key}Title`)?.value.trim();
            const content = document.getElementById(`${key}Content`)?.value.trim();
            const image = document.getElementById(`${key}Image`)?.value.trim();
            const author = document.getElementById(`${key}Author`)?.value.trim();
            const date = document.getElementById(`${key}Date`)?.value;
            
            if (title && content) { // Só salvar se tiver título e conteúdo
                news[key] = {
                    title,
                    content,
                    image,
                    author: author || 'Equipe XTreino',
                    date: date ? new Date(date).toISOString() : new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }
        });
        
        // Limpar coleção atual
        const { collection, getDocs, deleteDoc, setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const newsRef = collection(window.firebaseDb, 'news');
        const snapshot = await getDocs(newsRef);
        snapshot.forEach(doc => {
            deleteDoc(doc.ref);
        });
        
        // Salvar novas notícias
        for (const [id, data] of Object.entries(news)) {
            await setDoc(doc(window.firebaseDb, 'news', id), data);
        }
        
        // Atualizar dados locais
        newsData = news;
        
        // Atualizar preview
        updateNewsPreview(news);
        
        // Fechar modal
        closeNewsModal();
        
        alert('✅ Notícias salvas com sucesso!');
        
    } catch (error) {
        console.error('Erro ao salvar notícias:', error);
        alert('❌ Erro ao salvar notícias');
    }
}

// Tornar funções globais
window.openNewsModal = openNewsModal;
window.closeNewsModal = closeNewsModal;
window.saveNews = saveNews;
window.addNews = addNews;
window.removeNews = removeNews;

// Carregar destaques quando o admin estiver pronto
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.firebaseDb && document.getElementById('highlightsPreview')) {
            loadHighlights();
        }
        if (window.firebaseDb && document.getElementById('newsPreview')) {
            loadNews();
        }
    }, 2000);
});

// ==================== SISTEMA DE PRODUTOS ====================

let productsData = {};
let productCounter = 0;

// Carregar produtos do Firestore
async function loadProducts() {
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const productsSnapshot = await getDocs(collection(window.firebaseDb, 'products'));
        
        if (productsSnapshot.empty) {
            // Criar produtos padrão se não existirem
            await createDefaultProducts();
            return;
        }
        
        productsData = {};
        productsSnapshot.forEach(doc => {
            productsData[doc.id] = doc.data();
        });
        
        updateProductsPreview();
        console.log('Produtos carregados:', Object.keys(productsData).length);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Criar produtos padrão
async function createDefaultProducts() {
    const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    
    const defaultProducts = {
        'imagens': {
            id: 'imagens',
            name: 'Imagens Aéreas',
            description: 'Pacote de imagens aéreas dos mapas do Free Fire',
            category: 'digital',
            price: 2.00,
            type: 'download',
            downloadType: 'maps',
            maps: ['Bermuda', 'Purgatório', 'Kalahari', 'Alpina', 'Bermuda Remastered'],
            baseUrl: 'https://freitasteste.netlify.app/downloads/',
            active: true,
            createdAt: new Date()
        },
        'planilhas': {
            id: 'planilhas',
            name: 'Planilhas de Análises',
            description: 'Planilhas com análises detalhadas de jogos e estratégias',
            category: 'digital',
            price: 5.00,
            type: 'download',
            downloadType: 'file',
            downloadUrl: 'https://drive.google.com/drive/folders/1ABC123',
            active: true,
            createdAt: new Date()
        },
        'camisa': {
            id: 'camisa',
            name: 'Camisa X-Treino Freitas',
            description: 'Camisa oficial da X-Treino Freitas',
            category: 'physical',
            price: 25.00,
            type: 'delivery',
            sizes: ['P', 'M', 'G', 'GG'],
            active: true,
            createdAt: new Date()
        },
        'passe-booyah': {
            id: 'passe-booyah',
            name: 'Passe Booyah',
            description: 'Passe Booyah do Free Fire',
            category: 'digital',
            price: 15.00,
            type: 'gift',
            active: true,
            createdAt: new Date()
        }
    };
    
    for (const [productId, productData] of Object.entries(defaultProducts)) {
        await setDoc(doc(window.firebaseDb, 'products', productId), productData);
    }
    
    productsData = defaultProducts;
    updateProductsPreview();
    console.log('Produtos padrão criados');
}

// Atualizar preview dos produtos
function updateProductsPreview() {
    const preview = document.getElementById('productsPreview');
    if (!preview) return;
    
    const products = Object.values(productsData);
    if (products.length === 0) {
        preview.innerHTML = '<div class="text-center text-gray-500 text-sm">Nenhum produto encontrado</div>';
        return;
    }
    
    preview.innerHTML = products.map(product => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-${getProductIcon(product.category)} text-blue-600 text-sm"></i>
                </div>
                <div>
                    <div class="font-medium text-sm">${product.name}</div>
                    <div class="text-xs text-gray-500">${product.category} • R$ ${product.price.toFixed(2)}</div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="px-2 py-1 text-xs rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.active ? 'Ativo' : 'Inativo'}
                </span>
            </div>
        </div>
    `).join('');
}

// Obter ícone do produto
function getProductIcon(category) {
    switch (category) {
        case 'digital': return 'download';
        case 'physical': return 'shipping-fast';
        case 'gift': return 'gift';
        default: return 'box';
    }
}

// Abrir modal de produtos
function openProductsModal() {
    const modal = document.getElementById('modalProducts');
    if (modal) {
        modal.classList.remove('hidden');
        renderProductsForm();
    }
}

// Renderizar formulário de produtos
function renderProductsForm() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(productsData).forEach(([key, product], index) => {
        container.appendChild(createProductForm(key, product, index));
    });
}

// Criar formulário de produto
function createProductForm(key, product, index) {
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-lg p-6';
    div.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h4 class="font-bold text-lg">${product.name || 'Novo Produto'}</h4>
            <button onclick="removeProduct('${key}')" class="text-red-500 hover:text-red-700">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ID do Produto</label>
                <input type="text" id="product_${key}_id" value="${product.id || ''}" 
                       class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                       placeholder="Ex: imagens, planilhas">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" id="product_${key}_name" value="${product.name || ''}" 
                       class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                       placeholder="Nome do produto">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea id="product_${key}_description" 
                          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                          rows="2" placeholder="Descrição do produto">${product.description || ''}</textarea>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select id="product_${key}_category" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="digital" ${product.category === 'digital' ? 'selected' : ''}>Digital</option>
                    <option value="physical" ${product.category === 'physical' ? 'selected' : ''}>Físico</option>
                    <option value="gift" ${product.category === 'gift' ? 'selected' : ''}>Presente</option>
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                <input type="number" id="product_${key}_price" value="${product.price || 0}" 
                       step="0.01" min="0" 
                       class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                       placeholder="0.00">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select id="product_${key}_type" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="download" ${product.type === 'download' ? 'selected' : ''}>Download</option>
                    <option value="delivery" ${product.type === 'delivery' ? 'selected' : ''}>Entrega</option>
                    <option value="gift" ${product.type === 'gift' ? 'selected' : ''}>Presente</option>
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="product_${key}_active" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="true" ${product.active === true ? 'selected' : ''}>Ativo</option>
                    <option value="false" ${product.active === false ? 'selected' : ''}>Inativo</option>
                </select>
            </div>
        </div>
        
        <!-- Configurações específicas para downloads -->
        <div id="downloadConfig_${key}" class="mt-4 ${product.type === 'download' ? '' : 'hidden'}">
            <h5 class="font-medium text-gray-700 mb-2">Configurações de Download</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Download</label>
                    <select id="product_${key}_downloadType" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option value="file" ${product.downloadType === 'file' ? 'selected' : ''}>Arquivo Único</option>
                        <option value="maps" ${product.downloadType === 'maps' ? 'selected' : ''}>Múltiplos Mapas</option>
                    </select>
                </div>
                
                <div id="downloadUrl_${key}" class="${product.downloadType === 'file' ? '' : 'hidden'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">URL de Download</label>
                    <input type="url" id="product_${key}_downloadUrl" value="${product.downloadUrl || ''}" 
                           class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                           placeholder="https://drive.google.com/...">
                </div>
                
                <div id="mapsConfig_${key}" class="${product.downloadType === 'maps' ? '' : 'hidden'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Mapas Disponíveis</label>
                    <input type="text" id="product_${key}_maps" value="${(product.maps || []).join(', ')}" 
                           class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                           placeholder="Bermuda, Purgatório, Kalahari">
                </div>
                
                <div id="baseUrl_${key}" class="${product.downloadType === 'maps' ? '' : 'hidden'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">URL Base</label>
                    <input type="url" id="product_${key}_baseUrl" value="${product.baseUrl || ''}" 
                           class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                           placeholder="https://freitasteste.netlify.app/downloads/">
                </div>
            </div>
        </div>
    `;
    
    // Adicionar event listeners para mostrar/ocultar configurações
    const typeSelect = div.querySelector(`#product_${key}_type`);
    const downloadConfig = div.querySelector(`#downloadConfig_${key}`);
    
    typeSelect.addEventListener('change', function() {
        if (this.value === 'download') {
            downloadConfig.classList.remove('hidden');
        } else {
            downloadConfig.classList.add('hidden');
        }
    });
    
    const downloadTypeSelect = div.querySelector(`#product_${key}_downloadType`);
    const downloadUrlDiv = div.querySelector(`#downloadUrl_${key}`);
    const mapsConfigDiv = div.querySelector(`#mapsConfig_${key}`);
    const baseUrlDiv = div.querySelector(`#baseUrl_${key}`);
    
    downloadTypeSelect.addEventListener('change', function() {
        if (this.value === 'file') {
            downloadUrlDiv.classList.remove('hidden');
            mapsConfigDiv.classList.add('hidden');
            baseUrlDiv.classList.add('hidden');
        } else {
            downloadUrlDiv.classList.add('hidden');
            mapsConfigDiv.classList.remove('hidden');
            baseUrlDiv.classList.remove('hidden');
        }
    });
    
    return div;
}

// Fechar modal de produtos
function closeProductsModal() {
    const modal = document.getElementById('modalProducts');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Adicionar novo produto
function addProduct() {
    const newKey = `product_${Date.now()}`;
    const newProduct = {
        id: '',
        name: '',
        description: '',
        category: 'digital',
        price: 0,
        type: 'download',
        active: true,
        createdAt: new Date()
    };
    
    productsData[newKey] = newProduct;
    renderProductsForm();
}

// Remover produto
function removeProduct(key) {
    if (Object.keys(productsData).length <= 1) {
        alert('Você deve manter pelo menos um produto.');
        return;
    }
    
    if (confirm('Tem certeza que deseja remover este produto?')) {
        delete productsData[key];
        renderProductsForm();
    }
}

// Salvar produtos
async function saveProducts() {
    try {
        const { collection, getDocs, deleteDoc, setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        
        // Limpar coleção existente
        const productsSnapshot = await getDocs(collection(window.firebaseDb, 'products'));
        for (const docSnapshot of productsSnapshot.docs) {
            await deleteDoc(docSnapshot.ref);
        }
        
        // Salvar novos produtos
        for (const [key, productData] of Object.entries(productsData)) {
            const productId = document.getElementById(`product_${key}_id`)?.value || key;
            const product = {
                id: productId,
                name: document.getElementById(`product_${key}_name`)?.value || '',
                description: document.getElementById(`product_${key}_description`)?.value || '',
                category: document.getElementById(`product_${key}_category`)?.value || 'digital',
                price: parseFloat(document.getElementById(`product_${key}_price`)?.value || 0),
                type: document.getElementById(`product_${key}_type`)?.value || 'download',
                active: document.getElementById(`product_${key}_active`)?.value === 'true',
                downloadType: document.getElementById(`product_${key}_downloadType`)?.value || 'file',
                downloadUrl: document.getElementById(`product_${key}_downloadUrl`)?.value || '',
                maps: document.getElementById(`product_${key}_maps`)?.value?.split(',').map(s => s.trim()).filter(Boolean) || [],
                baseUrl: document.getElementById(`product_${key}_baseUrl`)?.value || '',
                updatedAt: new Date()
            };
            
            await setDoc(doc(window.firebaseDb, 'products', productId), product);
        }
        
        // Recarregar dados
        await loadProducts();
        closeProductsModal();
        
        alert('Produtos salvos com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar produtos:', error);
        alert('Erro ao salvar produtos: ' + error.message);
    }
}

// Expor funções globalmente
window.openProductsModal = openProductsModal;
window.closeProductsModal = closeProductsModal;
window.addProduct = addProduct;
window.removeProduct = removeProduct;
window.saveProducts = saveProducts;

  // Security: Enhanced authentication system
  async function initAuth() {
    // Check for existing session
    const savedSession = sessionStorage.getItem('adminSession');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (Date.now() - sessionData.timestamp < SESSION_TIMEOUT) {
          // Session still valid, check with Firebase
          const user = auth.currentUser;
          if (user && await isAuthorizedAdmin(user)) {
            showDashboard(user.role || 'admin');
            return;
          }
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
      // Clear invalid session
      sessionStorage.removeItem('adminSession');
    }

    // Show login form
    showAuthGate();
  }

  // Security: Enhanced login handler
  async function handleLogin(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user is authorized
      if (!(await isAuthorizedAdmin(user))) {
        await signOut(auth);
        showLoginError('Acesso negado. Email não autorizado para administração.');
        return;
      }

      // Get user role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const role = userData?.role || 'admin';

      // Save session
      const sessionData = {
        uid: user.uid,
        email: user.email,
        role: role,
        timestamp: Date.now()
      };
      sessionStorage.setItem('adminSession', JSON.stringify(sessionData));

      // Show dashboard
      showDashboard(role);
      
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Erro ao fazer login.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      
      showLoginError(errorMessage);
    }
  }

  // Security: Setup event listeners
  function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('emailLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        if (!email || !password) {
          showLoginError('Por favor, preencha todos os campos.');
          return;
        }
        
        await handleLogin(email, password);
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // Reset session timer on user activity
    document.addEventListener('click', resetSessionTimer);
    document.addEventListener('keypress', resetSessionTimer);
    document.addEventListener('scroll', resetSessionTimer);
  }

  // Initialize admin panel
  async function initAdmin() {
    try {
      setupEventListeners();
      await initAuth();
      
      // Load products if dashboard is visible
      setTimeout(() => {
        if (window.firebaseDb && document.getElementById('productsPreview') && !dashboard.classList.contains('hidden')) {
          loadProducts();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Admin initialization error:', error);
      showLoginError('Erro ao inicializar o painel administrativo.');
    }
  }

  // Start admin panel
  initAdmin();


