// Client Area JavaScript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, addDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Reuse global Firebase app/auth/db initialized in firebase.js
let app = null;
let auth = null;
let db = null;

// Inicializar Firebase imediatamente
function initializeFirebase() {
  console.log('🔍 Initializing Firebase...');
  console.log('🔍 window.firebaseApp:', !!window.firebaseApp);
  console.log('🔍 window.firebaseAuth:', !!window.firebaseAuth);
  console.log('🔍 window.firebaseDb:', !!window.firebaseDb);
  console.log('🔍 window.FIREBASE_CONFIG:', !!window.FIREBASE_CONFIG);
  
  if (window.firebaseApp && window.firebaseAuth && window.firebaseDb) {
    app = window.firebaseApp;
    auth = window.firebaseAuth;
    db = window.firebaseDb;
    console.log('✅ Firebase initialized from global instances');
    console.log('🔍 DB after global init:', typeof db, db ? db.constructor.name : 'null');
    return true;
  }
  
  if (window.FIREBASE_CONFIG) {
    // Fallback: initialize here if global init hasn't run yet
    console.log('🔍 Initializing Firebase from FIREBASE_CONFIG...');
    app = initializeApp(window.FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized from FIREBASE_CONFIG');
    console.log('🔍 DB after local init:', typeof db, db ? db.constructor.name : 'null');
    return true;
  }
  
  console.error('❌ FIREBASE_CONFIG not found');
  return false;
}

// Inicializar Firebase
const firebaseInitialized = initializeFirebase();
console.log('🔍 Firebase initialization result:', firebaseInitialized);

// Ensure local persistence for auth session
if (auth && auth.setPersistence) {
  try { setPersistence(auth, browserLocalPersistence); } catch(_) {}
}

// Global variables
let currentUser = null;
let userProfile = null;

// Initialize client area
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthState();
    setupEventListeners();
    // Se vier com ?tab=myTokens, abrir direto essa aba
    try{
        const sp = new URLSearchParams(location.search);
        const tab = sp.get('tab');
        if (tab === 'myTokens') {
            await switchTab('myTokens');
        }
    }catch(_){ }
});

// Check authentication state
async function checkAuthState() {
    console.log('🔍 Checking auth state...');
    console.log('🔍 Auth instance:', auth ? 'Available' : 'NULL');
    if (!auth) {
        console.log('❌ Auth not available, showing login prompt');
        showLoginPrompt();
        return;
    }
    onAuthStateChanged(auth, async (user) => {
        console.log('🔍 Auth state changed:', user ? `User logged in: ${user.email} (${user.uid})` : 'User logged out');
        if (user) {
            currentUser = user;
            console.log('✅ User authenticated, loading profile and dashboard');
            await loadUserProfile();
            await loadDashboard();
            // Hide login prompt if user is logged in
            hideLoginPrompt();
        } else {
            console.log('❌ User not authenticated, showing login prompt');
            // Show login prompt instead of redirecting
            showLoginPrompt();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    const dashTab = document.getElementById('dashboardTab');
    const ordersTab = document.getElementById('ordersTab');
    const profileTab = document.getElementById('profileTab');
    const tokensTab = document.getElementById('tokensTab');
    const myTokensTab = document.getElementById('myTokensTab');
    if (dashTab) dashTab.addEventListener('click', async () => await switchTab('dashboard'));
    if (ordersTab) ordersTab.addEventListener('click', async () => await switchTab('orders'));
    if (profileTab) profileTab.addEventListener('click', async () => await switchTab('profile'));
    if (tokensTab) tokensTab.addEventListener('click', async () => await switchTab('tokens'));
    if (myTokensTab) myTokensTab.addEventListener('click', async () => await switchTab('myTokens'));

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.addEventListener('submit', saveProfile);
}

// Switch between tabs
async function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active', 'border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });

    // Show selected tab content
    document.getElementById(tabName + 'Content').classList.remove('hidden');

    // Add active class to selected tab
    const activeTab = document.getElementById(tabName + 'Tab');
    activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');
    activeTab.classList.remove('border-transparent', 'text-gray-500');

    // Load tab-specific data
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'tokens':
            loadTokensHistory();
            break;
        case 'myTokens':
            await loadMyTokens();
            break;
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        // Verificar se o usuário está autenticado
        if (!currentUser || !currentUser.uid) {
            console.warn('Usuário não autenticado, não é possível carregar perfil');
            return;
        }
        
        console.log('🔍 Loading user profile for:', currentUser.uid);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userProfile = userDoc.data();
            console.log('✅ User profile loaded:', userProfile);
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = userProfile.name || currentUser.email;
            }
        } else {
            console.log('❌ User document not found, creating default profile');
            // Create default profile
            userProfile = {
                name: currentUser.displayName || '',
                email: currentUser.email,
                phone: '',
                nickname: '',
                team: '',
                age: '',
                tokens: 0,
                role: 'user',
                level: 'Associado Treino'
            };
            await setDoc(doc(db, 'users', currentUser.uid), userProfile);
            console.log('✅ Default profile created:', userProfile);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Load dashboard
async function loadDashboard() {
    try {
        // Garantir que o userProfile seja carregado primeiro
        if (!userProfile && currentUser) {
            console.log('🔍 UserProfile not loaded, loading it first...');
            await loadUserProfile();
        }
        
        // Load recent orders
        await loadRecentOrders();
        
        // Load stats
        await loadStats();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        // Verificar se o usuário está autenticado
        if (!currentUser || !currentUser.uid) {
            console.warn('Usuário não autenticado, mostrando pedidos vazios');
            displayRecentOrders([]);
            return;
        }
        
        const ordersData = await fetchUserDocs('orders', 5, true);
        const orders = ordersData.map(d => ({
            id: d.id,
            ...d.data,
            date: d.data.createdAt?.toDate?.() || new Date(),
            title: d.data.title || d.data.item || 'Pedido',
            status: d.data.status || 'pending'
        }));

        displayRecentOrders(orders);
    } catch (error) {
        console.error('Error loading recent orders:', error);
        const recentOrdersElement = document.getElementById('recentOrders');
        if (recentOrdersElement) {
            recentOrdersElement.innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar pedidos</p>';
        }
    }
}

// Display recent orders
function displayRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhum pedido encontrado</p>';
        return;
    }

    const ordersHTML = orders.map(order => `
        <div class="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
            <div>
                <p class="font-medium text-gray-900">${order.title || 'Reserva'}</p>
                <p class="text-sm text-gray-500">${formatDate(order.date)}</p>
            </div>
            <div class="text-right">
                <p class="font-medium text-gray-900">R$ ${order.price?.toFixed(2) || '0,00'}</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}">
                    ${getStatusText(order.status)}
                </span>
            </div>
        </div>
    `).join('');

    container.innerHTML = ordersHTML;
}

// Load all orders
async function loadOrders() {
    try {
        const ordersData = await fetchUserDocs('orders', 50, true);
        const orders = ordersData.map(d => ({
            id: d.id,
            ...d.data,
            date: d.data.createdAt?.toDate?.() || new Date(),
            title: d.data.title || d.data.item || 'Pedido',
            status: d.data.status || 'pending'
        }));

        displayAllOrders(orders);
        await loadWhatsAppLinks(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('allOrders').innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar pedidos</p>';
    }
}

// Função para converter data e horário do evento em DateTime
function getEventDateTime(dateStr, scheduleStr) {
    try {
        // Formato da data: YYYY-MM-DD
        // Formato do schedule: "Segunda - 19h" ou "19h"
        const date = new Date(dateStr + 'T00:00:00');
        
        // Extrair o horário do schedule
        let timeStr = scheduleStr;
        if (scheduleStr.includes(' - ')) {
            timeStr = scheduleStr.split(' - ')[1]; // Pega a parte após " - "
        }
        
        // Converter horário (ex: "19h" -> 19)
        const hour = parseInt(timeStr.replace('h', ''));
        
        // Definir a data e hora do evento
        date.setHours(hour, 0, 0, 0);
        
        return date;
    } catch (error) {
        console.error('Erro ao converter data/hora do evento:', error);
        return new Date(); // Retorna data atual em caso de erro
    }
}

// Carrega links do WhatsApp para pedidos confirmados
async function loadWhatsAppLinks(orders) {
    const whatsappContainer = document.getElementById('whatsappLinks');
    const whatsappList = document.getElementById('whatsappList');
    if (!whatsappContainer || !whatsappList) return;

    const confirmedOrders = orders.filter(order => {
        // Verificar se o pedido está confirmado
        if (!(order.status === 'paid' || order.status === 'confirmed') || !(order.eventType || order.title)) {
            return false;
        }
        
        // Verificar se o link do WhatsApp ainda deve ser exibido (não passou de 1h do evento)
        if (order.schedule && order.date) {
            const eventDateTime = getEventDateTime(order.date, order.schedule);
            const oneHourAfterEvent = new Date(eventDateTime.getTime() + (60 * 60 * 1000)); // +1 hora
            const now = new Date();
            
            // Se passou mais de 1 hora do evento, não mostrar o link
            if (now > oneHourAfterEvent) {
                return false;
            }
        }
        
        return true;
    });

    if (confirmedOrders.length === 0) {
        whatsappContainer.classList.add('hidden');
        return;
    }

    whatsappContainer.classList.remove('hidden');
    
    // Mapeamento de eventos para links do WhatsApp (você pode personalizar)
    const whatsappLinks = {
        'camp-freitas': 'https://chat.whatsapp.com/SEU_LINK_CAMP_FREITAS',
        'xtreino-gratuito': 'https://chat.whatsapp.com/SEU_LINK_XTREINO_GRATUITO',
        'modo-liga': 'https://chat.whatsapp.com/SEU_LINK_MODO_LIGA',
        'treino': 'https://chat.whatsapp.com/SEU_GRUPO_TREINO',
        'modoLiga': 'https://chat.whatsapp.com/SEU_GRUPO_MODO_LIGA',
        'semanal': 'https://chat.whatsapp.com/SEU_GRUPO_SEMANAL',
        'finalSemanal': 'https://chat.whatsapp.com/SEU_GRUPO_FINAL_SEMANAL',
        'campFases': 'https://chat.whatsapp.com/SEU_GRUPO_CAMP_FASES',
        'associado': 'https://chat.whatsapp.com/SEU_GRUPO_ASSOCIADO'
    };

    whatsappList.innerHTML = confirmedOrders.map(order => {
        const eventType = order.eventType || '';
        const title = order.title || '';
        const date = order.date || new Date();
        
        // Usar o link salvo no pedido ou determinar baseado no tipo de evento
        let whatsappLink = order.whatsappLink || whatsappLinks[eventType] || whatsappLinks['modo-liga'];
        
        // Se não encontrar por eventType, tenta por título
        if (!order.whatsappLink && !whatsappLinks[eventType]) {
            if (title.toLowerCase().includes('camp')) {
                whatsappLink = whatsappLinks['camp-freitas'];
            } else if (title.toLowerCase().includes('gratuito')) {
                whatsappLink = whatsappLinks['xtreino-gratuito'];
            } else if (title.toLowerCase().includes('treino')) {
                whatsappLink = whatsappLinks['treino'];
            } else if (title.toLowerCase().includes('modo liga')) {
                whatsappLink = whatsappLinks['modoLiga'];
            } else if (title.toLowerCase().includes('semanal')) {
                whatsappLink = whatsappLinks['semanal'];
            }
        }
        
        // Calcular quando o link expira
        let expiresInfo = '';
        if (order.schedule && order.date) {
            const eventDateTime = getEventDateTime(order.date, order.schedule);
            const oneHourAfterEvent = new Date(eventDateTime.getTime() + (60 * 60 * 1000));
            const now = new Date();
            const timeLeft = oneHourAfterEvent.getTime() - now.getTime();
            
            if (timeLeft > 0) {
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                expiresInfo = `<p class="text-xs text-orange-600 mt-1">⏰ Link expira em ${hoursLeft}h ${minutesLeft}m</p>`;
            }
        }

        return `
            <div class="border border-gray-200 rounded-lg p-4 mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-medium text-gray-900">${title}</h4>
                        <p class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</p>
                        <p class="text-sm text-green-600 font-medium">Confirmado</p>
                        ${expiresInfo}
                    </div>
                    <a href="${whatsappLink}" target="_blank" 
                       class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        <span>Entrar no Grupo</span>
                    </a>
                </div>
            </div>
        `;
    }).join('');
    
    // Atualizar automaticamente a cada minuto para verificar expiração
    setTimeout(() => {
        loadWhatsAppLinks(orders);
    }, 60000); // 60 segundos
}

// Display all orders
function displayAllOrders(orders) {
    const container = document.getElementById('allOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhum pedido encontrado</p>';
        return;
    }

    const ordersHTML = orders.map(order => `
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">${order.title || 'Reserva'}</h4>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}">
                    ${getStatusText(order.status)}
                </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                    <span class="font-medium">Data:</span> ${formatDate(order.date)}
                </div>
                <div>
                    <span class="font-medium">Valor:</span> R$ ${order.price?.toFixed(2) || '0,00'}
                </div>
                <div>
                    <span class="font-medium">ID:</span> ${order.id.substring(0, 8)}...
                </div>
            </div>
            ${order.whatsappLink ? `
                <div class="mt-3">
                    <a href="${order.whatsappLink}" target="_blank" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        Entrar no Grupo
                    </a>
                </div>
            ` : ''}
        </div>
    `).join('');

    container.innerHTML = ordersHTML;
}

// Load stats
async function loadStats() {
    try {
        // Verificar se o usuário está autenticado
        if (!currentUser || !currentUser.uid) {
            console.warn('Usuário não autenticado, carregando stats padrão');
            // Mostrar stats padrão se não autenticado
            const totalOrdersElement = document.getElementById('totalOrders');
            const totalSpentElement = document.getElementById('totalSpent');
            const availableTokensElement = document.getElementById('availableTokens');
            const myTokenBalanceElement = document.getElementById('myTokenBalance');
            
            if (totalOrdersElement) totalOrdersElement.textContent = '0';
            if (totalSpentElement) totalSpentElement.textContent = 'R$ 0,00';
            if (availableTokensElement) availableTokensElement.textContent = '0';
            if (myTokenBalanceElement) myTokenBalanceElement.textContent = '0';
            return;
        }
        
        const orders = await fetchUserDocs('orders', 200, false);
        let totalOrders = orders.length;
        let totalSpent = orders.reduce((sum, r) => sum + (r.data.total || r.data.amount || 0), 0);

        console.log('🔍 Stats data:', { totalOrders, totalSpent, userProfile });

        const totalOrdersElement = document.getElementById('totalOrders');
        const totalSpentElement = document.getElementById('totalSpent');
        const availableTokensElement = document.getElementById('availableTokens');
        const myTokenBalanceElement = document.getElementById('myTokenBalance');
        
        if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
        if (totalSpentElement) totalSpentElement.textContent = `R$ ${totalSpent.toFixed(2)}`;
        if (availableTokensElement) availableTokensElement.textContent = userProfile?.tokens || 0;
        if (myTokenBalanceElement) myTokenBalanceElement.textContent = userProfile?.tokens || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Helper to fetch user docs handling different owner field names and rule variations
async function fetchUserDocs(colName, max = 50, sortDesc = false){
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
        console.warn('Usuário não autenticado, não é possível buscar documentos');
        return [];
    }
    
    const colRef = collection(db, colName);
    
    // Para coleção 'orders', usar campos customer e buyerEmail
    // Para coleção 'registrations', usar campos contact e teamName
    let candidates;
    if (colName === 'orders') {
        candidates = [
            where('customer','==', currentUser.email),
            where('buyerEmail','==', currentUser.email),
            where('userId','==', currentUser.uid),
            where('uid','==', currentUser.uid)
        ];
    } else if (colName === 'registrations') {
        candidates = [
            where('contact','==', currentUser.email),
            where('userId','==', currentUser.uid),
            where('uid','==', currentUser.uid)
        ];
    } else {
        // Para outras coleções, usar campos originais
        candidates = [
            where('userId','==', currentUser.uid),
            where('uid','==', currentUser.uid),
            where('ownerId','==', currentUser.uid)
        ];
    }
    
    console.log(`🔍 Searching in collection '${colName}' with email: ${currentUser.email}, uid: ${currentUser.uid}`);
    const results = [];
    for (const cond of candidates){
        try{
            const base = sortDesc ? query(colRef, cond) : query(colRef, cond);
            const snap = await getDocs(base);
            console.log(`🔍 Query result for ${colName}:`, snap.size, 'documents');
            snap.forEach(d => {
                const data = d.data();
                console.log(`🔍 Found document:`, { id: d.id, customer: data.customer, buyerEmail: data.buyerEmail, userId: data.userId, uid: data.uid });
                results.push({ id: d.id, data });
            });
            if (results.length > 0) break; // got something
        }catch(e){
            console.log(`🔍 Query error for ${colName}:`, e);
            // ignore permission errors, try next field
        }
    }
    // limit and sort by createdAt if requested
    const limited = results
        .sort((a,b)=>{
            const at = a.data.createdAt?.toMillis?.() || 0;
            const bt = b.data.createdAt?.toMillis?.() || 0;
            return sortDesc ? bt - at : at - bt;
        })
        .slice(0, max);
    console.log(`🔍 Final results for ${colName}:`, limited.length, 'documents');
    return limited;
}

// Load profile
function loadProfile() {
    if (userProfile) {
        document.getElementById('profileName').value = userProfile.name || '';
        document.getElementById('profileEmail').value = userProfile.email || '';
        document.getElementById('profilePhone').value = userProfile.phone || '';
        document.getElementById('profileNickname').value = userProfile.nickname || '';
        document.getElementById('profileTeam').value = userProfile.team || '';
        document.getElementById('profileAge').value = userProfile.age || '';
    }
}

// Save profile
async function saveProfile(e) {
    e.preventDefault();
    
    try {
        // Verificar se o usuário está autenticado
        if (!currentUser || !currentUser.uid) {
            alert('Você precisa estar logado para atualizar o perfil');
            return;
        }
        
        const profileData = {
            name: document.getElementById('profileName').value,
            phone: document.getElementById('profilePhone').value,
            nickname: document.getElementById('profileNickname').value,
            team: document.getElementById('profileTeam').value,
            age: document.getElementById('profileAge').value,
            updatedAt: new Date()
        };

        await setDoc(doc(db, 'users', currentUser.uid), profileData, { merge: true });
        
        // Update userProfile
        userProfile = { ...userProfile, ...profileData };
        document.getElementById('userName').textContent = profileData.name || currentUser.email;
        
        alert('Perfil atualizado com sucesso!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Erro ao salvar perfil. Tente novamente.');
    }
}

// Load tokens history (purchases)
async function loadTokensHistory() {
    try {
        const container = document.getElementById('tokensHistory');
        if (!container) return;
        
        // Buscar compras de tokens (orders com tipo 'tokens' ou descrição contendo 'token')
        const orders = await fetchUserDocs('orders', 50, true);
        const tokenOrders = orders.filter(o => 
            o.data.itemName?.toLowerCase().includes('token') || 
            o.data.type === 'tokens' ||
            o.data.description?.toLowerCase().includes('token') ||
            o.data.item?.toLowerCase().includes('token')
        );
        
        if (tokenOrders.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma compra de tokens encontrada</p>';
            return;
        }
        
        const historyHTML = tokenOrders.map(order => `
            <div class="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                <div>
                    <p class="font-medium text-gray-900">${order.data.itemName || 'Compra de Tokens'}</p>
                    <p class="text-sm text-gray-500">${formatDate(order.data.createdAt?.toDate?.() || new Date())}</p>
                </div>
                <div class="text-right">
                    <p class="font-medium text-gray-900">R$ ${order.data.amount?.toFixed(2) || '0,00'}</p>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.data.status)}">
                        ${getStatusText(order.data.status)}
                    </span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = historyHTML;
    } catch (error) {
        console.error('Error loading tokens history:', error);
        document.getElementById('tokensHistory').innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar histórico</p>';
    }
}

// Load my tokens (balance)
async function loadMyTokens() {
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
        console.warn('Usuário não autenticado, não é possível carregar tokens');
        // Mostrar 0 tokens se não autenticado
        const balanceElement = document.getElementById('myTokenBalance');
        if (balanceElement) {
            balanceElement.textContent = '0 Tokens';
        }
        return;
    }
    
    // Garantir que o userProfile seja carregado
    if (!userProfile) {
        console.log('🔍 UserProfile not loaded, loading it first...');
        await loadUserProfile();
    }
    
    // Verificar se há tokens não sincronizados
    await checkAndSyncTokens();
    
    if (userProfile) {
        const balanceElement = document.getElementById('myTokenBalance');
        if (balanceElement) {
            balanceElement.textContent = `${userProfile.tokens || 0} Tokens`;
        }
        console.log('🔍 My tokens loaded:', userProfile.tokens);
    } else {
        console.log('❌ userProfile not available in loadMyTokens');
    }
    
    // Carregar histórico de uso dos tokens
    loadTokenUsageHistory();
}

// Verificar e sincronizar tokens com base nas compras
async function checkAndSyncTokens() {
    try {
        console.log('🔍 Checking for unsynced tokens...');
        
        // Buscar todas as compras de tokens
        const orders = await fetchUserDocs('orders', 100, false);
        const tokenOrders = orders.filter(o => 
            o.data.itemName?.toLowerCase().includes('token') || 
            o.data.type === 'tokens' ||
            o.data.description?.toLowerCase().includes('token') ||
            o.data.item?.toLowerCase().includes('token')
        );
        
        console.log('🔍 Token orders found:', tokenOrders.length);
        
        if (tokenOrders.length > 0) {
            // Calcular total de tokens comprados
            let totalTokensPurchased = 0;
            tokenOrders.forEach(order => {
                const tokensInOrder = parseInt(order.data.itemName?.match(/\d+/)?.[0] || 
                                            order.data.description?.match(/\d+/)?.[0] || 
                                            order.data.item?.match(/\d+/)?.[0] || '0');
                totalTokensPurchased += tokensInOrder;
                console.log(`🔍 Order ${order.id}: ${tokensInOrder} tokens`);
            });
            
            console.log('🔍 Total tokens purchased:', totalTokensPurchased);
            console.log('🔍 Current tokens in profile:', userProfile?.tokens || 0);
            
            // Se os tokens comprados são maiores que os tokens no perfil, atualizar
            if (totalTokensPurchased > (userProfile?.tokens || 0)) {
                console.log('🔍 Syncing tokens...');
                const newTokenBalance = totalTokensPurchased;
                
                // Atualizar no Firestore
                await setDoc(doc(db, 'users', currentUser.uid), {
                    tokens: newTokenBalance
                }, { merge: true });
                
                // Atualizar userProfile local
                userProfile.tokens = newTokenBalance;
                
                console.log(`✅ Tokens synced! New balance: ${newTokenBalance}`);
            }
        }
    } catch (error) {
        console.error('Error checking and syncing tokens:', error);
    }
}

// Load token usage history
async function loadTokenUsageHistory() {
    try {
        // Verificar se o usuário está autenticado
        if (!currentUser || !currentUser.uid) {
            console.warn('Usuário não autenticado, não é possível carregar histórico de tokens');
            return;
        }
        
        const container = document.getElementById('tokenUsageHistory');
        if (!container) return;
        
        // Buscar registrations onde o usuário usou tokens
        const registrations = await fetchUserDocs('registrations', 50, true);
        const tokenUsage = registrations.filter(r => r.data.paidWithTokens === true);
        
        if (tokenUsage.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p>Nenhum uso de tokens encontrado</p>
                    <p class="text-sm mt-1">Seus usos de tokens aparecerão aqui</p>
                </div>
            `;
            return;
        }
        
        const historyHTML = tokenUsage.map(usage => {
            const date = usage.data.createdAt?.toDate?.() || new Date();
            const eventType = usage.data.eventType || 'Evento';
            const tokensUsed = usage.data.tokensUsed || usage.data.tokenCost || 1;
            const status = usage.data.status || 'unknown';
            const whatsappLink = usage.data.whatsappLink;
            const schedule = usage.data.schedule || '';
            const eventDate = usage.data.date || '';
            
            return `
                <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"></path>
                                </svg>
                            </div>
                            <div>
                                <h6 class="font-medium text-gray-900">${eventType}</h6>
                                <p class="text-sm text-gray-500">${formatDate(date)}</p>
                                ${eventDate && schedule ? `<p class="text-xs text-gray-400">${eventDate} às ${schedule}</p>` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="flex items-center space-x-2">
                                <span class="text-sm font-medium text-yellow-600">-${tokensUsed} token${tokensUsed > 1 ? 's' : ''}</span>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}">
                                    ${getStatusText(status)}
                                </span>
                            </div>
                            ${whatsappLink ? `
                                <div class="mt-2">
                                    <a href="${whatsappLink}" target="_blank" class="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-full hover:bg-green-700 transition-colors">
                                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                                        </svg>
                                        Entrar no Grupo
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = historyHTML;
    } catch (error) {
        console.error('Error loading token usage history:', error);
        document.getElementById('tokenUsageHistory').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>Erro ao carregar histórico</p>
            </div>
        `;
    }
}

// Logout
async function logout() {
    try {
        await signOut(auth);
        // Show login prompt instead of redirecting
        showLoginPrompt();
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Show login prompt
function showLoginPrompt() {
    const mainContent = document.querySelector('.max-w-7xl');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div class="mb-6">
                        <svg class="w-16 h-16 mx-auto text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
                        <p class="text-gray-600">Você precisa fazer login para acessar sua área de cliente.</p>
                    </div>
                    <div class="space-y-4">
                        <button onclick="window.location.href='index.html'" class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                            Ir para Login
                        </button>
                        <button onclick="window.location.href='index.html'" class="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors">
                            Voltar ao Site
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Hide login prompt
function hideLoginPrompt() {
    // This function is called when user is logged in
    // The main content is already loaded by loadDashboard()
}

// Helper functions
function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Função para persistir perfil do usuário
async function persistUserProfile(profile) {
    try {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        const isNetlify = /netlify\.app$/i.test(location.hostname);
        
        console.log('🔍 Persisting profile:', { isLocal, isNetlify, firebaseReady: window.firebaseReady, hasUid: !!profile?.uid });
        
        if (window.firebaseReady && !isLocal && profile?.uid) {
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(db, 'users'), profile.uid);
            await setDoc(ref, profile, { merge: true });
            console.log('✅ Profile saved to Firestore');
        } else {
            localStorage.setItem('assoc_profile', JSON.stringify(profile));
            console.log('✅ Profile saved to localStorage');
        }
    } catch(error) {
        console.error('❌ Error persisting profile:', error);
        localStorage.setItem('assoc_profile', JSON.stringify(profile));
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'paid':
        case 'approved':
            return 'bg-green-100 text-green-800';
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'rejected':
        case 'failed':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'paid':
        case 'approved':
            return 'Pago';
        case 'pending':
            return 'Pendente';
        case 'rejected':
        case 'failed':
            return 'Rejeitado';
        default:
            return 'Desconhecido';
    }
}

// Token purchase functions - expostas globalmente
window.openTokensPurchaseModal = function() {
    const modal = document.getElementById('tokensPurchaseModal');
    if (modal) modal.classList.remove('hidden');
}

window.closeTokensPurchaseModal = function() {
    const modal = document.getElementById('tokensPurchaseModal');
    if (modal) modal.classList.add('hidden');
}

window.purchaseTokens = async function(quantity) {
    try {
        // Verificar se Firebase está inicializado
        if (!db) {
            console.error('❌ Firebase not initialized, attempting to reinitialize...');
            initializeFirebase();
            if (!db) {
                alert('Erro: Firebase não foi inicializado. Recarregue a página.');
                return;
            }
        }
        
        const price = quantity; // R$ 1,00 por token
        
        // Criar preferência no Mercado Pago
        const response = await fetch('/.netlify/functions/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                unit_price: price,
                currency_id: 'BRL',
                quantity: 1,
                back_url: window.location.origin + window.location.pathname
            })
        });
        
        if (!response.ok) throw new Error('Erro ao criar preferência');
        
        const data = await response.json();
        
        if (data.init_point) {
            // Salvar order no Firestore ANTES de redirecionar
            try {
                const currentUser = auth.currentUser;
                console.log('🔍 Current user:', currentUser ? `${currentUser.uid} (${currentUser.email})` : 'Not authenticated');
                console.log('🔍 DB instance:', db ? 'Available' : 'NULL - Firebase not initialized');
                console.log('🔍 DB type:', typeof db);
                console.log('🔍 DB constructor:', db ? db.constructor.name : 'null');
                console.log('🔍 DB has collection method:', db && typeof db.collection === 'function' ? 'YES' : 'NO');
                
                if (currentUser && db) {
                    const orderData = {
                        title: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                        description: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                        item: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                        amount: price,
                        total: price,
                        quantity: 1,
                        currency: 'BRL',
                        status: 'pending',
                        external_reference: data.external_reference,
                        preference_id: data.id,
                        customer: currentUser.email,
                        buyerEmail: currentUser.email,
                        userId: currentUser.uid,
                        uid: currentUser.uid,
                        createdAt: new Date(),
                        timestamp: Date.now()
                    };
                    
                    console.log('🔍 Attempting to save order:', orderData);
                    const docRef = await addDoc(collection(db, 'orders'), orderData);
                    console.log('✅ Order saved to Firestore with ID:', docRef.id);
                } else {
                    console.error('❌ Cannot save order: User not authenticated or DB not available');
                    console.error('❌ User:', currentUser ? 'Authenticated' : 'Not authenticated');
                    console.error('❌ DB:', db ? 'Available' : 'Not available');
                }
            } catch (firestoreError) {
                console.error('❌ Error saving order to Firestore:', firestoreError);
                console.error('❌ Error details:', {
                    message: firestoreError.message,
                    code: firestoreError.code,
                    stack: firestoreError.stack
                });
                // Continuar mesmo se der erro no Firestore
            }
            
            closeTokensPurchaseModal();
            
            // Salvar info da compra para processar após pagamento
            sessionStorage.setItem('tokenPurchase', JSON.stringify({
                quantity,
                price,
                external_reference: data.external_reference
            }));
            window.location.href = data.init_point;
        } else {
            alert('Erro ao iniciar pagamento');
        }
    } catch (error) {
        console.error('Error purchasing tokens:', error);
        alert('Erro ao processar compra de tokens');
    }
}

// Compra rápida de tokens (botões diretos) - exposta globalmente
window.purchaseTokensQuick = async function(quantity) {
    try {
        // Verificar se Firebase está inicializado
        if (!db) {
            console.error('❌ Firebase not initialized, attempting to reinitialize...');
            initializeFirebase();
            if (!db) {
                alert('Erro: Firebase não foi inicializado. Recarregue a página.');
                return;
            }
        }
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('Você precisa estar logado para comprar tokens');
            return;
        }

        const price = quantity * 1.00; // R$ 1,00 por token
        
        // Confirmar compra
        const confirmMessage = `Confirmar compra de ${quantity} token${quantity > 1 ? 's' : ''} por R$ ${price.toFixed(2)}?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        // Criar preferência de pagamento
        const response = await fetch('/.netlify/functions/create-preference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: [{
                    title: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                    quantity,
                    unit_price: 1.00
                }],
                external_reference: `tokens_${currentUser.uid}_${Date.now()}`
            })
        });

        const data = await response.json();
        
        if (data.init_point) {
            // Salvar order no Firestore ANTES de redirecionar
            try {
                console.log('🔍 Quick purchase - Current user:', currentUser ? `${currentUser.uid} (${currentUser.email})` : 'Not authenticated');
                console.log('🔍 Quick purchase - DB instance:', db ? 'Available' : 'NULL - Firebase not initialized');
                console.log('🔍 Quick purchase - DB type:', typeof db);
                console.log('🔍 Quick purchase - DB constructor:', db ? db.constructor.name : 'null');
                console.log('🔍 Quick purchase - DB has collection method:', db && typeof db.collection === 'function' ? 'YES' : 'NO');
                
                if (currentUser && db) {
                    const orderData = {
                    title: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                    description: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                    item: `${quantity} Token${quantity > 1 ? 's' : ''} XTreino`,
                    amount: price,
                    total: price,
                    quantity: quantity,
                    currency: 'BRL',
                    status: 'pending',
                    external_reference: data.external_reference,
                    preference_id: data.id,
                    customer: currentUser.email,
                    buyerEmail: currentUser.email,
                    userId: currentUser.uid,
                    uid: currentUser.uid,
                    createdAt: new Date(),
                    timestamp: Date.now()
                };
                
                    console.log('🔍 Attempting to save quick order:', orderData);
                    const docRef = await addDoc(collection(db, 'orders'), orderData);
                    console.log('✅ Quick order saved to Firestore with ID:', docRef.id);
                } else {
                    console.error('❌ Cannot save quick order: User not authenticated or DB not available');
                    console.error('❌ User:', currentUser ? 'Authenticated' : 'Not authenticated');
                    console.error('❌ DB:', db ? 'Available' : 'Not available');
                }
            } catch (firestoreError) {
                console.error('❌ Error saving quick order to Firestore:', firestoreError);
                console.error('❌ Error details:', {
                    message: firestoreError.message,
                    code: firestoreError.code,
                    stack: firestoreError.stack
                });
                // Continuar mesmo se der erro no Firestore
            }
            
            // Redirecionar para pagamento
            window.location.href = data.init_point;
        } else {
            alert('Erro ao iniciar pagamento');
        }
    } catch (error) {
        console.error('Error in quick purchase:', error);
        alert('Erro ao processar compra rápida');
    }
}
