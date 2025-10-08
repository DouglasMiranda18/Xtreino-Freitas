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

function requestAdminAccess(){
    // Se já estiver logado, valida papel; senão, abre modal de login e marca redirecionamento
    if (!window.isLoggedIn) {
        window.postLoginRedirect = 'admin';
        openLoginModal();
        return;
    }
    // Validar papel do usuário logado
    const role = (window.currentUserProfile?.role || '').toLowerCase();
    if (['ceo','gerente','vendedor'].includes(role)) {
        window.location.href = 'admin.html';
    } else {
        alert('Acesso ao painel restrito (CEO, Gerente ou Vendedor).');
    }
}

function openAccountModal(){ 
    const m = document.getElementById('accountModal'); 
    if (m) {
        m.classList.remove('hidden');
        // Carrega dados quando abre o modal
        setTimeout(() => {
            loadAccountProfile();
            loadAccountOrders();
            loadTokensBalance();
        }, 300);
    }
}
function closeAccountModal(){ const m = document.getElementById('accountModal'); if (m) m.classList.add('hidden'); }

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
    closeAccountModal();
}

// --- Account panels logic ---
function showAccountTab(tab){
    const map = { profile:'accPanelProfile', tokens:'accPanelTokens', orders:'accPanelOrders' };
    Object.entries(map).forEach(([k,id])=>{
        const p = document.getElementById(id);
        const b = document.getElementById('accTab'+k.charAt(0).toUpperCase()+k.slice(1));
        if (!p || !b) return;
        if (k===tab){ p.classList.remove('hidden'); b.classList.add('border-blue-matte'); b.classList.remove('text-gray-500'); }
        else { p.classList.add('hidden'); b.classList.remove('border-blue-matte'); b.classList.add('text-gray-500'); }
    });
}

async function loadAccountProfile(){
    try{
        if (!window.firebaseReady || !window.firebaseAuth?.currentUser) {
            return;
        }
        
        const uid = window.firebaseAuth.currentUser.uid;
        const user = window.firebaseAuth.currentUser;
        
        // Tenta carregar do Firestore primeiro
        try {
            const { doc, getDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb,'users'), uid);
            const snap = await getDoc(ref);
            
            if (snap.exists()) {
                const d = snap.data();
                populateProfileFields(d);
                localStorage.setItem(`userProfile_${uid}`, JSON.stringify(d));
                return;
            }
        } catch (e) {
            console.log('Erro ao carregar do Firestore, tentando localStorage');
        }
        
        // Se não tem no Firestore, tenta localStorage
        const localProfile = localStorage.getItem(`userProfile_${uid}`);
        if (localProfile) {
            const d = JSON.parse(localProfile);
            populateProfileFields(d);
            return;
        }
        
        // Se não tem em lugar nenhum, cria perfil básico
        const basicProfile = {
            name: user.displayName || '',
            email: user.email || '',
            phone: '',
            nickname: '',
            teamName: '',
            age: '',
            tokens: 0,
            role: 'Vendedor',
            level: 'Associado Treino'
        };
        populateProfileFields(basicProfile);
        
    }catch(e){ 
        console.error('Erro ao carregar perfil:', e);
    }
}

function populateProfileFields(d) {
    try {
        // Aguarda um pouco para garantir que os elementos existam
        setTimeout(() => {
            const nameField = document.getElementById('profileName');
            const emailField = document.getElementById('profileEmail');
            const phoneField = document.getElementById('profilePhone');
            const nicknameField = document.getElementById('profileNickname');
            const teamField = document.getElementById('profileTeam');
            const ageField = document.getElementById('profileAge');
            
            if (nameField) nameField.value = d.name || '';
            if (emailField) emailField.value = d.email || window.firebaseAuth.currentUser.email || '';
            if (phoneField) phoneField.value = d.phone || '';
            if (nicknameField) nicknameField.value = d.nickname || '';
            if (teamField) teamField.value = d.teamName || '';
            if (ageField) ageField.value = d.age || '';
            
            const tokensElement = document.getElementById('accTokensBalance');
            if (tokensElement) {
                tokensElement.textContent = Number(d.tokens || 0);
            }
            
            window.currentUserProfile = d;
            updateUIForPermissions();
        }, 100);
    } catch (e) {
        console.error('Erro ao preencher campos:', e);
    }
}


async function saveAccountProfile(){
    try{
        if (!window.firebaseReady || !window.firebaseAuth?.currentUser){ 
            document.getElementById('accProfileMsg').textContent='Sessão inválida.'; 
            return; 
        }
        
        const uid = window.firebaseAuth.currentUser.uid;
        const payload = {
            name: document.getElementById('profileName').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
            phone: document.getElementById('profilePhone').value.trim(),
            nickname: document.getElementById('profileNickname').value.trim(),
            teamName: document.getElementById('profileTeam').value.trim(),
            age: document.getElementById('profileAge').value.trim(),
            updatedAt: Date.now()
        };
        
        console.log('Tentando salvar perfil:', payload);
        
        // Salva no localStorage primeiro (sempre funciona)
        localStorage.setItem(`userProfile_${uid}`, JSON.stringify(payload));
        console.log('Perfil salvo no localStorage');
        
        // Tenta salvar no Firestore
        try {
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb,'users'), uid);
            console.log('Tentando salvar no Firestore...');
            console.log('Referência do documento:', ref);
            console.log('Payload:', payload);
            
            await setDoc(ref, payload, { merge:true });
            console.log('Perfil salvo no Firestore com sucesso!');
            document.getElementById('accProfileMsg').textContent='Perfil salvo com sucesso!';
        } catch (firestoreError) {
            console.error('Erro detalhado ao salvar no Firestore:', firestoreError);
            console.error('Código do erro:', firestoreError.code);
            console.error('Mensagem do erro:', firestoreError.message);
            document.getElementById('accProfileMsg').textContent=`Erro: ${firestoreError.code} - ${firestoreError.message}`;
        }
        
        // Atualiza perfil local
        window.currentUserProfile = payload;
    }catch(e){ 
        console.error('Erro geral ao salvar:', e);
        document.getElementById('accProfileMsg').textContent='Erro ao salvar: ' + e.message; 
    }
}

async function loadTokensBalance(){
    try{
        if (!window.firebaseReady || !window.firebaseAuth?.currentUser) return;
        const uid = window.firebaseAuth.currentUser.uid;
        const { doc, getDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const ref = doc(collection(window.firebaseDb,'users'), uid);
        const snap = await getDoc(ref);
        const d = snap.exists()? snap.data():{};
        document.getElementById('accTokensBalance').textContent = Number(d.tokens||0);
    }catch(_){ }
}

async function setTokensDelta(delta){
    try{
        if (!window.firebaseReady || !window.firebaseAuth?.currentUser) return;
        const uid = window.firebaseAuth.currentUser.uid;
        const { doc, getDoc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const ref = doc(collection(window.firebaseDb,'users'), uid);
        const snap = await getDoc(ref);
        const d = snap.exists()? snap.data():{};
        const next = Math.max(0, Number((Number(d.tokens||0) + delta).toFixed(2)));
        await setDoc(ref, { tokens: next }, { merge:true });
        document.getElementById('accTokensBalance').textContent = next;
        document.getElementById('accTokensMsg').textContent = 'Saldo atualizado.';
        
        // Atualiza perfil local
        if (window.currentUserProfile) {
            window.currentUserProfile.tokens = next;
        }
    }catch(_){ document.getElementById('accTokensMsg').textContent = 'Erro ao atualizar tokens.'; }
}

function adminAddTokens(){ 
    const amt = Number(document.getElementById('accTokensAmount').value||0); 
    if (amt>0) {
        setTokensDelta(amt);
        logTokenAction('add', amt);
    }
}
function adminRemoveTokens(){ 
    const amt = Number(document.getElementById('accTokensAmount').value||0); 
    if (amt>0) {
        setTokensDelta(-amt);
        logTokenAction('remove', amt);
    }
}

function logTokenAction(action, amount) {
    try {
        if (!window.firebaseReady || !window.firebaseAuth?.currentUser) return;
        const uid = window.firebaseAuth.currentUser.uid;
        const adminUid = uid;
        const timestamp = Date.now();
        
        // Salva log no Firestore
        const logData = {
            action,
            amount,
            adminUid,
            timestamp,
            userUid: uid
        };
        
        // Adiciona ao histórico local também
        if (!window.tokenHistory) window.tokenHistory = [];
        window.tokenHistory.push(logData);
        
        // Persiste no Firestore quando possível
        if (window.firebaseDb) {
            import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                .then(({ collection, addDoc }) => {
                    return addDoc(collection(window.firebaseDb, 'token_logs'), logData);
                })
                .catch(() => {}); // Falha silenciosa
        }
    } catch (e) {
        console.error('Erro ao logar ação de token:', e);
    }
}

async function loadAccountOrders(){
    const container = document.getElementById('accOrders');
    if (!container) return;
    container.innerHTML = '';
    try{
        if (!window.firebaseReady || !window.firebaseAuth?.currentUser){ container.textContent='Faça login para ver seus pedidos.'; return; }
        const uid = window.firebaseAuth.currentUser.uid;
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const regs = query(collection(window.firebaseDb,'registrations'), where('uid','==',uid));
        const snap = await getDocs(regs);
        if (snap.empty){ container.textContent='Nenhum pedido/inscrição encontrado.'; return; }
        snap.forEach(docu=>{
            const r = docu.data();
            const row = document.createElement('div');
            row.className = 'border rounded p-3 flex justify-between';
            row.innerHTML = `<div><div class="font-semibold">${r.title||r.schedule||'Inscrição'}</div><div class="text-gray-500 text-xs">${r.date||''} ${r.schedule||''}</div></div><div class="text-sm">${r.status||'pendente'}</div>`;
            container.appendChild(row);
        });
    }catch(_){ container.textContent='Erro ao carregar pedidos.'; }
}
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
window.addEventListener('load', () => {});

// ---------------- Área de Associados: cargos, níveis, permissões e tokens ----------------
// Configuração centralizada acessível via window.AssocConfig
window.AssocConfig = {
    roles: {
        GERENTE: 'Gerente',
        CEO: 'Ceo',
        STAFF: 'Staff',
        VENDEDOR: 'Vendedor'
    },
    levels: {
        ASSOCIADO_TREINO: 'Associado Treino',
        ASSOCIADO_MODO_LIGA: 'Associado Modo Liga'
    },
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
                if (mpStatus) {
                    if (mpStatus === 'success') {
                        const regId = sessionStorage.getItem('lastRegId');
                        if (regId) {
                            import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                                .then(({ doc, setDoc, collection }) => {
                                    const ref = doc(collection(window.firebaseDb,'registrations'), regId);
                                    return setDoc(ref, { status:'paid' }, { merge:true });
                                }).then(()=>{
                                    openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.');
                                }).catch(()=>{});
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
        // Primeiro tenta carregar do localStorage
        const localProfile = localStorage.getItem(`userProfile_${uid}`);
        if (localProfile) {
            window.currentUserProfile = JSON.parse(localProfile);
            console.log('Perfil carregado do localStorage');
            return;
        }

        // Se não tem perfil local, tenta do Firestore
        if (window.firebaseReady) {
            const { doc, getDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                window.currentUserProfile = snap.data();
                // Salva no localStorage para uso offline
                localStorage.setItem(`userProfile_${uid}`, JSON.stringify(window.currentUserProfile));
                console.log('Perfil carregado do Firestore e salvo localmente');
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
                // Salva no localStorage
                localStorage.setItem(`userProfile_${uid}`, JSON.stringify(window.currentUserProfile));
                console.log('Perfil básico criado e salvo localmente');
            }
        } else {
            // Fallback: cria perfil básico se Firebase não estiver pronto
            window.currentUserProfile = {
                uid: uid,
                email: window.firebaseAuth.currentUser.email,
                name: window.firebaseAuth.currentUser.displayName || 'Usuário',
                tokens: 0,
                role: 'Usuario',
                level: 'Associado Treino'
            };
            localStorage.setItem(`userProfile_${uid}`, JSON.stringify(window.currentUserProfile));
            console.log('Perfil básico criado (Firebase offline)');
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
        localStorage.setItem(`userProfile_${uid}`, JSON.stringify(window.currentUserProfile));
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
    return Number(window.currentUserProfile?.tokens || 0);
}
function canSpendTokens(amountBRL) {
    return getTokenBalance() >= Number(amountBRL || 0);
}
function spendTokens(amountBRL) {
    const amt = Number(amountBRL || 0);
    if (!canSpendTokens(amt)) return false;
    window.currentUserProfile.tokens = Number((getTokenBalance() - amt).toFixed(2));
    persistUserProfile(window.currentUserProfile);
    return true;
}
function grantTokens(amountBRL) {
    const amt = Number(amountBRL || 0);
    window.currentUserProfile = window.currentUserProfile || {};
    window.currentUserProfile.tokens = Number(((window.currentUserProfile.tokens || 0) + amt).toFixed(2));
    persistUserProfile(window.currentUserProfile);
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
        level: window.AssocConfig.levels.ASSOCIADO_TREINO,
        tokens: 0
    };
    try {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        const isNetlify = /netlify\.app$/i.test(location.hostname);
        if (window.firebaseReady && !isLocal && !isNetlify && user?.uid){
            const { doc, getDoc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), user.uid);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, baseProfile);
                window.currentUserProfile = baseProfile;
            } else {
                window.currentUserProfile = { ...baseProfile, ...snap.data() };
            }
        } else {
            // fallback local
            const key = 'assoc_profile';
            const stored = JSON.parse(localStorage.getItem(key) || 'null');
            if (stored && stored.uid === (user?.uid || null)) {
                window.currentUserProfile = stored;
            } else {
                window.currentUserProfile = baseProfile;
                localStorage.setItem(key, JSON.stringify(baseProfile));
            }
        }
    } catch (err) {
        console.warn('Perfil: usando fallback local.', err);
        const key = 'assoc_profile';
        window.currentUserProfile = baseProfile;
        localStorage.setItem(key, JSON.stringify(baseProfile));
    }
}

async function persistUserProfile(profile){
    try {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        const isNetlify = /netlify\.app$/i.test(location.hostname);
        if (window.firebaseReady && !isLocal && !isNetlify && profile?.uid){
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), profile.uid);
            await setDoc(ref, profile, { merge: true });
        } else {
            localStorage.setItem('assoc_profile', JSON.stringify(profile));
        }
    } catch(_) {
        localStorage.setItem('assoc_profile', JSON.stringify(profile));
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
    // Habilitar/Desabilitar botão de associados no card
    const assocBtn = document.getElementById('assocTokensBtn');
    if (assocBtn){
        const isAssociated = p && (p.level === window.AssocConfig.levels.ASSOCIADO_TREINO || p.level === window.AssocConfig.levels.ASSOCIADO_MODO_LIGA);
        assocBtn.disabled = !isAssociated;
        assocBtn.classList.toggle('opacity-60', !isAssociated);
        assocBtn.textContent = isAssociated ? 'USAR TOKENS' : 'APENAS ASSOCIADOS';
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
    'evt-xtreino-gratuito': { name: 'XTreino Gratuito e Associado', price: 'R$ 0,00', description: 'Evento gratuito/associados — horários 14h–23h' },
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

function handlePurchase(event) {
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
    // Chamar function segura (Netlify) para criar Preference
    fetch('/.netlify/functions/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: product.name,
            unit_price: totalNum,
            currency_id: 'BRL',
            quantity: 1
        })
    })
    .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    })
    .then((data) => {
        closePurchaseModal();
        // Redireciona para o checkout do Mercado Pago
        if (data.init_point) {
            window.location.href = data.init_point;
        } else {
            alert('Não foi possível iniciar o checkout.');
        }
    })
    .catch((err) => {
        console.error('Erro no checkout:', err);
        alert('Falha ao iniciar checkout.');
    });
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

// Simple carousel
(function(){
    const track = document.getElementById('carouselTrack');
    const prev = document.getElementById('carouselPrev');
    const next = document.getElementById('carouselNext');
    if (!track || !prev || !next) return;
    let index = 0;
    const slides = track.children.length;
    function update(){ track.style.transform = `translateX(-${index*100}%)`; }
    prev.addEventListener('click', ()=>{ index = (index - 1 + slides) % slides; update(); });
    next.addEventListener('click', ()=>{ index = (index + 1) % slides; update(); });
})();

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

// Hook existing purchase buttons to cart add
document.querySelectorAll('[onclick^="openPurchaseModal("]').forEach(btn=>{
    const match = btn.getAttribute('onclick').match(/openPurchaseModal\('([^']+)'\)/);
    if (!match) return;
    const id = match[1];
    btn.addEventListener('click', (e)=>{
        e.preventDefault();
        showProductModal(id);
    });
});

function checkoutCart(){
    const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
    // Mercado Pago preference via Function
    fetch('/.netlify/functions/create-preference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Carrinho XTreino', unit_price: Number(total.toFixed(2)), currency_id: 'BRL', quantity: 1 })
    }).then(async (res)=>{ if(!res.ok) throw new Error(await res.text()); return res.json(); })
    .then(data=>{ if (data.init_point) window.location.href = data.init_point; else alert('Erro ao iniciar checkout.'); })
    .catch(()=> alert('Falha no checkout.'));
}

// --- Agendamento nativo (Firestore + Netlify Function) ---
const scheduleConfig = {
    'modo-liga': { label: 'XTreino Modo Liga', price: 3.00 },
    'camp-freitas': { label: 'Camp Freitas', price: 5.00 },
    'semanal-freitas': { label: 'Semanal Freitas', price: 3.50 },
    'associado': { label: 'XTreino Freitas Associado', price: 1.00, payWithToken: true }
};

function openScheduleModal(eventType){
    const cfg = scheduleConfig[eventType];
    const modal = document.getElementById('scheduleModal');
    if (!cfg || !modal) return;
    modal.dataset.eventType = eventType;
    document.getElementById('schedPrice').textContent = cfg.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    initScheduleDate();
    // re-render quando a data mudar
    const dateInput = document.getElementById('schedDate');
    if (dateInput && !dateInput._schedBound){
        dateInput.addEventListener('change', renderScheduleTimes);
        dateInput._schedBound = true;
    }
    renderScheduleTimes();
    modal.classList.remove('hidden');
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
    const hint = document.getElementById('schedHint');
    if (hint) hint.textContent = cfg.payWithToken ? `${cfg.label} • Pagamento com 1 token` : cfg.label;
}
function closeScheduleModal(){
    const modal = document.getElementById('scheduleModal');
    if (modal) modal.classList.add('hidden');
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
function setSchedToday(){ initScheduleDate(); renderScheduleTimes(); }
function setSchedTomorrow(){
    const input = document.getElementById('schedDate');
    const t = new Date();
    t.setDate(t.getDate()+1);
    const y = t.getFullYear();
    const m = String(t.getMonth()+1).padStart(2,'0');
    const d = String(t.getDate()).padStart(2,'0');
    input.value = `${y}-${m}-${d}`;
    renderScheduleTimes();
}
const scheduleCache = {};

async function renderScheduleTimes(){
    const timesWrap = document.getElementById('schedTimes');
    if (!timesWrap) return;
    timesWrap.innerHTML = '';
    const date = document.getElementById('schedDate').value;
    const dayNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const d = new Date(date + 'T00:00:00');
    const day = dayNames[d.getDay()];
    const slots = ['19h','20h','21h','22h','23h'];
    // Render imediato com estado neutro e atualiza assíncrono
    slots.forEach(time => {
        const schedule = `${day} - ${time}`;
        const btn = document.createElement('button');
        btn.className = 'slot-btn';
        btn.dataset.schedule = schedule;
        btn.textContent = `${time} (.. /12)`;
        btn.onclick = ()=>{ document.getElementById('schedSelectedTime').value = schedule; highlightSelectedSlot(btn, timesWrap); };
        timesWrap.appendChild(btn);
    });
    // Atualiza com dados reais
    updateOccupiedAndRefreshButtons(day, date, timesWrap);
}
function highlightSelectedSlot(selectedBtn, container){
    Array.from(container.children).forEach(el=> el.classList.remove('selected'));
    selectedBtn.classList.add('selected');
}
async function fetchOccupiedForDate(day, date){
    const map = {};
    try {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        const isNetlify = /netlify\.app$/i.test(location.hostname);
        // Evita consultas em dev local e também no domínio Netlify por enquanto
        if (!window.firebaseReady || isLocal || isNetlify) return map;
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const regsRef = collection(window.firebaseDb, 'registrations');
        const q = query(regsRef, where('date','==', date), where('status','==','confirmed'));
        const snap = await getDocs(q);
        snap.forEach(doc=>{
            const r = doc.data();
            map[r.schedule] = (map[r.schedule]||0)+1;
        });
    } catch(_) {}
    return map;
}
async function updateOccupiedAndRefreshButtons(day, date, container){
    // cache por data
    let occupied = scheduleCache[date];
    if (!occupied) {
        try { occupied = await fetchOccupiedForDate(day, date); } catch(_) { occupied = {}; }
        scheduleCache[date] = occupied;
    }
    Array.from(container.children).forEach(btn => {
        const schedule = btn.dataset.schedule;
        const time = (schedule || '').split(' - ')[1] || '';
        const taken = occupied[schedule] || 0;
        const available = Math.max(0, 12 - taken);
        btn.textContent = `${time} (${String(available).padStart(2,'0')}/12)`;
        if (available === 0){
            btn.classList.add('full');
            btn.disabled = true;
        } else {
            btn.classList.remove('full');
            btn.disabled = false;
        }
    });
}
async function submitSchedule(e){
    e.preventDefault();
    const submitBtn = document.getElementById('schedSubmit');
    const oldText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Processando...'; }
    const modal = document.getElementById('scheduleModal');
    const eventType = modal?.dataset?.eventType || 'modo-liga';
    const cfg = scheduleConfig[eventType];
    const schedule = document.getElementById('schedSelectedTime').value;
    const date = document.getElementById('schedDate').value;
    const team = document.getElementById('schedTeam').value.trim();
    const email = document.getElementById('schedEmail').value.trim();
    const phone = document.getElementById('schedPhone').value.trim();
    if (!schedule){ alert('Selecione um horário.'); return; }

    // Se pagar com token (associado): validar associação e saldo e debitar
    if (cfg && cfg.payWithToken){
        const profile = window.currentUserProfile || {};
        const isAssociated = profile && (profile.level === window.AssocConfig.levels.ASSOCIADO_TREINO || profile.level === window.AssocConfig.levels.ASSOCIADO_MODO_LIGA);
        if (!isAssociated){ alert('Apenas associados podem usar tokens.'); if(submitBtn){submitBtn.disabled=false; submitBtn.textContent=oldText;} return; }
        if (!canSpendTokens(cfg.price)){ alert('Saldo de tokens insuficiente.'); if(submitBtn){submitBtn.disabled=false; submitBtn.textContent=oldText;} return; }
    }
    // cria documento pendente no Firestore (se disponível)
    let regId = 'local-' + Date.now();
    try {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        const isNetlify = /netlify\.app$/i.test(location.hostname);
        // Evita tentativa de escrita quando em localhost ou domínio Netlify (até ajustar regras)
        if (window.firebaseReady && !isLocal && !isNetlify){
            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const docRef = await addDoc(collection(window.firebaseDb,'registrations'),{
                uid: (window.firebaseAuth && window.firebaseAuth.currentUser ? window.firebaseAuth.currentUser.uid : null),
                teamName: team,
                email,
                phone,
                schedule,
                date,
                status:'pending',
                timestamp: serverTimestamp()
            });
            regId = docRef.id;
            try{ sessionStorage.setItem('lastRegId', regId); }catch(_){ }
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

    // Fluxo normal: Checkout via Netlify Function
    const total = Number(cfg.price.toFixed(2));
    fetch('/.netlify/functions/create-preference',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ title: `${cfg.label} - ${schedule} - ${date}`, unit_price: total, currency_id:'BRL', quantity:1 })
    }).then(async res=>{ if(!res.ok){ const t = await res.text(); throw new Error(t || 'Erro na função de pagamento'); } return res.json(); })
    .then(data=>{
        closeScheduleModal();
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
function openPaymentConfirmModal(title, msg){
    const m = document.getElementById('paymentConfirmModal');
    const t = document.getElementById('paymentConfirmTitle');
    const p = document.getElementById('paymentConfirmMsg');
    if (t) t.textContent = title || 'Pagamento';
    if (p) p.textContent = msg || '';
    if (m) m.classList.remove('hidden');
}
function closePaymentConfirmModal(){
    const m = document.getElementById('paymentConfirmModal');
    if (m) m.classList.add('hidden');
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

// Compra de tokens removida (somente associados recebem tokens)

function useTokensForEvent(eventType){
    const eventCosts = {
        'treino': 1.00,
        'modoLiga': 3.00,
        'semanal': 3.50,
        'finalSemanal': 7.00,
        'campFases': 5.00
    };
    
    // Apenas associados podem usar tokens
    const profile = window.currentUserProfile || {};
    const isAssociated = profile && (profile.level === window.AssocConfig.levels.ASSOCIADO_TREINO || profile.level === window.AssocConfig.levels.ASSOCIADO_MODO_LIGA);
    if (!isAssociated){
        alert('Recurso disponível somente para contas de associado.');
        return;
    }

    const cost = eventCosts[eventType];
    if (!cost) return;
    
    if (!canSpendTokens(cost)) {
        alert(`Saldo insuficiente. Você precisa de ${cost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens.`);
        return;
    }
    
    const eventNames = {
        'treino': 'Treino Normal',
        'modoLiga': 'Modo Liga',
        'semanal': 'Semanal',
        'finalSemanal': 'Final Semanal',
        'campFases': 'Camp de Fases'
    };
    
    if (confirm(`Confirmar uso de ${cost.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em tokens para ${eventNames[eventType]}?`)) {
        spendTokens(cost);
        closeTokensModal();
        renderClientArea();
        alert('Token resgatado! Nossa equipe entrará em contato para agendar.');
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
    if (alertBar) {
        // TODO: lógica real (ex: Firestore), aqui apenas demonstração
        alertBar.classList.remove('hidden');
    }
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


