// Client Area JavaScript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Reuse global Firebase app/auth/db initialized in firebase.js
let app = null;
let auth = null;
let db = null;

if (window.firebaseApp && window.firebaseAuth && window.firebaseDb) {
  app = window.firebaseApp;
  auth = window.firebaseAuth;
  db = window.firebaseDb;
} else if (window.FIREBASE_CONFIG) {
  // Fallback: initialize here if global init hasn't run yet
  app = initializeApp(window.FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn('FIREBASE_CONFIG not found. Authentication may not work on client.html');
}

// Ensure local persistence for auth session
if (auth && auth.setPersistence) {
  try { setPersistence(auth, browserLocalPersistence); } catch(_) {}
}

// Global variables
let currentUser = null;
let userProfile = null;

// Initialize client area
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupEventListeners();
});

// Check authentication state
function checkAuthState() {
    if (!auth) {
        showLoginPrompt();
        return;
    }
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserProfile();
            loadDashboard();
            // Hide login prompt if user is logged in
            hideLoginPrompt();
        } else {
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
    if (dashTab) dashTab.addEventListener('click', () => switchTab('dashboard'));
    if (ordersTab) ordersTab.addEventListener('click', () => switchTab('orders'));
    if (profileTab) profileTab.addEventListener('click', () => switchTab('profile'));
    if (tokensTab) tokensTab.addEventListener('click', () => switchTab('tokens'));
    if (myTokensTab) myTokensTab.addEventListener('click', () => switchTab('myTokens'));

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.addEventListener('submit', saveProfile);
}

// Switch between tabs
function switchTab(tabName) {
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
            loadMyTokens();
            break;
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userProfile = userDoc.data();
            document.getElementById('userName').textContent = userProfile.name || currentUser.email;
        } else {
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
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Load dashboard
async function loadDashboard() {
    try {
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
        const regs = await fetchUserDocs('registrations', 5, true);
        const orders = regs.map(d => ({
            id: d.id,
            ...d.data,
            date: d.data.createdAt?.toDate?.() || new Date()
        }));

        displayRecentOrders(orders);
    } catch (error) {
        console.error('Error loading recent orders:', error);
        document.getElementById('recentOrders').innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar pedidos</p>';
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
        const regs = await fetchUserDocs('registrations', 50, true);
        const orders = regs.map(d => ({
            id: d.id,
            ...d.data,
            date: d.data.createdAt?.toDate?.() || new Date()
        }));

        displayAllOrders(orders);
        await loadWhatsAppLinks(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('allOrders').innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar pedidos</p>';
    }
}

// Carrega links do WhatsApp para pedidos confirmados
async function loadWhatsAppLinks(orders) {
    const whatsappContainer = document.getElementById('whatsappLinks');
    const whatsappList = document.getElementById('whatsappList');
    if (!whatsappContainer || !whatsappList) return;

    const confirmedOrders = orders.filter(order => 
        (order.status === 'paid' || order.status === 'confirmed') && 
        (order.eventType || order.title)
    );

    if (confirmedOrders.length === 0) {
        whatsappContainer.classList.add('hidden');
        return;
    }

    whatsappContainer.classList.remove('hidden');
    
    // Mapeamento de eventos para links do WhatsApp (você pode personalizar)
    const whatsappLinks = {
        'camp-freitas': 'https://chat.whatsapp.com/SEU_LINK_CAMP_FREITAS',
        'xtreino-gratuito': 'https://chat.whatsapp.com/SEU_LINK_XTREINO_GRATUITO',
        'modo-liga': 'https://chat.whatsapp.com/SEU_LINK_MODO_LIGA'
    };

    whatsappList.innerHTML = confirmedOrders.map(order => {
        const eventType = order.eventType || '';
        const title = order.title || '';
        const date = order.date || new Date();
        
        // Determina o link baseado no tipo de evento
        let whatsappLink = whatsappLinks[eventType] || whatsappLinks['modo-liga'];
        
        // Se não encontrar por eventType, tenta por título
        if (!whatsappLinks[eventType]) {
            if (title.toLowerCase().includes('camp')) {
                whatsappLink = whatsappLinks['camp-freitas'];
            } else if (title.toLowerCase().includes('gratuito')) {
                whatsappLink = whatsappLinks['xtreino-gratuito'];
            }
        }

        return `
            <div class="border border-gray-200 rounded-lg p-4 mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-medium text-gray-900">${title}</h4>
                        <p class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</p>
                        <p class="text-sm text-green-600 font-medium">Confirmado</p>
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
            ${order.groupLink ? `
                <div class="mt-3">
                    <a href="${order.groupLink}" target="_blank" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">
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
        const regs = await fetchUserDocs('registrations', 200, false);
        let totalOrders = regs.length;
        let totalSpent = regs.reduce((sum, r) => sum + (r.data.price || 0), 0);

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalSpent').textContent = `R$ ${totalSpent.toFixed(2)}`;
        document.getElementById('availableTokens').textContent = userProfile?.tokens || 0;
        document.getElementById('myTokenBalance').textContent = userProfile?.tokens || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Helper to fetch user docs handling different owner field names and rule variations
async function fetchUserDocs(colName, max = 50, sortDesc = false){
    const colRef = collection(db, colName);
    const candidates = [
        where('userId','==', currentUser.uid),
        where('uid','==', currentUser.uid),
        where('ownerId','==', currentUser.uid)
    ];
    const results = [];
    for (const cond of candidates){
        try{
            const base = sortDesc ? query(colRef, cond) : query(colRef, cond);
            const snap = await getDocs(base);
            snap.forEach(d => results.push({ id: d.id, data: d.data() }));
            if (results.length > 0) break; // got something
        }catch(e){
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
        
        // Buscar compras de tokens (orders com tipo 'tokens')
        const orders = await fetchUserDocs('orders', 50, true);
        const tokenOrders = orders.filter(o => o.data.itemName?.toLowerCase().includes('token') || o.data.type === 'tokens');
        
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
function loadMyTokens() {
    if (userProfile) {
        document.getElementById('myTokenBalance').textContent = `${userProfile.tokens || 0} Tokens`;
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

// Token purchase functions
function openTokensPurchaseModal() {
    const modal = document.getElementById('tokensPurchaseModal');
    if (modal) modal.classList.remove('hidden');
}

function closeTokensPurchaseModal() {
    const modal = document.getElementById('tokensPurchaseModal');
    if (modal) modal.classList.add('hidden');
}

async function purchaseTokens(quantity) {
    try {
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
        closeTokensPurchaseModal();
        
        if (data.init_point) {
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

// Compra rápida de tokens (botões diretos)
async function purchaseTokensQuick(quantity) {
    try {
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
