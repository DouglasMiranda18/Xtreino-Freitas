// --- Auth (novo) ---
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return re.test(phone);
}

function validateAge(age) {
    const num = parseInt(age);
    return num >= 12 && num <= 100;
}

function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 2) {
        input.value = value;
    } else if (value.length <= 6) {
        input.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length <= 10) {
        input.value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else {
        input.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
    }
}

function openLoginModal(){
    const m = document.getElementById('loginModal');
    if (m) m.classList.remove('hidden');
}
function closeLoginModal(){
    const m = document.getElementById('loginModal');
    if (m) m.classList.add('hidden');
}
function showAuthTab(tab){
    const tabs = ['login','register','reset'];
    tabs.forEach(t=>{
        const el = document.getElementById('auth'+t.charAt(0).toUpperCase()+t.slice(1));
        const btn = document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
        if (!el || !btn) return;
        if (t===tab){ el.classList.remove('hidden'); btn.classList.add('border-blue-matte'); btn.classList.remove('text-gray-500'); }
        else { el.classList.add('hidden'); btn.classList.remove('border-blue-matte'); btn.classList.add('text-gray-500'); }
    });
    const msg = document.getElementById('authMsg'); if (msg) msg.textContent='';
}

async function loginWithGoogle(){
    try{
        if (!window.firebaseReady){ throw new Error('Firebase não inicializado'); }
        const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(window.firebaseAuth, provider);
        onAuthLogged(res.user);
    }catch(e){ document.getElementById('authMsg').textContent = 'Erro no login Google.'; }
}

async function loginWithEmailPassword(){
    try{
        if (!window.firebaseReady){ throw new Error('Firebase não inicializado'); }
        const email = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPassword').value.trim();
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        const res = await signInWithEmailAndPassword(window.firebaseAuth, email, pass);
        onAuthLogged(res.user);
    }catch(e){ document.getElementById('authMsg').textContent = 'Email ou senha inválidos.'; }
}

async function registerWithEmailPassword(){
    try{
        if (!window.firebaseReady){ throw new Error('Firebase não inicializado'); }
        const email = document.getElementById('regEmail').value.trim();
        const pass = document.getElementById('regPassword').value.trim();
        const name = document.getElementById('regName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const nickname = document.getElementById('regNickname').value.trim();
        const team = document.getElementById('regTeam').value.trim();
        const age = document.getElementById('regAge').value.trim();
        
        // Validações
        if (!email || !pass || !name || !phone || !nickname || !team || !age) {
            throw new Error('Todos os campos são obrigatórios');
        }
        if (!validateEmail(email)) {
            throw new Error('Email inválido');
        }
        if (pass.length < 6) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }
        if (!validatePhone(phone)) {
            throw new Error('Telefone inválido. Use o formato (11) 99999-9999');
        }
        if (!validateAge(age)) {
            throw new Error('Idade deve ser entre 12 e 100 anos');
        }
        
        const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        const cred = await createUserWithEmailAndPassword(window.firebaseAuth, email, pass);
        await updateProfile(cred.user, { displayName: name });
        
        // salva perfil completo no Firestore
        try{
            if (window.firebaseReady){
                const { collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                const ref = doc(collection(window.firebaseDb,'users'), cred.user.uid);
                await setDoc(ref, { 
                    name, 
                    email, 
                    phone, 
                    nickname, 
                    teamName: team, 
                    age, 
                    role: 'Usuario',
                    level: 'Associado Treino',
                    tokens: 0,
                    createdAt: Date.now() 
                }, { merge: true });
            }
        }catch(e){ 
            console.error('Erro ao salvar perfil:', e);
        }
        onAuthLogged(cred.user);
    }catch(e){ document.getElementById('authMsg').textContent = e.message || 'Não foi possível criar a conta.'; }
}

async function sendPasswordReset(){
    try{
        if (!window.firebaseReady){ throw new Error('Firebase não inicializado'); }
        const email = document.getElementById('resetEmail').value.trim();
        const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        await sendPasswordResetEmail(window.firebaseAuth, email);
        document.getElementById('authMsg').textContent = 'Email de recuperação enviado.';
        showAuthTab('login');
    }catch(e){ document.getElementById('authMsg').textContent = 'Erro ao enviar recuperação.'; }
}

function onAuthLogged(user){
    console.log('User logged in:', user.email);
    try{
        const name = user?.displayName || user?.email || 'Usuário';
        const welcome = document.getElementById('accWelcome');
        if (welcome) welcome.textContent = `Bem-vindo, ${name}!`;
    }catch(_){ }
    window.isLoggedIn = true;
    toggleAccountButtons(true);
    closeLoginModal();
    // registra lastLogin
    try{
        if (window.firebaseReady && window.firebaseAuth?.currentUser){
            import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                .then(({ doc, setDoc, collection }) => {
                    const uid = window.firebaseAuth.currentUser.uid;
                    const ref = doc(collection(window.firebaseDb,'users'), uid);
                    return setDoc(ref, { lastLogin: Date.now() }, { merge:true });
                }).catch(()=>{});
        }
    }catch(_){ }
    // Redireciono para o admin se foi solicitado e o usuário tiver permissão
    if (window.postLoginRedirect === 'admin') {
        setTimeout(async () => {
            try {
                const uid = user?.uid || window.firebaseAuth?.currentUser?.uid;
                if (uid) {
                    await loadUserProfile(uid);
                    const role = (window.currentUserProfile?.role || '').toLowerCase();
                    if (['ceo','gerente','vendedor'].includes(role)) {
                        window.postLoginRedirect = null;
                        window.location.href = 'admin.html';
                        return;
                    }
                }
                alert('Acesso ao painel restrito (CEO, Gerente ou Vendedor).');
                window.postLoginRedirect = null;
            } catch (_) { window.postLoginRedirect = null; }
        }, 100);
    }
    // Redireciono para a aba de Meus Tokens se foi solicitado a partir do agendamento
    if (window.postLoginRedirect === 'myTokens'){
        window.postLoginRedirect = null;
        setTimeout(()=>{ window.location.href = 'client.html?tab=myTokens'; }, 100);
        return;
    }
    
    // Sincronização automática removida para evitar reset do saldo
    // setTimeout(async () => {
    //     try {
    //         // Só sincronizar se não há perfil local
    //         if (!window.currentUserProfile || !window.currentUserProfile.tokens) {
    //             await syncUserTokens();
    //         }
    //     } catch (error) {
    //         console.error('Erro ao sincronizar tokens:', error);
    //     }
    // }, 1000);
    
    // Não abre automaticamente a área do cliente - só quando clicar em MINHA CONTA
}

function toggleAccountButtons(isLogged){
    const loginDesk = document.getElementById('loginBtnDesktop');
    const accDesk = document.getElementById('accountBtnDesktop');
    const loginMob = document.getElementById('loginBtnMobile');
    const accMob = document.getElementById('accountBtnMobile');
    if (loginDesk && accDesk){ loginDesk.classList.toggle('hidden', isLogged); accDesk.classList.toggle('hidden', !isLogged); }
    if (loginMob && accMob){ loginMob.classList.toggle('hidden', isLogged); accMob.classList.toggle('hidden', !isLogged); }
}

// Garantir estado inicial correto dos botões ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    try{
        const loginDesk = document.getElementById('loginBtnDesktop');
        const accDesk = document.getElementById('accountBtnDesktop');
        const loginMob = document.getElementById('loginBtnMobile');
        const accMob = document.getElementById('accountBtnMobile');
        if (accDesk) accDesk.classList.add('hidden');
        if (accMob) accMob.classList.add('hidden');
        if (loginDesk) loginDesk.classList.remove('hidden');
        if (loginMob) loginMob.classList.remove('hidden');
    }catch(_){ /* noop */ }
});

function requestAdminAccess(){
    // Se já estiver logado, valida papel; senão, abre modal de login e marca redirecionamento
    if (!window.isLoggedIn) {
        window.postLoginRedirect = 'admin';
        openLoginModal();
        return;
    }
    (async () => {
        let role = (window.currentUserProfile?.role || '').toLowerCase();
        if (!role) {
            try{
                const uid = window.firebaseAuth?.currentUser?.uid;
                const { doc, getDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                let snap = await getDoc(doc(collection(window.firebaseDb,'users'), uid));
                if (snap.exists()) role = (snap.data().role||'').toLowerCase();
                if (!role){
                    const q = query(collection(window.firebaseDb,'users'), where('uid','==', uid));
                    const res = await getDocs(q); res.forEach(d=>{ if (!role) role=(d.data().role||'').toLowerCase(); });
                }
            }catch(_){ }
        }
        if (['ceo','gerente','vendedor'].includes(role)) {
            window.location.href = 'admin.html';
        } else {
            alert('Acesso ao painel restrito (CEO, Gerente ou Vendedor).');
        }
    })();
}

// Modal de conta removido - agora redireciona para client.html

async function logout(){
    try{
        if (window.firebaseReady){
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
            await signOut(window.firebaseAuth);
        }
    }catch(_){ }
    window.currentUserProfile = null;
    window.isLoggedIn = false;
    toggleAccountButtons(false);
    // Modal removido
}

// Funções do modal de conta removidas - agora usa client.html

// Função removida - agora usa client.html

// Função removida - agora usa client.html


// Todas as funções do modal de conta removidas - agora usa client.html
// Mobile menu toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('hidden');
}

// Smooth scroll to sections
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({
        behavior: 'smooth'
    });
}

// Redireciona para a compra/aba Meus Tokens a partir do modal de reserva
function goToTokensFromSchedule(){
    // Se não estiver logado, abre login e, após login, direciona para client.html na aba Meus Tokens
    if (!window.isLoggedIn) {
        window.postLoginRedirect = 'myTokens';
        openLoginModal();
        return;
    }
    // Se já estiver logado, vai direto para a aba Meus Tokens
    window.location.href = 'client.html?tab=myTokens';
}

// Função para abrir modal de compra de tokens (compatibilidade)
function openTokensPurchaseModal() {
    // Redirecionar para a área do cliente na aba de tokens
    if (!window.isLoggedIn) {
        window.postLoginRedirect = 'myTokens';
        openLoginModal();
        return;
    }
    window.location.href = 'client.html?tab=myTokens';
}

// [login removed]

// [login removed]

// Email/senha
// [login removed]

// [login removed]

function showRegisterForm() {
    alert('Formulário de cadastro será implementado. Esta é uma demonstração da interface.');
}

// Alterna botões Login/Minha Conta conforme estado
function refreshAuthButtons(){ /* removed */ }

// Abrir modal de cadastro direto (atalho)
function openRegisterModal(){ /* removed */ }

// Submissão de cadastro: salva no perfil e persiste
async function submitRegister(){ /* removed */ }

// Inicializa header conforme sessão prévia
window.addEventListener('load', () => { try{ initShopCartHook(); }catch(_){ } });

// ---------------- Área de Associados: cargos, níveis, permissões e tokens ----------------
// Configuração centralizada acessível via window.AssocConfig
window.AssocConfig = {
    roles: {
        GERENTE: 'Gerente',
        CEO: 'Ceo',
        STAFF: 'Staff',
        VENDEDOR: 'Vendedor'
    },
    levels: {},
    // Permissões por cargo
    permissionsByRole: {
        Gerente: {
            redeemTokens: true,
            purchaseItems: true,
            accessExclusive: true,
            manageSalesFlow: false
        },
        Ceo: {
            redeemTokens: true,
            purchaseItems: true,
            accessExclusive: true,
            manageSalesFlow: true
        },
        Staff: {
            redeemTokens: true,
            purchaseItems: true,
            accessExclusive: true,
            manageSalesFlow: false
        },
        Vendedor: {
            redeemTokens: false,
            purchaseItems: false,
            accessExclusive: false,
            manageSalesFlow: false,
            salesAndChat: true
        }
    },
    // Regras de valor dos tokens (BRL -> tipo de vaga)
    tokenPricingBRL: [
        { amount: 1.00, benefit: '1 vaga treino normal', key: 'treino' },
        { amount: 3.00, benefit: '1 vaga modo liga', key: 'modoLiga' },
        { amount: 3.50, benefit: '1 vaga semanal', key: 'semanal' },
        { amount: 7.00, benefit: '1 vaga final semanal', key: 'finalSemanal' },
        { amount: 5.00, benefit: '1 vaga camp de fases', key: 'campFases' }
    ]
};

// Estado local do usuário autenticado (perfil minimalista)
window.currentUserProfile = null;
window.isLoggedIn = false;

// Verifica se há usuário logado ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o Firebase estar pronto
    const checkFirebaseReady = () => {
        if (window.firebaseReady) {
            checkAuthState();
            // Tenta sincronizar dados offline quando Firebase estiver pronto
            syncOfflineData();
            // Trata retorno do Mercado Pago e atualiza vagas
            try{
                const sp = new URLSearchParams(location.search);
                const mpStatus = sp.get('mp_status');
                const preferenceId = sp.get('preference-id');
                console.log('MP Return Check:', { mpStatus, preferenceId, url: window.location.href });
                
                // Só verificar pagamentos se há evidência real de uma tentativa de pagamento
                const hasPaymentEvidence = mpStatus || preferenceId || sessionStorage.getItem('lastExternalRef') || sessionStorage.getItem('lastRegId');
                
                if (!mpStatus && preferenceId) {
                    console.log('No mp_status but has preference-id, checking payment status...');
                    // Mostrar modal de processamento enquanto verifica
                    openPaymentConfirmModal('Pagamento em processamento', 'Estamos aguardando a confirmação do PIX. Assim que aprovado, avisaremos aqui.');
                    checkPaymentStatus(preferenceId);
                } else if (!mpStatus && hasPaymentEvidence) {
                    // Se não tem mp_status mas há evidência de pagamento, tentar usar external_reference salvo
                    const externalRef = sessionStorage.getItem('lastExternalRef');
                    if (externalRef) {
                        console.log('No mp_status or preference-id, checking with external_reference...');
                        // Mostrar modal de processamento enquanto verifica
                        openPaymentConfirmModal('Pagamento em processamento', 'Estamos aguardando a confirmação do PIX. Assim que aprovado, avisaremos aqui.');
                        checkPaymentStatus(externalRef);
                    }
                } else if (!hasPaymentEvidence) {
                    console.log('No payment evidence found - user is just visiting the site normally');
                    // Limpar dados antigos de pagamento se existirem
                    sessionStorage.removeItem('lastExternalRef');
                    sessionStorage.removeItem('lastRegId');
                    sessionStorage.removeItem('lastRegInfo');
                    // Não fazer nada mais - usuário está apenas visitando o site
                    return;
                } else if (mpStatus === 'success') {
                    if (mpStatus === 'success') {
                        console.log('Payment successful, processing...');
                        const regId = sessionStorage.getItem('lastRegId');
                        console.log('RegId from sessionStorage:', regId);
                        if (regId) {
                            import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                                .then(({ doc, setDoc, getDoc, collection }) => {
                                    const ref = doc(collection(window.firebaseDb,'registrations'), regId);
                                    return setDoc(ref, { status:'paid' }, { merge:true })
                                      .then(()=> getDoc(ref))
                                      .then(snap=>{ const d = snap.exists()? snap.data():{}; return d.groupLink || null; });
                                }).then((groupLink)=>{
                                    console.log('Registration updated, showing modal');
                                    openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.', groupLink);
                                }).catch((e)=>{
                                    console.error('Error updating registration:', e);
                                    openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.');
                                });
                        } else {
                            console.log('No regId, creating local order');
                            // Fallback: cria registro local para exibir na aba pedidos
                            try{
                                const info = JSON.parse(sessionStorage.getItem('lastRegInfo')||'{}');
                                const orders = JSON.parse(localStorage.getItem('localOrders')||'[]');
                                orders.unshift({ title: info.title||'Reserva', amount: info.price||0, status:'paid', date: new Date().toISOString() });
                                localStorage.setItem('localOrders', JSON.stringify(orders));
                                console.log('Local order created:', orders[0]);
                            }catch(e){ console.error('Error creating local order:', e); }
                            openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.');
                        }
                    }
                    history.replaceState({}, document.title, location.pathname);
                }
            }catch(_){ }
        } else {
            setTimeout(checkFirebaseReady, 100);
        }
    };
    checkFirebaseReady();
});


// Função para sincronizar dados offline quando a conexão voltar
async function syncOfflineData() {
    try {
        if (!window.firebaseAuth?.currentUser) return;
        
        const uid = window.firebaseAuth.currentUser.uid;
        const localProfile = localStorage.getItem(`userProfile_${uid}`);
        
        if (localProfile && window.firebaseReady) {
            const profile = JSON.parse(localProfile);
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), uid);
            await setDoc(ref, profile, { merge: true });
            console.log('Dados offline sincronizados com Firestore');
        }
    } catch (e) {
        console.log('Erro ao sincronizar dados offline:', e);
    }
}

async function checkAuthState() {
    try {
        if (window.firebaseReady && window.firebaseAuth) {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
            onAuthStateChanged(window.firebaseAuth, (user) => {
                console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
                if (user) {
                    // Usuário está logado
                    window.isLoggedIn = true;
                    toggleAccountButtons(true);
                    // Carrega perfil do usuário
                    loadUserProfile(user.uid);
                } else {
                    // Usuário não está logado
                    window.isLoggedIn = false;
                    window.currentUserProfile = null;
                    toggleAccountButtons(false);
                }
            });
        }
    } catch (e) {
        console.error('Erro ao verificar estado de autenticação:', e);
    }
}

async function loadUserProfile(uid) {
    try {
        // Sempre priorizar Firestore (desabilitado uso de localStorage)
        if (window.firebaseReady) {
            const { doc, getDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                window.currentUserProfile = snap.data();
                console.log('Perfil carregado do Firestore');
            } else {
                // Cria perfil básico se não existir
                window.currentUserProfile = {
                    uid: uid,
                    email: window.firebaseAuth.currentUser.email,
                    name: window.firebaseAuth.currentUser.displayName || 'Usuário',
                    tokens: 0,
                    role: 'Vendedor',
                    level: 'Associado Treino'
                };
                console.log('Perfil básico criado (Firebase pronto, sem doc)');
            }
        } else {
            // Fallback: cria perfil básico se Firebase não estiver pronto (sem localStorage)
            window.currentUserProfile = {
                uid: uid,
                email: window.firebaseAuth.currentUser.email,
                name: window.firebaseAuth.currentUser.displayName || 'Usuário',
                tokens: 0,
                role: 'Usuario',
                level: 'Associado Treino'
            };
            console.log('Perfil básico criado (Firebase offline, em memória)');
        }
    } catch (e) {
        console.error('Erro ao carregar perfil:', e);
        // Fallback final: perfil básico
        window.currentUserProfile = {
            uid: uid,
            email: window.firebaseAuth.currentUser.email,
            name: window.firebaseAuth.currentUser.displayName || 'Usuário',
            tokens: 0,
            role: 'Usuario',
            level: 'Associado Treino'
        };
    }
}

// Helpers de permissão
function hasPermission(permission) {
    const profile = window.currentUserProfile;
    if (!profile) return false;
    const role = profile.role || 'Vendedor';
    const perms = window.AssocConfig.permissionsByRole[role] || {};
    return !!perms[permission];
}

function updateUIForPermissions() {
    const isAdmin = hasPermission('admin_tokens');
    const adminPanel = document.getElementById('accTokensAdmin');
    const historyPanel = document.getElementById('accTokensHistory');
    
    if (adminPanel) {
        adminPanel.classList.toggle('hidden', !isAdmin);
    }
    if (historyPanel) {
        historyPanel.classList.toggle('hidden', !isAdmin);
        if (isAdmin) {
            loadTokenHistory();
        }
    }
    
    // Outras permissões podem ser aplicadas aqui
    const canViewSales = hasPermission('view_sales');
    const salesElements = document.querySelectorAll('[data-permission="view_sales"]');
    salesElements.forEach(el => el.style.display = canViewSales ? 'block' : 'none');
}

function loadTokenHistory() {
    const container = document.getElementById('tokenHistoryList');
    if (!container) return;
    
    if (!window.tokenHistory || window.tokenHistory.length === 0) {
        container.innerHTML = '<div class="text-gray-400">Nenhum histórico encontrado</div>';
        return;
    }
    
    const history = window.tokenHistory.slice(-10).reverse(); // Últimos 10, mais recentes primeiro
    container.innerHTML = history.map(log => {
        const date = new Date(log.timestamp).toLocaleString('pt-BR');
        const action = log.action === 'add' ? 'Adicionado' : 'Removido';
        const color = log.action === 'add' ? 'text-green-600' : 'text-red-600';
        return `<div class="flex justify-between ${color}">
            <span>${action} ${log.amount} token(s)</span>
            <span class="text-gray-400">${date}</span>
        </div>`;
    }).join('');
}

// Helpers de token (saldo simples em perfil.tokens, número decimal em BRL)
function getTokenBalance() {
    const balance = Number(window.currentUserProfile?.tokens || 0);
    console.log('🔍 Token balance check:', { 
        profile: window.currentUserProfile, 
        tokens: window.currentUserProfile?.tokens, 
        balance 
    });
    return balance;
}
function canSpendTokens(amountBRL) {
    const balance = getTokenBalance();
    const amount = Number(amountBRL || 0);
    const canSpend = balance >= amount;
    console.log('🔍 Can spend tokens check:', { balance, amount, canSpend });
    return canSpend;
}
async function spendTokens(amountBRL) {
    const amt = Number(amountBRL || 0);
    if (!canSpendTokens(amt)) return false;
    
    const newBalance = Number((getTokenBalance() - amt).toFixed(2));
    window.currentUserProfile.tokens = newBalance;
    
    console.log(`🔍 Spending ${amt} tokens. New balance: ${newBalance}`);
    
    // Persistir no Firestore (sem localStorage)
    await persistUserProfile(window.currentUserProfile);
    
    // Atualizar interface se estiver na área do cliente
    if (window.location.pathname.includes('client.html')) {
        // Recarregar dados do cliente
        if (typeof loadMyTokens === 'function') {
            await loadMyTokens();
        }
        if (typeof loadTokenUsageHistory === 'function') {
            await loadTokenUsageHistory();
        }
    }
    
    // Atualizar interface na página principal
    renderClientArea();
    
    // Re-sync do Firestore para refletir saldo final
    await syncUserTokens();
    
    return true;
}
function grantTokens(amountBRL) {
    const amt = Number(amountBRL || 0);
    window.currentUserProfile = window.currentUserProfile || {};
    window.currentUserProfile.tokens = Number(((window.currentUserProfile.tokens || 0) + amt).toFixed(2));
    persistUserProfile(window.currentUserProfile);
}

// Função para sincronizar tokens do usuário
async function syncUserTokens() {
    try {
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser) return;
        
        const { doc, getDoc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const userRef = doc(collection(window.firebaseDb, 'users'), window.firebaseAuth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentTokens = userData.tokens || 0;
            
            // Só atualizar se o perfil local não existe ou se os tokens do Firestore são significativamente maiores
            // (isso evita sobrescrever tokens que foram gastos recentemente)
            window.currentUserProfile = window.currentUserProfile || {};
            const localTokens = window.currentUserProfile.tokens || 0;
            
            if (localTokens === 0 || currentTokens > localTokens + 5) {
                window.currentUserProfile.tokens = currentTokens;
                console.log('✅ Tokens synced from Firestore:', currentTokens);
            } else {
                console.log('🔍 Local tokens are more recent, keeping:', localTokens);
            }
            
            // Dar token inicial apenas se o usuário realmente não tem tokens (não é 0, mas undefined/null)
            if (window.currentUserProfile.tokens === undefined || window.currentUserProfile.tokens === null) {
                await setDoc(userRef, { tokens: 1 }, { merge: true });
                window.currentUserProfile.tokens = 1;
                console.log('🎁 Initial token given to user with undefined tokens');
            }
            
            // Atualizar localStorage também
            localStorage.setItem('assoc_profile', JSON.stringify(window.currentUserProfile));
            
            console.log('✅ Final token balance:', window.currentUserProfile.tokens);
            
            // Atualizar interface
            renderClientArea();
        }
    } catch (error) {
        console.error('❌ Error syncing tokens:', error);
    }
}

// Persistência de perfil: Firestore quando possível; fallback localStorage
async function ensureUserProfile(user) {
    const baseProfile = {
        uid: user?.uid || null,
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        nickname: '',
        teamName: '',
        orgName: '',
        age: '',
        role: window.AssocConfig.roles.VENDEDOR, // padrão mínimo
        level: undefined,
        tokens: 0
    };
    try {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        const isNetlify = /netlify\.app$/i.test(location.hostname);
        // Sempre tentar Firestore quando disponível e com usuário logado
        if (window.firebaseReady && user?.uid){
            const { doc, getDoc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), user.uid);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, baseProfile);
                window.currentUserProfile = baseProfile;
                console.log('✅ Perfil criado no Firestore');
            } else {
                const data = snap.data();
                window.currentUserProfile = { ...baseProfile, ...data };
                console.log('✅ Perfil carregado do Firestore:', { tokens: data.tokens });
            }
        } else {
            // Sem Firebase: usa somente base em memória (não persiste em localStorage)
            window.currentUserProfile = baseProfile;
            console.log('⚠️ Firebase indisponível — usando perfil em memória.');
        }
        
        // Sincronização automática removida para evitar reset do saldo
        // if (window.firebaseReady && !isLocal && !isNetlify && user?.uid) {
        //     await syncUserTokens();
        // }
    } catch (err) {
        console.warn('Perfil: erro ao carregar, usando perfil em memória.', err);
        window.currentUserProfile = baseProfile;
    }
}

async function persistUserProfile(profile){
    try {
        console.log('🔍 Persisting profile:', { firebaseReady: window.firebaseReady, hasUid: !!profile?.uid });

        // Garantir UID presente
        if (!profile.uid && window.firebaseAuth && window.firebaseAuth.currentUser) {
            profile.uid = window.firebaseAuth.currentUser.uid;
        }
        // Normalizar tokens
        if (profile.tokens === undefined || profile.tokens === null) {
            profile.tokens = 0;
        }

        if (window.firebaseReady && profile?.uid){
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), profile.uid);
            await setDoc(ref, profile, { merge: true });
            console.log('✅ Profile saved to Firestore');
        } else {
            console.warn('⚠️ Firebase unavailable when persisting profile; keeping in memory only');
        }
    } catch(error) {
        console.error('❌ Error persisting profile:', error);
    }
}

// Client Area Functions
function openClientArea() {
    document.getElementById('clientAreaModal').classList.remove('hidden');
    try { renderClientArea(); } catch(_) {}
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
}

function closeClientArea() { /* removed - client area não existe mais */ }

// Renderiza informações dinâmicas do cliente (nome, tokens, etc.)
function renderClientArea(){
    const p = window.currentUserProfile || {};
    const nameEl = document.querySelector('#clientAreaModal p.text-gray-300');
    if (nameEl) nameEl.textContent = `Bem-vindo, ${p.name || p.email || 'Usuário'}!`;
    // Overview: cards numéricos (usa saldo de tokens real)
    const overviewTokens = document.querySelector('#overviewTab .bg-blue-matte.bg-opacity-20:nth-child(3) h3');
    if (overviewTokens) overviewTokens.textContent = String(Math.round(getTokenBalance()));
    // Tokens Tab: saldo
    const tokensTab = document.querySelector('#tokensTab .bg-blue-matte.bg-opacity-20 h3');
    if (tokensTab) tokensTab.textContent = String(Math.round(getTokenBalance()));
    // Habilitar/Desabilitar botão de tokens no card
    const assocBtn = document.getElementById('assocTokensBtn');
    if (assocBtn){
        const hasTokens = p && p.tokens && p.tokens > 0;
        assocBtn.disabled = !hasTokens;
        assocBtn.classList.toggle('opacity-60', !hasTokens);
        assocBtn.textContent = hasTokens ? 'USAR 1 TOKEN' : 'COMPRAR TOKENS';
        
        // Adicionar evento de clique se não existir
        if (!assocBtn.hasAttribute('data-listener-added')) {
            assocBtn.addEventListener('click', function() {
                if (hasTokens) {
                    openScheduleModal('xtreino-tokens');
                } else {
                    // Redirecionar para área do cliente para comprar tokens
                    window.location.href = 'client.html?tab=myTokens';
                }
            });
            assocBtn.setAttribute('data-listener-added', 'true');
        }
    }
}

function showClientTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.client-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.client-tab').forEach(btn => {
        btn.classList.remove('active', 'border-blue-matte', 'text-blue-matte');
        btn.classList.add('border-transparent', 'text-gray-400');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
    
    // Add active class to clicked button
    event.target.classList.add('active', 'border-blue-matte', 'text-blue-matte');
    event.target.classList.remove('border-transparent', 'text-gray-400');
    // atualizar dados dinâmicos ao trocar de aba
    if (tabName === 'overview' || tabName === 'tokens') {
        try { renderClientArea(); } catch(_) {}
    } else if (tabName === 'profile') {
        try { loadProfileData(); } catch(_) {}
    } else if (tabName === 'orders') {
        try { loadOrders(); } catch(_) {}
    } else if (tabName === 'products') {
        try { loadProducts(); } catch(_) {}
    }
}

function downloadFile(fileType) {
    // Simula download de arquivo
    const files = {
        'planilhas': 'Planilhas_Analise_v2.1.xlsx',
        'sensibilidades': 'Sensibilidades_Pro.cfg',
        'imagens': 'Imagens_Aereas_HD.zip'
    };
    
    alert(`Download iniciado: ${files[fileType]}\n\nEm uma implementação real, o arquivo seria baixado automaticamente.`);
}

function viewOnline(contentType) {
    alert('Abrindo conteúdo online...\n\nEm uma implementação real, isso abriria uma nova aba com o conteúdo exclusivo.');
}

function scheduleTraining(trainingType) {
    const trainings = {
        'aim': { label: 'Aim Training', cost: 1.00 },
        'strategy': { label: 'Estratégia', cost: 2.00 },
        'mental': { label: 'Mentalidade', cost: 1.00 }
    };
    const t = trainings[trainingType];
    if (!t) return;
    if (!canSpendTokens(t.cost)){
        alert(`Saldo insuficiente. Você precisa de ${t.cost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens.`);
        return;
    }
    if (confirm(`Confirmar uso de ${t.cost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens para ${t.label}?`)){
        spendTokens(t.cost);
        renderClientArea();
        alert('Token resgatado! Nossa equipe entrará em contato para agendar.');
    }
}

function handleContactForm(event) {
    event.preventDefault();
    const form = event.target;
    // Honeypot simples: se preenchido, descarta
    const botField = form.querySelector('input[name="website"]');
    if (botField && botField.value) {
        form.reset();
        return;
    }
    const nome = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const assunto = form.querySelector('select').value;
    const mensagem = form.querySelector('textarea').value;

    // Se Firestore estiver configurado, salvar
    if (window.firebaseReady) {
        (async () => {
            try {
                const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                await addDoc(collection(window.firebaseDb, 'contatos'), {
                    nome,
                    email,
                    assunto,
                    mensagem,
                    criadoEm: serverTimestamp()
                });
                alert('Mensagem enviada com sucesso!');
                form.reset();
            } catch (err) {
                console.error('Erro ao salvar contato:', err);
                alert('Não foi possível enviar agora. Tente novamente mais tarde.');
            }
        })();
    } else {
        alert('Mensagem enviada com sucesso!\n\n(Offline: configure o Firebase para salvar no banco)');
        form.reset();
    }
}

// Purchase modal functions
let currentProduct = null;
const products = {
    'passe-booyah': { name: 'Passe Booyah', price: 'R$ 11,00', description: 'Assinatura mensal com acesso completo' },
    'aim-training': { name: 'XTreino - Aim Training', price: 'R$ 49,90', description: 'Sessão de 2 horas de treinamento' },
    'estrategia': { name: 'XTreino - Estratégia', price: 'R$ 79,90', description: 'Sessão de 3 horas de treinamento' },
    'mentalidade': { name: 'XTreino - Mentalidade', price: 'R$ 39,90', description: 'Sessão de 1.5 horas de treinamento' },
    'camisa': { name: 'Camisa Oficial', price: 'R$ 89,90', description: 'Produto físico - Camisa premium' },
    'planilhas': { name: 'Planilhas de Análise', price: 'R$ 29,90', description: 'Download digital imediato' },
    'imagens': { name: 'Imagens Aéreas', price: 'R$ 19,90', description: 'Download digital imediato' },
    'sensibilidades': { name: 'Sensibilidades', price: 'R$ 8,00', description: 'Download digital imediato' },
    // Eventos e Reservas (cupom ADMFALL = 5% off)
    'evt-xtreino-gratuito': { name: 'XTreino Gratuito', price: 'R$ 0,00', description: 'Evento gratuito — horários 14h–23h' },
    'evt-modo-liga': { name: 'XTreino Modo Liga', price: 'R$ 3,00', description: 'Tabela + premiações, narração e transmissão — 14h–23h' },
    'evt-camp-freitas': { name: 'Camp Freitas', price: 'R$ 5,00', description: 'Inscrição — premiação total R$ 2000,00 + troféu' },
    'evt-semanal-freitas': { name: 'Semanal Freitas', price: 'R$ 3,50', description: '2 quedas, premiação R$ 65,00, fases 19h–22h' }
};

function openPurchaseModal(productId) {
    showProductModal(productId);
}

function showProductModal(productId){
    currentProduct = productId;
    const product = products[productId];
    if (!product) return;
    const detailsMap = {
        'sensibilidades': {
            desc: '⚠ Apenas R$8,00! ⚠\nPrecisão, estabilidade e controle máximo.\nInclui: Sensibilidade otimizada (PC/Android/iOS), Pack de Otimização, Configuração Completa, Aprimoramento de Mira e Reação.',
            options: null
        },
        'imagens': {
            desc: 'Mapas: Bermuda, Purgatório, Kalahari, Nova Terra, Alpine. Cada link: ~20 imagens com principais calls. Valores: 1 mapa R$2 | 2 por R$4 | 3 por R$5 | 5 por R$7.',
            options: ['Bermuda','Purgatório','Kalahari','Nova Terra','Alpine']
        },
        'planilhas': {
            desc: 'Para coachs e analistas: análises (kills, dano, tempo), gráficos, ajuste total e vídeo explicativo.',
            options: null
        },
        'passe-booyah': {
            desc: 'R$11,00 • 100% confiável, entrega rápida, não pedimos senha/email (apenas ID).',
            options: null
        },
        'camisa': {
            desc: 'Camisa oficial • tecido leve e estampa premium. Frente/Costas disponíveis nos links da página.',
            options: ['P','M','G','GG']
        }
    };

    const details = detailsMap[productId] || { desc: product.description, options: null };
    document.getElementById('purchaseTitle').textContent = product.name;
    document.getElementById('purchaseDescription').textContent = details.desc;
    document.getElementById('purchasePrice').textContent = product.price;

    // imagem do produto
    const imgMap = {
        'sensibilidades': 'BANNER FREITAS SENSIBILIDADE.png',
        'imagens': 'BANNER FREITAS VENDA DE MAPAS.png',
        'planilhas': 'PLANILHAS FREITAS FINALIZADO VERMELHO.png',
        'passe-booyah': 'PASSE ORG FREITAS FEED.png',
        'camisa': 'DIVULGAÇÃO MANTO FREITAS.jpg',
        // imagens dos eventos (JPGs no projeto)
        'evt-xtreino-gratuito': 'XTREINO FREITAS GRATUITO E ASSOCIADO.jpg',
        'evt-modo-liga': '𝑿𝑻𝑹𝑬𝑰𝑵𝑶 𝑭𝑹𝑬𝑰𝑻𝑨𝑺 𝑴𝑶𝑫𝑶 𝑳𝑰𝑮𝑨.jpg',
        'evt-camp-freitas': '𝑪𝑨𝑴𝑷 𝑭𝑹𝑬𝑰𝑻𝑨𝑺 .jpg',
        'evt-semanal-freitas': '𝙎𝙀𝙈𝘼𝙉𝘼𝙇 𝙁𝙍𝙀𝙄𝙏𝘼𝙎.jpg'
    };
    const imgEl = document.getElementById('purchaseImage');
    if (imgEl) imgEl.src = imgMap[productId] || '';

    // opções dinâmicas
    const optContainer = document.getElementById('purchaseOptions');
    optContainer.innerHTML = '';
    // Opções para camisa (tamanho)
    if (productId === 'camisa' && details.options){
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium mb-2';
        label.textContent = 'Tamanho';
        const select = document.createElement('select');
        select.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:border-blue-matte focus:outline-none';
        details.options.forEach(o=>{ const op = document.createElement('option'); op.textContent = o; select.appendChild(op); });
        optContainer.appendChild(label);
        optContainer.appendChild(select);
    }

    // Opções para imagens: campo texto para mapas + quantidade
    if (productId === 'imagens'){
        const mapsLabel = document.createElement('label');
        mapsLabel.className = 'block text-sm font-medium mb-2';
        mapsLabel.textContent = 'Mapas desejados (separe por vírgula)';
        const mapsInput = document.createElement('input');
        mapsInput.id = 'mapsNames';
        mapsInput.type = 'text';
        mapsInput.placeholder = 'Ex.: Bermuda, Kalahari';
        mapsInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none';
        optContainer.appendChild(mapsLabel);
        optContainer.appendChild(mapsInput);

        const qtyWrap = document.createElement('div');
        qtyWrap.className = 'mt-3';
        qtyWrap.innerHTML = '<label class="block text-sm font-medium mb-2">Quantidade de mapas (1 a 5)</label><input id="mapsQty" type="number" min="1" max="5" value="1" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:border-blue-matte focus:outline-none">';
        optContainer.appendChild(qtyWrap);
    }

    // Campo de cupom apenas para eventos (ids iniciando com evt-)
    if (productId.startsWith('evt-')){
        const cupomWrap = document.createElement('div');
        cupomWrap.className = 'mt-3';
        cupomWrap.innerHTML = '<label class="block text-sm font-medium mb-2">Cupom de desconto</label><input id="couponCode" type="text" placeholder="ADMFALL" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none">\n<p class="text-xs text-gray-500 mt-1">Use <strong>ADMFALL</strong> para 5% de desconto.</p>';
        optContainer.appendChild(cupomWrap);
    }

    // Preço inicial e atualização dinâmica
    updatePurchaseTotal(productId);
    const qtyEl = document.getElementById('mapsQty');
    if (qtyEl) qtyEl.addEventListener('input', ()=> updatePurchaseTotal(productId));
    const mapsNamesEl = document.getElementById('mapsNames');
    if (mapsNamesEl) mapsNamesEl.addEventListener('input', ()=> syncMapsQtyWithNames());
    const couponEl = document.getElementById('couponCode');
    if (couponEl) couponEl.addEventListener('input', ()=> updatePurchaseTotal(productId));

    document.getElementById('purchaseModal').classList.remove('hidden');
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
}

function updatePurchaseTotal(productId){
    let total = 0;
    if (productId === 'imagens'){
        const qty = Math.max(1, Math.min(5, Number(document.getElementById('mapsQty')?.value || 1)));
        const pricing = {1:2, 2:4, 3:5, 4:6, 5:7};
        total = pricing[qty] || 2;
    } else {
        const product = products[productId];
        total = Number((product.price || '0').replace(/[^0-9,]/g,'').replace(',','.')) || 0;
        // aplicar cupom de 5% apenas em eventos
        if (productId.startsWith('evt-')){
            const code = (document.getElementById('couponCode')?.value || '').trim().toUpperCase();
            if (code === 'ADMFALL') {
                total = Number((total * 0.95).toFixed(2));
            }
        }
    }
    const priceEl = document.getElementById('purchasePrice');
    if (priceEl) priceEl.textContent = total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function syncMapsQtyWithNames(){
    const names = (document.getElementById('mapsNames')?.value || '')
        .split(',')
        .map(s=>s.trim())
        .filter(Boolean);
    const qtyEl = document.getElementById('mapsQty');
    if (!qtyEl) return;
    if (names.length) qtyEl.value = Math.min(5, Math.max(1, names.length));
    updatePurchaseTotal('imagens');
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').classList.add('hidden');
    currentProduct = null;
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}

async function handlePurchase(event) {
    event.preventDefault();
    const product = products[currentProduct];
    if (!product) {
        alert('Produto inválido.');
        return;
    }
    
    // total atual do modal
    const totalText = document.getElementById('purchasePrice')?.textContent || '0';
    const totalNum = Number(totalText.replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    
    // validação específica para imagens (quantidade vs nomes)
    if (currentProduct === 'imagens'){
        const qty = Math.max(1, Math.min(5, Number(document.getElementById('mapsQty')?.value || 1)));
        const names = (document.getElementById('mapsNames')?.value || '')
            .split(',').map(s=>s.trim()).filter(Boolean);
        if (names.length && names.length !== qty){
            alert('Quantidade de mapas deve corresponder ao número de mapas escritos.');
            return;
        }
    }

    // Coletar dados do formulário
    const formData = new FormData(event.target);
    const customerName = formData.get('name') || document.querySelector('#purchaseModal input[type="text"]')?.value || '';
    const customerEmail = formData.get('email') || document.querySelector('#purchaseModal input[type="email"]')?.value || '';
    
    // Coletar opções específicas do produto
    let productOptions = {};
    if (currentProduct === 'camisa') {
        const sizeSelect = document.querySelector('#purchaseModal select');
        productOptions.size = sizeSelect?.value || '';
    } else if (currentProduct === 'imagens') {
        const selected = Array.from(document.querySelectorAll('input[name="mapOption"]:checked')).map(i=>i.value);
        productOptions.maps = selected;
        productOptions.quantity = selected.length || 1;
    }

    try {
        // Salvar order no Firestore ANTES de redirecionar
        if (window.firebaseDb) {
            const { addDoc, collection, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            
            const orderData = {
                title: product.name,
                description: product.description,
                item: product.name,
                amount: totalNum,
                total: totalNum,
                quantity: 1,
                currency: 'BRL',
                status: 'pending',
                customer: customerEmail,
                customerName: customerName,
                buyerEmail: customerEmail,
                userId: window.firebaseAuth.currentUser?.uid,
                uid: window.firebaseAuth.currentUser?.uid,
                productId: currentProduct,
                productOptions: productOptions,
                createdAt: new Date(),
                timestamp: Date.now(),
                type: 'digital_product' // Marcar como produto digital
            };
            
            console.log('🔍 Attempting to save digital product order:', orderData);
            const docRef = await addDoc(collection(window.firebaseDb, 'orders'), orderData);
            console.log('✅ Digital product order saved to Firestore with ID:', docRef.id);
            
            // Salvar external_reference para o webhook
            const externalRef = `digital_${docRef.id}`;
            await updateDoc(docRef, { external_reference: externalRef });
        }

        // Chamar function segura (Netlify) para criar Preference
        const response = await fetch('/.netlify/functions/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: product.name,
                unit_price: totalNum,
                currency_id: 'BRL',
                quantity: 1,
                back_url: window.location.origin + window.location.pathname,
                external_reference: externalRef
            })
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        
        closePurchaseModal();
        
        // Redireciona para o checkout do Mercado Pago
        if (data.init_point) {
            window.location.href = data.init_point;
        } else {
            alert('Não foi possível iniciar o checkout.');
        }
    } catch (error) {
        console.error('Erro no checkout:', error);
        alert('Falha ao iniciar checkout.');
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const purchaseModal = document.getElementById('purchaseModal');
    const clientAreaModal = document.getElementById('clientAreaModal');
    const tokensModal = document.getElementById('tokensModal');
    const freeWhatsModal = document.getElementById('freeWhatsModal');
    const scheduleModal = document.getElementById('scheduleModal');
    
    // login modal removido
    if (event.target === purchaseModal) {
        closePurchaseModal();
    }
    // client area removida
    if (event.target === tokensModal) {
        closeTokensModal();
    }
    if (event.target === freeWhatsModal) {
        closeFreeWhatsModal();
    }
    if (event.target === scheduleModal) {
        closeScheduleModal();
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Carregar destaques do Firestore
async function loadHighlightsFromFirestore() {
    try {
        if (!window.firebaseDb) return;
        
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const highlightsRef = collection(window.firebaseDb, 'highlights');
        const snapshot = await getDocs(highlightsRef);
        
        const highlights = {};
        snapshot.forEach(doc => {
            highlights[doc.id] = doc.data();
        });
        
        // Se não há destaques, usar os padrão
        if (Object.keys(highlights).length === 0) {
            highlights.highlight1 = {
                title: 'Modo Liga - Estratégia',
                subtitle: 'Treinos competitivos',
                description: 'Treinos competitivos com pontuação e ranking.',
                image: '',
                action: "openPurchaseModal('estrategia')",
                hasRedirect: false,
                redirectUrl: '',
                customLinkUrl: ''
            };
            highlights.highlight2 = {
                title: 'Campeonato Semanal',
                subtitle: 'Etapas semanais',
                description: 'Etapas semanais com premiações.',
                image: '',
                action: "openPurchaseModal('planilhas')",
                hasRedirect: false,
                redirectUrl: '',
                customLinkUrl: ''
            };
            highlights.highlight3 = {
                title: 'Camp de Fases',
                subtitle: 'Eliminatórias',
                description: 'Eliminatórias com melhores confrontos.',
                image: '',
                action: "openPurchaseModal('camp-fases')",
                hasRedirect: false,
                redirectUrl: '',
                customLinkUrl: ''
            };
        }
        
        // Renderizar destaques
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        
        track.innerHTML = '';
        
        Object.keys(highlights).forEach(key => {
            const highlight = highlights[key];
            if (highlight && highlight.title) {
                const slide = document.createElement('div');
                slide.className = 'min-w-full p-8 bg-white';
                
                // Criar imagem com ou sem link
                let imageHtml = '';
                if (highlight.image) {
                    if (highlight.hasRedirect && highlight.redirectUrl) {
                        imageHtml = `<a href="${highlight.redirectUrl}" target="_blank" rel="noopener noreferrer" class="block w-full h-full">
                            <img src="${highlight.image}" alt="${highlight.title}" class="w-full h-full object-cover hover:opacity-90 transition-opacity">
                        </a>`;
                    } else {
                        imageHtml = `<img src="${highlight.image}" alt="${highlight.title}" class="w-full h-full object-cover">`;
                    }
                } else {
                    imageHtml = '';
                }
                
                // Criar botão com ou sem link personalizado
                let buttonHtml = '';
                if (highlight.action === 'custom_link' && highlight.customLinkUrl) {
                    buttonHtml = `<a href="${highlight.customLinkUrl}" target="_blank" rel="noopener noreferrer" class="bg-blue-matte hover-blue-matte px-6 py-2 rounded-lg text-white font-semibold inline-block">Ver Mais</a>`;
                } else {
                    buttonHtml = `<button onclick="${highlight.action}" class="bg-blue-matte hover-blue-matte px-6 py-2 rounded-lg text-white font-semibold">Ver Mais</button>`;
                }
                
                slide.innerHTML = `
                    <div class="grid md:grid-cols-2 gap-6 items-center">
                        <div>
                            <h3 class="text-xl font-bold mb-2">${highlight.title}</h3>
                            ${highlight.subtitle ? `<p class="text-gray-500 mb-2">${highlight.subtitle}</p>` : ''}
                            <p class="text-gray-600 mb-4">${highlight.description}</p>
                            ${buttonHtml}
                        </div>
                        <div class="rounded-xl ${highlight.image ? '' : 'bg-blue-matte bg-opacity-20'} h-48 overflow-hidden flex items-center justify-center">
                            ${imageHtml}
                        </div>
                    </div>
                `;
                track.appendChild(slide);
            }
        });
        
        // Inicializar carousel
        initCarousel();
        
    } catch (error) {
        console.error('Erro ao carregar destaques:', error);
    }
}

// Simple carousel with auto-advance
function initCarousel() {
    const track = document.getElementById('carouselTrack');
    const prev = document.getElementById('carouselPrev');
    const next = document.getElementById('carouselNext');
    if (!track || !prev || !next) return;
    
    let index = 0;
    const slides = track.children.length;
    let autoAdvanceInterval;
    
    function update() { 
        track.style.transform = `translateX(-${index*100}%)`; 
    }
    
    function nextSlide() {
        index = (index + 1) % slides;
        update();
    }
    
    function prevSlide() {
        index = (index - 1 + slides) % slides;
        update();
    }
    
    function startAutoAdvance() {
        autoAdvanceInterval = setInterval(nextSlide, 10000); // 10 segundos
    }
    
    function stopAutoAdvance() {
        if (autoAdvanceInterval) {
            clearInterval(autoAdvanceInterval);
        }
    }
    
    // Event listeners para botões manuais
    prev.addEventListener('click', () => {
        stopAutoAdvance();
        prevSlide();
        startAutoAdvance();
    });
    
    next.addEventListener('click', () => {
        stopAutoAdvance();
        nextSlide();
        startAutoAdvance();
    });
    
    // Pausar auto-advance quando hover
    track.addEventListener('mouseenter', stopAutoAdvance);
    track.addEventListener('mouseleave', startAutoAdvance);
    
    // Iniciar auto-advance
    if (slides > 1) {
        startAutoAdvance();
    }
}

// Carregar destaques quando o Firebase estiver pronto
if (window.firebaseReady) {
    loadHighlightsFromFirestore();
    loadNewsFromFirestore();
} else {
    window.addEventListener('load', () => {
        setTimeout(() => {
            loadHighlightsFromFirestore();
            loadNewsFromFirestore();
        }, 1000);
    });
}

// Carregar notícias do Firestore
async function loadNewsFromFirestore() {
    try {
        if (!window.firebaseDb) return;
        
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const newsRef = collection(window.firebaseDb, 'news');
        const snapshot = await getDocs(newsRef);
        
        const news = [];
        snapshot.forEach(doc => {
            news.push(doc.data());
        });
        
        // Ordenar por data (mais recente primeiro)
        news.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Renderizar notícias
        const container = document.getElementById('newsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (news.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex items-center justify-center py-12">
                    <p class="text-gray-500">Nenhuma notícia disponível no momento.</p>
                </div>
            `;
            return;
        }
        
        news.forEach(newsItem => {
            const newsCard = document.createElement('article');
            newsCard.className = 'bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200';
            
            const date = new Date(newsItem.date);
            const formattedDate = date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Determinar ícone baseado no tipo de notícia
            let iconClass = 'fas fa-newspaper';
            let category = 'Notícia';
            
            if (newsItem.title.toLowerCase().includes('evento') || newsItem.title.toLowerCase().includes('treino')) {
                iconClass = 'fas fa-calendar-alt';
                category = 'Evento';
            } else if (newsItem.title.toLowerCase().includes('aviso') || newsItem.title.toLowerCase().includes('pausa')) {
                iconClass = 'fas fa-bell';
                category = 'Aviso';
            } else if (newsItem.title.toLowerCase().includes('confirmado') || newsItem.title.toLowerCase().includes('verificado')) {
                iconClass = 'fas fa-check-circle';
                category = 'Confirmado';
            }
            
            newsCard.innerHTML = `
                <div class="bg-blue-matte h-48 flex items-center justify-center">
                    <i class="${iconClass} text-4xl text-white"></i>
                </div>
                <div class="p-6">
                    <div class="text-sm text-blue-matte mb-2">${category}</div>
                    <h3 class="text-xl font-bold mb-3 text-gray-800">${newsItem.title}</h3>
                    <p class="text-gray-600 mb-4">${newsItem.content}</p>
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>Por: ${newsItem.author}</span>
                        <span>${formattedDate}</span>
                    </div>
                    <button class="text-blue-matte hover:underline font-semibold">Ver mais</button>
                </div>
            `;
            
            container.appendChild(newsCard);
        });
        
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        const container = document.getElementById('newsContainer');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full flex items-center justify-center py-12">
                    <p class="text-red-500">Erro ao carregar notícias.</p>
                </div>
            `;
        }
    }
}

// Cart
const cart = [];
function formatBRL(v){ return (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function toggleCart(open){
    const drawer = document.getElementById('cartDrawer');
    if (!drawer) return;
    if (open === undefined) drawer.classList.toggle('hidden');
    else drawer.classList[open ? 'remove' : 'add']('hidden');
    // marcar estado de modal no mobile quando carrinho visível
    if (window.innerWidth <= 767) {
        if (!drawer.classList.contains('hidden')) document.body.classList.add('modal-open-mobile');
        else maybeClearMobileModalState();
    }
}
const cartFab = document.getElementById('cartFab');
if (cartFab){ cartFab.addEventListener('click', ()=> toggleCart(true)); }

function renderCart(){
    const list = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!list || !totalEl) return;
    list.innerHTML = '';
    let total = 0;
    cart.forEach((item, idx)=>{
        total += item.price * item.qty;
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between border-b pb-3';
        row.innerHTML = `<div><div class="font-semibold">${item.name}</div><div class="text-sm text-gray-500">${item.qty} x ${formatBRL(item.price)}</div></div>
        <button class="text-red-600" data-remove="${idx}"><i class="fas fa-trash"></i></button>`;
        list.appendChild(row);
    });
    list.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-remove]');
        if (!btn) return;
        const i = Number(btn.getAttribute('data-remove'));
        cart.splice(i,1);
        renderCart();
    }, { once: true });
    totalEl.textContent = formatBRL(total);
}

function addToCartByProductId(productId){
    const map = {
        'aim-training': { name:'XTreino - Aim Training', price:49.90 },
        'estrategia': { name:'XTreino - Estratégia', price:79.90 },
        'mentalidade': { name:'XTreino - Mentalidade', price:39.90 },
        'camisa': { name:'Camisa Oficial', price:89.90 },
        'planilhas': { name:'Planilhas de Análise', price:29.90 },
        'imagens': { name:'Imagens Aéreas', price:19.90 },
        'sensibilidades': { name:'Sensibilidades', price:14.90 },
        'camp-fases': { name:'Camp de Fases', price:99.90 }
    };
    const p = map[productId];
    if (!p) return;
    const existing = cart.find(c=>c.name===p.name);
    if (existing) existing.qty += 1; else cart.push({ ...p, qty: 1 });
    renderCart();
    toggleCart(true);
}

// Hook da loja → adicionar ao carrinho (executa após scheduleConfig existir)
function initShopCartHook(){
    document.querySelectorAll('#loja .product-card button').forEach(btn=>{
        const onClick = btn.getAttribute('onclick') || '';
        const m = onClick.match(/openScheduleModal\('([^']+)'\)/);
        if (!m) return;
        const pid = m[1];
        btn.addEventListener('click', (e)=>{
            try{
                if (!window.scheduleConfig || !window.scheduleConfig[pid] || !window.scheduleConfig[pid].isProduct) return; // deixa eventos intactos
                e.preventDefault();
                const sc = window.scheduleConfig[pid];
                const p = { name: sc.label, price: Number(sc.price) };
                const exists = cart.find(c=>c.name===p.name);
                if (exists) exists.qty += 1; else cart.push({ ...p, qty: 1 });
                renderCart();
                toggleCart(true);
            }catch(_){ }
        });
    });
}

function checkoutCart(){
    const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
    // Mercado Pago preference via Function
    fetch('/.netlify/functions/create-preference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: 'Carrinho XTreino', 
            unit_price: Number(total.toFixed(2)), 
            currency_id: 'BRL', 
            quantity: 1,
            back_url: window.location.origin + window.location.pathname
        })
    }).then(async (res)=>{ if(!res.ok) throw new Error(await res.text()); return res.json(); })
    .then(data=>{ if (data.init_point) window.location.href = data.init_point; else alert('Erro ao iniciar checkout.'); })
    .catch(()=> alert('Falha no checkout.'));
}

// --- Agendamento nativo (Firestore + Netlify Function) ---
const scheduleConfig = {
    'modo-liga': { label: 'XTreino Modo Liga', price: 3.00 },
    'camp-freitas': { label: 'Camp Freitas', price: 5.00 },
    'semanal-freitas': { label: 'Semanal Freitas', price: 3.50 },
    'xtreino-tokens': { label: 'XTreino Tokens', price: 1.00, payWithToken: true },
    // Produtos da loja virtual
    'sensibilidades': { label: 'Sensis Freitas – PC / Android / iOS', price: 8.00, isProduct: true },
    'imagens': { label: 'Imagens Aéreas', price: 2.00, isProduct: true },
    'planilhas': { label: 'Planilhas de Análises', price: 29.90, isProduct: true },
    'passe-booyah': { label: 'Passe Booyah', price: 11.00, isProduct: true },
    'camisa': { label: 'Camisa Oficial', price: 89.90, isProduct: true }
};

// Função para adicionar opções específicas de cada produto
function addProductOptions(productId) {
    // Limpar opções anteriores
    const optionsContainer = document.getElementById('productOptions');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
    } else {
        // Criar container se não existir
        const container = document.createElement('div');
        container.id = 'productOptions';
        container.className = 'mt-6';
        
        // Inserir após o campo de telefone
        const phoneField = document.getElementById('schedPhone').parentElement;
        phoneField.parentNode.insertBefore(container, phoneField.nextSibling);
    }
    
    const container = document.getElementById('productOptions');
    
    switch (productId) {
        case 'sensibilidades':
            // Sensibilidades não precisa de opções extras
            container.innerHTML = `
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div class="flex items-center mb-4">
                        <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                        <h4 class="text-lg font-semibold text-gray-800">Configuração Completa</h4>
                    </div>
                    <p class="text-gray-600 text-sm">Inclui: Sensibilidade otimizada (PC/Android/iOS), Pack de Otimização, Configuração Completa, Aprimoramento de Mira e Reação.</p>
                </div>
            `;
            break;
            
        case 'imagens':
            // Opções para imagens aéreas (checkboxes com IDs padronizados)
            container.innerHTML = `
                <div class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                    <div class="flex items-center mb-4">
                        <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                            </svg>
                        </div>
                        <h4 class="text-lg font-semibold text-gray-800">Selecionar Mapas</h4>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <label class="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="checkbox" name="mapOption" value="bermuda" class="w-4 h-4"> <span>Bermuda</span></label>
                        <label class="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="checkbox" name="mapOption" value="purgatorio" class="w-4 h-4"> <span>Purgatório</span></label>
                        <label class="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="checkbox" name="mapOption" value="kalahari" class="w-4 h-4"> <span>Kalahari</span></label>
                        <label class="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="checkbox" name="mapOption" value="alpina" class="w-4 h-4"> <span>Alpina</span></label>
                        <label class="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="checkbox" name="mapOption" value="novaterra" class="w-4 h-4"> <span>Nova Terra</span></label>
                    </div>
                    <div class="mt-4 bg-blue-100 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-sm text-blue-800 font-medium">Preços: 1 mapa R$2 | 2 por R$4 | 3 por R$5 | 5 por R$7 • Selecionados: <b id="mapsCount">0</b> • Total: <b id="mapsPrice">R$ 0,00</b></span>
                        </div>
                    </div>
                </div>
            `;
            // Atualizar contagem/preço conforme seleção
            (function(){
                const prices = { 1: 2, 2: 4, 3: 5, 4: 5, 5: 7 };
                const update = () => {
                    const count = document.querySelectorAll('input[name="mapOption"]:checked').length;
                    const price = prices[count] || (count>5?prices[5]:0);
                    const c = document.getElementById('mapsCount'); if (c) c.textContent = String(count);
                    const p = document.getElementById('mapsPrice'); if (p) p.textContent = `R$ ${price.toFixed(2)}`;
                };
                document.querySelectorAll('input[name="mapOption"]').forEach(i=>i.addEventListener('change', update));
                update();
            })();
            break;
            
        case 'planilhas':
            // Planilhas
            container.innerHTML = `
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                    <div class="flex items-center mb-4">
                        <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                        </div>
                        <h4 class="text-lg font-semibold text-gray-800">Análises Profissionais</h4>
                    </div>
                    <p class="text-gray-600 text-sm">Para coachs e analistas: análises (kills, dano, tempo), gráficos, ajuste total e vídeo explicativo.</p>
                </div>
            `;
            break;
            
        case 'passe-booyah':
            // Opções para passe Booyah
            container.innerHTML = `
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                    <div class="flex items-center mb-4">
                        <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h4 class="text-lg font-semibold text-gray-800">Informações do Jogo</h4>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">ID do Jogador (Free Fire)</label>
                        <input type="text" id="playerId" placeholder="Ex.: 123456789" 
                               class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors">
                    </div>
                    
                    <div class="mt-4 bg-green-100 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-sm text-green-800 font-medium">Entrega rápida! Não pedimos senha/email, apenas o ID.</span>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'camisa':
            // Opções para camisa
            container.innerHTML = `
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                    <div class="flex items-center mb-4">
                        <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                        </div>
                        <h4 class="text-lg font-semibold text-gray-800">Informações da Camisa</h4>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tamanho</label>
                            <select id="shirtSize" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                                <option value="P">P</option>
                                <option value="M" selected>M</option>
                                <option value="G">G</option>
                                <option value="GG">GG</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Endereço de Entrega</label>
                            <textarea id="deliveryAddress" placeholder="Rua, número, bairro, cidade, CEP" 
                                      class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" rows="3"></textarea>
                        </div>
                    </div>
                    
                    <div class="mt-4 bg-purple-100 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-sm text-purple-800 font-medium">Produto físico - será enviado pelo correio</span>
                        </div>
                    </div>
                </div>
            `;
            break;
    }
    
    // Adicionar event listeners para atualizar preço dinamicamente
    if (productId === 'imagens') {
        const qtyInput = document.getElementById('mapsQty');
        const namesInput = document.getElementById('mapsNames');
        
        if (qtyInput) {
            qtyInput.addEventListener('input', () => updateProductPrice(productId));
        }
        if (namesInput) {
            namesInput.addEventListener('input', () => syncMapsQtyWithNames());
        }
    }
}

// Função para atualizar preço baseado nas opções
function updateProductPrice(productId) {
    const cfg = scheduleConfig[productId];
    if (!cfg) return;
    
    let finalPrice = cfg.price;
    
    if (productId === 'imagens') {
        const qty = parseInt(document.getElementById('mapsQty')?.value || 1);
        // Preços: 1 mapa R$2 | 2 por R$4 | 3 por R$5 | 5 por R$7
        const prices = { 1: 2, 2: 4, 3: 5, 4: 5, 5: 7 };
        finalPrice = prices[qty] || 2;
    }
    
    document.getElementById('schedPrice').textContent = finalPrice.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

// Função para sincronizar quantidade com nomes de mapas
function syncMapsQtyWithNames() {
    const namesInput = document.getElementById('mapsNames');
    const qtyInput = document.getElementById('mapsQty');
    
    if (namesInput && qtyInput) {
        const names = namesInput.value.split(',').map(s => s.trim()).filter(Boolean);
        if (names.length > 0) {
            qtyInput.value = names.length;
            updateProductPrice('imagens');
        }
    }
}

function openScheduleModal(eventType){
    const cfg = scheduleConfig[eventType];
    const modal = document.getElementById('scheduleModal');
    if (!cfg || !modal) return;
    modal.dataset.eventType = eventType;
    document.getElementById('schedPrice').textContent = cfg.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById('schedEventType').textContent = cfg.label;
    
    // Sincronizar tokens do usuário antes de qualquer checagem
    try { if (typeof syncUserTokens === 'function') { syncUserTokens(); } } catch(_) {}

    // Ocultar botão de tokens (não usamos compra de tokens)
    const hideBuyTokens = document.getElementById('buyTokensBtn');
    if (hideBuyTokens) hideBuyTokens.classList.add('hidden');
    
    // Se for produto da loja, esconder seleção de data/hora e adicionar opções específicas
    if (cfg.isProduct) {
        // Esconder TODAS as seções de data e horários para produtos
        const grid = document.querySelector('#scheduleModal .lg\\:grid-cols-2');
        const leftColumn = document.querySelector('#scheduleModal .lg\\:grid-cols-2 > div:first-child');
        if (leftColumn) {
            leftColumn.style.display = 'none';
        }
        // Expandir coluna direita para 100% quando produto (ex.: Sensibilidades)
        if (grid) {
            grid.classList.remove('lg:grid-cols-2');
            grid.classList.add('grid-cols-1');
        }
        console.log('Modal de produto aberto - coluna esquerda escondida');
        
        // Esconder botão "Comprar tokens"
        const buyTokensBtn = document.getElementById('buyTokensBtn');
        if (buyTokensBtn) buyTokensBtn.classList.add('hidden');
        
        // Adicionar opções específicas do produto
        addProductOptions(eventType);
        
        // Mostrar modal
        modal.classList.remove('hidden');
        return;
    }
    
    // Para eventos, mostrar seleção de data/hora
    const leftColumn = document.querySelector('#scheduleModal .lg\\:grid-cols-2 > div:first-child');
    if (leftColumn) {
        leftColumn.style.display = 'block';
    }
    // Se havia opções de produto (ex.: seleção de mapas), remover ao abrir um evento
    const prodOpts = document.getElementById('productOptions');
    if (prodOpts && prodOpts.parentNode) {
        prodOpts.parentNode.removeChild(prodOpts);
    }
    // Garantir grid em 2 colunas para eventos
    const gridEv = document.querySelector('#scheduleModal .grid');
    if (gridEv) {
        gridEv.classList.remove('grid-cols-1');
        if (!gridEv.classList.contains('lg:grid-cols-2')) gridEv.classList.add('lg:grid-cols-2');
    }
    
    // Garantir que o botão de tokens permaneça oculto
    const buyTokensBtn = document.getElementById('buyTokensBtn');
    if (buyTokensBtn) buyTokensBtn.classList.add('hidden');
    
    initScheduleDate();
    // re-render quando a data mudar
    const dateInput = document.getElementById('schedDate');
    if (dateInput && !dateInput._schedBound){
        dateInput.addEventListener('change', () => {
            updateSelectedDate();
            renderScheduleTimes();
        });
        dateInput._schedBound = true;
    }
    renderScheduleTimes();
    // Preenche dados se logado
    try{
        if (window.isLoggedIn && window.currentUserProfile){
            const p = window.currentUserProfile;
            const team = document.getElementById('schedTeam');
            const email = document.getElementById('schedEmail');
            const phone = document.getElementById('schedPhone');
            if (team) team.value = p.teamName || '';
            if (email) email.value = p.email || '';
            if (phone) phone.value = p.phone || '';
        }
    }catch(_){ }
    modal.classList.remove('hidden');
    
    // Ajustes para mobile
    if (window.innerWidth <= 767) {
        document.body.classList.add('modal-open-mobile');
        // Força o modal a ocupar toda a tela no mobile
        const modalContent = modal.querySelector('div');
        if (modalContent) {
            modalContent.style.height = '100vh';
            modalContent.style.maxHeight = '100vh';
            modalContent.style.overflowY = 'auto';
            modalContent.style.webkitOverflowScrolling = 'touch';
        }
    }
    
    const hint = document.getElementById('schedHint');
    if (hint) hint.textContent = cfg.label;
}
function closeScheduleModal(){
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.classList.add('hidden');
        // Remove estilos inline aplicados no mobile
        const modalContent = modal.querySelector('div');
        if (modalContent && window.innerWidth <= 767) {
            modalContent.style.height = '';
            modalContent.style.maxHeight = '';
            modalContent.style.overflowY = '';
            modalContent.style.webkitOverflowScrolling = '';
        }
        // Restaurar grid padrão (2 colunas) quando fechar o modal de produto
        const grid = document.querySelector('#scheduleModal .grid');
        if (grid) {
            grid.classList.remove('grid-cols-1');
            if (!grid.classList.contains('lg:grid-cols-2')) grid.classList.add('lg:grid-cols-2');
        }
    }
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}
function initScheduleDate(){
    const input = document.getElementById('schedDate');
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth()+1).padStart(2,'0');
    const d = String(today.getDate()).padStart(2,'0');
    input.value = `${y}-${m}-${d}`;
}
function setSchedToday(){ 
    initScheduleDate(); 
    updateSelectedDate();
    renderScheduleTimes(); 
}
function setSchedTomorrow(){
    const input = document.getElementById('schedDate');
    const t = new Date();
    t.setDate(t.getDate()+1);
    const y = t.getFullYear();
    const m = String(t.getMonth()+1).padStart(2,'0');
    const d = String(t.getDate()).padStart(2,'0');
    input.value = `${y}-${m}-${d}`;
    updateSelectedDate();
    renderScheduleTimes();
}

// Função para atualizar a data selecionada
function updateSelectedDate() {
    const dateInput = document.getElementById('schedDate');
    const selectedDateDisplay = document.getElementById('schedSelectedDate');
    if (dateInput && selectedDateDisplay) {
        const date = new Date(dateInput.value);
        if (!isNaN(date.getTime())) {
            selectedDateDisplay.textContent = date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            selectedDateDisplay.textContent = '--';
        }
    }
}
const scheduleCache = {};

// Valida se a data é válida para agendamento (segunda a sexta, não passado)
function isValidScheduleDate(dateStr){
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Não pode ser no passado
    if (date < today) return false;
    
    // Só segunda a sexta (1-5)
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
}

async function renderScheduleTimes(){
    const timesWrap = document.getElementById('schedTimes');
    if (!timesWrap) return;
    timesWrap.innerHTML = '';
    const date = document.getElementById('schedDate').value;
    // eventType do modal atual
    const modal = document.getElementById('scheduleModal');
    const eventType = modal?.dataset?.eventType || null;
    
    // Valida data antes de renderizar
    if (!isValidScheduleDate(date)){
        timesWrap.innerHTML = '<p class="text-red-500 text-center py-4">Agendamentos apenas de segunda a sexta-feira e não em datas passadas.</p>';
        return;
    }
    
    const dayNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const d = new Date(date + 'T00:00:00');
    const day = dayNames[d.getDay()];
    const slots = ['19h','20h','21h','22h','23h'];
    const now = new Date();
    const selectedDate = new Date(date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    // Render imediato com estado neutro e atualiza assíncrono
    slots.forEach(time => {
        const schedule = `${day} - ${time}`;
        const btn = document.createElement('button');
        btn.className = 'slot-btn';
        btn.dataset.schedule = schedule;
        
        // Verificar se o horário já passou (apenas para hoje)
        let isPastTime = false;
        if (isToday) {
            const hour = parseInt(time.replace('h', ''));
            const currentHour = now.getHours();
            isPastTime = hour <= currentHour;
        }
        
        if (isPastTime) {
            btn.className = 'slot-btn bg-gray-300 text-gray-500 cursor-not-allowed';
            btn.disabled = true;
            btn.textContent = `${time} (Horário passou)`;
            btn.onclick = null;
        } else {
            btn.textContent = `${time} (.. /12)`;
            btn.onclick = ()=>{ 
                document.getElementById('schedSelectedTime').value = schedule; 
                document.getElementById('schedSelectedTimeDisplay').textContent = time;
                highlightSelectedSlot(btn, timesWrap); 
            };
        }
        
        timesWrap.appendChild(btn);
    });
    // Atualiza com dados reais e mantém em tempo real
    updateOccupiedAndRefreshButtons(day, date, eventType, timesWrap);
    try{
        const { collection, query, where, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        if (window.__schedUnsub) { try{ window.__schedUnsub(); }catch(_){ } }
        const baseQ = [ where('date','==', date) ];
        if (eventType) baseQ.push(where('eventType','==', eventType));
        window.__schedUnsub = onSnapshot(
            query(collection(window.firebaseDb,'registrations'), ...baseQ),
            ()=> updateOccupiedAndRefreshButtons(day, date, eventType, timesWrap)
        );
    }catch(_){ }
}
function highlightSelectedSlot(selectedBtn, container){
    Array.from(container.children).forEach(el=> el.classList.remove('selected'));
    selectedBtn.classList.add('selected');
}
async function fetchOccupiedForDate(day, date, eventType){
    const map = {};
    try {
        if (!window.firebaseReady) return map;
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const regsRef = collection(window.firebaseDb, 'registrations');
        const clauses = [ where('date','==', date), where('status','in',['paid','confirmed']) ];
        if (eventType) clauses.push(where('eventType','==', eventType));
        const q = query(regsRef, ...clauses);
        const snap = await getDocs(q);
        snap.forEach(doc=>{
            const r = doc.data();
            map[r.schedule] = (map[r.schedule]||0)+1;
        });
    } catch(_) {}
    return map;
}

// Verifica disponibilidade (limite 12 por horário)
async function checkSlotAvailability(date, schedule, eventType){
    try{
        if (!window.firebaseReady) return true;
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const regsRef = collection(window.firebaseDb, 'registrations');
        const clauses = [ where('date','==', date), where('schedule','==', schedule), where('status','in',['paid','confirmed']) ];
        if (eventType) clauses.push(where('eventType','==', eventType));
        const q = query(regsRef, ...clauses);
        const snap = await getDocs(q);
        return snap.size < 12;
    }catch(_){ return true; }
}
async function updateOccupiedAndRefreshButtons(day, date, eventType, container){
    // cache por data
    const cacheKey = `${date}__${eventType||'all'}`;
    let occupied = scheduleCache[cacheKey];
    if (!occupied) {
        try { occupied = await fetchOccupiedForDate(day, date, eventType); } catch(_) { occupied = {}; }
        scheduleCache[cacheKey] = occupied;
    }
    const now = new Date();
    const selectedDate = new Date(date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    Array.from(container.children).forEach(btn => {
        const schedule = btn.dataset.schedule;
        const time = (schedule || '').split(' - ')[1] || '';
        const taken = occupied[schedule] || 0;
        const available = Math.max(0, 12 - taken);
        
        // Verificar se o horário já passou (apenas para hoje)
        let isPastTime = false;
        if (isToday) {
            const hour = parseInt(time.replace('h', ''));
            const currentHour = now.getHours();
            isPastTime = hour <= currentHour;
        }
        
        if (isPastTime) {
            btn.className = 'slot-btn bg-gray-300 text-gray-500 cursor-not-allowed';
            btn.disabled = true;
            btn.textContent = `${time} (Horário passou)`;
            btn.onclick = null;
        } else if (available === 0){
            btn.className = 'slot-btn bg-red-100 text-red-600 cursor-not-allowed';
            btn.disabled = true;
            btn.textContent = `${time} (Lotado)`;
            btn.onclick = null;
        } else {
            btn.className = 'slot-btn';
            btn.disabled = false;
            btn.textContent = `${time} (${String(available).padStart(2,'0')}/12)`;
            btn.onclick = ()=>{ 
                document.getElementById('schedSelectedTime').value = schedule; 
                document.getElementById('schedSelectedTimeDisplay').textContent = time;
                highlightSelectedSlot(btn, container); 
            };
        }
    });
}
// Função para lidar com compra de produtos da loja
async function handleProductPurchase(productId, cfg) {
    try {
        // Coletar dados do formulário
        const team = document.getElementById('schedTeam').value.trim();
        const email = document.getElementById('schedEmail').value.trim();
        const phone = document.getElementById('schedPhone').value.trim();
        
        if (!email) {
            alert('Email é obrigatório.');
            return;
        }
        
        // Coletar opções específicas do produto
        let productOptions = {};
        let finalPrice = cfg.price;
        
        if (productId === 'imagens') {
            const selected = Array.from(document.querySelectorAll('input[name="mapOption"]:checked')).map(i=>i.value);
            productOptions.maps = selected;
            productOptions.quantity = selected.length || 1;
            // Atualizar preço baseado na quantidade selecionada
            const prices = { 1: 2, 2: 4, 3: 5, 4: 5, 5: 7 };
            finalPrice = prices[productOptions.quantity] || 2;
        } else if (productId === 'passe-booyah') {
            const playerId = document.getElementById('playerId')?.value || '';
            productOptions.playerId = playerId;
        } else if (productId === 'camisa') {
            const shirtSize = document.getElementById('shirtSize')?.value || 'M';
            const deliveryAddress = document.getElementById('deliveryAddress')?.value || '';
            productOptions.size = shirtSize;
            productOptions.deliveryAddress = deliveryAddress;
        }

        // Salvar order no Firestore ANTES de redirecionar
        if (window.firebaseDb) {
            const { addDoc, collection, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            
            const orderData = {
                title: cfg.label,
                description: cfg.label,
                item: cfg.label,
                amount: finalPrice,
                total: finalPrice,
                quantity: 1,
                currency: 'BRL',
                status: 'pending',
                customer: email,
                customerName: team,
                buyerEmail: email,
                userId: window.firebaseAuth.currentUser?.uid,
                uid: window.firebaseAuth.currentUser?.uid,
                phone: phone,
                productId: productId,
                productOptions: productOptions,
                createdAt: new Date(),
                timestamp: Date.now(),
                type: 'digital_product'
            };
            
            console.log('🔍 Attempting to save product order:', orderData);
            const docRef = await addDoc(collection(window.firebaseDb, 'orders'), orderData);
            console.log('✅ Product order saved to Firestore with ID:', docRef.id);

            // Salvar external_reference para o webhook
            var externalRef = `digital_${docRef.id}`;
            await updateDoc(docRef, { external_reference: externalRef });
            try { sessionStorage.setItem('lastExternalRef', externalRef); } catch(_) {}
        }

        // Chamar function segura (Netlify) para criar Preference
        const response = await fetch('/.netlify/functions/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: cfg.label,
                unit_price: finalPrice,
                currency_id: 'BRL',
                quantity: 1,
                back_url: window.location.origin + window.location.pathname,
                external_reference: externalRef || (`digital_${docRef?.id || Date.now()}`)
            })
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        
        closeScheduleModal();
        
        // Redireciona para o checkout do Mercado Pago
        if (data.init_point) {
            window.location.href = data.init_point;
        } else {
            alert('Não foi possível iniciar o checkout.');
        }
    } catch (error) {
        console.error('Erro na compra do produto:', error);
        alert('Falha ao processar compra.');
    }
}

async function submitSchedule(e){
    e.preventDefault();
    const submitBtn = document.getElementById('schedSubmit');
    const oldText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Processando...'; }
    const modal = document.getElementById('scheduleModal');
    const eventType = modal?.dataset?.eventType || 'modo-liga';
    const cfg = scheduleConfig[eventType];
    
    // Se for produto da loja, usar lógica de compra
    if (cfg.isProduct) {
        await handleProductPurchase(eventType, cfg);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
        return;
    }
    
    // Se for evento que usa tokens, usar tokens diretamente
    if (cfg.payWithToken) {
        await useTokensForEvent(eventType);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
        return;
    }
    
    // Lógica para eventos (agendamento)
    const schedule = document.getElementById('schedSelectedTime').value;
    const date = document.getElementById('schedDate').value;
    const team = document.getElementById('schedTeam').value.trim();
    const email = document.getElementById('schedEmail').value.trim();
    const phone = document.getElementById('schedPhone').value.trim();
    if (!schedule){ alert('Selecione um horário.'); return; }
    
    // Verificar se o horário já passou
    const now = new Date();
    const selectedDate = new Date(date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    if (isToday) {
        const timeStr = schedule.split(' - ')[1] || '';
        const hour = parseInt(timeStr.replace('h', ''));
        const currentHour = now.getHours();
        
        if (hour <= currentHour) {
            alert('Este horário já passou. Selecione um horário futuro.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }
    }

    // Se pagar com token: validar saldo e debitar
    if (cfg && cfg.payWithToken){
        const profile = window.currentUserProfile || {};
        if (!profile || !profile.tokens || profile.tokens < cfg.price){ 
            alert(`Saldo de tokens insuficiente. Você precisa de ${cfg.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens.`); 
            if(submitBtn){submitBtn.disabled=false; submitBtn.textContent=oldText;} 
            return; 
        }
    }
    // checar disponibilidade antes de criar a reserva (evita overbooking)
    const canBook = await checkSlotAvailability(date, schedule, eventType);
    if (!canBook){ alert('Este horário não possui vagas. Escolha outro horário.'); if (submitBtn){ submitBtn.disabled=false; submitBtn.textContent=oldText; } return; }

    // cria documento pendente no Firestore (se disponível)
    let regId = 'local-' + Date.now();
    try {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        // grava reserva (inclusive em Netlify/produção)
        if (window.firebaseReady && !isLocal){
            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const docRef = await addDoc(collection(window.firebaseDb,'registrations'),{
                userId: (window.firebaseAuth && window.firebaseAuth.currentUser ? window.firebaseAuth.currentUser.uid : null),
                teamName: team,
                email,
                phone,
                schedule,
                date,
                eventType,
                title: `${cfg.label} - ${schedule} - ${date}`,
                price: Number(cfg.price || 0),
                status:'pending',
                createdAt: serverTimestamp()
            });
            regId = docRef.id;
            try{ sessionStorage.setItem('lastRegId', regId); }catch(_){ }
            try{ sessionStorage.setItem('lastRegInfo', JSON.stringify({ schedule, date, eventType: modal.dataset.eventType, price: cfg.price, title: `${cfg.label} - ${schedule} - ${date}` })); }catch(_){ }
        }
    } catch(_) {}
    if (cfg && cfg.payWithToken){
        // Debita token e confirma
        spendTokens(cfg.price);
        closeScheduleModal();
        alert('Reserva confirmada com uso de token!');
        if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = oldText; }
        return;
    }

    // Se não logado, exige login primeiro
    if (!window.isLoggedIn){
        closeScheduleModal();
        openLoginModal && openLoginModal();
        alert('Faça login para continuar a compra.');
        if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = oldText; }
        return;
    }
    // Fluxo normal: Checkout via Netlify Function
    const total = Number(cfg.price.toFixed(2));
    fetch('/.netlify/functions/create-preference',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
            title: `${cfg.label} - ${schedule} - ${date}`, 
            unit_price: total, 
            currency_id:'BRL', 
            quantity:1,
            back_url: window.location.origin + window.location.pathname
        })
    }).then(async res=>{ if(!res.ok){ const t = await res.text(); throw new Error(t || 'Erro na função de pagamento'); } return res.json(); })
    .then(data=>{
        closeScheduleModal();
        // Salvar external_reference para verificação posterior
        if (data.external_reference) {
            sessionStorage.setItem('lastExternalRef', data.external_reference);
            // Persistir no registro (se existir) para rastrear via painel
            try{
                const regId = sessionStorage.getItem('lastRegId');
                if (regId && window.firebaseDb){
                    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                      .then(({ doc, setDoc, collection }) => {
                          const ref = doc(collection(window.firebaseDb,'registrations'), regId);
                          return setDoc(ref, { external_reference: data.external_reference }, { merge:true });
                      }).catch(()=>{});
                }
            }catch(_){ }
        }
        const url = data.init_point || data.sandbox_init_point; // prioriza produção
        if (url) window.location.href = url; else alert('Não foi possível iniciar o pagamento.');
    }).catch((err)=> { alert('Falha ao iniciar pagamento. ' + (err && err.message ? err.message : '')); })
    .finally(()=>{ if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = oldText; }});
}

// XTreino Gratuito: abrir WhatsApp com mensagem
function openFreeWhatsModal(){
    const modal = document.getElementById('freeWhatsModal');
    const link = document.getElementById('freeWhatsLink');
    const number = '5581986103152'; // ajuste se necessário
    const message = 'Vim do site e quero uma vaga gratuita. Quais horários têm disponível?';
    if (link) link.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    if (modal) modal.classList.remove('hidden');
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
}
function closeFreeWhatsModal(){
    const modal = document.getElementById('freeWhatsModal');
    if (modal) modal.classList.add('hidden');
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}

// Modal confirmação
function openPaymentConfirmModal(title, msg, groupLink){
    console.log('Opening payment confirmation modal:', { title, msg, groupLink });
    const m = document.getElementById('paymentConfirmModal');
    const t = document.getElementById('paymentConfirmTitle');
    const p = document.getElementById('paymentConfirmMsg');
    const g = document.getElementById('paymentGroupBtn');
    
    if (!m) {
        console.error('Payment confirmation modal not found');
        return;
    }
    
    if (t) t.textContent = title || 'Pagamento';
    if (p) p.textContent = msg || '';
    if (g){
        if (groupLink){ g.href = groupLink; g.classList.remove('hidden'); }
        else { g.classList.add('hidden'); }
    }
    m.classList.remove('hidden');
    console.log('Payment confirmation modal opened successfully');
}
function closePaymentConfirmModal(){
    const m = document.getElementById('paymentConfirmModal');
    if (m) m.classList.add('hidden');
}

// Verificar status do pagamento via API do Mercado Pago
async function checkPaymentStatus(preferenceId) {
    try {
        console.log('Checking payment status for preference:', preferenceId);
        
        // Marcar que estamos verificando um pagamento real
        sessionStorage.setItem('checkingPayment', 'true');
        
        // Fazer requisição para nossa Netlify Function que verifica o status
        const response = await fetch('/.netlify/functions/check-payment-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                preference_id: preferenceId,
                external_reference: sessionStorage.getItem('lastExternalRef')
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to check payment status');
        }
        
        const data = await response.json();
        console.log('Payment status response:', data);
        
        if (data.status === 'approved') {
            console.log('Payment approved, processing...');
            processSuccessfulPayment();
        } else if (data.status === 'pending') {
            console.log('Payment still pending, will check again in 10 seconds...');
            setTimeout(() => checkPaymentStatus(preferenceId), 10000);
        } else if (data.status === 'rejected') {
            console.log('Payment was rejected');
            openPaymentConfirmModal('Pagamento Rejeitado', 'Seu pagamento foi rejeitado. Tente novamente ou use outro método de pagamento.');
        } else {
            console.log('Payment status:', data.status);
            // Para outros status, não mostrar modal automaticamente
            // O usuário pode verificar o status na área do cliente
        }
        
    } catch (error) {
        console.error('Error checking payment status:', error);
        // Fallback: apenas logar o erro, não mostrar modal
        // O usuário pode verificar o status na área do cliente
    }
}

// Processar pagamento bem-sucedido
function processSuccessfulPayment() {
    const regId = sessionStorage.getItem('lastRegId');
    console.log('Processing successful payment, regId:', regId);
    
    // Limpar dados de pagamento após processar com sucesso
    sessionStorage.removeItem('lastExternalRef');
    sessionStorage.removeItem('lastRegId');
    sessionStorage.removeItem('lastRegInfo');
    
    if (regId) {
        // Atualizar status no Firestore
        import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
            .then(({ doc, setDoc, getDoc, collection }) => {
                const ref = doc(collection(window.firebaseDb,'registrations'), regId);
                return setDoc(ref, { status:'paid', paidAt: Date.now() }, { merge:true })
                  .then(()=> getDoc(ref))
                  .then(snap=>{ const d = snap.exists()? snap.data():{}; return d.groupLink || null; });
            }).then((groupLink)=>{
                console.log('Registration updated, showing modal');
                openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.', groupLink);
            }).catch((e)=>{
                console.error('Error updating registration:', e);
                openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.');
            });
    } else {
        console.log('No regId, creating local order');
        // Fallback: cria registro local para exibir na aba pedidos
        try{
            const info = JSON.parse(sessionStorage.getItem('lastRegInfo')||'{}');
            const orders = JSON.parse(localStorage.getItem('localOrders')||'[]');
            orders.unshift({ title: info.title||'Reserva', amount: info.price||0, status:'paid', date: new Date().toISOString() });
            localStorage.setItem('localOrders', JSON.stringify(orders));
            console.log('Local order created:', orders[0]);
        }catch(e){ console.error('Error creating local order:', e); }
        openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.');
    }
}

// --- Modal de Tokens ---
function openTokensModal(){
    const modal = document.getElementById('tokensModal');
    if (!modal) return;
    
    // Atualizar saldo de tokens
    const balanceEl = document.getElementById('tokensBalance');
    if (balanceEl) balanceEl.textContent = String(Math.round(getTokenBalance()));
    
    // Atualizar total ao mudar quantidade
    const qtyInput = document.getElementById('tokensQuantity');
    const totalEl = document.getElementById('tokensTotal');
    if (qtyInput && totalEl) {
        qtyInput.addEventListener('input', () => {
            const qty = Math.max(1, Math.min(100, Number(qtyInput.value) || 1));
            const total = qty * 1.00; // R$ 1,00 por token
            totalEl.textContent = total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        });
    }
    
    modal.classList.remove('hidden');
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
}

function closeTokensModal(){
    const modal = document.getElementById('tokensModal');
    if (modal) modal.classList.add('hidden');
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}

// Compra de tokens removida (somente usuários recebem tokens)

async function useTokensForEvent(eventType){
    const eventCosts = {
        'treino': 1.00,
        'modoLiga': 3.00,
        'semanal': 3.50,
        'finalSemanal': 7.00,
        'campFases': 5.00,
        'xtreino-tokens': 1.00
    };
    
    const cost = eventCosts[eventType];
    if (!cost) {
        console.error('Event type not found:', eventType);
        return;
    }
    
    // Sincronização forçada removida para evitar reset do saldo
    // console.log('🔄 Forcing token sync before use...');
    // await syncUserTokens();
    
    // Verificar se tem tokens suficientes
    const profile = window.currentUserProfile || {};
    console.log('🔍 useTokensForEvent - Profile check:', { profile, tokens: profile.tokens, cost });
    
    if (!profile || profile.tokens === undefined || profile.tokens === null || Number(profile.tokens) < Number(cost)) {
        console.log('❌ Insufficient tokens:', { profile, tokens: profile.tokens, cost });
        alert(`Saldo insuficiente. Você precisa de ${cost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens.`);
        return;
    }
    
    if (!canSpendTokens(cost)) {
        alert(`Saldo insuficiente. Você precisa de ${cost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens.`);
        return;
    }
    
    const eventNames = {
        'treino': 'Treino Normal',
        'modoLiga': 'Modo Liga',
        'semanal': 'Semanal',
        'finalSemanal': 'Final Semanal',
        'campFases': 'Camp de Fases',
        'xtreino-tokens': 'XTreino Tokens'
    };
    
    if (confirm(`Confirmar uso de ${cost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens para ${eventNames[eventType]}?`)) {
        const success = await spendTokens(cost);
        if (success) {
            // Criar agendamento direto
            await createTokenSchedule(eventType, cost);
            closeTokensModal();
            renderClientArea();
            alert('✅ Token usado com sucesso! Agendamento criado. Verifique na sua área do cliente.');
        } else {
            alert('Erro ao processar o resgate de tokens. Tente novamente.');
        }
    }
}

// Função para criar agendamento quando usar tokens
async function createTokenSchedule(eventType, cost) {
    try {
        const team = document.getElementById('schedTeam')?.value?.trim() || 'Time';
        const email = document.getElementById('schedEmail')?.value?.trim() || window.firebaseAuth.currentUser?.email;
        const phone = document.getElementById('schedPhone')?.value?.trim() || '';
        const date = document.getElementById('schedDate')?.value || new Date().toISOString().split('T')[0];
        const schedule = document.getElementById('schedSelectedTime')?.value || '19h';
        
        const eventNames = {
            'treino': 'Treino Normal',
            'modoLiga': 'Modo Liga',
            'semanal': 'Semanal',
            'finalSemanal': 'Final Semanal',
            'campFases': 'Camp de Fases',
            'xtreino-tokens': 'XTreino Tokens'
        };
        
        // Link do grupo do WhatsApp baseado no tipo de evento
        const whatsappLinks = {
            'treino': 'https://chat.whatsapp.com/SEU_GRUPO_TREINO',
            'modoLiga': 'https://chat.whatsapp.com/SEU_GRUPO_MODO_LIGA',
            'semanal': 'https://chat.whatsapp.com/SEU_GRUPO_SEMANAL',
            'finalSemanal': 'https://chat.whatsapp.com/SEU_GRUPO_FINAL_SEMANAL',
            'campFases': 'https://chat.whatsapp.com/SEU_GRUPO_CAMP_FASES',
            'xtreino-tokens': 'https://chat.whatsapp.com/SEU_GRUPO_TOKENS'
        };
        
        const scheduleData = {
            teamName: team,
            contact: email,
            email: email, // Campo duplicado para compatibilidade
            phone: phone,
            date: date,
            schedule: schedule,
            eventType: eventType,
            status: 'confirmed',
            paidWithTokens: true,
            tokenCost: cost,
            tokensUsed: cost, // Campo para histórico
            eventName: eventNames[eventType],
            title: eventNames[eventType], // Campo para compatibilidade
            whatsappLink: whatsappLinks[eventType] || 'https://chat.whatsapp.com/SEU_GRUPO_PADRAO',
            userId: window.firebaseAuth.currentUser?.uid,
            uid: window.firebaseAuth.currentUser?.uid,
            createdAt: new Date(),
            timestamp: Date.now()
        };
        
        console.log('🔍 Creating token schedule:', scheduleData);
        
        // Salvar no Firestore
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        
        // 1. Salvar na coleção 'registrations' (para histórico de tokens)
        const regDocRef = await addDoc(collection(window.firebaseDb, 'registrations'), {
            ...scheduleData,
            createdAt: serverTimestamp() // Usar serverTimestamp para consistência
        });
        console.log('✅ Token schedule created with ID:', regDocRef.id);
        
        // 2. Não criar pedido em 'orders' quando for pago com tokens
        // Apenas salvar o registration acima e atualizar UI/local
        
        // Fechar modal
        const modal = document.getElementById('scheduleModal');
        if (modal) modal.classList.add('hidden');
        
        // Forçar atualização da área do cliente
        setTimeout(async () => {
            if (window.location.pathname.includes('client.html')) {
                await loadTokenUsageHistory();
                if (typeof loadRecentOrders === 'function') await loadRecentOrders();
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error creating token schedule:', error);
        alert('Erro ao criar agendamento. Tente novamente.');
    }
}

// --- Edição de Perfil ---
function loadProfileData(){
    const p = window.currentUserProfile || {};
    document.getElementById('profileName').value = p.name || '';
    document.getElementById('profileEmail').value = p.email || '';
    document.getElementById('profilePhone').value = p.phone || '';
    document.getElementById('profileNickname').value = p.nickname || '';
    document.getElementById('profileTeam').value = p.teamName || '';
    document.getElementById('profileAge').value = p.age || '';
    document.getElementById('profileRole').value = p.role || 'Vendedor';
    document.getElementById('profileLevel').value = p.level || 'Associado Treino';
}

function updateProfile(event){
    event.preventDefault();
    
    const profile = {
        ...window.currentUserProfile,
        name: document.getElementById('profileName').value.trim(),
        email: document.getElementById('profileEmail').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
        nickname: document.getElementById('profileNickname').value.trim(),
        teamName: document.getElementById('profileTeam').value.trim(),
        age: document.getElementById('profileAge').value.trim()
        // role e level não são editáveis pelo usuário
    };
    
    // Validar campos obrigatórios
    if (!profile.name || !profile.email) {
        alert('Nome e email são obrigatórios.');
        return;
    }
    
    // Validações adicionais
    if (!validateEmail(profile.email)) {
        alert('Email inválido.');
        return;
    }
    if (profile.phone && !validatePhone(profile.phone)) {
        alert('Telefone inválido. Use o formato (11) 99999-9999');
        return;
    }
    if (profile.age && !validateAge(profile.age)) {
        alert('Idade deve ser entre 12 e 100 anos');
        return;
    }
    
    // Salvar no localStorage primeiro (sempre funciona)
    if (window.firebaseAuth?.currentUser) {
        localStorage.setItem(`userProfile_${window.firebaseAuth.currentUser.uid}`, JSON.stringify(profile));
    }
    
    // Tenta salvar no Firestore (pode falhar se offline)
    try {
        if (window.firebaseReady && window.firebaseAuth?.currentUser) {
            import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                .then(({ doc, setDoc, collection }) => {
                    const ref = doc(collection(window.firebaseDb, 'users'), window.firebaseAuth.currentUser.uid);
                    return setDoc(ref, profile, { merge: true });
                })
                .then(() => {
                    console.log('Perfil salvo no Firestore');
                })
                .catch((e) => {
                    console.log('Firestore offline, perfil salvo localmente');
                });
        }
    } catch (e) {
        console.log('Firestore offline, perfil salvo localmente');
    }
    
    // Atualizar perfil local
    window.currentUserProfile = profile;
    
    alert('Perfil atualizado com sucesso!');
}

// Top alert control (example trigger)
window.addEventListener('load', () => {
    const alertBar = document.getElementById('topAlert');
    if (!alertBar) return;
    // Lê configuração do Firestore: collection 'config', doc 'topAlert'
    (async () => {
        try{
            if (!window.firebaseReady) { alertBar.classList.add('hidden'); return; }
            const { doc, getDoc, collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb,'config'), 'topAlert');
            const apply = (data) => {
                const enabled = !!data?.enabled;
                const text = data?.text || '';
                if (enabled && text){
                    alertBar.innerHTML = text;
                    alertBar.classList.remove('hidden');
                } else {
                    alertBar.classList.add('hidden');
                }
            };
            try{
                const snap = await getDoc(ref);
                if (snap.exists()) apply(snap.data()); else alertBar.classList.add('hidden');
            }catch(_){ alertBar.classList.add('hidden'); }
            try{
                onSnapshot(ref, (snap)=>{ if (snap.exists()) apply(snap.data()); });
            }catch(_){ }
        }catch(_){ /* fallback: manter oculto */ }
    })();
});

// Back to top logic
const backBtn = document.getElementById('backToTop');
if (backBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn.classList.remove('hidden');
        else backBtn.classList.add('hidden');
    });
    backBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function maybeClearMobileModalState(){
    const anyOpen = [
        document.getElementById('loginModal'),
        document.getElementById('purchaseModal'),
        document.getElementById('clientAreaModal'),
        document.getElementById('cartDrawer'),
        document.getElementById('tokensModal'),
        document.getElementById('freeWhatsModal'),
        document.getElementById('scheduleModal')
    ].some(el => el && !el.classList.contains('hidden'));
    if (!anyOpen) document.body.classList.remove('modal-open-mobile');
}


