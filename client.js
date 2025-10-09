// Client Area JavaScript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqJ8Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q",
    authDomain: "supernatural-51e12.firebaseapp.com",
    projectId: "supernatural-51e12",
    storageBucket: "supernatural-51e12.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnopqrstuv"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserProfile();
            loadDashboard();
        } else {
            // Redirect to login
            window.location.href = 'index.html';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.getElementById('dashboardTab').addEventListener('click', () => switchTab('dashboard'));
    document.getElementById('ordersTab').addEventListener('click', () => switchTab('orders'));
    document.getElementById('profileTab').addEventListener('click', () => switchTab('profile'));
    document.getElementById('tokensTab').addEventListener('click', () => switchTab('tokens'));

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Profile form
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
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
            loadTokens();
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
        const ordersQuery = query(
            collection(db, 'registrations'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        const orders = [];
        
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            orders.push({
                id: doc.id,
                ...data,
                date: data.createdAt?.toDate?.() || new Date()
            });
        });

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
        const ordersQuery = query(
            collection(db, 'registrations'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        const orders = [];
        
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            orders.push({
                id: doc.id,
                ...data,
                date: data.createdAt?.toDate?.() || new Date()
            });
        });

        displayAllOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('allOrders').innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar pedidos</p>';
    }
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
        const ordersQuery = query(
            collection(db, 'registrations'),
            where('userId', '==', currentUser.uid)
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        let totalOrders = 0;
        let totalSpent = 0;
        
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            totalOrders++;
            totalSpent += data.price || 0;
        });

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalSpent').textContent = `R$ ${totalSpent.toFixed(2)}`;
        document.getElementById('availableTokens').textContent = userProfile?.tokens || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
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

// Load tokens
function loadTokens() {
    if (userProfile) {
        document.getElementById('tokenBalance').textContent = `${userProfile.tokens || 0} Tokens`;
    }
}

// Logout
async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
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
