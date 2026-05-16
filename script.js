// ==================== TOAST NOTIFICATION SYSTEM ====================
let confirmResolve = null;

function showToast(type, message, title = null, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    const titles = {
        success: 'Sucesso',
        error: 'Erro',
        info: 'Informação',
        warning: 'Atenção'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ'}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }

    return toast;
}

function removeToast(toast) {
    if (!toast) return;
    toast.classList.add('toast-exit');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

// Replace alert() with toast
window.alert = function (message) {
    showToast('info', message, null, 4000);
};

// Elegant confirmation modal
function showConfirm(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');

        if (!modal || !titleEl || !messageEl || !okBtn) {
            resolve(false);
            return;
        }

        titleEl.textContent = title || 'Confirmar';
        messageEl.textContent = message || '';
        okBtn.textContent = confirmText;

        confirmResolve = resolve;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
}

function handleConfirmOk() {
    closeConfirmModal();
    if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
    }
}

// Replace confirm() with elegant modal
window.confirm = function (message) {
    return showConfirm('Confirmar', message);
};

// Helper functions for different toast types
window.showSuccessToast = function (message, title = 'Sucesso') {
    showToast('success', message, title);
};

window.showErrorToast = function (message, title = 'Erro') {
    showToast('error', message, title);
};

window.showInfoToast = function (message, title = 'Informação') {
    showToast('info', message, title);
};

window.showWarningToast = function (message, title = 'Atenção') {
    showToast('warning', message, title);
};

const CAMP_SEMIFINAL_DATES = ['2024-11-22', '2024-11-23', '2025-11-22', '2025-11-23'];
const CAMP_FINAL_DATES = ['2024-11-28', '2025-11-28'];
const CAMP_SEMIFINAL_LINK_CACHE_TTL = 60000;
let campSemifinalLinksCache = { data: null, timestamp: 0 };

const AFFILIATE_REF_KEY = 'xf_affiliate_ref';
const AFFILIATE_REF_TS_KEY = 'xf_affiliate_ref_ts';
const AFFILIATE_REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function captureAffiliateRefFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref && typeof ref === 'string' && ref.trim().length >= 6) {
            storeAffiliateRef(ref.trim());          
        }
    } catch (error) {
        
    }
}

function storeAffiliateRef(ref) {
    try {
        localStorage.setItem(AFFILIATE_REF_KEY, ref);
        localStorage.setItem(AFFILIATE_REF_TS_KEY, Date.now().toString());
    } catch (_) { }
    try {
        sessionStorage.setItem(AFFILIATE_REF_KEY, ref);
        sessionStorage.setItem(AFFILIATE_REF_TS_KEY, Date.now().toString());
    } catch (_) { }
}

function clearStoredAffiliateRef() {
    try {
        localStorage.removeItem(AFFILIATE_REF_KEY);
        localStorage.removeItem(AFFILIATE_REF_TS_KEY);
    } catch (_) { }
    try {
        sessionStorage.removeItem(AFFILIATE_REF_KEY);
        sessionStorage.removeItem(AFFILIATE_REF_TS_KEY);
    } catch (_) { }
}

function getStoredAffiliateRef() {
    try {
        const ref = sessionStorage.getItem(AFFILIATE_REF_KEY) || localStorage.getItem(AFFILIATE_REF_KEY);
        if (!ref) return null;
        const tsStr = sessionStorage.getItem(AFFILIATE_REF_TS_KEY) || localStorage.getItem(AFFILIATE_REF_TS_KEY);
        const ts = tsStr ? parseInt(tsStr, 10) : null;
        if (ts && (Date.now() - ts) > AFFILIATE_REF_TTL_MS) {
            clearStoredAffiliateRef();
            return null;
        }
        return ref;
    } catch (_) {
        return null;
    }
}

function getActiveAffiliateCode(preferredAffiliateId = null) {
    if (preferredAffiliateId) return preferredAffiliateId;
    const storedRef = getStoredAffiliateRef();
    if (!storedRef) return null;
    const currentUid = window.currentUserProfile?.uid || window.firebaseAuth?.currentUser?.uid || null;
    if (currentUid && storedRef === currentUid) return null; // evita auto-comissão
    return storedRef;
}

// Função especializada para exibir erros de pagamento com tokens de forma elegante
function showTokenPaymentError(errorCode, errorMessage, details = null) {
    // Mapeamento de mensagens amigáveis para cada código de erro
    const friendlyMessages = {
        'ERR_TKN_001': 'Erro ao processar dados da reserva',
        'ERR_TKN_002': 'Saldo de tokens insuficiente',
        'ERR_TKN_003': 'Erro ao criar reservas',
        'ERR_TKN_004': 'Erro ao calcular valores',
        'ERR_TKN_005': 'Erro ao validar saldo',
        'ERR_TKN_006': 'Validação de pagamento falhou',
        'ERR_TKN_007': 'Erro ao processar pagamento',
        'ERR_TKN_008': 'Erro ao processar reservas',
        'ERR_TKN_009': 'Erro ao confirmar pagamento',
        'ERR_TKN_010': 'Erro crítico - contate o suporte',
        'ERR_TKN_011': 'Erro inesperado',
        'ERR_SPEND_001': 'Valor inválido',
        'ERR_SPEND_002': 'Saldo insuficiente',
        'ERR_SPEND_003': 'Erro ao acessar sua conta',
        'ERR_SPEND_004': 'Erro no cálculo',
        'ERR_SPEND_005': 'Erro ao salvar alterações'
    };

    const friendlyTitle = friendlyMessages[errorCode] || 'Erro no Pagamento';

    // Mensagem formatada de forma elegante
    let formattedMessage = errorMessage;
    if (details) {
        formattedMessage += `\n\n${details}`;
    }

    // Criar toast customizado com código de erro destacado
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Fallback para alert se o container não existir
        alert(`${friendlyTitle}\n\n${formattedMessage}\n\nCódigo: ${errorCode}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-error';

    toast.innerHTML = `
        <div class="toast-icon" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
        </div>
        <div class="toast-content" style="flex: 1;">
            <div class="toast-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span>${friendlyTitle}</span>
                <span style="background: rgba(239, 68, 68, 0.1); color: #dc2626; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: monospace;">
                    ${errorCode}
                </span>
            </div>
            <div class="toast-message" style="white-space: pre-line; line-height: 1.6;">
                ${formattedMessage}
            </div>
            ${details ? `
            <div style="margin-top: 8px; padding: 8px; background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 12px; color: #7f1d1d;">
                ${details}
            </div>
            ` : ''}
        </div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove após 8 segundos (mais tempo para erros)
    setTimeout(() => {
        removeToast(toast);
    }, 8000);

    // Também logar no console para debug
    
    if (details) {
        
    }

    return toast;
}

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

function openLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.classList.remove('hidden');
}
function closeLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.classList.add('hidden');
}
function showAuthTab(tab) {
    const tabs = ['login', 'register', 'reset'];
    tabs.forEach(t => {
        const el = document.getElementById('auth' + t.charAt(0).toUpperCase() + t.slice(1));
        const btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (!el || !btn) return;
        if (t === tab) { el.classList.remove('hidden'); btn.classList.add('border-blue-matte'); btn.classList.remove('text-gray-500'); }
        else { el.classList.add('hidden'); btn.classList.remove('border-blue-matte'); btn.classList.add('text-gray-500'); }
    });
    const msg = document.getElementById('authMsg'); if (msg) msg.textContent = '';
}

async function loginWithGoogle() {
    try {
        if (!window.firebaseReady) { throw new Error('Firebase não inicializado'); }
        const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(window.firebaseAuth, provider);
        onAuthLogged(res.user);
    } catch (e) { document.getElementById('authMsg').textContent = 'Erro no login Google.'; }
}


async function loginWithEmailPassword() {
    try {
        if (!window.firebaseReady) { throw new Error('Firebase não inicializado'); }
        const email = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPassword').value.trim();
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        const res = await signInWithEmailAndPassword(window.firebaseAuth, email, pass);
        onAuthLogged(res.user);
    } catch (e) { document.getElementById('authMsg').textContent = 'Email ou senha inválidos.'; }
}

async function registerWithEmailPassword() {
    try {
        if (!window.firebaseReady) { throw new Error('Firebase não inicializado'); }
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
        try {
            if (window.firebaseReady) {
                const { collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                const ref = doc(collection(window.firebaseDb, 'users'), cred.user.uid);
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
        } catch (e) {
            
        }
        onAuthLogged(cred.user);
    } catch (e) { document.getElementById('authMsg').textContent = e.message || 'Não foi possível criar a conta.'; }
}

async function sendPasswordReset() {
    try {
        if (!window.firebaseReady) { throw new Error('Firebase não inicializado'); }
        const email = document.getElementById('resetEmail').value.trim();
        const btn = document.getElementById('resetBtn');
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            const alertEl = document.getElementById('resetAlert');
            if (alertEl) {
                alertEl.className = 'text-sm px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200';
                alertEl.textContent = 'Digite um email válido.';
                alertEl.classList.remove('hidden');
            } else {
                document.getElementById('authMsg').textContent = 'Digite um email válido.';
            }
            return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
        const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        await sendPasswordResetEmail(window.firebaseAuth, email);
        const alertEl = document.getElementById('resetAlert');
        if (alertEl) {
            alertEl.className = 'text-sm px-3 py-2 rounded-md bg-green-50 text-green-700 border border-green-200';
            alertEl.textContent = 'Pronto! Enviamos um link de recuperação para seu email.';
            alertEl.classList.remove('hidden');
        } else {
            document.getElementById('authMsg').textContent = 'Enviamos um link de recuperação para seu email. Confira também a caixa de spam.';
        }
        if (btn) { btn.textContent = 'Email enviado'; }
    } catch (e) {
        const msg = (e && e.code) ? String(e.code).replace('auth/', '').replaceAll('-', ' ') : 'Erro ao enviar recuperação.';
        const alertEl = document.getElementById('resetAlert');
        if (alertEl) {
            alertEl.className = 'text-sm px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200';
            alertEl.textContent = msg;
            alertEl.classList.remove('hidden');
        } else {
            document.getElementById('authMsg').textContent = msg;
        }
    } finally {
        const btn = document.getElementById('resetBtn');
        if (btn) { btn.disabled = false; }
    }
}

function onAuthLogged(user) {
    // Atualiza lastLogin no Firestore
    try {
        if (window.firebaseReady && window.firebaseDb && user?.uid) {
            (async () => {
                const { doc, setDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                const ref = doc(collection(window.firebaseDb, 'users'), user.uid);
                await setDoc(ref, { lastLogin: serverTimestamp(), email: user.email || null }, { merge: true });
            })().catch(() => { });
        }
    } catch (_) {/* noop */ }
    try {
        const name = user?.displayName || user?.email || 'Usuário';
        const welcome = document.getElementById('accWelcome');
        if (welcome) welcome.textContent = `Bem-vindo, ${name}!`;
    } catch (_) { }
    window.isLoggedIn = true;
    toggleAccountButtons(true);
    closeLoginModal();
    updateAdminLinkVisibility();
    // registra lastLogin
    try {
        if (window.firebaseReady && window.firebaseAuth?.currentUser) {
            import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                .then(({ doc, setDoc, collection }) => {
                    const uid = window.firebaseAuth.currentUser.uid;
                    const ref = doc(collection(window.firebaseDb, 'users'), uid);
                    return setDoc(ref, { lastLogin: Date.now() }, { merge: true });
                }).catch(() => { });
        }
    } catch (_) { }
    // Redireciono para o admin se foi solicitado e o usuário tiver permissão
    if (window.postLoginRedirect === 'admin') {
        setTimeout(async () => {
            try {
                const uid = user?.uid || window.firebaseAuth?.currentUser?.uid;
                if (uid) {
                    await loadUserProfile(uid);
                    const role = (window.currentUserProfile?.role || '').toLowerCase();
                    if (['ceo', 'gerente', 'vendedor', 'design', 'socio', 'afiliado', 'staff'].includes(role)) {
                        window.postLoginRedirect = null;
                        window.location.href = 'admin.html';
                        return;
                    }
                }
                showErrorToast('Acesso ao painel restrito (CEO, Gerente, Vendedor, Design, Sócio, Afiliado ou Staff).', 'Acesso Negado');
                window.postLoginRedirect = null;
            } catch (_) { window.postLoginRedirect = null; }
        }, 100);
    }
    // Redireciono para a aba de Meus Tokens se foi solicitado a partir do agendamento
    if (window.postLoginRedirect === 'myTokens') {
        window.postLoginRedirect = null;
        setTimeout(() => { window.location.href = 'client.html?tab=myTokens'; }, 100);
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
    //         
    //     }
    // }, 1000);

    // Não abre automaticamente a área do cliente - só quando clicar em MINHA CONTA
}

// ===== NOTIFICAÇÕES DO USUÁRIO =====
let _notifUnreadCount = 0;

async function loadUserNotifications() {
    if (!window.isLoggedIn || !window.firebaseDb || !window.firebaseAuth?.currentUser) return;
    try {
        const uid = window.firebaseAuth.currentUser.uid;
        const { collection, query, where, getDocs, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const db = window.firebaseDb;

        let allDocs = [];
        try {
            const q1 = query(collection(db, 'notifications'), where('type', '==', 'all'), limit(30));
            const s1 = await getDocs(q1);
            allDocs.push(...s1.docs);
        } catch(e) { console.warn('Notif q1:', e?.code); }
        try {
            const q2 = query(collection(db, 'notifications'), where('targetUserId', '==', uid), limit(30));
            const s2 = await getDocs(q2);
            allDocs.push(...s2.docs);
        } catch(e) { console.warn('Notif q2:', e?.code); }

        // Deduplicar e ordenar
        const seen = new Set();
        allDocs = allDocs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
        allDocs.sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));

        // Calcular não lidas usando localStorage
        const readKey = `notifRead_${uid}`;
        const readIds = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));
        _notifUnreadCount = allDocs.filter(d => !readIds.has(d.id)).length;
        updateNotifBadge(_notifUnreadCount);

        // Mostrar sininho se logado
        ['notifBellDesktop', 'notifBellMobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });

        const listEl = document.getElementById('notifList');
        if (!listEl) return;

        if (allDocs.length === 0) {
            listEl.innerHTML = '<p class="text-center text-gray-400 text-sm py-8">Sem notificações no momento</p>';
            return;
        }

        listEl.innerHTML = allDocs.map(d => {
            const n = d.data();
            const isRead = readIds.has(d.id);
            const dateStr = n.createdAt ? new Date(n.createdAt.toDate ? n.createdAt.toDate() : n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            const roomBtnHtml = n.roomLink ? `
                <a href="${n.roomLink}" target="_blank" rel="noopener noreferrer"
                   style="display:block;margin-top:10px;text-decoration:none;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-align:center;padding:12px 16px;border-radius:12px;font-weight:900;font-size:15px;letter-spacing:1px;animation:roomPulse 1.5s infinite;box-shadow:0 0 0 0 rgba(124,58,237,0.7)">
                    🚀 ENTRAR NA SALA!!
                </a>` : '';
            return `<div class="p-3 transition-colors cursor-default ${isRead ? 'hover:bg-gray-50' : 'bg-blue-50 border-l-2 border-blue-400'}">
                <div class="font-semibold text-sm text-gray-900">${n.title || ''}</div>
                <div class="text-xs text-gray-600 mt-0.5 leading-relaxed whitespace-pre-line">${n.message || ''}</div>
                ${roomBtnHtml}
                <div class="text-xs text-gray-400 mt-1">${dateStr}</div>
            </div>`;
        }).join('') + `<style>@keyframes roomPulse{0%{box-shadow:0 0 0 0 rgba(124,58,237,0.7)}70%{box-shadow:0 0 0 12px rgba(124,58,237,0)}100%{box-shadow:0 0 0 0 rgba(124,58,237,0)}}</style>`;
    } catch (err) {
        console.error('Erro ao carregar notificações:', err);
    }
}

function updateNotifBadge(count) {
    ['notifBadgeDesktop', 'notifBadgeMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = count > 99 ? '99+' : String(count);
        count > 0 ? el.classList.remove('hidden') : el.classList.add('hidden');
    });
}

function toggleNotifDropdown() {
    const d = document.getElementById('notifDropdown');
    if (!d) return;
    if (d.classList.contains('hidden')) {
        d.classList.remove('hidden');
        loadUserNotifications();
        // Marcar como lidas ao abrir
        if (window.firebaseAuth?.currentUser) {
            const uid = window.firebaseAuth.currentUser.uid;
            const readKey = `notifRead_${uid}`;
            const listEl = document.getElementById('notifList');
            // Aguarda um tick para o DOM atualizar
            setTimeout(() => {
                const ids = [];
                document.querySelectorAll('#notifList [data-notif-id]').forEach(el => ids.push(el.dataset.notifId));
                // Re-carrega e pega os IDs da lista
                loadUserNotifications().then(() => {
                    const currentIds = JSON.parse(localStorage.getItem(readKey) || '[]');
                    // Marcar todos os visíveis — simplificado: zerar badge
                    _notifUnreadCount = 0;
                    updateNotifBadge(0);
                });
            }, 600);
        }
    } else {
        d.classList.add('hidden');
    }
}

function closeNotifDropdown() {
    const d = document.getElementById('notifDropdown');
    if (d) d.classList.add('hidden');
}

window.loadUserNotifications = loadUserNotifications;
window.toggleNotifDropdown = toggleNotifDropdown;
window.closeNotifDropdown = closeNotifDropdown;
window.updateNotifBadge = updateNotifBadge;

// ===== FIM NOTIFICAÇÕES =====

function toggleAccountButtons(isLogged) {
    const loginDesk = document.getElementById('loginBtnDesktop');
    const accountSectionDesktop = document.getElementById('accountSectionDesktop');
    const loginMob = document.getElementById('loginBtnMobile');
    const profileAvatarMobile = document.getElementById('profileAvatarMobile');
    const accountBtnMobileExpanded = document.getElementById('accountBtnMobileExpanded');

    // Desktop
    if (loginDesk && accountSectionDesktop) {
        loginDesk.classList.toggle('hidden', isLogged);
        accountSectionDesktop.classList.toggle('hidden', !isLogged);
    }

    // Mobile - Avatar sempre visível quando logado, botão CONTA no menu expandido
    if (loginMob && profileAvatarMobile) {
        loginMob.classList.toggle('hidden', isLogged);
        profileAvatarMobile.classList.toggle('hidden', !isLogged);
    }

    // Botão CONTA no menu expandido
    if (accountBtnMobileExpanded) {
        accountBtnMobileExpanded.classList.toggle('hidden', !isLogged);
    }

    updateHeaderTokenBadges();
}

// Garantir estado inicial correto dos botões ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    try {
        const loginDesk = document.getElementById('loginBtnDesktop');
        const accDesk = document.getElementById('accountBtnDesktop');
        const loginMob = document.getElementById('loginBtnMobile');
        const accMob = document.getElementById('accountBtnMobile');
        if (accDesk) accDesk.classList.add('hidden');
        if (accMob) accMob.classList.add('hidden');
        if (profileAvatarMobile) profileAvatarMobile.classList.add('hidden');
        if (loginDesk) loginDesk.classList.remove('hidden');
        if (loginMob) loginMob.classList.remove('hidden');
        updateHeaderTokenBadges();
    } catch (_) { /* noop */ }
});

// Verificar se usuário é admin autorizado
async function checkAdminAccess() {
    

    if (!window.isLoggedIn || !window.firebaseAuth?.currentUser) {
        
        return false;
    }

    const user = window.firebaseAuth.currentUser;
    const authorizedEmails = ['cleitondouglass@gmail.com', 'cleitondouglass123@hotmail.com', 'gilmariofreitas378@gmail.com', 'gilmariofreitas387@gmail.com'];

    

    // Verificar role no Firestore primeiro
    try {
        const uid = user.uid;
        
        

        const { doc, getDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getDoc(doc(collection(window.firebaseDb, 'users'), uid));
        if (snap.exists()) {
            const userData = snap.data();
            const role = (userData.role || '').toLowerCase();
            
            

            // Para design e socio, permitir qualquer email (incluindo variações)
            const designVariations = ['design', 'designer', 'desgin', 'desgine'];
            const socioVariations = ['socio', 'sócio'];

            
            
            

            // Verificação adicional para socio com diferentes variações
            const isSocio = role === 'socio' || role === 'sócio' || role.includes('socio') || role.includes('sócio');
            

            if (designVariations.includes(role) || socioVariations.includes(role) || isSocio) {
                
                return true;
            }

            

            // Para outros cargos, verificar email na whitelist
            if (['admin', 'ceo', 'gerente', 'vendedor'].includes(role)) {
                if (!authorizedEmails.includes(user.email.toLowerCase())) {
                    
                    return false;
                }
                
                return true;
            }
        }
    } catch (error) {
        
    }

    
    return false;
}

// Mostrar/esconder link ADMIN baseado no acesso
async function updateAdminLinkVisibility() {
   
    const adminLink = document.getElementById('adminLink');
    const adminLinkMobile = document.getElementById('adminLinkMobile');
    if (!adminLink && !adminLinkMobile) {
        
        return;
    }

    const hasAccess = await checkAdminAccess();

    const toggle = (el, show) => {
        if (!el) return;
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    };
    toggle(adminLink, hasAccess);
    toggle(adminLinkMobile, hasAccess);
    const adminLinkMobileExpanded = document.getElementById('adminLinkMobileExpanded');
    if (adminLinkMobileExpanded) {
        toggle(adminLinkMobileExpanded, hasAccess);
    }
   
}

function requestAdminAccess() {
    // Se já estiver logado, valida papel; senão, abre modal de login e marca redirecionamento
    if (!window.isLoggedIn) {
        window.postLoginRedirect = 'admin';
        openLoginModal();
        return;
    }
    (async () => {
        const hasAccess = await checkAdminAccess();
        if (hasAccess) {
            window.location.href = 'admin.html';
        } else {
            showErrorToast('Acesso ao painel restrito. Apenas administradores autorizados.', 'Acesso Negado');
        }
    })();
}

// Modal de conta removido - agora redireciona para client.html

async function logout() {
    try {
        if (window.firebaseReady) {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
            await signOut(window.firebaseAuth);
        }
    } catch (_) { }
    window.currentUserProfile = null;
    window.isLoggedIn = false;
    toggleAccountButtons(false);
    // Modal removido
}

// Funções do modal de conta removidas - agora usa client.html

// Função removida - agora usa client.html

// Função removida - agora usa client.html


// Todas as funções do modal de conta removidas - agora usa client.html
// Mobile menu toggle - Removido, menu agora é sempre visível
// Função mantida para compatibilidade mas não faz nada
function toggleMobileMenu() {
    // Menu mobile agora é sempre visível, não precisa de toggle
}

// Smooth scroll to sections
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({
        behavior: 'smooth'
    });
}

// Redireciona para a compra/aba Meus Tokens a partir do modal de reserva
function goToTokensFromSchedule() {
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
function refreshAuthButtons() { /* removed */ }

// Abrir modal de cadastro direto (atalho)
function openRegisterModal() { /* removed */ }

// Submissão de cadastro: salva no perfil e persiste
async function submitRegister() { /* removed */ }

// Inicializa header conforme sessão prévia
window.addEventListener('load', () => {
    try {
        initShopCartHook();
        // Aguardar um pouco para garantir que o Firebase esteja carregado
        setTimeout(() => {
            updateAdminLinkVisibility();
        }, 1000);
    } catch (_) { }
});

// ---------------- Área de Associados: cargos, níveis, permissões e tokens ----------------
// Configuração centralizada acessível via window.AssocConfig
window.AssocConfig = {
    roles: {
        GERENTE: 'Gerente',
        CEO: 'Ceo',
        STAFF: 'Staff',
        VENDEDOR: 'Vendedor',
        AFILIADO: 'Afiliado'
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
        },
        Afiliado: {
            redeemTokens: false,
            purchaseItems: true,
            accessExclusive: false,
            manageSalesFlow: false,
            viewCommissions: true,
            viewSales: true
        }
    },
    // Regras de valor dos tokens (BRL -> tipo de vaga)
    tokenPricingBRL: [
        { amount: 1.00, benefit: '1 vaga XTreino Freitas', key: 'xtreino-tokens' },
        { amount: 3.00, benefit: '1 vaga XTreino Modo Liga', key: 'modo-liga' },
        { amount: 3.50, benefit: '1 vaga Semanal Freitas', key: 'semanal-freitas' },
        { amount: 5.00, benefit: '1 vaga Campeonato Freitas', key: 'camp-freitas' }
    ]
};

// Estado local do usuário autenticado (perfil minimalista)
window.currentUserProfile = null;
window.isLoggedIn = false;

// Mostrar sino imediatamente se sessão anterior estava ativa (antes mesmo do Firebase resolver)
// Movido para DOMContentLoaded para garantir que os elementos existam no DOM

// Verifica se há usuário logado ao carregar a página
document.addEventListener('DOMContentLoaded', function () {
    captureAffiliateRefFromUrl();
    // Mostrar sino imediatamente se havia sessão ativa (antes do Firebase resolver)
    try {
        if (localStorage.getItem('xt_session') === '1') {
            ['notifBellDesktop','notifBellMobile'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hidden');
            });
        }
    } catch(_) {}
    // Aguarda o Firebase estar pronto
    const checkFirebaseReady = () => {
        if (window.firebaseReady) {
            checkAuthState();
            // Tenta sincronizar dados offline quando Firebase estiver pronto
            syncOfflineData();
            // Trata retorno do Mercado Pago e atualiza vagas
            try {
                const sp = new URLSearchParams(location.search);
                const mpStatus = sp.get('mp_status');
                const preferenceId = sp.get('preference-id');
                

                // Só verificar pagamentos se há evidência real de uma tentativa de pagamento
                const hasPaymentEvidence = mpStatus || preferenceId || sessionStorage.getItem('lastExternalRef') || sessionStorage.getItem('lastRegId');

                if (!mpStatus && preferenceId) {
                    checkPaymentStatus(preferenceId);
                } else if (!mpStatus && hasPaymentEvidence) {
                    // Se não tem mp_status mas há evidência de pagamento, tentar usar external_reference salvo
                    const externalRef = sessionStorage.getItem('lastExternalRef');
                    if (externalRef) {
                        checkPaymentStatus(externalRef);
                    }
                } else if (!hasPaymentEvidence) {
                    
                    // Limpar dados antigos de pagamento se existirem
                    sessionStorage.removeItem('lastExternalRef');
                    sessionStorage.removeItem('lastRegId');
                    sessionStorage.removeItem('lastRegInfo');
                    // Não fazer nada mais - usuário está apenas visitando o site
                    return;
                } else if (mpStatus === 'success') {
                    if (mpStatus === 'success') {
                        
                        const regId = sessionStorage.getItem('lastRegId');
                        
                        if (regId) {
                            import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
                                .then(({ doc, setDoc, getDoc, collection }) => {
                                    const ref = doc(collection(window.firebaseDb, 'registrations'), regId);
                                    return setDoc(ref, { status: 'paid' }, { merge: true })
                                        .then(() => getDoc(ref))
                                        .then(snap => { const d = snap.exists() ? snap.data() : {}; return d.groupLink || null; });
                                }).then((groupLink) => {
                                    
                                    openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.', groupLink);
                                }).catch((e) => {
                                    
                                    openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.');
                                });
                        } else {
                            
                            // Fallback: cria registro local para exibir na aba pedidos
                            try {
                                const info = JSON.parse(sessionStorage.getItem('lastRegInfo') || '{}');
                                const orders = JSON.parse(localStorage.getItem('localOrders') || '[]');
                                orders.unshift({ title: info.title || 'Reserva', amount: info.price || 0, status: 'paid', date: new Date().toISOString() });
                                localStorage.setItem('localOrders', JSON.stringify(orders));
                                
                            } catch (e) {  }
                            openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento foi aprovado. Confira seus acessos na área Minha Conta.');
                        }
                    }
                    history.replaceState({}, document.title, location.pathname);
                }
            } catch (_) { }
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
            
        }
    } catch (e) {
        
    }
}

async function checkAuthState() {
    try {
        if (window.firebaseReady && window.firebaseAuth) {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
            onAuthStateChanged(window.firebaseAuth, (user) => {
                
                if (user) {
                    // Usuário está logado
                    window.isLoggedIn = true;
                    // Persistir sessão localmente para mostrar sino instantâneo no próximo carregamento
                    try { localStorage.setItem('xt_session', '1'); } catch(_) {}
                    toggleAccountButtons(true);
                    // Mostrar sininho imediatamente ao logar (conteúdo carrega depois)
                    ['notifBellDesktop','notifBellMobile'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.remove('hidden');
                    });
                    // Carrega perfil do usuário
                    loadUserProfile(user.uid);
                    updateAdminLinkVisibility();
                    setTimeout(() => { try { loadUserNotifications(); } catch(_) {} }, 1500);
                } else {
                    // Usuário não está logado
                    window.isLoggedIn = false;
                    window.currentUserProfile = null;
                    // Unsubscribe profile listener if exists
                    if (window._userProfileUnsubscribe && typeof window._userProfileUnsubscribe === 'function') {
                        try { window._userProfileUnsubscribe(); } catch (_) { }
                        window._userProfileUnsubscribe = null;
                    }
                    toggleAccountButtons(false);
                    updateAdminLinkVisibility();
                    // Limpar flag de sessão e ocultar sininho ao deslogar
                    try { localStorage.removeItem('xt_session'); } catch(_) {}
                    ['notifBellDesktop','notifBellMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
                    updateNotifBadge(0);
                }
            });
        }
    } catch (e) {
        
    }
}

async function loadUserProfile(uid) {
    try {
        // Sempre priorizar Firestore: usar listener onSnapshot para receber atualizações em tempo real
        // Isso garante que créditos de tokens aplicados pelo webhook apareçam imediatamente
        if (window._userProfileUnsubscribe && typeof window._userProfileUnsubscribe === 'function') {
            try { window._userProfileUnsubscribe(); } catch (_) { }
            window._userProfileUnsubscribe = null;
        }
        if (window.firebaseReady) {
            const { doc, collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), uid);
            // onSnapshot will call immediately with current data and on further updates
            window._userProfileUnsubscribe = onSnapshot(ref, (snap) => {
                if (snap.exists && typeof snap.data === 'function') {
                    window.currentUserProfile = snap.data();
                    
                } else {
                    // Criar perfil básico em memória se não existir
                    window.currentUserProfile = {
                        uid: uid,
                        email: window.firebaseAuth.currentUser?.email || '',
                        name: window.firebaseAuth.currentUser?.displayName || 'Usuário',
                        tokens: 0,
                        role: 'Usuario',
                        level: 'Associado Treino'
                    };
                    
                }
                updateHeaderTokenBadges();
            }, (err) => {
                
            });
        } else {
            // Fallback: cria perfil básico se Firebase não estiver pronto (em memória)
            window.currentUserProfile = {
                uid: uid,
                email: window.firebaseAuth.currentUser?.email || '',
                name: window.firebaseAuth.currentUser?.displayName || 'Usuário',
                tokens: 0,
                role: 'Usuario',
                level: 'Associado Treino'
            };
            
        }
    } catch (e) {
        
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
    updateHeaderTokenBadges();
}

// Atualiza o badge de tokens no header (desktop e mobile)
function updateHeaderTokenBadges() {
    try {
        const isLogged = !!(window.isLoggedIn && window.currentUserProfile);
        const bal = isLogged ? Math.round(getTokenBalance()) : 0;
        const d = document.getElementById('tokenBadgeDesktop');
        const m = document.getElementById('tokenBadgeMobile');
        if (d) { d.classList.toggle('hidden', !isLogged); d.textContent = `💎 ${bal}`; }
        if (m) { m.classList.toggle('hidden', !isLogged); m.textContent = `💎 ${bal}`; }

        // Atualizar foto de perfil no header
        updateHeaderProfilePhoto();
    } catch (_) { }
}

// Atualiza a foto de perfil no header
function updateHeaderProfilePhoto() {
    try {
        const isLogged = !!(window.isLoggedIn && window.currentUserProfile);
        const profile = window.currentUserProfile;

        if (!isLogged || !profile) {
            // Esconder seções de conta
            const accountSectionDesktop = document.getElementById('accountSectionDesktop');
            const profileAvatarMobile = document.getElementById('profileAvatarMobile');
            if (accountSectionDesktop) accountSectionDesktop.classList.add('hidden');
            if (profileAvatarMobile) profileAvatarMobile.classList.add('hidden');
            return;
        }

        // Mostrar seções de conta (botão + foto desktop, apenas avatar mobile)
        const accountSectionDesktop = document.getElementById('accountSectionDesktop');
        const profileAvatarMobile = document.getElementById('profileAvatarMobile');
        if (accountSectionDesktop) accountSectionDesktop.classList.remove('hidden');
        if (profileAvatarMobile) profileAvatarMobile.classList.remove('hidden');

        // Garantir que o botão desktop também está visível
        const accountBtnDesktop = document.getElementById('accountBtnDesktop');
        if (accountBtnDesktop) accountBtnDesktop.classList.remove('hidden');

        // Obter nome para iniciais
        const name = profile.name || window.firebaseAuth?.currentUser?.displayName || window.firebaseAuth?.currentUser?.email?.split('@')[0] || 'Usuário';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';

        // Obter foto de perfil
        const photoURL = profile.photoURL || profile.photoUrl || '';

        // Desktop
        const avatarImageDesktop = document.getElementById('profileAvatarImageDesktop');
        const avatarInitialsDesktop = document.getElementById('profileAvatarInitialsDesktop');
        if (avatarImageDesktop && avatarInitialsDesktop) {
            if (photoURL && photoURL.trim() !== '') {
                avatarImageDesktop.src = photoURL;
                avatarImageDesktop.onload = function () {
                    avatarImageDesktop.classList.remove('hidden');
                    avatarInitialsDesktop.classList.add('hidden');
                };
                avatarImageDesktop.onerror = function () {
                    // Se a imagem falhar ao carregar, mostrar iniciais
                    avatarInitialsDesktop.textContent = initials;
                    avatarImageDesktop.classList.add('hidden');
                    avatarInitialsDesktop.classList.remove('hidden');
                };
                // Se já estiver carregada
                if (avatarImageDesktop.complete && avatarImageDesktop.naturalHeight !== 0) {
                    avatarImageDesktop.classList.remove('hidden');
                    avatarInitialsDesktop.classList.add('hidden');
                }
            } else {
                avatarInitialsDesktop.textContent = initials;
                avatarImageDesktop.classList.add('hidden');
                avatarInitialsDesktop.classList.remove('hidden');
            }
        }

        // Mobile
        const avatarImageMobile = document.getElementById('profileAvatarImageMobile');
        const avatarInitialsMobile = document.getElementById('profileAvatarInitialsMobile');
        if (avatarImageMobile && avatarInitialsMobile) {
            if (photoURL && photoURL.trim() !== '') {
                avatarImageMobile.src = photoURL;
                avatarImageMobile.onload = function () {
                    avatarImageMobile.classList.remove('hidden');
                    avatarInitialsMobile.classList.add('hidden');
                };
                avatarImageMobile.onerror = function () {
                    // Se a imagem falhar ao carregar, mostrar iniciais
                    avatarInitialsMobile.textContent = initials;
                    avatarImageMobile.classList.add('hidden');
                    avatarInitialsMobile.classList.remove('hidden');
                };
                // Se já estiver carregada
                if (avatarImageMobile.complete && avatarImageMobile.naturalHeight !== 0) {
                    avatarImageMobile.classList.remove('hidden');
                    avatarInitialsMobile.classList.add('hidden');
                }
            } else {
                avatarInitialsMobile.textContent = initials;
                avatarImageMobile.classList.add('hidden');
                avatarInitialsMobile.classList.remove('hidden');
            }
        }
    } catch (error) {
        
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
// Validar se pode gastar tokens
function canSpendTokens(amountBRL) {
    try {
        // Verificar se usuário está autenticado e perfil carregado
        if (!window.firebaseAuth?.currentUser) return false;
        if (!window.currentUserProfile) return false;

        const balance = Number(window.currentUserProfile.tokens || 0);
        const amount = Number(amountBRL || 0);

        if (isNaN(amount) || amount <= 0) return false;
        if (isNaN(balance) || balance < 0) return false;

        const canSpend = balance >= amount;
        
        return canSpend;
    } catch (error) {
        
        return false;
    }
}

// Debitar tokens localmente (retorna novo saldo)
function spendTokensSync(amountBRL) {
    const amt = Number(amountBRL || 0);
    if (isNaN(amt) || amt <= 0) throw new Error('TOKEN_005');
    if (!window.currentUserProfile) throw new Error('AUTH_001');

    const currentBalance = Number(window.currentUserProfile.tokens || 0);
    if (currentBalance < amt) throw new Error('TOKEN_001');

    const newBalance = Number((currentBalance - amt).toFixed(2));
    if (newBalance < 0) throw new Error('TOKEN_005');

    window.currentUserProfile.tokens = newBalance;
    try { localStorage.setItem('assoc_profile', JSON.stringify(window.currentUserProfile)); } catch (_) { }
    
    return newBalance;
}


// Debitar tokens e persistir no Firestore (Versão Segura com Rollback)
async function spendTokens(amountBRL) {
    const amt = Number(amountBRL || 0);
    // Guarda o saldo original
    const originalBalance = Number(window.currentUserProfile?.tokens || 0);

    try {
        
        
        if (isNaN(amt) || amt <= 0) { showErrorToast('Valor inválido', 'TOKEN_005'); return false; }
        if (!window.firebaseAuth?.currentUser) { showErrorToast('Faça login novamente', 'AUTH_001'); return false; }
        
        // Verificação visual imediata
        if (!canSpendTokens(amt)) { showErrorToast('Saldo insuficiente', 'TOKEN_001'); return false; }

        // 1. Debita Localmente (Visual Rápido)
        const newBalance = spendTokensSync(amt);
        updateHeaderTokenBadges(); 

        // 2. Persiste no Banco
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const userRef = doc(window.firebaseDb, 'users', window.firebaseAuth.currentUser.uid);
        
        await updateDoc(userRef, { tokens: newBalance });
        
        return true;

    } catch (error) {
        
        
        // --- ROLLBACK (Devolve o token visualmente) ---
        
        if (window.currentUserProfile) {
            window.currentUserProfile.tokens = originalBalance;
            try { localStorage.setItem('assoc_profile', JSON.stringify(window.currentUserProfile)); } catch(_) {}
            updateHeaderTokenBadges(); 
        }
        // ----------------------------------------------

        alert('Erro de conexão ao usar seus tokens. Seu saldo foi restaurado. Por favor, tente novamente.');
        return false;
    }
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
                
            }

            // Dar token inicial apenas se o usuário realmente não tem tokens (não é 0, mas undefined/null)
            if (window.currentUserProfile.tokens === undefined || window.currentUserProfile.tokens === null) {
                await setDoc(userRef, { tokens: 1 }, { merge: true });
                window.currentUserProfile.tokens = 1;
                
            }

            // Atualizar localStorage também
            localStorage.setItem('assoc_profile', JSON.stringify(window.currentUserProfile));

            

            // Atualizar interface
            renderClientArea();
            updateHeaderTokenBadges();
        }
    } catch (error) {
        
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
        if (window.firebaseReady && user?.uid) {
            const { doc, getDoc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), user.uid);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, baseProfile);
                window.currentUserProfile = baseProfile;
                
            } else {
                const data = snap.data();
                window.currentUserProfile = { ...baseProfile, ...data };
                
            }
        } else {
            // Sem Firebase: usa somente base em memória (não persiste em localStorage)
            window.currentUserProfile = baseProfile;
            
        }

        // Sincronização automática removida para evitar reset do saldo
        // if (window.firebaseReady && !isLocal && !isNetlify && user?.uid) {
        //     await syncUserTokens();
        // }
    } catch (err) {
        // Tratamento de erro com código padronizado
        if (err.message && err.message.includes('permission')) {
            logError('AUTH_005', 'AUTH_005');
        } else if (err.message && err.message.includes('network') || err.message && err.message.includes('fetch')) {
            logError('SYS_003', 'SYS_003');
        } else {
            logError(err, 'AUTH_005');
        }
        
        window.currentUserProfile = baseProfile;
    }
}

async function persistUserProfile(profile) {
    try {
        

        // Garantir UID presente
        if (!profile.uid && window.firebaseAuth && window.firebaseAuth.currentUser) {
            profile.uid = window.firebaseAuth.currentUser.uid;
        }
        // Normalizar tokens
        if (profile.tokens === undefined || profile.tokens === null) {
            profile.tokens = 0;
        }

        if (window.firebaseReady && profile?.uid) {
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'users'), profile.uid);
            await setDoc(ref, profile, { merge: true });
            
        } else {
            
        }
    } catch (error) {
        // Tratamento de erro com código padronizado
        if (error.message && error.message.includes('permission')) {
            logError('SYS_004', 'SYS_004');
        } else {
            logError(error, 'SYS_005');
        }
        
    }
}

// Client Area Functions
function openClientArea() {
    document.getElementById('clientAreaModal').classList.remove('hidden');
    try { renderClientArea(); } catch (_) { }
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
}

function closeClientArea() { /* removed - client area não existe mais */ }

// Renderiza informações dinâmicas do cliente (nome, tokens, etc.)
function renderClientArea() {
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
    if (assocBtn) {
        const hasTokens = p && p.tokens && p.tokens > 0;
        assocBtn.disabled = !hasTokens;
        assocBtn.classList.toggle('opacity-60', !hasTokens);
        assocBtn.textContent = hasTokens ? 'USAR 1 TOKEN' : 'COMPRAR TOKENS';

        // Adicionar evento de clique se não existir
        if (!assocBtn.hasAttribute('data-listener-added')) {
            assocBtn.addEventListener('click', function () {
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
        try { renderClientArea(); } catch (_) { }
    } else if (tabName === 'profile') {
        try { loadProfileData(); } catch (_) { }
    } else if (tabName === 'orders') {
        try { loadOrders(); } catch (_) { }
    } else if (tabName === 'products') {
        try { loadProducts(); } catch (_) { }
    }
}

function downloadFile(fileType) {
    // Direciona o usuário para a área de cliente, onde os downloads reais
    // consultam os pedidos e liberam arquivos via Netlify Function.
    try {
        const url = new URL('client.html', window.location.origin);
        url.searchParams.set('tab', 'products');
        window.location.href = url.toString();
    } catch (_) {
        window.location.href = 'client.html?tab=products';
    }
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
    if (!canSpendTokens(t.cost)) {
        showErrorToast(`Saldo insuficiente. Você precisa de ${t.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em tokens.`, 'Saldo Insuficiente');
        return;
    }
    if (confirm(`Confirmar uso de ${t.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em tokens para ${t.label}?`)) {
        spendTokens(t.cost);
        renderClientArea();
        showSuccessToast('Token resgatado! Nossa equipe entrará em contato para agendar.', 'Sucesso');
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
                showSuccessToast('Mensagem enviada com sucesso!', 'Sucesso');
                form.reset();
            } catch (err) {
                
                showErrorToast('Não foi possível enviar agora. Tente novamente mais tarde.', 'Erro');
            }
        })();
    } else {
        alert('Mensagem enviada com sucesso!\n\n(Offline: configure o Firebase para salvar no banco)');
        form.reset();
    }
}

// Purchase modal functions
let currentProduct = null;
let appliedCoupon = null;
let appliedScheduleCoupon = null;
let originalPrice = 0;
let scheduleOriginalTotal = 0;

const products = {
    // 'passe-booyah': { name: 'Passe de Elite', price: 'R$ 11,00', description: 'Passe de Elite para desbloqueio de recompensas, trajes e itens no jogo' },
    // 'aim-training': { name: 'XTreino - Aim Training', price: 'R$ 49,90', description: 'Sessão de 2 horas de treinamento' },
    // 'estrategia': { name: 'XTreino - Estratégia', price: 'R$ 79,90', description: 'Sessão de 3 horas de treinamento' },
    // 'mentalidade': { name: 'XTreino - Mentalidade', price: 'R$ 39,90', description: 'Sessão de 1.5 horas de treinamento' },
    // 'camisa': { name: 'Camisa Oficial Org Freitas', price: 'R$ 89,90', description: 'Camisa de manga curta com design exclusivo da Org Freitas' },
    // 'planilhas': { name: 'Planilha de Análise de Times', price: 'R$ 19,00', description: 'Planilha para Coach e Analista com análise detalhada de jogadores' },
    // 'imagens': { name: 'Imagens Aéreas', price: 'R$ 2,00', description: 'Mapas do Free Fire com visão aérea para estudo de calls e estratégias' },
    // 'sensibilidades': { name: 'Sensibilidade no Free Fire', price: 'R$ 8,00', description: 'Passo a passo para configurar sensibilidade Android, PC e iOS' },
    // Eventos e Reservas (cupom ADMFALL = 5% off)
    'evt-xtreino-tokens': { name: 'XTreino Freitas', price: 'R$ 1,00', description: '1 token — 10 horários diários (14h-23h) — Misto | Squad | 2 quedas' },
    'evt-modo-liga': { name: 'XTreino Modo Liga', price: 'R$ 3,00', description: '4 horários (14h, 15h, 17h, 18h) — 15 slots — Transmissão ao vivo' },
    'evt-camp-freitas': { name: 'Campeonato Freitas Season¹', price: 'R$ 8,00', description: 'Horários: 19h - 20h - 21h - 22h - 23h — Modalidade: Misto | Squad | 2 quedas por fase — Premiação R$ 4.000,00 + Troféu. Funcionamento: Segunda a Sexta-feira. Promoção: R$ 8,00 (antes R$ 10,00).' },
    'evt-semanal-freitas': { name: 'Semanal Freitas', price: 'R$ 3,50', description: '3 fases (20h, 21h, 22h) — Premiação R$ 65,00 — Termina no mesmo dia' }
};

const imgMap = {
    // 'sensibilidades': { image: 'assets/images/products/SENSIBILIDADE ORG FREITAS FORMATO YOUTUBE.png' },
    // 'imagens': { image: 'assets/images/products/IMAGENS AÉREAS ORG FREITAS FORMATO YOUTUBE.png' },
    // 'planilhas': { image: 'assets/images/products/PLANILHAS ORG FREITAS FORMATO YOUTUBE.png' },
    // 'passe-booyah': { image: 'assets/images/products/PASSE ORG FREITAS FEED.png' },
    // 'camisa': { image: 'assets/images/products/MANTO ORG FREITAS FORMATO YOUTUBE.png' },

    // imagens dos eventos (JPGs no projeto)
    'evt-xtreino-gratuito': { image: 'assets/images/events/XTREINO TOKENS.jpeg' },
    'evt-modo-liga': { image: 'assets/images/events/Modo Liga.jpeg' },
    'evt-camp-freitas': { image: 'assets/images/events/CAMP.jpeg' },
    'evt-semanal-freitas': { image: 'assets/images/events/SEMANAL FREITAS.jpg' }
};

function openPurchaseModal(productId) {
    showProductModal(productId);
}

function showProductModal(productId) {
    currentProduct = productId;
    const product = products[productId];
    if (!product) return;

    // Adicionar classe para esconder botões flutuantes no mobile
    document.body.classList.add('modal-open');
    const detailsMap = {
        'sensibilidades': {
            desc: '💚 SENSIBILIDADE NO FREE FIRE\n\n📱 ITEM: Sensibilidade ANDROID | PC | IOS\n\n📋 SOBRE O PRODUTO:\nPasso a passo de como configurar e ajustar a sensibilidade no Free Fire e no próprio dispositivo.\n\n✅ BENEFÍCIOS OFERECIDOS:\n• Precisão\n• Estabilidade\n• Cursor secreto\n\n🔧 DETALHES:\nAtualizações que se adaptam a cada temporada e vídeo explicativo de como usar.',
            options: null
        },
        'imagens': {
            desc: '💚 IMAGENS AÉREAS\n\n🗺️ ITEM: Mapas do Free Fire com visão aérea\n\n📋 SOBRE O PRODUTO:\nImagens aéreas dos seguintes Mapas: Bermuda | Purgatório | Kalahari | Nova Terra | Alpine. Obtenha a visão aérea dos mais diversos locais do jogo em seus respectivos Mapas.\n\n✅ BENEFÍCIOS OFERECIDOS:\n• Visão privilegiada para estudo de calls\n• Formação de rush\n• Marcação e rotação\n• Conhecimento do local\n• Montagem de estratégias\n\n🔧 DETALHES:\nOferecemos até 5 Mapas para estudos, cada um com no mínimo 20 imagens aéreas.',
            options: ['Bermuda', 'Purgatório', 'Kalahari', 'Nova Terra', 'Alpine']
        },
        'planilhas': {
            desc: '💚 PLANILHA DE ANÁLISE DE TIMES PARA COACH E ANALISTA\n\n📊 ITEM: Planilha para Coach e Analista\n\n📋 SOBRE O PRODUTO:\nPlanilha desenvolvida para estudo e aprimoramento de Times, com detalhes de cada player em suas respectivas partidas, bem como os mapas e Eventos jogados diariamente.\n\n✅ BENEFÍCIOS OFERECIDOS:\n• Cálculo de cada partida de até 8 integrantes\n• Pontuação total, abates, taxa de abates\n• Tempo de sobrevivência, média de sobrevivência\n• Assistências, danos e quedas jogadas no dia\n\n🔧 DETALHES:\nObserve o desempenho de até 4 titulares e + 4 reservas em cada partida. Destaque de top 3 e gráficos.',
            options: null
        },
        'passe-booyah': {
            desc: '💚 PASSE DE ELITE NO FREE FIRE\n\n🎮 ITEM: Passe de Elite\n\n📋 SOBRE O PRODUTO:\nPasse de Elite para desbloqueio de recompensas, trajes e itens no jogo.\n\n✅ BENEFÍCIOS OFERECIDOS:\n• Esteja à frente obtendo o Passe de Elite atual\n• Compra rápida e segura através do ID do player\n\n🔧 DETALHES:\nItem no seu correio em até 24h, oferecemos suporte.',
            options: null
        },
        'camisa': {
            desc: '💚 CAMISA OFICIAL ORG FREITAS\n\n👕 ITEM: Camisa Oficial Freitas\n\n📋 SOBRE O PRODUTO:\nCamisa de manga curta para homens e mulheres que veste super bem no corpo, com qualidade e conforto. A Camisa traz o Design exclusivo da Org Freitas, bem como sua logo.\n\n✅ BENEFÍCIOS OFERECIDOS:\n• Adicionamos o seu nome na Camisa\n• Tecido leve que proporciona sensação de frescor\n• Bom caimento e secagem rápida\n\n🔧 DETALHES:\nEntrega para todo Brasil. Temos todos os tamanhos.',
            options: ['P', 'M', 'G', 'GG']
        }
    };

    const details = detailsMap[productId] || { desc: product.description, options: null };
    document.getElementById('purchaseTitle').textContent = product.name;
    document.getElementById('purchaseDescription').textContent = details.desc;
    document.getElementById('purchasePrice').textContent = product.price;
 

    const imgEl = document.getElementById('purchaseImage');
    if (imgEl) imgEl.src = imgMap[productId].image || '';   

    // opções dinâmicas
    const optContainer = document.getElementById('purchaseOptions');
    optContainer.innerHTML = '';
    // Opções para camisa (campos adicionais)
    if (productId === 'camisa' && details.options) {
        // Tamanho
        const sizeLabel = document.createElement('label');
        sizeLabel.className = 'block text-sm font-medium mb-2';
        sizeLabel.textContent = 'Tamanho';
        const sizeSelect = document.createElement('select');
        sizeSelect.id = 'shirtSize';
        sizeSelect.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:border-blue-matte focus:outline-none';
        details.options.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; sizeSelect.appendChild(op); });
        optContainer.appendChild(sizeLabel);
        optContainer.appendChild(sizeSelect);
        // Nome (opcional)
        const nameLabel = document.createElement('label'); nameLabel.className = 'block text-sm font-medium mb-2 mt-4'; nameLabel.textContent = 'Nome (camisa) — opcional';
        const nameInput = document.createElement('input'); nameInput.id = 'shirtName'; nameInput.type = 'text'; nameInput.placeholder = 'Ex.: FREITAS'; nameInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none';
        optContainer.appendChild(nameLabel); optContainer.appendChild(nameInput);

        // Quantidade
        const qtyLabel = document.createElement('label'); qtyLabel.className = 'block text-sm font-medium mb-2 mt-4'; qtyLabel.textContent = 'Quantidade';
        const qtyInput = document.createElement('input'); qtyInput.id = 'shirtQty'; qtyInput.type = 'number'; qtyInput.min = '1'; qtyInput.value = '1'; qtyInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black focus:border-blue-matte focus:outline-none';
        optContainer.appendChild(qtyLabel); optContainer.appendChild(qtyInput);

        // Endereço de Entrega — campos separados + CPF
        const addrGrid = document.createElement('div'); addrGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-4';
        const ruaDiv = document.createElement('div'); const ruaLabel = document.createElement('label'); ruaLabel.className = 'block text-sm font-medium mb-2'; ruaLabel.textContent = 'Rua'; const ruaInput = document.createElement('input'); ruaInput.id = 'addrRua'; ruaInput.type = 'text'; ruaInput.placeholder = 'Rua Exemplo'; ruaInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none'; ruaDiv.appendChild(ruaLabel); ruaDiv.appendChild(ruaInput);
        const numDiv = document.createElement('div'); const numLabel = document.createElement('label'); numLabel.className = 'block text-sm font-medium mb-2'; numLabel.textContent = 'Número'; const numInput = document.createElement('input'); numInput.id = 'addrNumero'; numInput.type = 'text'; numInput.placeholder = '123'; numInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none'; numDiv.appendChild(numLabel); numDiv.appendChild(numInput);
        addrGrid.appendChild(ruaDiv); addrGrid.appendChild(numDiv);
        optContainer.appendChild(addrGrid);

        const refLabel = document.createElement('label'); refLabel.className = 'block text-sm font-medium mb-2 mt-3'; refLabel.textContent = 'Ponto de referência (opcional)';
        const refInput = document.createElement('input'); refInput.id = 'addrReferencia'; refInput.type = 'text'; refInput.placeholder = 'Próximo à praça...'; refInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none';
        optContainer.appendChild(refLabel); optContainer.appendChild(refInput);

        const cpfLabel = document.createElement('label'); cpfLabel.className = 'block text-sm font-medium mb-2 mt-3'; cpfLabel.textContent = 'CPF';
        const cpfInput = document.createElement('input'); cpfInput.id = 'customerCPF'; cpfInput.type = 'text'; cpfInput.placeholder = '000.000.000-00'; cpfInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none';
        optContainer.appendChild(cpfLabel); optContainer.appendChild(cpfInput);

        // Observações
        const obsLabel = document.createElement('label'); obsLabel.className = 'block text-sm font-medium mb-2 mt-4'; obsLabel.textContent = 'Observações (opcional)';
        const obsInput = document.createElement('textarea'); obsInput.id = 'shirtNotes'; obsInput.rows = 2; obsInput.placeholder = 'Ex.: Ajustar modelagem, presente, etc.'; obsInput.className = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none';
        optContainer.appendChild(obsLabel); optContainer.appendChild(obsInput);
    }

    // Opções para imagens: campo texto para mapas + quantidade
    if (productId === 'imagens') {
        // Seleção múltipla de mapas
        const hint = document.createElement('div'); hint.className = 'text-sm text-gray-600 mb-2'; hint.textContent = 'Selecione um ou mais mapas ou digite os nomes.';
        optContainer.appendChild(hint);
        const maps = ['Bermuda', 'Purgatório', 'Kalahari', 'Nova Terra', 'Alpine'];
        const grid = document.createElement('div'); grid.className = 'grid grid-cols-2 gap-2 mb-3';
        maps.forEach(m => {
            const label = document.createElement('label'); label.className = 'flex items-center gap-2';
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.name = 'mapOption'; cb.value = m;
            const span = document.createElement('span'); span.className = 'text-sm'; span.textContent = m;
            label.appendChild(cb); label.appendChild(span); grid.appendChild(label);
        });
        optContainer.appendChild(grid);

        const mapsLabel = document.createElement('label');
        mapsLabel.className = 'block text-sm font-medium mb-2';
        mapsLabel.textContent = 'Ou digite os mapas (separe por vírgula)';
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

    // Campo de cupom apenas para eventos (ids iniciando com evt-), exceto Xtreino Tokens
    
    if (productId.startsWith('evt-') && productId !== 'evt-xtreino-gratuito') {
        
        const cupomWrap = document.createElement('div');
        cupomWrap.className = 'mt-3';
        cupomWrap.innerHTML = '<label class="block text-sm font-medium mb-2">Cupom de desconto</label><input id="couponCode" type="text" placeholder="ADMFALL" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder-gray-400 focus:border-blue-matte focus:outline-none">\n<p class="text-xs text-gray-500 mt-1">Use <strong>ADMFALL</strong> para 5% de desconto.</p>';
        optContainer.appendChild(cupomWrap);
    }

    // Preço inicial e atualização dinâmica
    updatePurchaseTotal(productId);
    const qtyEl = document.getElementById('mapsQty');
    if (qtyEl) qtyEl.addEventListener('input', () => updatePurchaseTotal(productId));
    const mapsNamesEl = document.getElementById('mapsNames');
    if (mapsNamesEl) mapsNamesEl.addEventListener('input', () => syncMapsQtyWithNames());
    const couponEl = document.getElementById('couponCode');
    if (couponEl) couponEl.addEventListener('input', () => updatePurchaseTotal(productId));

    document.getElementById('purchaseModal').classList.remove('hidden');
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
}

function updatePurchaseTotal(productId) {
    let total = 0;
    if (productId === 'imagens') {
        const qty = Math.max(1, Math.min(5, Number(document.getElementById('mapsQty')?.value || 1)));
        const pricing = { 1: 2, 2: 4, 3: 5, 4: 6, 5: 7 };
        total = pricing[qty] || 2;
    } else {
        const product = products[productId];
        total = Number((product.price || '0').replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
    }

    // Armazenar preço original
    originalPrice = total;

    // Atualizar subtotal
    const subtotalEl = document.getElementById('purchaseSubtotal');
    if (subtotalEl) {
        subtotalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Se há cupom aplicado, recalcular com desconto
    if (appliedCoupon) {
        updatePriceWithCoupon();
    } else {
        // Sem cupom, mostrar preço original
        const priceEl = document.getElementById('purchasePrice');
        if (priceEl) {
            priceEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        // Esconder linha de desconto
        const discountRowEl = document.getElementById('discountRow');
        if (discountRowEl) {
            discountRowEl.classList.add('hidden');
        }
    }
}

function syncMapsQtyWithNames() {
    const names = (document.getElementById('mapsNames')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const qtyEl = document.getElementById('mapsQty');
    if (!qtyEl) return;
    if (names.length) qtyEl.value = Math.min(5, Math.max(1, names.length));
    updatePurchaseTotal('imagens');
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').classList.add('hidden');
    currentProduct = null;
    appliedCoupon = null;
    originalPrice = 0;

    // Remover classe para mostrar botões flutuantes novamente
    document.body.classList.remove('modal-open');

    // Limpar campos de cupom
    const couponInput = document.getElementById('couponCodeInput');
    const couponMessage = document.getElementById('couponMessage');
    if (couponInput) {
        couponInput.value = '';
        couponInput.disabled = false;
    }
    if (couponMessage) {
        couponMessage.classList.add('hidden');
        couponMessage.textContent = '';
    }

    // Remover botão de remover cupom
    const removeBtn = document.getElementById('removeCouponBtn');
    if (removeBtn) {
        removeBtn.remove();
    }
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}

// Pagar produto atual com Tokens
async function payCurrentProductWithTokens() {
    try {
        if (!window.isLoggedIn) {
            closePurchaseModal();
            if (typeof openLoginModal === 'function') openLoginModal();
            alert('Faça login para pagar com tokens.');
            return;
        }
        const productId = currentProduct;
        const product = products[productId];
        if (!product) { alert('Produto inválido'); return; }

        // Calcular preço final (recalcular para imagens ao invés de confiar na UI)
        let total = 0;
        if (productId === 'imagens') {
            const qty = Math.max(1, Math.min(5, Number(document.getElementById('mapsQty')?.value || 1)));
            const pricing = { 1: 2, 2: 4, 3: 5, 4: 6, 5: 7 };
            total = pricing[qty] || 2;
            
        } else {
            // Para outros produtos, ler do display
            const totalText = document.getElementById('purchasePrice')?.textContent || '0';
            total = Number(totalText.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
        }
        // saldo suficiente?
        if (!canSpendTokens(total)) {
            alert(`Saldo insuficiente. Você precisa de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em tokens.`);
            return;
        }
        // Coletar opções
        let productOptions = {};
        if (productId === 'imagens') {
            const selected = Array.from(document.querySelectorAll('input[name="mapOption"]:checked')).map(i => i.value);
            const names = (document.getElementById('mapsNames')?.value || '')
                .split(',').map(s => s.trim()).filter(Boolean);
            productOptions.maps = selected.length ? selected : names;
            productOptions.quantity = productOptions.maps.length || 1;
        }
        if (productId === 'passe-booyah') {
            productOptions.playerId = document.getElementById('playerId')?.value || '';
        }
        if (productId === 'camisa') {
            const size = document.getElementById('shirtSize')?.value || 'M';
            const nameOnShirt = document.getElementById('shirtName')?.value || '';
            const nome = document.getElementById('addrNome')?.value || '';
            const cpf = document.getElementById('customerCPF')?.value || '';
            const cep = document.getElementById('addrCEP')?.value || '';
            const rua = document.getElementById('addrRua')?.value || '';
            const numero = document.getElementById('addrNumero')?.value || '';
            const complemento = document.getElementById('addrComplemento')?.value || '';
            const bairro = document.getElementById('addrBairro')?.value || '';
            const cidade = document.getElementById('addrCidade')?.value || '';
            const estado = document.getElementById('addrEstado')?.value || '';
            // valida CPF básico (mesmo formato do checkout normal)
            const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
            if (!cpf || !cpfRegex.test(cpf)) { alert('CPF inválido. Use o formato 000.000.000-00.'); return; }
            productOptions.size = size;
            productOptions.name = nameOnShirt;
            productOptions.delivery = { nome, cpf, cep, address: rua, number: numero, complement: complemento, district: bairro, city: cidade, state: estado };
        }
        // Debitar tokens
        const ok = await spendTokens(total);
        if (!ok) { alert('Não foi possível debitar os tokens.'); return; }
        // Criar pedido pago
        const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const orderData = {
            title: product.name,
            description: product.description,
            item: product.name,
            amount: total,
            total: total,
            quantity: 1,
            currency: 'BRL',
            status: 'paid',
            paidWithTokens: true,
            tokensUsed: total,
            customer: window.firebaseAuth?.currentUser?.email || '',
            customerName: window.currentUserProfile?.name || '',
            buyerEmail: window.firebaseAuth?.currentUser?.email || '',
            userId: window.firebaseAuth?.currentUser?.uid,
            uid: window.firebaseAuth?.currentUser?.uid,
            productId: productId,
            productOptions: productOptions,
            shippingStatus: (productId === 'camisa') ? 'pending' : undefined,
            createdAt: new Date(),
            timestamp: Date.now(),
            type: 'digital_product'
        };
        const docRef = await addDoc(collection(window.firebaseDb, 'orders'), orderData);
        closePurchaseModal();
        
        // Mostrar sucesso e redirecionar
        if (typeof openPaymentConfirmModal === 'function') {
            openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento em tokens foi aprovado. Confira em Minha Conta.');
        } else {
            showSuccessToast('Seu pagamento em tokens foi aprovado', 'Sucesso');
        }
        
        // Redirecionar para client.html na aba de pedidos após 4.5 segundos (tempo para sincronizar ambas as collections)
        setTimeout(() => {
            try {
                window.location.href = 'client.html?tab=orders';
            } catch (_) { }
        }, 4500);
        
    } catch (e) {
        
        showErrorToast('Erro ao pagar com tokens. Por favor, tente novamente.', 'Erro');
    }
}

// Ação do botão "Pagar com Tokens" do agendamento
function payScheduleWithTokens() {
    if (window._scheduleSubmitting) return;
    const tokenBtn = document.getElementById('schedPayTokens');
    if (tokenBtn && tokenBtn.disabled) return;
    submitSchedule({ preventDefault: () => { } }, true);
}

// Função para aplicar cupom
async function applyCoupon() {
    const couponCode = document.getElementById('couponCodeInput')?.value?.trim().toUpperCase();
    const couponMessage = document.getElementById('couponMessage');

    if (!couponCode) {
        showCouponMessage('Digite um código de cupom', 'error');
        return;
    }

    if (!currentProduct) {
        showCouponMessage('Erro: produto não selecionado', 'error');
        return;
    }

    // Verificar se já existe um cupom aplicado
    if (appliedCoupon) {
        // Se é o mesmo cupom, não fazer nada
        if (appliedCoupon.code === couponCode) {
            showCouponMessage('Este cupom já está aplicado.', 'error');
            return;
        }
        // Se é um cupom diferente, substituir o anterior
        
    }

    try {
        

        // Importar Firebase
        const { collection, getDocs, query, where, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        // Buscar cupom no Firestore
        const couponsRef = collection(window.firebaseDb, 'coupons');
        const q = query(couponsRef, where('code', '==', couponCode), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
                showErrorToast('Cupom não encontrado', 'COUPON_001');
            return;
        }

        const couponDoc = snapshot.docs[0];
        const coupon = { id: couponDoc.id, ...couponDoc.data() };

        // Validar cupom
        const validation = validateCoupon(coupon);
        if (!validation.valid) {
            const errorCode = validation.code || 'COUPON_006';
            showErrorToast(validation.message, errorCode);
            showCouponMessage(validation.message, 'error');
            return;
        }

        // Garantir que originalPrice está atualizado antes de aplicar o cupom
        // Recalcular o preço original para evitar desconto sobre desconto
        if (currentProduct) {
            // Recalcular o preço base sem desconto
            updatePurchaseTotal(currentProduct);
        }

        // Aplicar cupom
        appliedCoupon = coupon;
        updatePriceWithCoupon();
        showCouponMessage(`Cupom "${coupon.code}" aplicado! Desconto: ${getDiscountText(coupon)}`, 'success');

        // Limpar e desabilitar o campo de input após aplicar com sucesso
        const couponInput = document.getElementById('couponCodeInput');
        if (couponInput) {
            couponInput.value = coupon.code;
            couponInput.disabled = true;
        }

        // Mostrar botão para remover cupom
        updateCouponUI();

        

    } catch (error) {
        
        showErrorToast('Erro ao validar cupom. Tente novamente.', 'COUPON_006');
        showCouponMessage('Erro ao validar cupom. Tente novamente.', 'error');
    }
}

// Validar cupom
function validateCoupon(coupon) {
    // Verificar se está ativo
    if (!coupon.isActive) {
        return { valid: false, message: 'Cupom inativo', code: 'COUPON_003' };
    }

    // Verificar data de expiração
    if (coupon.expirationDate) {
        const expirationDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
        if (expirationDate < new Date()) {
            return { valid: false, message: 'Cupom expirado', code: 'COUPON_002' };
        }
    }

    // Verificar tipo de uso do cupom
    const currentContext = getCurrentPurchaseContext();
    if (!isCouponValidForContext(coupon, currentContext)) {
        return { valid: false, message: 'Cupom não válido para este tipo de compra', code: 'COUPON_004' };
    }

    return { valid: true };
}

// Determinar contexto atual da compra
function getCurrentPurchaseContext() {
    // Verificar se estamos no modal de compra de produtos da loja
    const purchaseModal = document.getElementById('purchaseModal');
    if (purchaseModal && !purchaseModal.classList.contains('hidden')) {
        return 'store';
    }

    // Verificar se estamos no modal de agendamento de eventos
    const scheduleModal = document.getElementById('scheduleModal');
    if (scheduleModal && !scheduleModal.classList.contains('hidden')) {
        return 'events';
    }

    return 'unknown';
}

// Verificar se cupom é válido para o contexto atual
function isCouponValidForContext(coupon, context) {
    // Se o cupom pode ser usado em ambos os contextos
    if (coupon.usageType === 'both') return true;

    // Se o cupom é específico para eventos e estamos em contexto de eventos
    if (coupon.usageType === 'events' && context === 'events') return true;

    // Se o cupom é específico para loja e estamos em contexto de loja
    if (coupon.usageType === 'store' && context === 'store') return true;

    return false;
}

// Atualizar preço com cupom aplicado
function updatePriceWithCoupon() {
    if (!appliedCoupon) return;

    // Garantir que originalPrice está atualizado e representa o preço SEM desconto
    // Se originalPrice for 0 ou inválido, recalcular
    if (!originalPrice || originalPrice <= 0) {
        if (currentProduct) {
            updatePurchaseTotal(currentProduct);
        }
        // Se ainda assim não tiver preço, não pode aplicar desconto
        if (!originalPrice || originalPrice <= 0) {
            
            return;
        }
    }

    const subtotalEl = document.getElementById('purchaseSubtotal');
    const discountRowEl = document.getElementById('discountRow');
    const discountAmountEl = document.getElementById('discountAmount');
    const totalEl = document.getElementById('purchasePrice');

    if (!subtotalEl || !discountRowEl || !discountAmountEl || !totalEl) return;

    // Calcular desconto baseado SEMPRE no originalPrice (nunca no preço já descontado)
    let discountAmount = 0;
    if (appliedCoupon.discountType === 'percentage') {
        discountAmount = originalPrice * (appliedCoupon.discountValue / 100);
    } else {
        discountAmount = appliedCoupon.discountValue;
    }

    // Garantir que o desconto não seja maior que o preço
    discountAmount = Math.min(discountAmount, originalPrice);

    // Calcular preço final (sempre do originalPrice)
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    // Atualizar elementos
    subtotalEl.textContent = originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    discountAmountEl.textContent = `-${discountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    totalEl.textContent = finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Mostrar linha de desconto
    discountRowEl.classList.remove('hidden');
}

// Mostrar mensagem de cupom
function showCouponMessage(message, type) {
    const couponMessage = document.getElementById('couponMessage');
    if (!couponMessage) return;

    couponMessage.textContent = message;
    couponMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');

    if (type === 'success') {
        couponMessage.classList.add('text-green-600');
    } else if (type === 'error') {
        couponMessage.classList.add('text-red-600');
    }
}

// Remover cupom aplicado
function removeCoupon() {
    if (!appliedCoupon) return;

    const couponCode = appliedCoupon.code;
    appliedCoupon = null;

    // Recalcular preço sem desconto
    if (currentProduct) {
        updatePurchaseTotal(currentProduct);
    }

    // Limpar campo de input e reabilitar
    const couponInput = document.getElementById('couponCodeInput');
    if (couponInput) {
        couponInput.value = '';
        couponInput.disabled = false;
        couponInput.focus();
    }

    // Atualizar UI
    updateCouponUI();

    // Mostrar mensagem
    showCouponMessage(`Cupom "${couponCode}" removido`, 'success');

    
}

// Atualizar UI do cupom (mostrar/ocultar botão de remover)
function updateCouponUI() {
    const couponInput = document.getElementById('couponCodeInput');
    const couponContainer = couponInput?.parentElement;

    if (!couponContainer) return;

    // Verificar se já existe botão de remover
    let removeBtn = document.getElementById('removeCouponBtn');

    if (appliedCoupon) {
        // Se não existe, criar o botão
        if (!removeBtn) {
            removeBtn = document.createElement('button');
            removeBtn.id = 'removeCouponBtn';
            removeBtn.type = 'button';
            removeBtn.onclick = removeCoupon;
            removeBtn.className = 'px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors';
            removeBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Remover';
            // Adicionar na mesma div flex que contém o botão Aplicar
            const applyBtn = couponContainer.querySelector('button[onclick="applyCoupon()"]');
            if (applyBtn && applyBtn.parentElement) {
                applyBtn.parentElement.appendChild(removeBtn);
            } else {
                couponContainer.appendChild(removeBtn);
            }
        }
        removeBtn.style.display = '';
    } else {
        // Ocultar botão se não há cupom
        if (removeBtn) {
            removeBtn.style.display = 'none';
        }
    }
}

// Remover cupom aplicado
function removeCoupon() {
    if (!appliedCoupon) return;

    const couponCode = appliedCoupon.code;
    appliedCoupon = null;

    // Recalcular preço sem desconto
    if (currentProduct) {
        updatePurchaseTotal(currentProduct);
    }

    // Limpar campo de input e reabilitar
    const couponInput = document.getElementById('couponCodeInput');
    if (couponInput) {
        couponInput.value = '';
        couponInput.disabled = false;
        couponInput.focus();
    }

    // Atualizar UI
    updateCouponUI();

    // Mostrar mensagem
    showCouponMessage(`Cupom "${couponCode}" removido`, 'success');

    
}

// Atualizar UI do cupom (mostrar/ocultar botão de remover)
function updateCouponUI() {
    const couponInput = document.getElementById('couponCodeInput');
    const couponContainer = couponInput?.parentElement;

    if (!couponContainer) return;

    // Verificar se já existe botão de remover
    let removeBtn = document.getElementById('removeCouponBtn');

    if (appliedCoupon) {
        // Se não existe, criar o botão
        if (!removeBtn) {
            removeBtn = document.createElement('button');
            removeBtn.id = 'removeCouponBtn';
            removeBtn.type = 'button';
            removeBtn.onclick = removeCoupon;
            removeBtn.className = 'px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors';
            removeBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Remover';
            // Adicionar após o botão Aplicar ou campo de input
            const applyBtn = couponContainer.querySelector('button[onclick="applyCoupon()"]');
            if (applyBtn) {
                applyBtn.parentElement.appendChild(removeBtn);
            } else {
                couponContainer.appendChild(removeBtn);
            }
        }
        removeBtn.style.display = '';
    } else {
        // Ocultar botão se não há cupom
        if (removeBtn) {
            removeBtn.style.display = 'none';
        }
    }
}

// Obter texto do desconto
function getDiscountText(coupon) {
    if (coupon.discountType === 'percentage') {
        return `${coupon.discountValue}%`;
    } else {
        return `R$ ${coupon.discountValue.toFixed(2)}`;
    }
}


async function handlePurchase(event) {
    event.preventDefault();
    const product = products[currentProduct];
    if (!product) {
        showError('PRODUCT_001', 'PRODUCT_001');
        return;
    }

    // Calcular preço final (recalcular para imagens ao invés de confiar no UI)
    let totalNum = 0;
    if (currentProduct === 'imagens') {
        const qty = Math.max(1, Math.min(5, Number(document.getElementById('mapsQty')?.value || 1)));
        const pricing = { 1: 2, 2: 4, 3: 5, 4: 6, 5: 7 };
        totalNum = pricing[qty] || 2;
        
    } else {
        // Para outros produtos, ler do modal
        const totalText = document.getElementById('purchasePrice')?.textContent || '0';
        totalNum = Number(totalText.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
    }

    // Informações do cupom aplicado
    const activeAffiliateCode = getActiveAffiliateCode(appliedCoupon?.affiliateId || null);
    const couponInfo = appliedCoupon ? {
        code: appliedCoupon.code,
        discountType: appliedCoupon.discountType,
        discountValue: appliedCoupon.discountValue,
        originalPrice: originalPrice,
        finalPrice: totalNum
    } : null;

    // validação específica para imagens (quantidade vs nomes)
    if (currentProduct === 'imagens') {
        const qty = Math.max(1, Math.min(5, Number(document.getElementById('mapsQty')?.value || 1)));
        const names = (document.getElementById('mapsNames')?.value || '')
            .split(',').map(s => s.trim()).filter(Boolean);
        if (names.length && names.length !== qty) {
            showError('PRODUCT_007', 'PRODUCT_007');
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
        const selected = Array.from(document.querySelectorAll('input[name="mapOption"]:checked')).map(i => i.value);
        productOptions.maps = selected;
        productOptions.quantity = selected.length || 1;
    } else if (currentProduct === 'camisa') {
        // Redundância para garantir campos camisa
        productOptions.size = document.getElementById('shirtSize')?.value || '';
        productOptions.color = document.getElementById('shirtColor')?.value || '';
        productOptions.name = document.getElementById('shirtName')?.value || '';
        productOptions.number = document.getElementById('shirtNumber')?.value || '';
        productOptions.quantity = Number(document.getElementById('shirtQty')?.value || 1);
        productOptions.deliveryAddress = document.getElementById('deliveryAddress')?.value || '';
        productOptions.notes = document.getElementById('shirtNotes')?.value || '';
    }

    // Pegar botão de submit para mostrar loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || 'Finalizar (Mercado Pago)';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Processando...';
    }

    try {
        // Validar preço final
        if (!totalNum || totalNum <= 0 || isNaN(totalNum)) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
            showError('PAYMENT_002', 'PAYMENT_002');
            
            return;
        }

        // Inicializar variáveis
        let docRef = null;
        let externalRef = `digital_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // Salvar order no Firestore ANTES de redirecionar
        if (window.firebaseDb) {
            try {
                const { addDoc, collection, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

                // Validação de formato de CPF para camisa (obrigatório no padrão 000.000.000-00)
                if (currentProduct === 'camisa') {
                    const cpfVal = (document.getElementById('customerCPF')?.value || '').trim();
                    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
                    if (!cpfVal || !cpfRegex.test(cpfVal)) {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalBtnText;
                        }
                        showError('PRODUCT_006', 'PRODUCT_006');
                        return;
                    }
                }

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
                    type: 'digital_product', // Marcar como produto digital
                    // Incluir affiliateId do cupom se houver
                    affiliateCode: activeAffiliateCode || null
                };

                
                docRef = await addDoc(collection(window.firebaseDb, 'orders'), orderData);
                // Dentro de handlePurchase, após orderData ser montado e docRef salvo
                try {
                await createPendingAffiliateSale(docRef.id, activeAffiliateCode, orderData, 'product');
                } catch (e) { /* log, não quebrar fluxo */ }

                // Salvar external_reference para o webhook
                externalRef = `digital_${docRef.id}`;
                await updateDoc(docRef, { external_reference: externalRef });
            } catch (firebaseError) {
                
                // --- PROTEÇÃO CONTRA PAGAMENTO FANTASMA ---
                alert('Erro de conexão ao salvar seu pedido. Por favor, verifique sua internet e tente novamente. Nenhuma cobrança foi gerada.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                return; // INTERROMPE O FLUXO AQUI
                // -----------------------------------------
            }
        }

        // Chamar function segura (Netlify) para criar Preference
        const preferencePayload = {
            title: product.name || 'Produto',
            unit_price: Number(totalNum.toFixed(2)),
            currency_id: 'BRL',
            quantity: 1,
            back_url: window.location.origin,
            coupon_info: couponInfo,
            external_reference: externalRef
        };

        

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

        const response = await fetch('/.netlify/functions/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferencePayload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
            throw new Error(errorText || `Erro ao criar preferência (${response.status})`);
        }

        const data = await response.json();
        

        // Verificar se tem init_point ou sandbox_init_point
        const checkoutUrl = data.init_point || data.sandbox_init_point;
        if (!checkoutUrl) {
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
            throw new Error('Não foi possível obter o link de pagamento. Verifique se o Mercado Pago está configurado corretamente.');
        }

        // Registrar uso do cupom se aplicado
        if (appliedCoupon) {
            try {
                const discountAmount = originalPrice - totalNum;
                await recordCouponUsage(
                    appliedCoupon.id,
                    appliedCoupon.code,
                    originalPrice,
                    discountAmount,
                    'store',
                    data.external_reference || externalRef,
                    {
                        productId: currentProduct,
                        name: product.name,
                        title: product.name,
                        item: product.name
                    }
                );
            } catch (couponError) {
                
                // Não falhar a compra por causa de erro no cupom
            }
        }

        closePurchaseModal();

        // Redireciona para o checkout do Mercado Pago
        try {
            sessionStorage.setItem('lastCheckoutUrl', checkoutUrl);
        } catch (_) { }
        
        try {
            window.open(checkoutUrl, '_blank');
            showToast('success', 'Checkout aberto em nova aba. Finalize o pagamento no Mercado Pago.', 'Checkout');
        } catch (openErr) {
            
            window.location.href = checkoutUrl;
        }
    } catch (error) {
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
        // Tratar erros específicos
        if (error.message && error.message.includes('timeout')) {
            showToast('error', 'Conexão expirou. Verifique sua internet e tente novamente.', 'Timeout');
        } else if (error.message && (error.message.includes('preço') || error.message.includes('Preço'))) {
            showToast('error', 'Preço inválido. Tente novamente.', 'Erro no Pagamento');
        } else if (error.message && (error.message.includes('produto') || error.message.includes('Produto'))) {
            showToast('error', 'Produto inválido. Tente novamente.', 'Erro no Pagamento');
        } else if (error.message && (error.message.includes('link') || error.message.includes('Link'))) {
            showToast('error', 'Não foi possível obter o link de pagamento. Verifique sua conexão e tente novamente.', 'Erro no Pagamento');
        } else {
            showToast('error', error.message || 'Erro ao processar pagamento. Tente novamente.', 'Erro');
        }
    }
}

async function createPendingAffiliateSale(orderId, affiliateCode, orderData, saleType) {
    

    if (!affiliateCode || !orderId) {
        
        return;
    }

    try {
        const { doc, getDoc, collection, query, where, getDocs, addDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const db = window.firebaseDb;
        

        const usersRef = collection(db, 'users');

        // Busca por UID
        const affDocById = await getDoc(doc(usersRef, affiliateCode));
        

        let affDoc = affDocById;
        if (!affDoc.exists()) {
            // Busca por email
            
            const q = query(usersRef, where('email', '==', affiliateCode));
            const snap = await getDocs(q);
            affDoc = snap.empty ? null : snap.docs[0];
            
        }

        if (!affDoc || !affDoc.exists()) {
            
            return;
        }

        const affData = affDoc.data();
        const affId = affDoc.id;
        const commissionRate = affData.commissionRate || 10;
        const saleValue = Number(orderData.amount || 0);
        const commissionAmount = (saleValue * commissionRate) / 100;
        

        // Verificação de duplicata
        const salesRef = collection(db, 'affiliate_sales');
        const dupQ = query(salesRef, where('orderId', '==', orderId), where('affiliateId', '==', affId));
        const dupSnap = await getDocs(dupQ);
        

        if (!dupSnap.empty) {
            
            return;
        }

        // Criação do documento
        await addDoc(salesRef, {
            affiliateId: affId,
            orderId,
            customerEmail: orderData.customer || null,
            customerName: orderData.customerName || null,
            productName: orderData.title || '',
            saleValue,
            commissionRate,
            commissionAmount,
            saleType,
            status: 'pending',
            createdAt: new Date()
        });
        
    } catch (error) {
        
    }
}

// Close modals when clicking outside
document.addEventListener('click', function (event) {
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
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        try {
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (_) {}
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
                slide.className = 'carousel-slide p-8 bg-white';

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
                if (highlight.action === 'buy_tokens') {
                    buttonHtml = `<button onclick="openHeroTokensModal()" class="bg-blue-matte hover-blue-matte px-6 py-2 rounded-lg text-white font-semibold">Comprar Tokens</button>`;
                } else if (highlight.action === 'custom_link' && highlight.customLinkUrl) {
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

        // Apply animations after rendering
        setTimeout(() => {
            reinitAnimations(track);
        }, 50);

        // Inicializar carousel
        initCarousel();

    } catch (error) {
        
    }
}

// Carousel — abordagem por scrollLeft (não depende de offsetWidth no init)
function initCarousel() {
    const viewport = document.getElementById('carouselViewport');
    const track    = document.getElementById('carouselTrack');
    const prev     = document.getElementById('carouselPrev');
    const next     = document.getElementById('carouselNext');
    if (!track || !prev || !next) return;

    // Remover listener anterior para evitar duplicatas
    if (window._carouselCleanup) window._carouselCleanup();

    const container = viewport || track.parentElement;
    let index = 0;
    let slideCount = track.children.length;
    let autoAdvanceInterval;

    function slideWidth() {
        return container.getBoundingClientRect().width || container.offsetWidth || 0;
    }

    function applyWidths() {
        const w = slideWidth();
        if (!w) return;
        Array.from(track.children).forEach(s => {
            s.style.width    = w + 'px';
            s.style.minWidth = w + 'px';
            s.style.flexShrink = '0';
        });
        slideCount = track.children.length;
    }

    function update() {
        const w = slideWidth();
        track.style.transform = `translateX(-${index * w}px)`;
    }

    function go(dir) {
        index = ((index + dir) % slideCount + slideCount) % slideCount;
        update();
    }

    function startAuto() { autoAdvanceInterval = setInterval(() => go(1), 8000); }
    function stopAuto()  { clearInterval(autoAdvanceInterval); }

    // Aguardar dois frames para garantir que o layout foi calculado
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            applyWidths();
            update();
            if (slideCount > 1) startAuto();
        });
    });

    const onResize = () => { applyWidths(); update(); };
    window.addEventListener('resize', onResize);

    const onPrev = () => { stopAuto(); go(-1); startAuto(); };
    const onNext = () => { stopAuto(); go(1);  startAuto(); };
    prev.addEventListener('click', onPrev);
    next.addEventListener('click', onNext);

    track.addEventListener('mouseenter', stopAuto);
    track.addEventListener('mouseleave', startAuto);

    // Swipe no mobile
    let tx = 0;
    const onTouchStart = e => { tx = e.changedTouches[0].screenX; };
    const onTouchEnd   = e => {
        const d = tx - e.changedTouches[0].screenX;
        if (Math.abs(d) > 50) { stopAuto(); go(d > 0 ? 1 : -1); startAuto(); }
    };
    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchend',   onTouchEnd,   { passive: true });

    // Limpeza para evitar listeners duplicados
    window._carouselCleanup = () => {
        stopAuto();
        window.removeEventListener('resize', onResize);
        prev.removeEventListener('click', onPrev);
        next.removeEventListener('click', onNext);
        track.removeEventListener('touchstart', onTouchStart);
        track.removeEventListener('touchend',   onTouchEnd);
    };
}

// Carregar destaques quando o Firebase estiver pronto
if (window.firebaseReady) {
    loadHighlightsFromFirestore();
    loadNewsFromFirestore();
    loadProductsFromFirestore();

    // Initialize smooth animations
    initSmoothAnimations();
    initChat();
} else {
    window.addEventListener('load', () => {
        setTimeout(() => {
            loadHighlightsFromFirestore();
            loadNewsFromFirestore();
            loadProductsFromFirestore();
            initChat();
        }, 1000);
    });
}

// ===== Modal Comprar Tokens (Home/Destaques) =====
let heroAppliedCoupon = null;
let heroSelectedQty = 0;
function openHeroTokensModal() {
    const modal = document.getElementById('heroTokensModal');
    if (!modal) return;
    const msg = document.getElementById('heroTokensCouponMsg'); if (msg) { msg.textContent = ''; msg.className = 'text-xs text-gray-500'; }
    const input = document.getElementById('heroTokensCoupon'); if (input) input.value = '';
    heroAppliedCoupon = null; heroSelectedQty = 0; updateHeroTokensSummary();
    modal.classList.remove('hidden'); modal.classList.add('flex');
}
function closeHeroTokensModal() { const m = document.getElementById('heroTokensModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } }
function heroSetTokensQty(qty) { heroSelectedQty = qty; updateHeroTokensSummary(); }
async function heroPurchaseTokens() {
    try {
        if (!window.firebaseAuth?.currentUser) { openLoginModal(); return; }
        const qty = heroSelectedQty || 0; if (!qty) { alert('Selecione a quantidade'); return; }
        const basePrice = qty; let price = basePrice;
        if (heroAppliedCoupon) { const d = heroAppliedCoupon.discountType === 'percentage' ? basePrice * (heroAppliedCoupon.discountValue / 100) : heroAppliedCoupon.discountValue; price = Math.max(0, basePrice - d); }

        // Criar ordem no Firestore para associar external_reference e permitir confirmação automática
        let externalRef;
        try {
            const { addDoc, updateDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const activeAffiliateCode = getActiveAffiliateCode();
            const orderData = {
                title: `${qty} Token${qty > 1 ? 's' : ''} XTreino`,
                amount: price,
                quantity: qty,
                currency: 'BRL',
                customer: window.firebaseAuth.currentUser?.email || null,
                customerName: window.firebaseAuth.currentUser?.displayName || null,
                uid: window.firebaseAuth.currentUser?.uid || null,
                type: 'tokens_purchase',
                createdAt: new Date(),
                timestamp: Date.now(),
                affiliateCode: activeAffiliateCode || null
            };
            const docRef = await addDoc(collection(window.firebaseDb, 'orders'), orderData);
            externalRef = `tokens_${docRef.id}`;
            await updateDoc(docRef, { external_reference: externalRef });
            try { sessionStorage.setItem('lastExternalRef', externalRef); } catch (_) { }
        } catch (e) {
            
            // --- PROTEÇÃO CONTRA PAGAMENTO FANTASMA ---
            alert('Erro de conexão ao iniciar pedido. Verifique sua internet e tente novamente.');
            return; // INTERROMPE O FLUXO
            // -----------------------------------------
        }

        const prefBody = {
            title: `${qty} Token${qty > 1 ? 's' : ''} XTreino`,
            // For tokens, Mercado Pago should receive unit_price = 1.00 and quantity = number of tokens
            unit_price: 1.00,
            currency_id: 'BRL',
            quantity: qty,
            back_url: window.location.origin,
            external_reference: externalRef,
            type: 'tokens_purchase'
        };
        if (heroAppliedCoupon) prefBody.coupon_info = { id: heroAppliedCoupon.id, code: heroAppliedCoupon.code, discountType: heroAppliedCoupon.discountType, discountValue: heroAppliedCoupon.discountValue, context: 'tokens' };
        
        const response = await fetch('/.netlify/functions/create-preference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody) });
        if (!response.ok) throw new Error('Erro ao comunicar com Mercado Pago');
        const data = await response.json();
        if (data.init_point) {
            try { sessionStorage.setItem('lastCheckoutUrl', data.init_point); } catch (_) { }
            closeHeroTokensModal();
            try {
                window.open(data.init_point, '_blank');
                showToast('success', 'Checkout aberto em nova aba. Finalize o pagamento no Mercado Pago.', 'Checkout');
            } catch (e) {
                
                window.location.href = data.init_point;
            }
        } else { showToast('error', 'Erro ao iniciar pagamento. Tente novamente.', 'Erro'); }
    } catch (e) {  showToast('error', `Erro ao comprar tokens: ${e && e.message ? e.message : String(e)}`, 'Erro'); }
}
function updateHeroTokensSummary() {
    const subtotalEl = document.getElementById('heroTokensSubtotal');
    const discountRow = document.getElementById('heroTokensDiscountRow');
    const discountEl = document.getElementById('heroTokensDiscount');
    const totalEl = document.getElementById('heroTokensTotal');
    const summary = document.getElementById('heroTokensSummary');
    const btn = document.getElementById('heroTokensBuyBtn');
    const base = heroSelectedQty || 0;
    const discount = heroAppliedCoupon ? (heroAppliedCoupon.discountType === 'percentage' ? base * (heroAppliedCoupon.discountValue / 100) : heroAppliedCoupon.discountValue) : 0;
    const total = Math.max(0, base - discount);
    if (subtotalEl) subtotalEl.textContent = base.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (discountRow) discountRow.style.display = heroAppliedCoupon ? '' : 'none';
    if (discountEl) discountEl.textContent = `- ${discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    if (totalEl) totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (summary) summary.classList.remove('hidden');
    if (btn) { btn.disabled = base <= 0; btn.textContent = base > 0 ? `Comprar ${base} token${base > 1 ? 's' : ''} por ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Selecionar quantidade'; }
}
// duplicate implementation removed (kept single correct implementation above)
async function heroApplyTokenCoupon() {
    const couponCode = document.getElementById('heroTokenCouponInput')?.value?.trim().toUpperCase();
    const couponMessage = document.getElementById('heroTokenCouponMessage');

    if (!couponCode) {
        showToast('error', 'Digite um código de cupom', 'Cupom');
        return;
    }

    if (heroAppliedCoupon && heroAppliedCoupon.code === couponCode) {
        showToast('error', 'Este cupom já está aplicado.', 'Cupom');
        return;
    }

    try {
        

        const { collection, getDocs, query, where, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        const couponsRef = collection(window.firebaseDb, 'coupons');
        const q = query(couponsRef, where('code', '==', couponCode), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showToast('error', 'Cupom não encontrado', 'Cupom');
            return;
        }

        const couponDoc = snapshot.docs[0];
        const coupon = { id: couponDoc.id, ...couponDoc.data() };

        // Validar cupom
        if (!coupon.isActive) {
            showToast('error', 'Cupom inativo', 'Cupom');
            return;
        }

        if (coupon.expirationDate) {
            const expirationDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
            if (expirationDate < new Date()) {
                showToast('error', 'Cupom expirado', 'Cupom');
                return;
            }
        }

        if (coupon.context && coupon.context !== 'tokens' && coupon.context !== 'all') {
            showToast('error', 'Este cupom não é válido para compra de tokens', 'Cupom');
            return;
        }

        heroAppliedCoupon = coupon;
        updateHeroTokensSummary();
        showToast('success', `Cupom "${coupon.code}" aplicado! Desconto: ${coupon.discountType === 'percentage' ? coupon.discountValue + '%' : 'R$ ' + coupon.discountValue}`, 'Cupom');

        const couponInput = document.getElementById('heroTokenCouponInput');
        if (couponInput) {
            couponInput.value = coupon.code;
            couponInput.disabled = true;
        }

        

    } catch (error) {
        
        showToast('error', 'Erro ao validar cupom. Tente novamente.', 'Cupom');
    }
}
window.openHeroTokensModal = openHeroTokensModal;
window.closeHeroTokensModal = closeHeroTokensModal;
window.heroSetTokensQty = heroSetTokensQty;
window.heroApplyTokenCoupon = heroApplyTokenCoupon;
window.heroPurchaseTokens = heroPurchaseTokens;
// ==================== CHAT INTERNO ====================

// Chat sempre disponível 24 horas
function isBusinessHours() {
    // Chat sempre online
    return true;
}

// ===== Helpers de chat inteligente (sem APIs externas) =====
function stripDiacritics(s) { try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) { return s; } }
function normalizeText(s) {
    const t = stripDiacritics(String(s || '').toLowerCase());
    return t.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function levenshtein(a, b) {
    a = String(a); b = String(b);
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) { m[0][j] = j; }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
        }
    }
    return m[a.length][b.length];
}
function similarity(a, b) {
    const na = normalizeText(a), nb = normalizeText(b);
    if (!na || !nb) return 0;
    const maxLen = Math.max(na.length, nb.length);
    const dist = levenshtein(na, nb);
    return 1 - (dist / Math.max(1, maxLen));
}
const EVENT_SYNONYMS = {
    'modo-liga': ['modo liga', 'liga', 'modoliga', 'xtreino liga', 'liga freitas'],
    'semanal-freitas': ['semanal', 'semanal freitas', 'final semanal', 'final do semanal'],
    'camp-freitas': ['camp', 'campeonato', 'camp freitas', 'campeonato freitas'],
    'xtreino-tokens': ['xtreino', 'treino', 'freitas', 'xtreino freitas', 'token', 'tokens']
};
function detectEventType(text) {
    const n = normalizeText(text);
    for (const [key, list] of Object.entries(EVENT_SYNONYMS)) {
        if (list.some(s => n.includes(normalizeText(s)))) return key;
    }
    return null;
}
function parseHourFromText(text) {
    const t = String(text || '').toLowerCase();
    const m1 = t.match(/\b(\d{1,2})\s*h\b/); if (m1) { const h = parseInt(m1[1], 10); if (h >= 0 && h <= 23) return `${h}h`; }
    const m2 = t.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/); if (m2) { const h = parseInt(m2[1], 10); if (h >= 0 && h <= 23) return `${h}h`; }
    return null;
}
function parseDateFromText(text) {
    try {
        const n = normalizeText(text);
        const today = new Date();
        if (/\bhoje\b/.test(n)) return today.toISOString().slice(0, 10);
        if (/\bamanha\b/.test(n)) { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
        const m = n.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\b/);
        if (m) {
            const dd = parseInt(m[1], 10), MM = parseInt(m[2], 10), yyyy = m[3] ? parseInt(m[3], 10) : today.getFullYear();
            const y4 = yyyy < 100 ? 2000 + yyyy : yyyy;
            const ds = `${y4}-${String(MM).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
            const d = new Date(ds + 'T00:00:00'); if (!isNaN(d)) return ds;
        }
    } catch (_) { }
    return null;
}
let __faqKbCache = null;
async function loadFaqKb() {
    if (__faqKbCache !== null) return __faqKbCache;
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getDocs(collection(window.firebaseDb, 'faq_kb'));
        __faqKbCache = [];
        snap.forEach(d => { const data = d.data(); if (data?.q && data?.a) __faqKbCache.push({ q: String(data.q), a: String(data.a) }); });
        return __faqKbCache;
    } catch (_) { __faqKbCache = []; return __faqKbCache; }
}
async function smartChatAnswer(message) {
    const text = String(message || '');
    const ntext = normalizeText(text);
    // 1) FAQ KB por similaridade
    const kb = await loadFaqKb();
    let best = { score: 0, a: '' };
    for (const item of kb) {
        const s = similarity(ntext, item.q);
        if (s > best.score) best = { score: s, a: item.a };
    }
    if (best.score >= 0.72) return { answer: best.a, confidence: best.score };
    // 2) Intenções: preço / vagas / horários
    const ev = detectEventType(ntext);
    const hour = parseHourFromText(ntext);
    const date = parseDateFromText(ntext) || new Date().toISOString().slice(0, 10);
    const wantsPrice = /\b(preco|preço|valor|custa|quanto)\b/.test(ntext);
    const wantsVacancy = /\b(vaga|vagas|lotado|tem vaga|disponivel|disponível)\b/.test(ntext);
    const wantsHours = /\b(horario|horário|hora|horas|que horas)\b/.test(ntext);
    if (ev && (wantsPrice || wantsHours || wantsVacancy)) {
        // Horários: listar horários do evento
        if (wantsHours && !hour) {
            let slots = [];
            if (ev === 'modo-liga') slots = ['14h', '15h', '17h', '18h'];
            else if (ev === 'xtreino-tokens') slots = ['14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h', '22h', '23h'];
            else if (ev === 'semanal-freitas') slots = ['20h', '21h', '22h'];
            else if (ev === 'camp-freitas') slots = ['19h', '20h', '21h', '22h', '23h'];
            return { answer: `⏰ Horários de ${scheduleConfig[ev]?.label || 'evento'}: ${slots.join(', ')}`, confidence: 0.9 };
        }
        // Preço: considerar preço por horário (ex.: 22h semanal = 7)
        if (wantsPrice) {
            const p = getEventPrice(ev, hour || '');
            return { answer: `💰 Valor de ${scheduleConfig[ev]?.label || 'Evento'}${hour ? ` (${hour})` : ''}: ${p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, confidence: 0.9 };
        }
        // Vagas: usar checkSlotAvailability
        if (wantsVacancy && hour) {
            try {
                const scheduleStr = `${new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })} - ${hour}`;
                const ok = await checkSlotAvailability(date, scheduleStr, ev);
                const cap = getEventCapacity(ev, hour, date);
                return { answer: ok ? `✅ Há vagas no ${hour} (${cap} no total) para ${scheduleConfig[ev]?.label || 'o evento'} em ${date.split('-').reverse().join('/')}.` : `❌ ${hour} está lotado para ${scheduleConfig[ev]?.label || 'o evento'} em ${date.split('-').reverse().join('/')}.`, confidence: 0.85 };
            } catch (_) { }
        }
    }
    // 3) Fallback leve: retorno vazio para usar canned
    return { answer: '', confidence: 0 };
}

// Inicializar chat
function initChat() {
    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const onlineStatus = document.getElementById('onlineStatus');
    const offlineStatus = document.getElementById('offlineStatus');

    if (!chatToggle || !chatWindow) return;

    // Verificar horário de atendimento
    let isOnline = isBusinessHours();

    if (isOnline) {
        onlineStatus.classList.remove('hidden');
        offlineStatus.classList.add('hidden');
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.placeholder = 'Digite sua mensagem...';
    } else {
        onlineStatus.classList.add('hidden');
        offlineStatus.classList.remove('hidden');
        chatInput.disabled = true;
        chatSend.disabled = true;
        chatInput.placeholder = 'Fora do horário de atendimento';
    }

    // Toggle chat window
    chatToggle.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            chatInput.focus();
            // Carregar histórico quando abrir o chat
            loadChatHistory();
        }
    });

    // Fechar chat
    chatClose.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    // Enviar mensagem
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || !isOnline) return;

        // Adicionar mensagem do usuário
        addMessage(message, 'user');
        chatInput.value = '';

        // Tenta primeiro resposta inteligente
        try {
            const smart = await smartChatAnswer(message);
            if (smart && smart.answer) {
                showTypingIndicator();
                setTimeout(() => { hideTypingIndicator(); addMessage(smart.answer, 'support'); }, 1200);
                return;
            }
        } catch (_) { }

        // Respostas prontas (FAQ curto). Se não bater, encaminha para WhatsApp
        const textLower = message.toLowerCase();
        const whatsNumber = '5511949830454';
        const whatsLink = `https://wa.me/${whatsNumber}?text=${encodeURIComponent('Olá! Preciso de ajuda no site XTreino Freitas.')}`;

        const canned = [
            // Valores e preços (prioridade alta)
            {
                match: ['valor', 'valores', 'preço', 'preços', 'quanto', 'custa', 'custo', 'precificar', 'orçamento', 'tabela', 'tabela de preços', 'preço dos', 'valor dos', 'quanto custa', 'quanto é', 'quanto sai', 'quanto fica', 'preço do', 'valor do', 'custo do', 'preço da', 'valor da', 'custo da', 'preço das', 'valor das', 'custo das', 'preço dos', 'valor dos', 'custo dos'],
                reply: '💰 **VALORES DOS PRODUTOS:**\n\n📱 **Sensibilidade no Free Fire:** R$ 8,00\n🗺️ **Imagens Aéreas:** A partir de R$ 2,00\n📊 **Planilha de Análise:** R$ 19,00\n🎮 **Passe de Elite:** R$ 11,00\n👕 **Camisa Oficial:** R$ 89,90\n\n🎯 **EVENTOS:**\n• **XTREINO FREITAS:** R$ 1,00 (1 token) - 14h às 23h\n• **XTREINO MODO LIGA:** R$ 3,00 - 14h, 15h, 17h, 18h\n• **CAMPEONATO FREITAS:** R$ 8,00 (promo no site — antes R$ 10,00) - 19h às 23h\n• **SEMANAL FREITAS:** R$ 3,50 - 20h, 21h, 22h\n\n💡 Precisa de mais detalhes sobre algum evento específico?'
            },

            // Horários e funcionamento (prioridade alta)
            {
                match: ['horário', 'horários', 'hora', 'horas', 'que horas', 'funcionamento', 'atendimento', 'quando', 'disponível', 'disponibilidade', 'aberto', 'fechado', 'funciona', 'trabalha', 'atende', 'expediente', 'jornada', 'turno', 'período', 'tempo', 'schedule', 'time', 'hours', 'working', 'available', 'open', 'closed', 'business hours', 'operating hours'],
                reply: '⏰ **HORÁRIOS DE FUNCIONAMENTO:**\n\n🕐 **Chat:** Disponível 24 horas\n🎮 **Treinos:** Geralmente entre 14h-23h\n📞 **WhatsApp:** Para dúvidas específicas\n\n💡 **DICAS:**\n• Eventos têm horários específicos\n• Tokens podem ser usados a qualquer hora\n• Suporte via WhatsApp é mais rápido para questões complexas'
            },
            {
                match: ['online', 'disponível', 'atendendo', 'suporte'],
                reply: '✅ **SUPORTE DISPONÍVEL:**\n\n🤖 **Chat:** Online 24 horas (respostas automáticas)\n📱 **WhatsApp:** Para atendimento personalizado\n🎮 **Treinos:** Segunda a sexta, 14h-23h\n\n💡 Para dúvidas específicas sobre pedidos, use o WhatsApp!'
            },

            // Tokens (prioridade alta)
            {
                match: ['token', 'tokens', 'comprar tokens', 'meus tokens', 'saldo', 'saldo de tokens', 'quantos tokens', 'tenho tokens', 'token balance', 'balance', 'crédito', 'créditos', 'moeda', 'moedas', 'pontos', 'pontuação', 'coin', 'coins', 'currency', 'wallet', 'carteira', 'dinheiro virtual', 'moeda virtual', 'comprar', 'adicionar tokens', 'recarregar', 'recarga', 'depositar', 'depósito', 'investir', 'investimento em tokens', 'token system', 'sistema de tokens', 'pagamento com token', 'pagar com token', 'usar token', 'gastar token', 'consumir token', 'token usado', 'tokens usados', 'token gasto', 'tokens gastos'],
                reply: 'Tokens custam R$ 1,00 cada. Compre e veja seu saldo em Minha Conta > Meus Tokens. Use tokens para pagar eventos!'
            },

            // Preços e valores (prioridade baixa - só se não for horário ou token)
            {
                match: ['preço', 'preços', 'valor', 'valores', 'quanto', 'cust', 'custa', 'quanto custa', 'quanto é', 'quanto vale', 'cobrança', 'cobrar', 'pagar', 'pagamento', 'dinheiro', 'reais', 'r$', 'barato', 'caro', 'econômico', 'custo', 'gasto', 'investimento', 'vale a pena', 'compensa', 'financeiro', 'monetário', 'tarifa', 'taxa', 'valor total', 'preço final', 'desconto', 'promoção', 'oferta', 'liquidação', 'sale', 'price', 'cost', 'money', 'cheap', 'expensive', 'affordable'],
                reply: 'Tokens: R$ 1,00 cada. Planilhas: R$ 19,00. Sensibilidades: R$ 8,00. Imagens Aéreas: R$ 2,00 por mapa. Camisa: R$ 89,90. Passe Booyah: R$ 11,00. Eventos: R$ 3,00-5,00.'
            },

            // Produtos digitais
            {
                match: ['sensibilidade', 'sensibilidades', 'sensis', 'configuração', 'config', 'configs', 'ajuste', 'ajustes', 'calibração', 'calibrar', 'mouse', 'teclado', 'dpi', 'fps', 'fps boost', 'otimização', 'otimizar', 'performance', 'rendimento', 'melhorar', 'melhoria', 'setup', 'settings', 'configurar', 'configurações', 'sens', 'sensibilidade do mouse', 'mouse sens', 'sens do mouse', 'sensibilidade da mira', 'mira', 'aim', 'apontar', 'apontamento', 'precisão', 'preciso', 'estabilidade', 'estável', 'controle', 'controlar', 'movimento', 'movimentação', 'crosshair', 'mira personalizada', 'personalizar', 'customizar', 'custom', 'personalização', 'personalizações', 'sensitivity', 'mouse sensitivity', 'aim sensitivity', 'game settings', 'jogo', 'gaming', 'gamer', 'free fire', 'ff', 'mobile', 'pc', 'android', 'ios', 'celular', 'computador', 'notebook', 'desktop', 'laptop', 'device', 'dispositivo', 'aparelho', 'equipamento', 'hardware', 'periférico', 'periféricos', 'mouse pad', 'mousepad', 'teclado mecânico', 'mechanical keyboard', 'gaming mouse', 'mouse gamer', 'teclado gamer', 'gaming keyboard', 'headset', 'fone', 'microfone', 'microphone', 'headphone', 'fone de ouvido', 'audio', 'som', 'sound', 'volume', 'vol', 'microfone', 'mic', 'micro', 'microfone gamer', 'gaming headset', 'headset gamer', 'fone gamer', 'gaming audio', 'audio gamer', 'som gamer', 'sound gamer', 'volume gamer', 'audio settings', 'configurações de áudio', 'configurações de som', 'configurações de audio', 'configurações de volume', 'configurações de microfone', 'configurações de mic', 'configurações de fone', 'configurações de headset', 'configurações de headphone', 'configurações de audio', 'configurações de som', 'configurações de volume', 'configurações de microfone', 'configurações de mic', 'configurações de fone', 'configurações de headset', 'configurações de headphone'],
                reply: 'Sensibilidades: R$ 8,00. Inclui configuração para PC/Android/iOS. Após compra, baixe em Minha Conta > Meus Produtos.'
            },
            {
                match: ['imagens aéreas', 'mapa', 'mapas', 'calls', 'bermuda', 'purgatório', 'kalahari', 'nova terra', 'alpine'],
                reply: 'Imagens Aéreas: R$ 2,00 por mapa. Escolha: Bermuda, Purgatório, Kalahari, Nova Terra, Alpine. Baixe em Minha Conta > Meus Produtos.'
            },
            {
                match: ['planilha', 'planilhas', 'analise', 'análise', 'coach', 'analista'],
                reply: 'Planilhas de Análise: R$ 19,00. Para coaches e analistas. Inclui dados precisos e gráficos. Download em Minha Conta > Meus Produtos.'
            },
            {
                match: ['passe', 'booyah', 'player id', 'id do jogador'],
                reply: 'Passe Booyah: R$ 11,00. Informe seu Player ID na compra. Após confirmação, um admin valida e entrega.'
            },
            {
                match: ['camisa', 'camiseta', 'roupa', 'física', 'entrega'],
                reply: 'Camisa Oficial: R$ 89,90. Produto físico com entrega. Escolha tamanho, cor, nome e endereço na compra.'
            },

            // Eventos e treinos
            {
                match: ['evento', 'eventos', 'treino', 'treinos', 'xtreino'],
                reply: '🎯 **EVENTOS DISPONÍVEIS:**\n\n• **XTREINO FREITAS:** R$ 1,00 (1 token) - 14h às 23h\n• **XTREINO MODO LIGA:** R$ 3,00 - 14h, 15h, 17h, 18h\n• **CAMPEONATO FREITAS:** R$ 8,00 (promo no site — antes R$ 10,00) - 19h às 23h\n• **SEMANAL FREITAS:** R$ 3,50 - 20h, 21h, 22h\n\nVeja na seção Eventos para mais detalhes!'
            },
            {
                match: ['modo liga', 'liga', 'competitivo'],
                reply: '🏆 **XTREINO MODO LIGA:**\n\n💰 **Valor:** R$ 3,00\n⏰ **Horários:** 14h, 15h, 17h, 18h\n🎮 **Modalidade:** Misto | Squad | 2 quedas | 15 slots\n🏅 **Premiação:** Vaga em campeonato pro top¹ da tabela\n📅 **Funcionamento:** Segunda a Sexta\n\n🎯 **Diferencial:** Transmissão modo liga ao vivo, montagem de cronograma, 15 slots e Troféu.'
            },
            {
                match: ['camp freitas', 'camp', 'campeonato'],
                reply: '🏆 **CAMPEONATO FREITAS:**\n\n💰 **Valor:** R$ 8,00 (promo no site — antes R$ 10,00)\n⏰ **Horários:** 19h, 20h, 21h, 22h, 23h\n🎮 **Modalidade:** Misto | Squad | 2 quedas por fase\n🏅 **Premiação:** R$ 4.000,00 + Troféu\n📅 **Funcionamento:** Segunda a Sexta-feira\n\n🎯 **Diferencial:** Transmissão modo liga ao vivo a partir das Semifinais + Troféu.'
            },
            {
                match: ['semanal', 'semanal freitas'],
                reply: '🏆 **SEMANAL FREITAS:**\n\n💰 **Valor:** R$ 3,50\n⏰ **Horários:** 1ª Fase às 20h e 21h | Final às 22h\n🎁 **Bônus:** Vaga direto na Final por apenas R$ 7,00\n🎮 **Modalidade:** Misto | Squad | 2 quedas\n🏅 **Premiação:** R$ 65,00\n📅 **Funcionamento:** Segunda a Sexta\n\n🎯 **Diferencial:** Termina no mesmo dia + premiação em dinheiro pro top¹.'
            },
            {
                match: ['xtreino freitas', 'xtreino', 'token', 'tokens', 'treino normal'],
                reply: '🎯 **XTREINO FREITAS:**\n\n💰 **Valor:** R$ 1,00 (1 token)\n⏰ **Horários:** 14h, 15h, 16h, 17h, 18h, 19h, 20h, 21h, 22h, 23h\n🎮 **Modalidade:** Misto | Squad | 2 quedas\n🏅 **Premiação:** Vaga em Campeonato pro top¹ da tabela\n📅 **Funcionamento:** Segunda a Sexta\n\n🎯 **Sobre o Evento:** Xtreino que visa o treinamento e aperfeiçoamento de Equipes amadoras e profissionais, onde Coach pode telar seu Time para avaliá-los. Oferecemos Tabela de pontuação, Banner de top³, Transmissão ao Vivo, Verificados, Ranking de melhor equipe com Troféu e mais...\n\n🎯 **Diferencial:** 10 horários diários, montagem de cronograma e Troféu.'
            },

            // Conta e pedidos
            {
                match: ['minha conta', 'conta', 'login', 'entrar', 'cadastro', 'registro'],
                reply: 'Acesse Minha Conta no menu. Faça login ou cadastre-se. Lá você vê pedidos, tokens, downloads e mais!'
            },
            {
                match: ['pedido', 'pedidos', 'compra', 'compras', 'histórico'],
                reply: 'Veja seus pedidos em Minha Conta > Meus Pedidos. Lá aparecem links de WhatsApp e status dos pagamentos.'
            },
            {
                match: ['download', 'baixar', 'meus produtos', 'produtos'],
                reply: 'Downloads ficam em Minha Conta > Meus Produtos. Sensibilidades, mapas, planilhas - tudo lá!'
            },

            // WhatsApp e grupos
            {
                match: ['whatsapp', 'grupo', 'link do grupo', 'id e senha', 'sala', 'discord'],
                reply: 'Links de WhatsApp das salas aparecem em Minha Conta > Meus Pedidos quando seu pedido estiver confirmado.'
            },
            {
                match: ['contato', 'falar', 'ajuda', 'suporte', 'problema'],
                reply: 'Precisa de ajuda? Use este chat 24 horas ou WhatsApp: (11) 94911-3275. Chat sempre disponível!'
            },

            // Pagamento e cupons
            {
                match: ['pagamento', 'pagar', 'mercado pago', 'cartão', 'pix'],
                reply: 'Aceitamos Mercado Pago (cartão, PIX, boleto). Pagamento seguro e rápido. Cupons de desconto disponíveis!'
            },
            {
                match: ['cupom', 'desconto', 'promoção', 'promo', 'código'],
                reply: 'Cupons de desconto disponíveis! Digite o código na compra. Alguns são específicos para eventos ou loja.'
            },

            // Informações gerais
            {
                match: ['freitas', 'mario', 'quem é', 'sobre', 'empresa'],
                reply: 'XTreino Freitas - Treinamentos e produtos para Free Fire. Mario Freitas e equipe especializada em estratégia e performance.'
            },
            {
                match: ['free fire', 'ff', 'jogo', 'gaming'],
                reply: 'Especialistas em Free Fire! Treinos, estratégias, sensibilidades, mapas e muito mais para melhorar sua performance.'
            },
            {
                match: ['obrigado', 'valeu', 'thanks', 'obg'],
                reply: 'De nada! Fico feliz em ajudar. Qualquer dúvida, estou aqui! 😊'
            },
            {
                match: ['oi', 'olá', 'hello', 'hi', 'bom dia', 'boa tarde', 'boa noite'],
                reply: 'Olá! Bem-vindo ao XTreino Freitas! Como posso te ajudar hoje? 😊'
            }
        ];

        let matchedReply = '';

        // Sistema mais inteligente de matching
        for (const c of canned) {
            let matchFound = false;

            // Verificar matches exatos
            if (c.match.some(k => textLower.includes(k))) {
                matchFound = true;
            }

            // Verificar variações comuns
            if (!matchFound) {
                for (const keyword of c.match) {
                    // Variações com acentos
                    const variations = [
                        keyword,
                        keyword.replace('ç', 'c'),
                        keyword.replace('ã', 'a'),
                        keyword.replace('é', 'e'),
                        keyword.replace('í', 'i'),
                        keyword.replace('ó', 'o'),
                        keyword.replace('ú', 'u'),
                        keyword.replace('á', 'a'),
                        keyword.replace('ê', 'e'),
                        keyword.replace('ô', 'o'),
                        keyword.replace('â', 'a'),
                        keyword.replace('õ', 'o'),
                        keyword.replace('à', 'a'),
                        keyword.replace('è', 'e'),
                        keyword.replace('ì', 'i'),
                        keyword.replace('ò', 'o'),
                        keyword.replace('ù', 'u')
                    ];

                    if (variations.some(v => textLower.includes(v))) {
                        matchFound = true;
                        break;
                    }
                }
            }

            // Verificar palavras similares (primeiras 3 letras)
            if (!matchFound) {
                for (const keyword of c.match) {
                    if (keyword.length >= 3) {
                        const prefix = keyword.substring(0, 3);
                        if (textLower.includes(prefix)) {
                            matchFound = true;
                            break;
                        }
                    }
                }
            }

            if (matchFound) {
                matchedReply = c.reply;
                break;
            }
        }

        if (!matchedReply) {
            // Tentar responder com base em palavras-chave genéricas
            if (textLower.includes('planilha') || textLower.includes('analise') || textLower.includes('analise') || textLower.includes('coach') || textLower.includes('analista')) {
                matchedReply = 'Planilhas de Análise: R$ 19,00. Para coaches e analistas. Inclui dados precisos e gráficos. Download em Minha Conta > Meus Produtos.';
            } else if (textLower.includes('mapa') || textLower.includes('call') || textLower.includes('bermuda') || textLower.includes('purgatorio') || textLower.includes('kalahari') || textLower.includes('alpine') || textLower.includes('nova terra')) {
                matchedReply = 'Imagens Aéreas: R$ 2,00 por mapa. Escolha: Bermuda, Purgatório, Kalahari, Nova Terra, Alpine. Baixe em Minha Conta > Meus Produtos.';
            } else if (textLower.includes('evento') || textLower.includes('treino') || textLower.includes('xtreino') || textLower.includes('liga') || textLower.includes('camp') || textLower.includes('semanal')) {
                matchedReply = '🎯 **EVENTOS DISPONÍVEIS:**\n\n• **XTREINO FREITAS:** R$ 1,00 (1 token) - 14h às 23h\n• **XTREINO MODO LIGA:** R$ 3,00 - 14h, 15h, 17h, 18h\n• **CAMPEONATO FREITAS:** R$ 5,00 - 20h às 23h\n• **SEMANAL FREITAS:** R$ 3,50 - 20h, 21h, 22h\n\nVeja na seção Eventos para mais detalhes!';
            } else if (textLower.includes('conta') || textLower.includes('login') || textLower.includes('cadastro') || textLower.includes('registro')) {
                matchedReply = 'Acesse Minha Conta no menu. Faça login ou cadastre-se. Lá você vê pedidos, tokens, downloads e mais!';
            } else if (textLower.includes('download') || textLower.includes('baixar') || textLower.includes('produto')) {
                matchedReply = 'Downloads ficam em Minha Conta > Meus Produtos. Sensibilidades, mapas, planilhas - tudo lá!';
            } else if (textLower.includes('whatsapp') || textLower.includes('grupo') || textLower.includes('sala')) {
                matchedReply = 'Links de WhatsApp das salas aparecem em Minha Conta > Meus Pedidos quando seu pedido estiver confirmado.';
            } else if (textLower.includes('pagamento') || textLower.includes('pagar') || textLower.includes('mercado pago') || textLower.includes('cartao') || textLower.includes('pix')) {
                matchedReply = 'Aceitamos Mercado Pago (cartão, PIX, boleto). Pagamento seguro e rápido. Cupons de desconto disponíveis!';
            } else if (textLower.includes('cupom') || textLower.includes('desconto') || textLower.includes('promocao') || textLower.includes('promo')) {
                matchedReply = 'Cupons de desconto disponíveis! Digite o código na compra. Alguns são específicos para eventos ou loja.';
            } else {
                matchedReply = `❌ Não temos essa resposta no chat.\n\nChame no WhatsApp para saber melhor:\n\n📱 (11) 94911-3275\n\n🔗 [Clique aqui para abrir o WhatsApp](${whatsLink})`;
            }
        }

        // Mostrar indicador de "digitando..." e simular digitação com atraso de 4 segundos
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addMessage(matchedReply, 'support');
        }, 3000);
    }

    // Event listeners
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Atualizar status a cada minuto
    setInterval(() => {
        const isOnlineNow = isBusinessHours();
        if (isOnlineNow !== isOnline) {
            isOnline = isOnlineNow;
            if (isOnline) {
                onlineStatus.classList.remove('hidden');
                offlineStatus.classList.add('hidden');
                chatInput.disabled = false;
                chatSend.disabled = false;
                chatInput.placeholder = 'Digite sua mensagem...';
            } else {
                onlineStatus.classList.add('hidden');
                offlineStatus.classList.remove('hidden');
                chatInput.disabled = true;
                chatSend.disabled = true;
                chatInput.placeholder = 'Fora do horário de atendimento';
            }
        }
    }, 60000);
}

// Mostrar indicador de "digitando..."
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // Remover indicador anterior se existir
    const existingTyping = document.getElementById('typingIndicator');
    if (existingTyping) {
        existingTyping.remove();
    }

    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'flex items-center space-x-2 p-3 bg-gray-100 rounded-lg mb-2';
    typingDiv.innerHTML = `
        <div class="flex space-x-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
        <span class="text-sm text-gray-500">Digitando...</span>
    `;

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Esconder indicador de "digitando..."
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Adicionar mensagem ao chat
function addMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    const isUser = sender === 'user';
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
    // Converter links markdown para HTML clicável
    const textWithLinks = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline hover:no-underline">$1</a>');

    messageDiv.innerHTML = `
        <div class="${isUser ? 'bg-blue-matte text-white' : 'bg-gray-100'} rounded-lg p-3 max-w-xs">
            <p class="text-sm whitespace-pre-line">${textWithLinks}</p>
            <span class="text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}">${time}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Salvar mensagem no histórico
    saveMessageToHistory(text, sender, now.toISOString());
}

// Salvar mensagem no histórico (localStorage)
function saveMessageToHistory(text, sender, timestamp) {
    try {
        const history = getChatHistory();
        history.push({ text, sender, timestamp });
        // Manter apenas as últimas 100 mensagens
        if (history.length > 100) {
            history.shift();
        }
        localStorage.setItem('chatHistory', JSON.stringify(history));
    } catch (e) {
        
    }
}

// Carregar histórico do chat
function loadChatHistory() {
    try {
        const history = getChatHistory();
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Se não houver histórico, manter mensagem inicial
        if (history.length === 0) {
            // Verificar se já tem a mensagem inicial
            const hasInitialMessage = chatMessages.querySelector('.bg-gray-100');
            if (!hasInitialMessage) {
                chatMessages.innerHTML = `
                    <div class="flex justify-start">
                        <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                            <p class="text-sm text-gray-700">Olá! Como posso ajudá-lo hoje?</p>
                            <span class="text-xs text-gray-500">Agora</span>
                        </div>
                    </div>
                `;
            }
            return;
        }

        // Limpar mensagem inicial e adicionar histórico
        chatMessages.innerHTML = '';

        // Adicionar todas as mensagens do histórico
        history.forEach(msg => {
            const messageDiv = document.createElement('div');
            const isUser = msg.sender === 'user';
            const date = new Date(msg.timestamp);
            const time = date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
            const textWithLinks = msg.text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline hover:no-underline">$1</a>');

            messageDiv.innerHTML = `
                <div class="${isUser ? 'bg-blue-matte text-white' : 'bg-gray-100'} rounded-lg p-3 max-w-xs">
                    <p class="text-sm whitespace-pre-line">${textWithLinks}</p>
                    <span class="text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}">${time}</span>
                </div>
            `;

            chatMessages.appendChild(messageDiv);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (e) {
        
    }
}

// Obter histórico do localStorage
function getChatHistory() {
    try {
        const stored = localStorage.getItem('chatHistory');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

// Limpar histórico do chat
function clearChatHistory() {
    showConfirm('Limpar Histórico', 'Deseja limpar todo o histórico de conversas? Esta ação não pode ser desfeita.', 'Limpar', 'Cancelar').then((confirmed) => {
        if (confirmed) {
            localStorage.removeItem('chatHistory');
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="flex justify-start">
                        <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                            <p class="text-sm text-gray-700">Histórico limpo! Como posso ajudá-lo hoje?</p>
                            <span class="text-xs text-gray-500">Agora</span>
                        </div>
                    </div>
                `;
            }
            showSuccessToast('Histórico limpo com sucesso!');
        }
    });
}

// Enviar mensagem rápida (sugestões)
function sendQuickMessage(message) {
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');

    if (chatInput && chatSend && !chatInput.disabled) {
        chatInput.value = message;
        chatSend.click();
    }
}

// Abrir WhatsApp diretamente
function openWhatsAppDirect() {
    const whatsNumber = '5511949830454';
    const message = encodeURIComponent('Olá! Preciso de ajuda no site XTreino Freitas.');
    const whatsLink = `https://wa.me/${whatsNumber}?text=${message}`;
    window.open(whatsLink, '_blank');
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

        // Guardar lista global para o modal
        window._newsList = news;

        // Garantir modal de notícia no DOM
        ensureNewsModal();

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

        // Apply animations after rendering
        setTimeout(() => {
            reinitAnimations(container);
        }, 50);

        // função de truncar texto para o card
        const truncate = (txt, max = 160) => {
            try {
                const s = String(txt || '');
                if (s.length <= max) return s;
                return s.slice(0, max).trimEnd() + '…';
            } catch (_) { return ''; }
        };

        news.forEach((raw, idx) => {
            const newsItem = { ...raw };
            // Normalizar data (Timestamp do Firestore ou string)
            const asDate = newsItem.date?.toDate ? newsItem.date.toDate() : (newsItem.date ? new Date(newsItem.date) : new Date());
            // Normalizar imagem (aceita imageUrl ou image)
            newsItem.imageUrl = newsItem.imageUrl || newsItem.image || '';
            const newsCard = document.createElement('article');
            newsCard.className = 'bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200';

            const date = asDate;
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

            const hasImage = newsItem.imageUrl && typeof newsItem.imageUrl === 'string';
            const headerHtml = hasImage
                ? `<div class="h-48 overflow-hidden bg-gray-100"><img src="${newsItem.imageUrl}" alt="${newsItem.title}" class="w-full h-48 object-cover" loading="lazy" referrerpolicy="no-referrer" /></div>`
                : '';

            const contentPreview = truncate(newsItem.content, 180);
            newsCard.innerHTML = `
                ${headerHtml}
                <div class="p-6">
                    <div class="text-sm text-blue-matte mb-2">${category}</div>
                    <h3 class="text-xl font-bold mb-3 text-gray-800">${newsItem.title}</h3>
                    <p class="text-gray-600 mb-4">${contentPreview}</p>
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>Por: ${newsItem.author}</span>
                        <span>${formattedDate}</span>
                    </div>
                </div>
            `;

            container.appendChild(newsCard);
        });

    } catch (error) {
        
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

// Modal de notícias
function ensureNewsModal() {
    if (document.getElementById('newsModal')) return;
    const modal = document.createElement('div');
    modal.id = 'newsModal';
    modal.className = 'fixed inset-0 z-50 hidden';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black bg-opacity-60" onclick="closeNewsModal()"></div>
        <div class="relative max-w-3xl w-[92%] md:w-[800px] mx-auto my-8 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div id="newsModalHeader"></div>
            <div class="p-6">
                <div class="text-sm text-blue-matte mb-2" id="newsModalCategory"></div>
                <h3 class="text-2xl font-bold mb-3 text-gray-800" id="newsModalTitle"></h3>
                <div class="text-sm text-gray-500 mb-4" id="newsModalMeta"></div>
                <div class="prose max-w-none text-gray-700" id="newsModalContent"></div>
                <div class="mt-6 flex justify-end">
                    <button class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50" onclick="closeNewsModal()">Fechar</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    // Esc para fechar
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNewsModal(); });
}

window.openNewsModal = function (index) {
    const list = window._newsList || [];
    const item = list[index];
    if (!item) return;
    const date = item.date?.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : new Date());
    const meta = `${item.author || ''} • ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    const img = item.imageUrl || item.image || '';
    // Abrir imagem completa no modal
    const header = img ? `<img src="${img}" alt="${item.title || ''}" class="w-full object-contain max-h-[70vh] bg-black" loading="lazy" referrerpolicy="no-referrer" />` : '';
    document.getElementById('newsModalHeader').innerHTML = header;
    document.getElementById('newsModalCategory').textContent = '';
    document.getElementById('newsModalTitle').textContent = item.title || '';
    document.getElementById('newsModalMeta').textContent = meta;
    document.getElementById('newsModalContent').textContent = item.content || '';
    document.getElementById('newsModal').classList.remove('hidden');
}

window.closeNewsModal = function () {
    const m = document.getElementById('newsModal');
    if (m) m.classList.add('hidden');
}

// Função para abrir modal do FAQ
window.openFAQModal = function (faqId) {
    const faqData = {
        'faq1': {
            title: 'Treinos Modo Liga',
            content: `
                <p>Os <strong>Treinos Modo Liga</strong> são compostos por <strong>2 quedas consecutivas</strong> (15 times) no formato competitivo.</p>
                <p>As partidas acontecem em <strong>salas Modo Liga</strong>, com visibilidade ativa, simulando o ambiente dos grandes campeonatos.</p>
                <p>O <strong>Top 1 de cada horário</strong> ganha vaga no <strong>Camp Freitas</strong> como premiação.</p>
                <p class="text-blue-600 font-medium">💡 <strong>Ideal para equipes que buscam treinar em formato profissional e conquistar espaço no cenário.</strong></p>
            `
        },
        'faq2': {
            title: 'Cancelamento de Inscrição',
            content: `
                <p>Após o pagamento, a inscrição não pode ser cancelada, pois o slot é reservado exclusivamente para sua equipe.</p>
                <p>Porém, se houver erro de horário, duplicidade ou imprevisto, entre em contato com o suporte antes do início da sala — analisamos caso a caso.</p>
                <p class="text-orange-600 font-medium">⚠ Sempre confirme o horário e nome da equipe antes de finalizar o pagamento.</p>
            `
        },
        'faq3': {
            title: 'Formas de Pagamento',
            content: `
                <p>Aceitamos:</p>
                <ul class="list-disc list-inside space-y-1 ml-4">
                    <li>Pix (instantâneo)</li>
                    <li>Pix Copia e Cola</li>
                    <li>Transferência bancária</li>
                    <li>PAYPAL (em casos específicos)</li>
                </ul>
                <p class="text-green-600 font-medium">⚡ Pagamentos confirmados garantem a vaga automaticamente.</p>
            `
        },
        'faq4': {
            title: 'Grupos das Salas',
            content: `
                <p>Assim que sua inscrição é confirmada, você recebe o link do grupo oficial (whatsapp), aqui mesmo no site. Vá em "meus pedidos" e clique em "acessar grupo de whatsapp"</p>
                <p>Lá serão enviadas as informações da sala (ID e senha) e as atualizações do cronograma.</p>
                <p class="text-blue-600 font-medium">💬 Fique atento — o ID e a Senha são enviados cerca de 10 minutos antes do início da partida.</p>
            `
        },
        'faq5': {
            title: 'Premiações',
            content: `
                <p>Sim! Em muitos horários, os Top 1 dos treinos recebem vagas gratuitas para os campeonatos ou bônus especiais.</p>
                <p>Além disso, os associados participam de premiações exclusivas e sorteios mensais.</p>
                <p class="text-yellow-600 font-medium">🎁 Treine, ganhe destaque e conquiste prêmios com a Org Freitas.</p>
            `
        },
        'faq6': {
            title: 'Benefícios de Associado',
            content: `
                <p>Os associados têm acesso a benefícios exclusivos, como:</p>
                <ul class="list-disc list-inside space-y-1 ml-4">
                    <li>Concorrer a campeonatos com vantagens</li>
                    <li>Concorrer a troféus e banners personalizados</li>
                    <li>Jogar até 10 horários por dia</li>
                    <li>Participar de ranking geral das melhores equipes do Mês</li>
                </ul>
                <p class="text-purple-600 font-medium">📢 Ser associado é ter prioridade e visibilidade dentro da comunidade Freitas.</p>
            `
        },
        'faq7': {
            title: 'Horários dos Treinos',
            content: `
                <p>Os X Treinos Freitas acontecem de segunda a sexta, das 14h às 23h (horário de Brasília).</p>
                <p>As vagas são limitadas e organizadas por horário.</p>
                <p class="text-blue-600 font-medium">💡 Compre suas vagas com antecedência e garanta seu espaço.</p>
            `
        },
        'faq8': {
            title: 'Resgate da Premiação',
            content: `
                <p>Após o resultado oficial ser divulgado, um representante da Org Freitas entrará em contato com o líder da equipe premiada via WhatsApp para confirmar os dados de pagamento.</p>
                <p>O prêmio é enviado diretamente ao responsável cadastrado na inscrição, dentro do prazo informado no regulamento.</p>
                <p class="text-green-600 font-medium">💬 Certifique-se de que o número de contato esteja correto no momento da inscrição para evitar atrasos no resgate.</p>
            `
        },
        'faq9': {
            title: 'Modalidade do Jogo',
            content: `
                <p>A modalidade é Misto, ou seja, permitimos jogadores de todas as plataformas (mobile, emulador e iPad).</p>
                <p class="text-blue-600 font-medium">💡 O foco é oferecer treinos equilibrados, acessíveis e competitivos para todos os estilos de jogo.</p>
            `
        }
    };

    const faq = faqData[faqId];
    if (faq) {
        document.getElementById('faqModalTitle').textContent = faq.title;
        document.getElementById('faqModalContent').innerHTML = faq.content;
        document.getElementById('faqModal').classList.remove('hidden');
    }
}

// Função para fechar modal do FAQ
window.closeFAQModal = function () {
    document.getElementById('faqModal').classList.add('hidden');
}

// ==================== SMOOTH ANIMATIONS SYSTEM ====================

// Initialize fade-in animations for cards
function initFadeInAnimations() {
    const cards = document.querySelectorAll('.product-card, .news-card, article');
    cards.forEach((card, index) => {
        card.classList.add('fade-in');
        if (index < 4) {
            card.classList.add(`fade-in-delay-${index + 1}`);
        }

        // Use Intersection Observer for better performance
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(card);
    });
}

// Initialize scroll reveal animations
function initScrollReveal() {
    const elements = document.querySelectorAll('section, h2, h3');
    elements.forEach(el => {
        el.classList.add('scroll-reveal');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        observer.observe(el);
    });
}

// Handle lazy loaded images
function initLazyImageAnimations() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        // Se a imagem já está carregada, marcar como loaded imediatamente
        if (img.complete && img.naturalHeight !== 0) {
            img.classList.add('loaded');
        } else {
            // Adicionar listeners para quando a imagem carregar
            const handleLoad = () => {
                img.classList.add('loaded');
            };

            img.addEventListener('load', handleLoad);
            img.addEventListener('error', handleLoad); // Mostrar mesmo se houver erro

            // Fallback: se a imagem já carregou mas o evento não disparou
            if (img.complete) {
                setTimeout(() => {
                    if (!img.classList.contains('loaded')) {
                        img.classList.add('loaded');
                    }
                }, 100);
            }
        }
    });
    // Garantir que imagens não fiquem invisíveis por muito tempo (fallback geral)
    setTimeout(() => {
        images.forEach(img => {
            if (!img.classList.contains('loaded')) {
                img.classList.add('loaded');
            }
        });
    }, 2000);

    // Também verificar todas as imagens sem loading="lazy" para garantir que apareçam
    const allImages = document.querySelectorAll('img:not([loading="lazy"])');
    allImages.forEach(img => {
        img.style.opacity = '1'; // Forçar visibilidade
    });
}

// Main initialization function
function initSmoothAnimations() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initFadeInAnimations();
            initScrollReveal();
            initLazyImageAnimations();
        });
    } else {
        // DOM already loaded
        setTimeout(() => {
            initFadeInAnimations();
            initScrollReveal();
            initLazyImageAnimations();
        }, 100);
    }
}

// Re-initialize animations when new content is loaded (e.g., news, products)
function reinitAnimations(container) {
    if (!container) return;
    const newCards = container.querySelectorAll('.product-card, .news-card, article, .min-w-full');
    newCards.forEach((card, index) => {
        card.classList.add('fade-in');
        if (index < 4) {
            card.classList.add(`fade-in-delay-${index + 1}`);
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(card);
    });

    // Also handle images in the container
    const images = container.querySelectorAll('img');
    images.forEach(img => {
        if (img.hasAttribute('loading') && img.getAttribute('loading') === 'lazy') {
            // Imagens lazy
            if (img.complete && img.naturalHeight !== 0) {
                img.classList.add('loaded');
            } else {
                const handleLoad = () => {
                    img.classList.add('loaded');
                };
                img.addEventListener('load', handleLoad);
                img.addEventListener('error', handleLoad);

                // Fallback
                if (img.complete) {
                    setTimeout(() => {
                        if (!img.classList.contains('loaded')) {
                            img.classList.add('loaded');
                        }
                    }, 100);
                }
            }
        } else {
            // Imagens sem lazy - garantir que apareçam
            img.style.opacity = '1';
        }
    });
    // Fallback: forçar mostrar imagens no container após curto timeout
    setTimeout(() => {
        images.forEach(img => {
            if (!img.classList.contains('loaded')) img.classList.add('loaded');
            img.style.opacity = '1';
        });
    }, 1500);
}

// Make functions globally available
window.reinitAnimations = reinitAnimations;
window.initSmoothAnimations = initSmoothAnimations;

// --- Agendamento nativo (Firestore + Netlify Function) ---
const scheduleConfig =
{
    'modo-liga': { label: 'XTreino Modo Liga', price: 3.00 },
    'camp-freitas': { label: 'Camp Freitas', price: 8.00, startDate: '2026-01-12', allowedWeekdays: [1, 2, 3, 4, 5], slots: ['19h', '20h', '21h', '22h', '23h'] },
    'camp-final': { label: 'Vaga Direto na Final', price: 100.00 },
    'semanal-freitas': { label: 'Semanal Freitas', price: 3.50 },
    'xtreino-tokens': { label: 'XTreino Tokens', price: 1.00 },
    // Produtos da loja virtual
    // 'sensibilidades': { label: 'Sensibilidade no Free Fire – PC / Android / iOS', price: 8.00, isProduct: true },
    // 'imagens': { label: 'Imagens Aéreas dos Mapas', price: 2.00, isProduct: true },
    // 'planilhas': { label: 'Planilha de Análise de Times', price: 19.00, isProduct: true },
    // 'passe-booyah': { label: 'Passe de Elite', price: 11.00, isProduct: true },
    // 'camisa': { label: 'Camisa Oficial Org Freitas', price: 89.90, isProduct: true }
};

// Função para controlar a exibição da seleção de marcas Android
function handlePlatformChange() {
    const platformSelect = document.getElementById('platformSelect');
    const androidBrandContainer = document.getElementById('androidBrandContainer');
    const androidBrandSelect = document.getElementById('androidBrandSelect');

    if (platformSelect && androidBrandContainer && androidBrandSelect) {
        if (platformSelect.value === 'android') {
            androidBrandContainer.classList.remove('hidden');
            androidBrandSelect.required = true;
        } else {
            androidBrandContainer.classList.add('hidden');
            androidBrandSelect.required = false;
            androidBrandSelect.value = '';
        }
    }
}

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

        // Inserir antes da seção "Finalizar Reservas" (Payment Section)
        const paymentSection = document.querySelector('#schedForm .bg-white.rounded-2xl.p-6.border.border-gray-200:last-child');
        if (paymentSection) {
            paymentSection.parentNode.insertBefore(container, paymentSection);
        } else {
            // Fallback: inserir no final do formulário
            const form = document.getElementById('schedForm');
            if (form) {
                form.appendChild(container);
            }
        }
    }

    const container = document.getElementById('productOptions');

    switch (productId) {
        case 'sensibilidades':
            // Sensibilidades com seleção de plataforma
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
                    <p class="text-gray-600 text-sm mb-4">Inclui: Sensibilidade otimizada, Pack de Otimização, Configuração Completa, Aprimoramento de Mira e Reação.</p>
                    
                    <div class="space-y-3">
                        <label class="block text-sm font-medium text-gray-700">
                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            Escolha sua plataforma:
                        </label>
                        <select id="platformSelect" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700" onchange="handlePlatformChange()">
                            <option value="">Selecione uma plataforma</option>
                            <option value="pc">🖥️ PC (Windows)</option>
                            <option value="android">📱 Android</option>
                            <option value="ios">🍎 iOS (iPhone/iPad)</option>
                        </select>
                        
                        <div id="androidBrandContainer" class="hidden">
                            <label class="block text-sm font-medium text-gray-700">
                                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                </svg>
                                Escolha a marca do seu dispositivo:
                            </label>
                            <select id="androidBrandSelect" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700">
                                <option value="">Selecione a marca</option>
                                <option value="samsung">📱 Samsung</option>
                                <option value="motorola">📱 Motorola</option>
                                <option value="lg">📱 LG</option>
                                <option value="xiaomi">📱 Xiaomi</option>
                            </select>
                        </div>
                        
                        <p class="text-xs text-gray-500">O arquivo será personalizado para sua plataforma e dispositivo escolhidos</p>
                    </div>
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
                        <label class="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="checkbox" name="mapOption" value="alpina" class="w-4 h-4"> <span>Alpine</span></label>
                        <label class="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="checkbox" name="mapOption" value="novaterra" class="w-4 h-4"> <span>Nova Terra</span></label>
                        </div>
                    <div class="mt-4 bg-blue-100 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-sm text-blue-800 font-medium">Preços: 1 mapa R$2 | 2 por R$4 | 3 por R$5 | 4 por R$6 | 5 por R$7 • Selecionados: <b id="mapsCount">0</b> • Total: <b id="mapsPrice">R$ 0,00</b></span>
                        </div>
                    </div>
                </div>
            `;
            // Atualizar contagem/preço conforme seleção
            (function () {
                const prices = { 1: 2, 2: 4, 3: 5, 4: 6, 5: 7 }; // Ajustado: 4 mapas = R$ 6,00
                const update = () => {
                    const count = document.querySelectorAll('input[name="mapOption"]:checked').length;
                    const price = prices[count] || (count > 5 ? prices[5] : 0);
                    const c = document.getElementById('mapsCount'); if (c) c.textContent = String(count);
                    const p = document.getElementById('mapsPrice'); if (p) p.textContent = `R$ ${price.toFixed(2)}`;
                };
                document.querySelectorAll('input[name="mapOption"]').forEach(i => i.addEventListener('change', update));
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
        case 'passe':
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
                    <div class="mt-4 bg-green-100 rounded-lg p-3 flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="text-sm text-green-800 font-medium">Entrega rápida! Não pedimos senha/email, apenas o ID.</span>
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
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nome na Camisa</label>
                            <input id="shirtName" type="text" placeholder="Ex.: FREITAS" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                            <input id="addrNome" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                            <input id="customerCPF" type="text" placeholder="000.000.000-00" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                            <input id="addrCEP" type="text" placeholder="00000-000" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                            <input id="addrRua" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Número</label>
                            <input id="addrNumero" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                            <input id="addrComplemento" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                            <input id="addrBairro" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                            <input id="addrCidade" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                            <input id="addrEstado" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors" />
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

        default: {
            // Produtos criados pelo admin — detecta o tipo pelo dado salvo no Firestore
            const prodData = (window.scheduleConfig?.[productId]) || (typeof products !== 'undefined' && products[productId]) || {};
            const prodCat = (prodData.category || '').toLowerCase();
            const prodName = (prodData.name || prodData.label || '').toLowerCase();
            const isPasse = prodCat === 'passe' || prodName.includes('passe') || prodName.includes('pass booyah');
            const isFisico = prodCat === 'fisico' || prodCat === 'physical';

            const isAereas = prodCat === 'aereas';

            if (isAereas) {
                // Imagens Aéreas do admin — checkboxes com mapas disponíveis
                const mapDefs = [
                    { key: 'bermuda',   label: 'Bermuda' },
                    { key: 'purgatorio',label: 'Purgatório' },
                    { key: 'solara',    label: 'Solara' },
                    { key: 'kalahari',  label: 'Kalahari' },
                    { key: 'novaTerra', label: 'Nova Terra' }
                ];
                const ml = prodData.mapLinks || {};
                // Mostrar só mapas com link; se nenhum ainda, mostrar todos
                const displayMaps = mapDefs.filter(m => ml[m.key] && ml[m.key].trim() !== '');
                const mapsHtml = (displayMaps.length > 0 ? displayMaps : mapDefs)
                    .map(m => `<label class="flex items-center gap-3 p-3 border border-orange-200 rounded-xl bg-white hover:bg-orange-50 cursor-pointer">
                        <input type="checkbox" name="aereasMapOption" value="${m.key}" class="w-4 h-4 accent-orange-500">
                        <i class="fas fa-map-marker-alt text-orange-400 text-sm"></i>
                        <span class="text-sm font-medium text-gray-800">${m.label}</span>
                    </label>`).join('');
                const basePrice = (prodData.priceOptions?.[0]?.price) || prodData.price || 2;
                container.innerHTML = `
                    <div class="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                                <i class="fas fa-map text-white"></i>
                            </div>
                            <h4 class="text-lg font-semibold text-gray-800">Selecionar Mapas</h4>
                        </div>
                        <div class="grid md:grid-cols-2 gap-3 mb-4">${mapsHtml}</div>
                        <div class="bg-orange-100 rounded-lg p-3">
                            <span class="text-sm text-orange-800 font-medium">
                                Selecionados: <b id="aereasCount">0</b> •
                                Total: <b id="aereasPrice">R$ 0,00</b>
                            </span>
                        </div>
                    </div>`;
                const updateAereasPrice = () => {
                    const n = document.querySelectorAll('input[name="aereasMapOption"]:checked').length;
                    const el = document.getElementById('aereasCount'); if (el) el.textContent = String(n);
                    const ep = document.getElementById('aereasPrice'); if (ep) ep.textContent = `R$ ${(n * basePrice).toFixed(2)}`;
                };
                document.querySelectorAll('input[name="aereasMapOption"]').forEach(i => i.addEventListener('change', updateAereasPrice));
                updateAereasPrice();
            } else if (isPasse) {
                container.innerHTML = `
                    <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                                <i class="fas fa-gamepad text-white"></i>
                            </div>
                            <h4 class="text-lg font-semibold text-gray-800">Informações do Jogo</h4>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nick (Apelido no Free Fire) <span class="text-red-500">*</span></label>
                                <input type="text" id="gameNick" placeholder="Seu apelido no jogo"
                                       class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">ID do Jogador (Free Fire) <span class="text-red-500">*</span></label>
                                <input type="text" id="gameId" placeholder="Ex.: 123456789"
                                       class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Contato WhatsApp <span class="text-red-500">*</span></label>
                                <input type="tel" id="gameContact" placeholder="(XX) 9XXXX-XXXX"
                                       class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors">
                            </div>
                        </div>
                        <div class="mt-4 bg-green-100 rounded-lg p-3 flex items-center gap-2">
                            <i class="fas fa-info-circle text-green-600 flex-shrink-0"></i>
                            <span class="text-sm text-green-800 font-medium">Não pedimos senha/email. Apenas Nick, ID e WhatsApp para entrega.</span>
                        </div>
                    </div>
                `;
            } else if (isFisico) {
                container.innerHTML = `
                    <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                                <i class="fas fa-box text-white"></i>
                            </div>
                            <h4 class="text-lg font-semibold text-gray-800">Dados para Entrega</h4>
                        </div>
                        <div class="grid md:grid-cols-2 gap-3">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nome Completo <span class="text-red-500">*</span></label>
                                <input id="addrNome" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">CPF <span class="text-red-500">*</span></label>
                                <input id="customerCPF" type="text" placeholder="000.000.000-00" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Tamanho (se aplicável)</label>
                                <select id="prodTamanho" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                                    <option value="">Não se aplica</option>
                                    <option value="PP">PP</option>
                                    <option value="P">P</option>
                                    <option value="M">M</option>
                                    <option value="G">G</option>
                                    <option value="GG">GG</option>
                                    <option value="XGG">XGG</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">CEP <span class="text-red-500">*</span></label>
                                <input id="addrCEP" type="text" placeholder="00000-000" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Endereço (Rua) <span class="text-red-500">*</span></label>
                                <input id="addrRua" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Número</label>
                                <input id="addrNumero" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                                <input id="addrComplemento" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Bairro <span class="text-red-500">*</span></label>
                                <input id="addrBairro" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Cidade <span class="text-red-500">*</span></label>
                                <input id="addrCidade" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Estado <span class="text-red-500">*</span></label>
                                <input id="addrEstado" type="text" class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors">
                            </div>
                        </div>
                        <div class="mt-4 bg-purple-100 rounded-lg p-3 flex items-center gap-2">
                            <i class="fas fa-truck text-purple-600 flex-shrink-0"></i>
                            <span class="text-sm text-purple-800 font-medium">Produto físico — será enviado pelo correio após confirmação do pagamento.</span>
                        </div>
                    </div>
                `;
            } else {
                // Digital — coleta Nome, Email, Telefone
                container.innerHTML = `
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-download text-white"></i>
                            </div>
                            <h4 class="text-lg font-semibold text-gray-800">Dados para Recebimento</h4>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nome Completo <span class="text-red-500">*</span></label>
                                <input type="text" id="digitalNome" placeholder="Seu nome completo"
                                       class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">E-mail <span class="text-red-500">*</span></label>
                                <input type="email" id="digitalEmail" placeholder="seu@email.com"
                                       class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp <span class="text-red-500">*</span></label>
                                <input type="tel" id="digitalTelefone" placeholder="(XX) 9XXXX-XXXX"
                                       class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors">
                            </div>
                        </div>
                        <div class="mt-4 bg-blue-100 rounded-lg p-3 flex items-center gap-2">
                            <i class="fas fa-bolt text-blue-600 flex-shrink-0"></i>
                            <span class="text-sm text-blue-800 font-medium">O link de download será liberado automaticamente após a confirmação do pagamento.</span>
                        </div>
                    </div>
                `;
            }
            break;
        }
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

    document.getElementById('schedPrice').textContent = finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

// Global variables for multiple reservations
let selectedTimes = [];
let teams = [];
let teamCounter = 0;
let selectedDates = [];

function openScheduleModal(eventType) {
    const cfg = scheduleConfig[eventType];
    const modal = document.getElementById('scheduleModal');
    if (!cfg || !modal) return;

    // Reset global variables
    selectedTimes = [];
    teams = [];
    teamCounter = 0;

    modal.dataset.eventType = eventType;
    document.getElementById('schedPrice').textContent = cfg.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('schedEventType').textContent = cfg.label;

    // Mostrar/ocultar seção de cupom conforme tipo de pagamento
    (function () {
        const couponSection = document.getElementById('scheduleCouponSection');
        if (couponSection) {
            // Esconde cupom quando pagamento é via tokens
            couponSection.style.display = cfg.payWithToken ? 'none' : 'block';
        }
        if (cfg.payWithToken) {
            // Garante que nenhum cupom de agendamento fique aplicado
            try { window.appliedScheduleCoupon = null; } catch (_) { }
            const msg = document.getElementById('schedCouponMessage');
            if (msg) { msg.classList.add('hidden'); msg.textContent = ''; }
            const input = document.getElementById('schedCouponCodeInput');
            if (input) { input.value = ''; }
        }
    })();
    updateScheduleCouponUI();

    // Initialize with one team
    addTeam();

    // Sincronizar tokens do usuário antes de qualquer checagem
    try { if (typeof syncUserTokens === 'function') { syncUserTokens(); } } catch (_) { }

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

        // Esconder seções específicas para produtos
        const reservationsSummarySection = document.getElementById('reservationsSummarySection');
        if (reservationsSummarySection) {
            reservationsSummarySection.style.display = 'none';
        }

        const teamsSection = document.getElementById('teamsSection');
        if (teamsSection) {
            teamsSection.style.display = 'none';
        }

        // Alterar texto do botão para "Finalizar Compra" quando for produto
        const submitBtn = document.getElementById('schedSubmit');
        if (submitBtn) {
            submitBtn.textContent = '🛒 Finalizar Compra';
        }

        

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

    // Mostrar seções específicas para eventos
    const reservationsSummarySection = document.getElementById('reservationsSummarySection');
    if (reservationsSummarySection) {
        reservationsSummarySection.style.display = 'block';
    }

    const teamsSection = document.getElementById('teamsSection');
    if (teamsSection) {
        teamsSection.style.display = 'block';
    }

    // Restaurar texto original do botão para eventos
    const submitBtn = document.getElementById('schedSubmit');
    if (submitBtn) {
        submitBtn.textContent = '✅ Confirmar e Pagar';
    }

    // Detectar evento grátis e ajustar UI (sem pagamento, cupom ou tokens)
    {
        const _isFree = cfg.price === 0 || cfg.isFree === true;
        modal.dataset.isFree = _isFree ? '1' : '0';
        const _couponSec = document.getElementById('scheduleCouponSection');
        const _payTokenBtn = document.getElementById('schedPayTokens');
        const _priceEl = document.getElementById('schedPrice');
        if (_isFree) {
            if (_couponSec) _couponSec.style.display = 'none';
            if (_payTokenBtn) _payTokenBtn.style.display = 'none';
            if (submitBtn) submitBtn.textContent = '✅ Confirmar Inscrição Grátis';
            if (_priceEl) _priceEl.textContent = 'GRÁTIS';
        } else {
            if (_couponSec) _couponSec.style.display = '';
            if (_payTokenBtn) _payTokenBtn.style.display = '';
        }
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
    // Ajustar limites de data por tipo de evento
    (function () {
        const dateInput = document.getElementById('schedDate');
        if (!dateInput) return;
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        // Para camp-freitas, usar configurações específicas (semifinais têm prioridade)
        if (eventType === 'camp-freitas') {
            const cfg = scheduleConfig[eventType] || {};
            // Prioridade: se há datas de semifinal, manter essas datas como opções mínimas
            const availableDates = CAMP_SEMIFINAL_DATES.filter(d => d >= todayStr);
            if (availableDates.length > 0) {
                dateInput.min = availableDates[0];
                dateInput.max = availableDates[availableDates.length - 1];
                dateInput.value = availableDates[0];
            } else if (cfg.startDate) {
                // Usar startDate da configuração quando não for semifinal
                dateInput.min = cfg.startDate;
                dateInput.value = cfg.startDate;
                // remover max para permitir agendamento ad infinitum
                try { dateInput.removeAttribute('max'); } catch (_) { }
            } else {
                // fallback: manter comportamento antigo (bloqueado)
                dateInput.min = CAMP_SEMIFINAL_DATES[0];
                dateInput.max = CAMP_SEMIFINAL_DATES[CAMP_SEMIFINAL_DATES.length - 1];
                dateInput.value = CAMP_SEMIFINAL_DATES[0];
            }
            updateSelectedDate();
        } else if (eventType === 'camp-final') {
            const availableDates = CAMP_FINAL_DATES.filter(d => d >= todayStr);
            if (availableDates.length > 0) {
                dateInput.min = availableDates[0];
                dateInput.max = availableDates[availableDates.length - 1];
                dateInput.value = availableDates[0];
            } else {
                dateInput.min = CAMP_FINAL_DATES[0];
                dateInput.max = CAMP_FINAL_DATES[CAMP_FINAL_DATES.length - 1];
                dateInput.value = CAMP_FINAL_DATES[0];
            }
            updateSelectedDate();
        } else {
            // Para outros eventos, permitir de hoje em diante
            dateInput.min = todayStr;
            dateInput.removeAttribute('max');
        }
    })();
    // re-render quando a data mudar
    const dateInput = document.getElementById('schedDate');
    if (dateInput && !dateInput._schedBound) {
        dateInput.addEventListener('change', () => {
            updateSelectedDate();
            renderScheduleTimes();
        });
        dateInput._schedBound = true;
    }
    // Resetar datas múltiplas selecionadas ao abrir
    selectedDates = [];
    renderSelectedDatesList();
    renderScheduleTimes();
    // Preenche dados se logado
    try {
        if (window.isLoggedIn && window.currentUserProfile) {
            const p = window.currentUserProfile;
            const team = document.getElementById('schedTeam');
            const email = document.getElementById('schedEmail');
            const phone = document.getElementById('schedPhone');
            if (team) team.value = p.teamName || '';
            if (email) email.value = p.email || '';
            if (phone) phone.value = p.phone || '';
        }
    } catch (_) { }
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

    // Atualizações periódicas e ao voltar o foco (evita tela antiga ficar válida)
    try {
        if (window.__schedRefreshInterval) { clearInterval(window.__schedRefreshInterval); window.__schedRefreshInterval = null; }
        window.__schedRefreshInterval = setInterval(() => { try { renderScheduleTimes(); } catch (_) { } }, 60000); // 60s
        // Handlers para quando o usuário volta à aba/janela
        window.__schedVisibilityHandler = () => { if (document.visibilityState === 'visible') { try { renderScheduleTimes(); } catch (_) { } } };
        window.__schedFocusHandler = () => { try { renderScheduleTimes(); } catch (_) { } };
        document.addEventListener('visibilitychange', window.__schedVisibilityHandler);
        window.addEventListener('focus', window.__schedFocusHandler);
    } catch (_) { }
}
function closeScheduleModal() {
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

        // Limpar times e resetar contador quando fechar o modal
        const teamsContainer = document.getElementById('teamsContainer');
        if (teamsContainer) {
            teamsContainer.innerHTML = '';
        }
        teams = [];
        teamCounter = 0;
        selectedTimes = [];
        selectedDates = [];
        appliedScheduleCoupon = null;
        scheduleOriginalTotal = 0;
        updateScheduleCouponUI();

        // Limpar resumo de reservas
        const summaryContainer = document.getElementById('reservationsSummary');
        if (summaryContainer) {
            summaryContainer.innerHTML = '<p class="text-gray-600">Nenhuma reserva selecionada</p>';
        }
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement) {
            totalPriceElement.textContent = 'R$ 0,00';
        }
    }
    // Remover timers/handlers de atualização
    try {
        if (window.__schedRefreshInterval) { clearInterval(window.__schedRefreshInterval); window.__schedRefreshInterval = null; }
        if (window.__schedVisibilityHandler) { document.removeEventListener('visibilitychange', window.__schedVisibilityHandler); window.__schedVisibilityHandler = null; }
        if (window.__schedFocusHandler) { window.removeEventListener('focus', window.__schedFocusHandler); window.__schedFocusHandler = null; }
    } catch (_) { }
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}
// Renderizar lista de datas selecionadas para agendamento múltiplo
function renderSelectedDatesList() {
    const list = document.getElementById('selectedDatesList');
    if (!list) return;
    if (!selectedDates || selectedDates.length === 0) {
        list.innerHTML = '';
        updateReservationsSummary();
        return;
    }
    const fmt = (d) => {
        try {
            const [y, m, dd] = d.split('-').map(n => parseInt(n, 10));
            const date = new Date(y, m - 1, dd);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });
        } catch (_) { return d; }
    };
    list.innerHTML = selectedDates.map(d => (
        `<div class="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
            <span>${fmt(d)}</span>
            <button type="button" class="text-red-600 hover:text-red-800 text-xs" onclick="removeSelectedDate('${d}')">remover</button>
         </div>`
    )).join('');
    updateReservationsSummary();
}
function addSelectedDate() {
    const input = document.getElementById('schedDate');
    const modal = document.getElementById('scheduleModal');
    const eventType = modal?.dataset?.eventType || null;
    if (!input || !input.value) return;
    const date = input.value;
    if (!isValidScheduleDate(date, eventType)) {
        alert('Data inválida para este evento.');
        return;
    }
    if (!selectedDates.includes(date)) {
        selectedDates.push(date);
        renderSelectedDatesList();
    }
}

function removeSelectedDate(dateStr) {
    selectedDates = selectedDates.filter(d => d !== dateStr);
    // Remove os horários associados a essa data
    selectedTimes = selectedTimes.filter(item => item.date !== dateStr);
    renderSelectedDatesList();
    updateReservationsSummary();
    // Se a data removida for a data atualmente exibida, re-renderiza os horários
    const currentDate = document.getElementById('schedDate')?.value;
    if (currentDate === dateStr) {
        renderScheduleTimes();
    }
}

function clearSelectedDates() {
    selectedDates = [];
    selectedTimes = []; // Remove todos os horários, pois não têm mais data associada
    renderSelectedDatesList();
    updateReservationsSummary();
    renderScheduleTimes();
}

function initScheduleDate() {
    const input = document.getElementById('schedDate');
    const today = new Date();
    // Avançar para próximo dia útil se hoje é fim de semana
    const dow = today.getDay();
    if (dow === 0) today.setDate(today.getDate() + 1); // domingo → segunda
    else if (dow === 6) today.setDate(today.getDate() + 2); // sábado → segunda
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    input.value = `${y}-${m}-${d}`;
}
function setSchedToday() {
    initScheduleDate();
    updateSelectedDate();
    renderScheduleTimes();
}
function setSchedTomorrow() {
    const input = document.getElementById('schedDate');
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    input.value = `${y}-${m}-${d}`;
    updateSelectedDate();
    renderScheduleTimes();
}

// Função para atualizar a data selecionada
function updateSelectedDate() {
    const dateInput = document.getElementById('schedDate');
    const selectedDateDisplay = document.getElementById('schedSelectedDate');
    if (dateInput && selectedDateDisplay) {
        const raw = dateInput.value;
        let date = null;
        if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            // Criar Date no fuso local para evitar retroceder um dia (UTC)
            const [y, m, d] = raw.split('-').map(n => parseInt(n, 10));
            date = new Date(y, m - 1, d);
        } else if (raw) {
            // Fallback seguro: normalizar para meia-noite local
            const tmp = new Date(raw);
            if (!isNaN(tmp.getTime())) {
                date = new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
            }
        }
        selectedDateDisplay.textContent = (date && !isNaN(date.getTime()))
            ? date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : '--';
    }
}
const scheduleCache = {};

// Capacidade de vagas por tipo de evento e horário (casos especiais)
function getEventCapacity(eventType, hourStr, dateStr) {
    const type = String(eventType || '').toLowerCase();
    const hour = String(hourStr || '').toLowerCase().replace(/\s/g, '');
    const dateIso = dateStr || (document.getElementById('schedDate')?.value || null);

    // Modo liga: 15
    if (type === 'modo-liga') return 15;

    // Camp Final: apenas 2 vagas fixas
    if (type === 'camp-final') return 2;

    // Semanal Freitas 22h: capacidade 4
    if (type === 'semanal-freitas' && (hour === '22h' || hour.includes('22'))) return 4;

    // Camp Freitas SEMIFINAL: 22/11 e 23/11 às 17h - apenas 3 vagas
    if (type === 'camp-freitas') {
        if (dateIso && CAMP_SEMIFINAL_DATES.includes(dateIso) && (hour === '17h' || hour.includes('17'))) {
            return 3; // Semifinal: apenas 3 vagas
        }
    }

    // Demais: 12
    return 12;
}

// Preço por tipo de evento e horário (casos especiais)
function getEventPrice(eventType, hourStr, dateStr) {
    const type = String(eventType || '').toLowerCase();
    const hour = String(hourStr || '').toLowerCase().replace(/\s/g, '');
    const dateIso = dateStr || (document.getElementById('schedDate')?.value || null);
    // Semanal Freitas 22h: R$ 7,00 (vaga direto na final)
    if (type === 'semanal-freitas' && (hour === '22h' || hour.includes('22'))) return 7.00;
    if (type === 'camp-final') return 100.00;
    // Camp Freitas SEMIFINAL: 22/11 e 23/11 às 17h - R$ 60,00
    try {
        if (type === 'camp-freitas' && dateIso) {
            // Verificar se é semifinal primeiro (prioridade)
            if (CAMP_SEMIFINAL_DATES.includes(dateIso) && (hour === '17h' || hour.includes('17'))) {
                return 60.00; // Semifinal: R$ 60,00
            }
            // Camp Freitas PROMO: dias específicos (oitavas)
            const promos = {
                '2024-11-17': { price: 25.00, hours: ['21h', '22h'] }, // Dia 17/11: R$25,00 apenas 21h e 22h
                '2025-11-17': { price: 25.00, hours: ['21h', '22h'] }, // Dia 17/11/2025: R$25,00 apenas 21h e 22h
                '2025-11-13': { price: 20.00, hours: ['21h', '22h', '23h'] },
                '2025-11-14': { price: 20.00, hours: ['20h'] }
            };
            const promo = promos[dateIso];
            if (promo && promo.hours && promo.hours.includes(hour)) return promo.price;
        }
    } catch (_) { }
    // Padrão: usar preço do config
    const cfg = scheduleConfig[eventType] || {};
    return Number(cfg.price || 0);
}

// Valida se a data é válida para agendamento (segunda a sexta, não passado)
function isValidScheduleDate(dateStr, eventType) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Regras específicas por evento
    if (eventType === 'camp-freitas') {
        // Prioridade: manter suporte a semifinais já definidas
        const dateIso = dateStr || '';
        if (CAMP_SEMIFINAL_DATES.includes(dateIso)) {
            return date >= today;
        }

        // Usar configuração em scheduleConfig quando disponível (promoção regular a partir de uma data)
        const cfg = scheduleConfig[eventType] || {};
        if (cfg.startDate) {
            // aceitar datas a partir do startDate e somente em weekdays permitidos
            const normalizedStart = new Date(cfg.startDate + 'T00:00:00');
            if (isNaN(normalizedStart.getTime())) {
                // fallback: não permitir
                return false;
            }
            if (date < normalizedStart) return false;
            // verificar dias da semana permitidos se definido
            if (Array.isArray(cfg.allowedWeekdays) && cfg.allowedWeekdays.length > 0) {
                const day = date.getDay(); // 0..6 (Domingo..Sábado)
                if (!cfg.allowedWeekdays.includes(day)) return false;
            } else {
                // por padrão permitir apenas segunda a sexta
                const dayOfWeek = date.getDay();
                if (dayOfWeek < 1 || dayOfWeek > 5) return false;
            }
            // não permitir datas no passado
            if (date < today) return false;
            return true;
        }

        // Se não há configuração, não permitir por padrão
        return false;
    } else if (eventType === 'camp-final') {
        const dateIso = dateStr || '';
        if (CAMP_FINAL_DATES.includes(dateIso)) {
            return date >= today;
        }
        return false;
    }

    // Não pode ser no passado (padrão)
    if (date < today) return false;

    // Só segunda a sexta (1-5)
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
}

async function renderScheduleTimes() {
    const timesWrap = document.getElementById('schedTimes');
    if (!timesWrap) return;
    timesWrap.innerHTML = '';
    const date = document.getElementById('schedDate').value;
    // eventType do modal atual
    const modal = document.getElementById('scheduleModal');
    const eventType = modal?.dataset?.eventType || null;

    // Valida data antes de renderizar
    if (!isValidScheduleDate(date, eventType)) {
        let msg = 'Agendamentos apenas de segunda a sexta-feira e não em datas passadas.';
        if (eventType === 'camp-freitas') {
            msg = 'Camp Freitas (Semifinal) disponível somente em 22/11 e 23/11 às 17h.';
        } else if (eventType === 'camp-final') {
            msg = 'Vaga Direto na Final disponível apenas em 28/11 às 18h.';
        }
        timesWrap.innerHTML = `<p class="text-red-500 text-center py-4">${msg}</p>`;
        return;
    }

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const d = new Date(date + 'T00:00:00');
    const day = dayNames[d.getDay()];

    // Verificar trava geral do evento (event_global_locks)
    try {
        if (window.firebaseDb && eventType) {
            const { doc: _doc, getDoc: _getDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const glSnap = await _getDoc(_doc(window.firebaseDb, 'event_global_locks', eventType));
            if (glSnap.exists() && glSnap.data().locked === true) {
                timesWrap.innerHTML = `<div class="text-center py-6">
                    <div class="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 font-bold text-base">
                        🔴 Este evento está temporariamente suspenso pelo administrador.<br>
                        <span class="font-normal text-sm">Novos horários serão liberados em breve.</span>
                    </div>
                </div>`;
                return;
            }
        }
    } catch(_) {}

    // Definir horários baseados no tipo de evento
    let slots = ['14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h', '22h', '23h'];
    const cfg = scheduleConfig[eventType] || {};
       
    // NÃO filtrar horários travados - eles devem aparecer como "Lotado"
    const now = new Date();
    const selectedDate = new Date(date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();

    // Render imediato com estado neutro e atualiza assíncrono
    slots.forEach(time => {
        const schedule = `${day} - ${time}`;
        const btn = document.createElement('button');
        btn.className = 'slot-btn';
        btn.dataset.schedule = schedule;

        // Verificar se o horário já está disponível (12 minutos antes do horário)
        let isTimeAvailable = true;
        let timeMessage = '';
        if (isToday) {
            const hour = parseInt(time.replace('h', ''));
            const eventTime = new Date(selectedDate);
            eventTime.setHours(hour, 0, 0, 0);

            const minutesUntilEvent = (eventTime - now) / (1000 * 60); // minutos até o evento

            if (minutesUntilEvent < 0) {
                // Horário já passou
                isTimeAvailable = false;
                timeMessage = 'Horário passou';
            } else if (minutesUntilEvent < 12) {
                // Ainda não passaram 12 minutos antes do horário
                isTimeAvailable = false;
                const minutesLeft = Math.ceil(minutesUntilEvent);
                timeMessage = `Disponível em ${minutesLeft} min`;
            }
        }

        if (!isTimeAvailable) {
            btn.className = 'slot-btn bg-gray-300 text-gray-500 cursor-not-allowed';
            btn.disabled = true;
            btn.textContent = `${time} (${timeMessage})`;
            btn.onclick = null;
        } else if (eventType === 'semanal-freitas' && time === '19h') {
            // Semanal Freitas: 19h sempre esgotado
            btn.className = 'slot-btn bg-red-100 text-red-600 cursor-not-allowed';
            btn.disabled = true;
            btn.textContent = `${time} (Lotado)`;
            btn.onclick = null;
        } else {
            const date = document.getElementById('schedDate')?.value || null;
            btn.textContent = `${time} (Carregando...)`;
            btn.onclick = () => {
                document.getElementById('schedSelectedTime').value = schedule;
                document.getElementById('schedSelectedTimeDisplay').textContent = time;
                highlightSelectedSlot(btn, timesWrap);
            };
        }

        timesWrap.appendChild(btn);
    });
    // Atualiza com dados reais e mantém em tempo real
    updateOccupiedAndRefreshButtons(day, date, eventType, timesWrap);
    try {
        const { collection, query, where, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        if (window.__schedUnsub) { try { window.__schedUnsub(); } catch (_) { } }
        const baseQ = [where('date', '==', date)];
        if (eventType) baseQ.push(where('eventType', '==', eventType));
        window.__schedUnsub = onSnapshot(
            query(collection(window.firebaseDb, 'registrations'), ...baseQ),
            () => {
                // Invalidar cache quando houver mudanças
                const cacheKey = `${date}__${eventType || 'all'}`;
                delete scheduleCache[cacheKey];
                // Forçar atualização com dados frescos
                updateOccupiedAndRefreshButtons(day, date, eventType, timesWrap);
            }
        );
    } catch (_) { }
}
function highlightSelectedSlot(selectedBtn, container) {
    Array.from(container.children).forEach(el => el.classList.remove('selected'));
    selectedBtn.classList.add('selected');
}
async function fetchOccupiedForDate(day, date, eventType) {
    const map = {};
    try {
        if (!window.firebaseReady) return map;
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const regsRef = collection(window.firebaseDb, 'registrations');
        // CRÍTICO: usar apenas 1 filtro no Firestore (campo único) para nunca precisar de índice composto
        // date, status e eventType são filtrados em JS depois
        const validStatuses = new Set(['paid', 'confirmed', 'approved', 'pending']);
        // Priorizar eventType (mais seletivo); se não houver, filtrar por date
        const q = eventType
            ? query(regsRef, where('eventType', '==', eventType))
            : query(regsRef, where('date', '==', date));
        const snap = await getDocs(q);
        const parseHourFromRecord = (r) => {
            // Try multiple fields that may contain hour info
            const candidates = [];
            if (r == null) return null;
            const pushIf = (v) => { if (v !== undefined && v !== null) candidates.push(String(v)); };
            pushIf(r.schedule);
            pushIf(r.hour);
            pushIf(r.time);
            pushIf(r.selectedTime);
            pushIf(r.slot);
            pushIf(r.scheduledTime);
            pushIf(r.hourString);

            for (const raw of candidates) {
                if (!raw) continue;
                // Examples: 'Segunda - 19h', '19:00', '19h', '19', 'Seg - 19h (algum texto)'
                // Try patterns in order
                const m1 = raw.match(/(\d{1,2})\s*h/); // 19h
                if (m1) return parseInt(m1[1], 10);
                const m2 = raw.match(/(\d{1,2})\s*:\s*\d{2}/); // 19:00
                if (m2) return parseInt(m2[1], 10);
                const m3 = raw.match(/\b(\d{1,2})\b/); // any standalone number
                if (m3) return parseInt(m3[1], 10);
            }
            return null;
        };

        const normalizeToScheduleKey = (r) => {
            const hh = parseHourFromRecord(r);
            if (hh == null || Number.isNaN(hh)) return null;
            const hourStr = `${hh}h`;
            return `${day} - ${hourStr}`;
        };
        snap.forEach(doc => {
            const r = doc.data();
            if (!validStatuses.has(r.status)) return; // filtrar status em JS
            if (r.date !== date) return; // filtrar date em JS (query usa só eventType)
            const key = normalizeToScheduleKey(r);
            if (!key) return;
            map[key] = (map[key] || 0) + 1;
        });
        // Aplicar travas manuais (schedule_overrides): se locked, marcar como lotado; se extraOccupied, somar
        try {
            const { collection: col2, query: q2, where: w2, getDocs: get2 } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const overridesRef = col2(window.firebaseDb, 'schedule_overrides');

            // CRÍTICO: Garantir que a data está normalizada (YYYY-MM-DD)
            const normalizedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
            if (!normalizedDate) {
                
                return map;
            }

            // Buscar APENAS overrides da data específica (normalizada)
            const allOverrides = await get2(q2(overridesRef, w2('date', '==', normalizedDate)));

            allOverrides.forEach(doc => {
                const ov = doc.data();

                // VALIDAÇÃO CRÍTICA: Garantir que o override é realmente para esta data
                const ovDate = ov.date || '';
                if (ovDate !== normalizedDate) {
                    
                    return; // Ignorar override de data diferente
                }

                const hourNum = parseInt(String(ov.hour || ov.hh || '').replace(/\D/g, ''), 10);
                if (Number.isNaN(hourNum)) return;

                const key = `${day} - ${hourNum}h`;
                const ovEventType = ov.eventType || null;
                const shouldApply = !ovEventType || ovEventType === eventType || !eventType;

                if (shouldApply) {
                    if (ov.extraOccupied) {
                        map[key] = (map[key] || 0) + Number(ov.extraOccupied || 0);
                    }
                    if (ov.locked) {
                        // Horário travado pelo admin: usar capacidade do tipo para forçar lotado
                        const cap = getEventCapacity(eventType, `${hourNum}h`, normalizedDate);
                        map[key] = cap;
                        
                    }
                }
            });
        } catch (err) {
            
        }
    } catch (_) { }
    return map;
}

// Verifica disponibilidade por horário (capacidade por tipo de evento)
async function checkSlotAvailability(date, schedule, eventType) {
    try {
        if (!window.firebaseReady) return true;
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const regsRef = collection(window.firebaseDb, 'registrations');
        // CRÍTICO: campo único no Firestore — sem índice composto
        // date, status e eventType são filtrados em JS
        const validStatuses2 = new Set(['paid', 'confirmed', 'approved', 'pending']);
        const q = eventType
            ? query(regsRef, where('eventType', '==', eventType))
            : query(regsRef, where('date', '==', date));
        const snap = await getDocs(q);
        // Normalizar para comparar por hora
        const wantedHour = parseInt(String(schedule).match(/(\d{1,2})\s*h/)?.[1] || 'NaN', 10);
        let occupied = 0;
        snap.forEach(d => {
            const r = d.data();
            if (!validStatuses2.has(r.status)) return; // filtrar status em JS
            if (r.date !== date) return; // filtrar date em JS
            const rawSchedule = String(r.schedule || '');
            const rawHour = String(r.hour || '');
            let hh = rawSchedule.match(/(\d{1,2})\s*h/)?.[1]
                || rawSchedule.match(/(\d{1,2})\s*:/)?.[1]
                || rawHour.match(/(\d{1,2})/)?.[1];
            hh = parseInt(hh || 'NaN', 10);
            if (!Number.isNaN(hh) && hh === wantedHour) occupied++;
        });
        // Considerar overrides (horários travados pelo admin)
        try {
            const { collection: c2, query: q2, where: w2, getDocs: g2 } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ovRef = c2(window.firebaseDb, 'schedule_overrides');

            // CRÍTICO: Garantir que a data está normalizada (YYYY-MM-DD)
            const normalizedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
            if (!normalizedDate) {
                
                return occupied < getEventCapacity(eventType, `${wantedHour}h`, date);
            }

            // Buscar APENAS overrides da data específica (normalizada)
            const ovSnap = await g2(q2(ovRef, w2('date', '==', normalizedDate)));

            ovSnap.forEach(doc => {
                const ov = doc.data();

                // VALIDAÇÃO CRÍTICA: Garantir que o override é realmente para esta data
                const ovDate = ov.date || '';
                if (ovDate !== normalizedDate) {
                    
                    return; // Ignorar override de data diferente
                }

                const ovHour = parseInt(String(ov.hour || ov.hh || '').replace(/\D/g, ''), 10);

                // Verificar se é o horário que queremos
                if (ovHour === wantedHour) {
                    const ovEventType = ov.eventType || null;

                    // Aplicar override se:
                    // 1. Não tem eventType (genérico) OU
                    // 2. O eventType do override corresponde ao eventType do evento OU
                    // 3. Não temos eventType na verificação
                    const shouldApply = !ovEventType || ovEventType === eventType || !eventType;

                    if (shouldApply) {
                        if (ov.locked) {
                            // Horário travado pelo admin: marcar como lotado (capacidade total)
                            occupied = getEventCapacity(eventType, `${wantedHour}h`, normalizedDate);
                            
                        }
                        if (ov.extraOccupied) {
                            occupied += Number(ov.extraOccupied || 0);
                        }
                    }
                }
            });
        } catch (err) {
            
        }
        const capacity = getEventCapacity(eventType, `${wantedHour}h`, date);
        // Não permitir compra se ocupado >= capacidade (não pode ultrapassar)
        return occupied < capacity;
    } catch (_) { return true; }
}

// Verifica disponibilidade para múltiplos horários e times
async function checkMultipleSlotAvailability(date, selectedTimes, eventType, numberOfTeams) {
  try {
    // Fail-safe: se algo básico estiver errado, não bloqueia o usuário
    if (!date || !Array.isArray(selectedTimes) || selectedTimes.length === 0) {
      return { available: true };
    }

    // Normalização defensiva da data
    const normalizedDate =
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : null;

    if (!normalizedDate) {
      
      return { available: true };
    }

    // 🔥 ÚNICO ponto de verdade agora é o backend
    const response = await fetch('/.netlify/functions/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: normalizedDate,
        selectedTimes,
        eventType: eventType || null,
        numberOfTeams: Number(numberOfTeams || 1)
      })
    });

    if (!response.ok) {
      
      return { available: true }; // fail-safe
    }

    const result = await response.json();

    // Garantia mínima de contrato
    if (typeof result !== 'object' || result === null) {
      
      return { available: true };
    }

    return result;

  } catch (error) {
    // 🔒 Nunca bloquear compra por erro técnico
    

    try {
      logError(
        typeof error?.message === 'string' ? error.message : 'CHECK_AVAILABILITY_ERROR',
        'EVENT_004'
      );
    } catch (_) {
      // logging não pode quebrar fluxo
    }

    return { available: true };
  }
}


async function updateOccupiedAndRefreshButtons(day, date, eventType, container) {
    // IMPORTANTE: Sempre invalidar cache ao mudar de data para evitar dados antigos
    // Garantir que a data está no formato correto (YYYY-MM-DD)
    const normalizedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    if (!normalizedDate) {
        
        return;
    }

    // cache por data - sempre buscar dados frescos para evitar cache de outra data
    const cacheKey = `${normalizedDate}__${eventType || 'all'}`;

    // Invalidar cache se a data mudou (garantir dados frescos)
    const lastDate = window.__lastScheduleDate || null;
    if (lastDate !== normalizedDate) {
        // Limpar cache de outras datas para evitar confusão
        Object.keys(scheduleCache).forEach(key => {
            if (!key.startsWith(`${normalizedDate}__`)) {
                delete scheduleCache[key];
            }
        });
        window.__lastScheduleDate = normalizedDate;
    }

    let occupied = scheduleCache[cacheKey];
    if (!occupied) {
        try {
            occupied = await fetchOccupiedForDate(day, normalizedDate, eventType);
        } catch (_) {
            occupied = {};
        }
        scheduleCache[cacheKey] = occupied;
    }

    // Verificar horários travados diretamente do Firestore - SEMPRE para a data específica
    // CRÍTICO: SEMPRE buscar dados FRESCOS (não usar cache de travas) para detectar removals
    let lockedHours = new Set();
    try {
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const ovRef = collection(window.firebaseDb, 'schedule_overrides');

        // CRÍTICO: Buscar APENAS overrides da data específica (normalizada)
        const ovSnap = await getDocs(query(ovRef, where('date', '==', normalizedDate)));

        ovSnap.forEach(doc => {
            const ov = doc.data();
            const ovDate = ov.date || '';
            if (ovDate !== normalizedDate) return;

            const ovHour = parseInt(String(ov.hour || ov.hh || '').replace(/\D/g, ''), 10);
            if (isNaN(ovHour)) return;

            const ovEventType = ov.eventType || null;
            const shouldApply = !ovEventType || ovEventType === eventType || !eventType;

            if (!shouldApply) return;

            if (ov.locked === true) {
                lockedHours.add(ovHour);
            }
        });
    } catch (err) {}

    // Verificar travas permanentes por horário (event_hour_locks) — sem data, valem sempre
    try {
        const { collection: _c, getDocs: _g } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        if (window.firebaseDb) {
            const hlSnap = await _g(_c(window.firebaseDb, 'event_hour_locks'));
            console.log('[HourLocks] docs encontrados:', hlSnap.size, '| eventType atual:', eventType);
            hlSnap.forEach(doc => {
                const data = doc.data();
                if (data.locked !== true) return;
                const docEventType = (data.eventType || '').toLowerCase().replace(/[\s_]/g, '-');
                const curEventType = (eventType || '').toLowerCase().replace(/[\s_]/g, '-');
                const matchesType = !data.eventType || docEventType === curEventType || doc.id.startsWith(curEventType) || doc.id.startsWith((eventType||''));
                console.log('[HourLocks] doc:', doc.id, '| docEventType:', docEventType, '| match:', matchesType);
                if (!matchesType) return;
                const h = parseInt(String(data.hour || '').replace(/\D/g,''), 10);
                if (!isNaN(h)) { lockedHours.add(h); console.log('[HourLocks] travando hora:', h); }
            });
        } else {
            console.warn('[HourLocks] firebaseDb não disponível ainda');
        }
    } catch (err) { console.error('[HourLocks] erro:', err); }

    const now = new Date();
    const selectedDate = new Date(date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();

    Array.from(container.children).forEach(btn => {
        const schedule = btn.dataset.schedule;
        const time = (schedule || '').split(' - ')[1] || '';
        const hour = parseInt(time.replace('h', ''));
        const capacity = (scheduleConfig[eventType]?.vagas > 0 ? scheduleConfig[eventType].vagas : null) || getEventCapacity(eventType, time);

        // Verificar se o horário está travado (prioridade máxima)
        const isLocked = lockedHours.has(hour);

        // Se estiver travado, forçar como lotado (taken = capacity)
        // Isso faz aparecer como (15/15) ou (capacidade/capacidade)
        const taken = isLocked ? capacity : (occupied[schedule] || 0);
        // Garantir que taken não ultrapasse a capacidade
        const takenClamped = Math.min(taken, capacity);
        const available = Math.max(0, capacity - takenClamped);

        // Verificar se o horário já está disponível (12 minutos antes do horário)
        let isTimeAvailable = true;
        let timeMessage = '';
        if (isToday) {
            const eventTime = new Date(selectedDate);
            eventTime.setHours(hour, 0, 0, 0);

            const minutesUntilEvent = (eventTime - now) / (1000 * 60); // minutos até o evento

            if (minutesUntilEvent < 0) {
                // Horário já passou
                isTimeAvailable = false;
                timeMessage = 'Horário passou';
            } else if (minutesUntilEvent < 12) {
                // Ainda não passaram 12 minutos antes do horário
                isTimeAvailable = false;
                const minutesLeft = Math.ceil(minutesUntilEvent);
                timeMessage = `Disponível em ${minutesLeft} min`;
            }
        }

        // Verificar travamento primeiro (prioridade máxima)
        if (isLocked) {
            // Horário travado pelo admin - OCULTAR
            btn.style.display = 'none';
        } else if (eventType === 'semanal-freitas' && time === '19h') {
            // Semanal Freitas: 19h sempre esgotado - OCULTAR
            btn.style.display = 'none';
        } else if (available === 0) {
            // Horário lotado - OCULTAR
            btn.style.display = 'none';
        } else if (!isTimeAvailable) {
            // Verificar disponibilidade de tempo (12 minutos antes)
            btn.className = 'slot-btn bg-gray-300 text-gray-500 cursor-not-allowed';
            btn.disabled = true;
            btn.innerHTML = `<span class="font-semibold">${time}</span><span class="block text-xs opacity-75 mt-0.5">${timeMessage} • ${taken}/${capacity}</span>`;
            btn.onclick = null;
            btn.style.display = 'block'; // Garantir que está visível
        } else {
            // Horário disponível - mostrar vagas e % preenchido
            btn.className = 'slot-btn';
            btn.disabled = false;
            const _pct = capacity > 0 ? Math.round((taken / capacity) * 100) : 0;
            btn.innerHTML = `<span class="font-semibold">${time}</span><span class="block text-xs opacity-75 mt-0.5">${taken}/${capacity} vagas • ${_pct}%</span><div class="mt-1 w-full bg-black/10 rounded-full h-1"><div class="bg-current h-1 rounded-full transition-all" style="width:${_pct}%"></div></div>`;
            btn.onclick = () => {
                selectTime(schedule, btn);
            };
            btn.style.display = 'block'; // Garantir que está visível
            // Destaque se já estiver selecionado para esta data
            if (isTimeSelected(date, schedule)) {
                btn.classList.add('bg-blue-600', 'text-white');
                btn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
            }
        }       
    });
}

// Function to add a new team
function addTeam() {
    teamCounter++;
    const teamId = `team_${teamCounter}`;
    const teamData = {
        id: teamId,
        name: '',
        email: '',
        phone: ''
    };
    teams.push(teamData);

    const container = document.getElementById('teamsContainer');
    const teamDiv = document.createElement('div');
    teamDiv.id = teamId;
    teamDiv.className = 'bg-gray-50 rounded-xl p-4 border border-gray-200';
    teamDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h5 class="font-semibold text-gray-900">Time ${teamCounter}</h5>
            ${teamCounter > 1 ? `<button type="button" onclick="removeTeam('${teamId}')" class="text-red-600 hover:text-red-800 text-sm">Remover</button>` : ''}
        </div>
        <div class="space-y-3">
            <input type="text" placeholder="Nome do time" 
                   class="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-0 transition-colors"
                   oninput="updateTeam('${teamId}', 'name', this.value)">
            <input type="email" placeholder="Email" 
                   class="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-0 transition-colors"
                   oninput="updateTeam('${teamId}', 'email', this.value)">
            <input type="tel" placeholder="WhatsApp (11) 99999-9999" 
                   class="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-0 transition-colors"
                   oninput="updateTeam('${teamId}', 'phone', this.value)">
        </div>
    `;
    container.appendChild(teamDiv);
    updateReservationsSummary();
}
// Function to remove a team
function removeTeam(teamId) {
    teams = teams.filter(team => team.id !== teamId);
    const teamElement = document.getElementById(teamId);
    if (teamElement) {
        teamElement.remove();
    }
    updateReservationsSummary();
}

// Function to update team data
function updateTeam(teamId, field, value) {
    const team = teams.find(t => t.id === teamId);
    if (team) {
        team[field] = value;
        updateReservationsSummary();
    }
}

async function updateReservationsSummary() {
    const summaryContainer = document.getElementById('reservationsSummary');
    const totalPriceElement = document.getElementById('totalPrice');

    if (selectedTimes.length === 0 || teams.length === 0) {
        summaryContainer.innerHTML = '<p class="text-gray-600">Nenhuma reserva selecionada</p>';
        totalPriceElement.textContent = 'R$ 0,00';
        scheduleOriginalTotal = 0;
        appliedScheduleCoupon = null;
        updateScheduleCouponUI();
        return;
    }

    const modal = document.getElementById('scheduleModal');
    const eventType = modal?.dataset?.eventType || 'modo-liga';
    const cfg = scheduleConfig[eventType];

    // Agrupa horários por data
    const timesByDate = {};
    selectedTimes.forEach(item => {
        if (!timesByDate[item.date]) timesByDate[item.date] = [];
        timesByDate[item.date].push(item.schedule);
    });

    // Determina quais datas usar (selecionadas ou a data atual)
    const datesToUse = (selectedDates && selectedDates.length > 0)
        ? [...selectedDates]
        : [document.getElementById('schedDate')?.value].filter(Boolean);

    let summaryHTML = '';
    let computedTotal = 0;
    let availabilityWarning = '';

    // Verificação de disponibilidade (mantida)
    if (eventType && window.firebaseReady) {
        try {
            for (const d of datesToUse) {
                const times = timesByDate[d] || [];
                if (times.length === 0) continue;
                const availabilityCheck = await checkMultipleSlotAvailability(d, times, eventType, teams.length);
                if (!availabilityCheck.available) {
                    availabilityWarning = `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <div class="flex items-center">
                                <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                                <span class="text-red-700 font-medium">⚠️ Vagas insuficientes em ${d}!</span>
                            </div>
                            <p class="text-red-600 text-sm mt-1">Reduza o número de times ou escolha outros horários.</p>
                        </div>
                    `;
                    break;
                }
            }
        } catch (error) {
            
        }
    }

    // Monta resumo e calcula total
    for (const d of datesToUse) {
        const times = timesByDate[d] || [];
        if (times.length === 0) continue;

        for (const schedule of times) {
            const hour = (schedule.split(' - ')[1] || '').trim();
            const pricePerReservation = getEventPrice(eventType, hour, d);
            const lineTotal = pricePerReservation * teams.length;
            computedTotal += lineTotal;

            const formattedDate = new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
            summaryHTML += `<div class="flex justify-between items-center py-1">
                <span class="text-gray-700">${schedule} (${formattedDate}) × ${teams.length} time(s)</span>
                <span class="font-semibold">R$ ${(pricePerReservation * teams.length).toFixed(2)}</span>
            </div>`;
        }
    }

    summaryContainer.innerHTML = availabilityWarning + summaryHTML;

    scheduleOriginalTotal = Number(computedTotal || 0);
    totalPriceElement.textContent = `R$ ${scheduleOriginalTotal.toFixed(2)}`;

    if (appliedScheduleCoupon) {
        updateSchedulePriceWithCoupon();
    }
}

function isTimeSelected(date, schedule) {
    return selectedTimes.some(item => item.date === date && item.schedule === schedule);
}
function selectTime(schedule, element) {
    const date = document.getElementById('schedDate').value;
    const index = selectedTimes.findIndex(item => item.date === date && item.schedule === schedule);

    if (index !== -1) {
        // Remove
        selectedTimes.splice(index, 1);
        element.classList.remove('bg-blue-600', 'text-white');
        element.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
    } else {
        // Adiciona
        selectedTimes.push({ date, schedule });
        element.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
        element.classList.add('bg-blue-600', 'text-white');
    }

    // Atualiza campos ocultos (opcional)
    const hiddenField = document.getElementById('schedSelectedTime');
    const displayField = document.getElementById('schedSelectedTimeDisplay');
    if (hiddenField) hiddenField.value = schedule;
    if (displayField) {
        const hour = schedule.split(' - ')[1] || schedule;
        displayField.textContent = hour;
    }

    updateReservationsSummary();

    // Atualiza o preço exibido nos detalhes do evento
    try {
        const modal = document.getElementById('scheduleModal');
        const eventType = modal?.dataset?.eventType || '';
        const dateStr = document.getElementById('schedDate')?.value || null;
        const priceEl = document.getElementById('schedPrice');
        if (priceEl) {
            const timesForCurrentDate = selectedTimes.filter(item => item.date === dateStr).map(item => item.schedule);
            if (timesForCurrentDate.length === 1) {
                const hour = (timesForCurrentDate[0].split(' - ')[1] || '').trim();
                const p = getEventPrice(eventType, hour, dateStr);
                priceEl.textContent = p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } else if (timesForCurrentDate.length === 0) {
                const cfg = scheduleConfig[eventType] || {};
                priceEl.textContent = Number(cfg.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } else {
                let min = Infinity;
                for (const t of timesForCurrentDate) {
                    const h = (t.split(' - ')[1] || '').trim();
                    const p = getEventPrice(eventType, h, dateStr);
                    if (p < min) min = p;
                }
                if (Number.isFinite(min)) {
                    priceEl.textContent = min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                }
            }
        }
    } catch (_) { }
}

// Função para lidar com compra de produtos da loja
// Armazena falhas de checkout para diagnóstico (pode ser copiado pelo usuário)
function storeCheckoutFailure(info) {
    try {
        const existing = JSON.parse(sessionStorage.getItem('lastCheckoutFailure') || 'null');
        const out = { timestamp: Date.now(), ...info };
        // manter apenas o último registro
        sessionStorage.setItem('lastCheckoutFailure', JSON.stringify(out));
        
    } catch (e) {  }
}

// Helper to wrap fetch with timeout
async function fetchWithTimeout(url, opts = {}, ms = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    opts.signal = controller.signal;
    try {
        const r = await fetch(url, opts);
        clearTimeout(id);
        return r;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

// End helpers
async function handleProductPurchase(productId, cfg) {
    try {
        // Coletar dados do formulário (apenas se existirem)
        const teamElement = document.getElementById('schedTeam');
        const emailElement = document.getElementById('schedEmail');
        const phoneElement = document.getElementById('schedPhone');

        const team = teamElement ? teamElement.value.trim() : '';
        const email = emailElement ? emailElement.value.trim() : '';
        const phone = phoneElement ? phoneElement.value.trim() : '';

        // Resolver dados a partir do perfil/autenticação quando os campos do formulário não existem
        const authUser = window.firebaseAuth?.currentUser || {};
        const profile = window.currentUserProfile || {};
        const resolvedName = team || profile.name || authUser.displayName || '';
        const resolvedEmail = email || authUser.email || profile.email || '';
        const resolvedPhone = phone || profile.phone || '';

        // Email não é mais obrigatório

        // Coletar opções específicas do produto
        let productOptions = {};
        let finalPrice = cfg.price;

        if (productId === 'sensibilidades') {
            const platform = document.getElementById('platformSelect').value;
            if (!platform) {
                alert('Por favor, selecione uma plataforma.');
                return;
            }
            productOptions.platform = platform;

            // Se for Android, coletar também a marca
            if (platform === 'android') {
                const brand = document.getElementById('androidBrandSelect').value;
                if (!brand) {
                    alert('Por favor, selecione a marca do seu dispositivo Android.');
                    return;
                }
                productOptions.brand = brand;
            }
        } else if (productId === 'imagens') {
            const selected = Array.from(document.querySelectorAll('input[name="mapOption"]:checked')).map(i => i.value);
            productOptions.maps = selected;
            productOptions.quantity = selected.length || 1;
            // Atualizar preço baseado na quantidade selecionada
            const prices = { 1: 2, 2: 4, 3: 5, 4: 6, 5: 7 }; // Ajustado: 4 mapas = R$ 6,00
            finalPrice = prices[productOptions.quantity] || 2;
        } else if (productId === 'passe-booyah') {
            const playerId = document.getElementById('playerId')?.value || '';
            productOptions.playerId = playerId;
        } else if (productId === 'camisa') {
            const shirtSize = document.getElementById('shirtSize')?.value || 'M';
            const nameOnShirt = document.getElementById('shirtName')?.value || '';
            const nome = document.getElementById('addrNome')?.value || '';
            const cpf = document.getElementById('customerCPF')?.value || '';
            const cep = document.getElementById('addrCEP')?.value || '';
            const rua = document.getElementById('addrRua')?.value || '';
            const numero = document.getElementById('addrNumero')?.value || '';
            const complemento = document.getElementById('addrComplemento')?.value || '';
            const bairro = document.getElementById('addrBairro')?.value || '';
            const cidade = document.getElementById('addrCidade')?.value || '';
            const estado = document.getElementById('addrEstado')?.value || '';
            productOptions.size = shirtSize;
            productOptions.name = nameOnShirt;
            productOptions.delivery = { nome, cpf, cep, rua, numero, complemento, bairro, cidade, estado };
        } else {
            // Produto genérico criado pelo admin — coleta dados conforme categoria
            const prodInfo = window.scheduleConfig?.[productId] || {};
            const prodCat = (prodInfo.category || '').toLowerCase();
            const prodName = (prodInfo.name || prodInfo.label || '').toLowerCase();
            const isPasse = prodCat === 'passe' || prodName.includes('passe');
            const isFisico = prodCat === 'fisico' || prodCat === 'physical';
            const isAereas = prodCat === 'aereas';

            if (isAereas) {
                const selectedMaps = Array.from(
                    document.querySelectorAll('input[name="aereasMapOption"]:checked')
                ).map(i => i.value);
                if (selectedMaps.length === 0) {
                    alert('Por favor, selecione pelo menos um mapa.');
                    return;
                }
                productOptions.maps = selectedMaps;
                productOptions.quantity = selectedMaps.length;
                // Calcula preço com base na quantidade × preço base
                const basePrice = (prodInfo.priceOptions?.[0]?.price) || prodInfo.price || 2;
                finalPrice = selectedMaps.length * basePrice;
            } else if (isPasse) {
                productOptions.gameNick = document.getElementById('gameNick')?.value?.trim() || '';
                productOptions.gameId = document.getElementById('gameId')?.value?.trim() || '';
                productOptions.gameContact = document.getElementById('gameContact')?.value?.trim() || '';
            } else if (isFisico) {
                productOptions.delivery = {
                    nome: document.getElementById('addrNome')?.value?.trim() || '',
                    cpf: document.getElementById('customerCPF')?.value?.trim() || '',
                    cep: document.getElementById('addrCEP')?.value?.trim() || '',
                    rua: document.getElementById('addrRua')?.value?.trim() || '',
                    numero: document.getElementById('addrNumero')?.value?.trim() || '',
                    complemento: document.getElementById('addrComplemento')?.value?.trim() || '',
                    bairro: document.getElementById('addrBairro')?.value?.trim() || '',
                    cidade: document.getElementById('addrCidade')?.value?.trim() || '',
                    estado: document.getElementById('addrEstado')?.value?.trim() || '',
                    tamanho: document.getElementById('prodTamanho')?.value || ''
                };
            } else {
                // Digital
                productOptions.nome = document.getElementById('digitalNome')?.value?.trim() || '';
                productOptions.email = document.getElementById('digitalEmail')?.value?.trim() || '';
                productOptions.telefone = document.getElementById('digitalTelefone')?.value?.trim() || '';
            }
            // Salva o link de download direto no pedido para liberação automática
            if (prodInfo.downloadLink) {
                productOptions.downloadLink = prodInfo.downloadLink;
            }
        }

        // Validar preço final
        if (!finalPrice || finalPrice <= 0 || isNaN(finalPrice)) {
            alert('Preço inválido. Por favor, verifique os dados do produto.');
            
            return;
        }

        // Inicializar variáveis
        let docRef = null;
        let externalRef = `digital_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // Salvar order no Firestore ANTES de redirecionar
        if (window.firebaseDb) {
            try {
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
                    customer: resolvedEmail,
                    customerName: resolvedName,
                    buyerEmail: resolvedEmail,
                    userId: window.firebaseAuth.currentUser?.uid,
                    uid: window.firebaseAuth.currentUser?.uid,
                    phone: resolvedPhone,
                    productId: productId,
                    productOptions: productOptions,
                    downloadLink: cfg.downloadLink || productOptions.downloadLink || '',
                    productCategory: cfg.category || '',
                    createdAt: new Date(),
                    timestamp: Date.now(),
                    type: 'digital_product'
                };

                
                docRef = await addDoc(collection(window.firebaseDb, 'orders'), orderData);
                

                // Salvar external_reference para o webhook
                externalRef = `digital_${docRef.id}`;
                await updateDoc(docRef, { external_reference: externalRef });
                try { sessionStorage.setItem('lastExternalRef', externalRef); } catch (_) { }
            } catch (firebaseError) {
                
                // Continua com externalRef gerado acima
            }
        }

        // Chamar function segura (Netlify) para criar Preference
        const preferencePayload = {
            title: cfg.label || 'Produto',
            unit_price: Number(finalPrice.toFixed(2)),
            currency_id: 'BRL',
            quantity: 1,
            back_url: window.location.origin,
            external_reference: externalRef
        };

        
        let response;
        try {
            response = await fetchWithTimeout('/.netlify/functions/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferencePayload)
            }, 15000);
        } catch (fetchErr) {
            
            storeCheckoutFailure({ location: 'product', payload: preferencePayload, errorMessage: String(fetchErr) });
            throw fetchErr;
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => null);
            
            storeCheckoutFailure({ location: 'product', payload: preferencePayload, responseStatus: response.status, responseText: errorText });
            // Detect common server-side misconfiguration and show actionable message
            if (String(errorText || '').includes('Missing MP_ACCESS_TOKEN') || String(errorText || '').toLowerCase().includes('mercado pago')) {
                alert('Pagamento temporariamente indisponível: problema com a integração do Mercado Pago. Por favor, contate o suporte ou tente pagar via WhatsApp.');
            }
            throw new Error(errorText || 'Erro ao criar preferência de pagamento');
        }

        const data = await response.json().catch((e) => { return null; });
        

        // Verificar se tem init_point ou sandbox_init_point
        const checkoutUrl = data.init_point || data.sandbox_init_point;
        if (!checkoutUrl) {
            
            storeCheckoutFailure({ location: 'product', payload: preferencePayload, responseStatus: response.status, responseJson: data, errorMessage: 'No checkout URL in response' });
            throw new Error('Não foi possível obter o link de pagamento. Verifique se o Mercado Pago está configurado corretamente.');
        }

        closeScheduleModal();

        // Redireciona para o checkout do Mercado Pago
        try {
            sessionStorage.setItem('lastCheckoutUrl', checkoutUrl);
        } catch (_) { }
        try {
            window.open(checkoutUrl, '_blank');
            showToast('success', 'Checkout aberto em nova aba. Finalize o pagamento no Mercado Pago.', 'Checkout');
        } catch (openErr) {
            
            window.location.href = checkoutUrl;
        }
    } catch (error) {
        
        const errorMessage = error.message || 'Falha ao processar compra.';
        alert(`Falha ao processar compra.\n\n${errorMessage}\n\nPor favor, tente novamente ou entre em contato com o suporte.`);
    }
}

// Compra de produtos da loja usando Tokens (no modal de agendamento)
async function handleProductPurchaseWithTokens(productId, cfg) {
    try {
        // Resolver dados do perfil/usuário
        const authUser = window.firebaseAuth?.currentUser || {};
        const profile = window.currentUserProfile || {};
        const resolvedEmail = authUser.email || profile.email || '';
        const resolvedName = profile.name || authUser.displayName || '';

        // Coletar opções e calcular preço final
        let productOptions = {};
        let finalPrice = cfg.price;
        if (productId === 'sensibilidades') {
            const platform = document.getElementById('platformSelect')?.value;
            if (!platform) { showError('PRODUCT_008', 'PRODUCT_008'); return; }
            productOptions.platform = platform;
            if (platform === 'android') {
                const brand = document.getElementById('androidBrandSelect')?.value;
                if (!brand) { showError('PRODUCT_009', 'PRODUCT_009'); return; }
                productOptions.brand = brand;
            }
        } else if (productId === 'imagens') {
            const selected = Array.from(document.querySelectorAll('input[name="mapOption"]:checked')).map(i => i.value);
            productOptions.maps = selected;
            productOptions.quantity = selected.length || 1;
            const prices = { 1: 2, 2: 4, 3: 5, 4: 6, 5: 7 };
            finalPrice = prices[productOptions.quantity] || 2;
        } else if (productId === 'passe-booyah') {
            productOptions.playerId = document.getElementById('playerId')?.value || '';
        } else if (productId === 'camisa') {
            const shirtSize = document.getElementById('shirtSize')?.value || 'M';
            const nameOnShirt = document.getElementById('shirtName')?.value || '';
            const nome = document.getElementById('addrNome')?.value || '';
            const cpf = document.getElementById('customerCPF')?.value || '';
            const cep = document.getElementById('addrCEP')?.value || '';
            const rua = document.getElementById('addrRua')?.value || '';
            const numero = document.getElementById('addrNumero')?.value || '';
            const complemento = document.getElementById('addrComplemento')?.value || '';
            const bairro = document.getElementById('addrBairro')?.value || '';
            const cidade = document.getElementById('addrCidade')?.value || '';
            const estado = document.getElementById('addrEstado')?.value || '';
            const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
            if (!cpf || !cpfRegex.test(cpf)) { alert('CPF inválido. Use o formato 000.000.000-00.'); return; }
            productOptions.size = shirtSize;
            productOptions.name = nameOnShirt;
            productOptions.delivery = { nome, cpf, cep, address: rua, number: numero, complement: complemento, district: bairro, city: cidade, state: estado };
        }

        // Aplicar cupom do schedule se houver
        if (typeof appliedScheduleCoupon !== 'undefined' && appliedScheduleCoupon) {
            let discountAmount = 0;
            if (appliedScheduleCoupon.discountType === 'percentage') {
                discountAmount = finalPrice * (appliedScheduleCoupon.discountValue / 100);
            } else {
                discountAmount = appliedScheduleCoupon.discountValue;
            }
            finalPrice = Math.max(0, finalPrice - discountAmount);
        }

        // Validar saldo
        if (!canSpendTokens(finalPrice)) {
            showError('TOKEN_001', 'TOKEN_001');
            return;
        }
        const ok = await spendTokens(finalPrice);
        if (!ok) {
            showError('TOKEN_002', 'TOKEN_002');
            return;
        }

        // Criar pedido pago
        const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const orderData = {
            title: cfg.label,
            description: cfg.label,
            item: cfg.label,
            amount: finalPrice,
            total: finalPrice,
            quantity: 1,
            currency: 'BRL',
            status: 'paid',
            paidWithTokens: true,
            tokensUsed: finalPrice,
            customer: resolvedEmail,
            customerName: resolvedName,
            buyerEmail: resolvedEmail,
            userId: window.firebaseAuth?.currentUser?.uid,
            uid: window.firebaseAuth?.currentUser?.uid,
            productId: productId,
            productOptions: productOptions,
            createdAt: new Date(),
            timestamp: Date.now(),
            type: 'digital_product',
            // Incluir affiliateId do cupom se houver
            affiliateCode: getActiveAffiliateCode(appliedScheduleCoupon?.affiliateId || null)
        };
        // Firestore não aceita campos undefined. Adicionar shippingStatus apenas quando aplicável
        if (productId === 'camisa') {
            orderData.shippingStatus = 'pending';
        }
        await addDoc(collection(window.firebaseDb, 'orders'), orderData);
        closeScheduleModal();
        if (typeof openPaymentConfirmModal === 'function') {
            openPaymentConfirmModal('Pagamento confirmado', 'Seu pagamento em tokens foi aprovado. Confira em Minha Conta.');
        } else {
            alert('Pagamento confirmado com tokens!');
        }
    } catch (e) {
        
        showError(e, 'TOKEN_002');
    }
}
async function submitSchedule(e, useTokens = false) {
    e.preventDefault();
    if (window._scheduleSubmitting) return;
    window._scheduleSubmitting = true;
    const submitBtn = document.getElementById('schedSubmit');
    const tokenBtn = document.getElementById('schedPayTokens');
    const oldText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Processando...'; }
    if (tokenBtn) tokenBtn.disabled = true;

    try {
        const modal = document.getElementById('scheduleModal');
        const rawEventType = modal?.dataset?.eventType || 'modo-liga';
        const normalizeType = (t) => String(t || '').toLowerCase().trim().replace(/\s+/g, '-').replace('modo liga', 'modo-liga').replace('camp', 'camp-freitas').replace('semanal freitas', 'semanal-freitas');
        const normalizeHour = (h) => { if (!h) return null; const s = String(h).toLowerCase().trim(); const m = s.match(/(\d{1,2})/); return m ? `${parseInt(m[1], 10)}h` : s; };
        const eventType = normalizeType(rawEventType);
        const cfg = scheduleConfig[rawEventType] || scheduleConfig[eventType] || {};
        const isFreeEvent = (cfg.price === 0 || cfg.isFree === true) && !cfg.isProduct;

        // Se for produto da loja, usar lógica de compra
        if (cfg.isProduct) {
            if (useTokens) {
                await handleProductPurchaseWithTokens(eventType, cfg);
            } else {
                await handleProductPurchase(eventType, cfg);
            }
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }

        // --- FLUXO DE EVENTOS ---
        if (!window.isLoggedIn) {
            closeScheduleModal();
            if (typeof openLoginModal === 'function') openLoginModal();
            alert('Faça login para continuar a compra.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }

        // Validações básicas
        const date = document.getElementById('schedDate').value;
        const datesToUse = (selectedDates && selectedDates.length > 0) ? [...selectedDates] : [date];

        if (!isFreeEvent && selectedTimes.length === 0) {
            alert('Selecione pelo menos um horário.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }

        // --- CAPTURAR DADOS DOS TIMES DIRETAMENTE DO DOM ---
        const teamElements = document.querySelectorAll('#teamsContainer > div');
        const teamsData = [];
        teamElements.forEach((teamDiv) => {
            const nameInput = teamDiv.querySelector('input[placeholder="Nome do time"]');
            const emailInput = teamDiv.querySelector('input[placeholder="Email"]');
            const phoneInput = teamDiv.querySelector('input[placeholder="WhatsApp (11) 99999-9999"]');

            if (nameInput && emailInput && phoneInput) {
                teamsData.push({
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    phone: phoneInput.value.trim()
                });
            }
        });

        if (teamsData.length === 0) {
            alert('Adicione pelo menos um time.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }

        for (let team of teamsData) {
            if (!team.name || !team.email || !team.phone) {
                alert('Preencha todos os dados dos times.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }
        }

        // Fluxo de evento grátis: confirmar diretamente sem pagamento
        if (isFreeEvent) {
            await handleFreeEventRegistration(rawEventType, cfg, teamsData, datesToUse, selectedTimes);
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }

        // Agrupar horários por data
        const timesByDate = {};
        selectedTimes.forEach(item => {
            if (!timesByDate[item.date]) timesByDate[item.date] = [];
            timesByDate[item.date].push(item.schedule);
        });
        
        // Verificar disponibilidade
        for (const d of datesToUse) {
            const times = timesByDate[d] || [];
            if (times.length === 0) continue;
            const availabilityCheck = await checkMultipleSlotAvailability(d, times, eventType, teamsData.length);
            if (!availabilityCheck.available) {
                alert(availabilityCheck.message || 'Não há vagas suficientes.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }
        }

        // Verificar travas permanentes ANTES de criar cobrança (event_global_locks + event_hour_locks)
        try {
            const { doc: _ld, getDoc: _lg, collection: _lc, query: _lq, where: _lw, getDocs: _lgs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            // 1. Trava global do evento inteiro
            const globalLock = await _lg(_ld(window.firebaseDb, 'event_global_locks', rawEventType));
            if (globalLock.exists() && globalLock.data().locked === true) {
                alert('Este evento está temporariamente suspenso. Nenhuma nova inscrição pode ser feita no momento.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }
            // 2. Travas permanentes por horário — 1 filtro apenas (evita índice composto no Firestore)
            const hourLocksSnap = await _lgs(_lq(
                _lc(window.firebaseDb, 'event_hour_locks'),
                _lw('eventType', '==', rawEventType)
            ));
            const lockedHoursSet = new Set();
            hourLocksSnap.forEach(ld => {
                const ldata = ld.data();
                if (ldata.locked !== true) return; // filtrar em JS
                if (ldata.hour) lockedHoursSet.add(String(ldata.hour).toLowerCase().trim());
            });
            if (lockedHoursSet.size > 0) {
                for (const item of selectedTimes) {
                    const parts = (item.schedule || '').split(' - ');
                    const rawHourStr = (parts[1] || parts[0] || '').trim();
                    const normH = normalizeHour(rawHourStr);
                    if (normH && lockedHoursSet.has(normH)) {
                        alert(`O horário ${normH} está permanentemente bloqueado para este evento e não aceita novas inscrições.`);
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                        return;
                    }
                }
            }
        } catch (_lockErr) {
            // Se a checagem de travas falhar por qualquer motivo, não bloquear o fluxo
            // (a UI já oculta os botões dos horários travados)
        }

        // Calcular total original
        // Usa rawEventType (ID original do Firestore, case-sensitive) para lookup correto no scheduleConfig
        let originalTotal = 0;
        for (const d of datesToUse) {
            const times = timesByDate[d] || [];
            for (const schedule of times) {
                const hour = (schedule.split(' - ')[1] || '').trim();
                const price = getEventPrice(rawEventType, hour, d);
                originalTotal += price * teamsData.length;
            }
        }

        // Aplicar cupom
        let finalPrice = originalTotal;
        let couponInfo = null;
        if (appliedScheduleCoupon) {
            let discount = 0;
            if (appliedScheduleCoupon.discountType === 'percentage') {
                discount = originalTotal * (appliedScheduleCoupon.discountValue / 100);
            } else {
                discount = appliedScheduleCoupon.discountValue;
            }
            finalPrice = Math.max(0, originalTotal - discount);
            couponInfo = {
                code: appliedScheduleCoupon.code,
                discountType: appliedScheduleCoupon.discountType,
                discountValue: appliedScheduleCoupon.discountValue,
                context: 'events'
            };
        }

        const totalReservations = teamsData.length * selectedTimes.length; // selectedTimes já inclui a multiplicação por datas

        // Se for pagamento com tokens
        // if (useTokens || (cfg && cfg.payWithToken)) {
        //     // Passa os dados dos times para a função de tokens
        //     await useTokensForEvent(eventType, totalReservations, finalPrice, teamsData);
        //     if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
        //     return;
        // }


        // Se for pagamento com tokens
        if (useTokens || (cfg && cfg.payWithToken)) {
            await useTokensForEvent(rawEventType, totalReservations, finalPrice, teamsData, selectedTimes, datesToUse);
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }

        // --- SALVAR NO FIRESTORE ---
        let externalRef = `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        let regIds = [];

        try {
            if (!window.firebaseReady || !window.firebaseDb) throw new Error('Conexão com banco falhou');

            const { collection, query, where, getDocs, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

            // Alocar slots via transação atômica (slotCounters) — não requer ler registrations de outros
            const mpSlotCount = {};
            {
                const _sc = {};
                for (const _d of datesToUse) {
                    for (const _t of (timesByDate[_d] || [])) {
                        _sc[_t] = (_sc[_t] || 0) + teamsData.length;
                    }
                }
                if (Object.keys(_sc).length > 0) {
                    const _ss = await allocateSlotsViaTransaction(rawEventType, _sc);
                    if (_ss) {
                        for (const [_k, _v] of Object.entries(_ss)) mpSlotCount[_k] = _v - 1;
                    }
                }
            }

            const mpIsLiga = (cfg.modo || '').toUpperCase().includes('LIGA');
            const mpVagas = cfg.vagas || 0;
            const mpGrupos = Math.max(1, cfg.grupos || 1);

            for (const d of datesToUse) {
                const times = timesByDate[d] || [];
                for (let schedule of times) {
                    const hour = (schedule.split(' - ')[1] || '').trim();
                    const normalizedHour = normalizeHour(hour);
                    // rawEventType preserva o case original do ID do Firestore
                    const price = getEventPrice(rawEventType, hour, d);

                    // Buscar link usando o horário normalizado
                    const whatsappLink = await getWhatsAppLink(rawEventType, normalizedHour, d);

                    for (let team of teamsData) {
                        // Slot por horário independente (evita duplicatas entre horários diferentes)
                        mpSlotCount[schedule] = (mpSlotCount[schedule] || 0) + 1;
                        const slotNum = mpSlotCount[schedule];
                        const slotDisplay = computeSlotDisplay(slotNum, mpVagas, mpGrupos, mpIsLiga);

                        const docRef = await addDoc(collection(window.firebaseDb, 'registrations'), {
                            userId: window.firebaseAuth.currentUser.uid,
                            teamName: team.name,
                            email: team.email,
                            phone: team.phone,
                            schedule: schedule,
                            date: d,
                            eventType: rawEventType,
                            title: mpIsLiga ? `${cfg.label} - ${schedule}` : `${cfg.label} - ${slotDisplay || schedule}`,
                            price: price,
                            slot: mpIsLiga ? null : slotNum,
                            slotDisplay: slotDisplay,
                            status: 'pending',
                            createdAt: serverTimestamp(),
                            external_reference: externalRef,
                            groupLink: whatsappLink || null,
                            whatsappLink: whatsappLink || null,
                            hour: normalizedHour || null,
                            affiliateCode: getActiveAffiliateCode(appliedScheduleCoupon?.affiliateId || null)
                        });
                        regIds.push(docRef.id);
                    }
                }
            }

            if (regIds.length > 0) {
                try { sessionStorage.setItem('lastRegIds', JSON.stringify(regIds)); } catch (_) { }
                try { sessionStorage.setItem('lastRegId', regIds[0]); } catch (_) { }
                try { sessionStorage.setItem('lastExternalRef', externalRef); } catch (_) { }
            }

        } catch (dbError) {
            
            alert('Erro de conexão ao salvar sua reserva. Por favor, verifique sua internet e tente novamente. Nenhuma cobrança foi gerada.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
            return;
        }

        // --- CHAMAR MERCADO PAGO ---
        const _cleanupPendingRegs = async () => {
            if (!regIds.length) return;
            try {
                const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
                await Promise.all(regIds.map(id => deleteDoc(doc(window.firebaseDb, 'registrations', id))));
            } catch (_) {}
        };

        try {
            const _prefPayload = {
                title: `${cfg.label} - ${totalReservations} reservas`,
                unit_price: Number(finalPrice.toFixed(2)),
                currency_id: 'BRL',
                quantity: 1,
                back_url: `${window.location.origin}/evento.html#${rawEventType}`,
                coupon_info: couponInfo,
                external_reference: externalRef,
                multiple_reservations: {
                    teams: teamsData.map(t => t.name),
                    schedules: selectedTimes.map(item => item.schedule),
                    dates: datesToUse,
                    eventType: rawEventType
                }
            };

            if (typeof showToast === 'function') showToast('info', 'Gerando link de pagamento, aguarde...', 'Mercado Pago');

            let resp;
            try {
                resp = await fetch('/.netlify/functions/create-preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(_prefPayload)
                });
            } catch (fetchErr) {
                await _cleanupPendingRegs();
                alert('Não foi possível conectar ao servidor de pagamento. Verifique sua internet e tente novamente.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }

            if (resp.status === 404) {
                await _cleanupPendingRegs();
                alert('⚠️ Pagamento via Mercado Pago não está disponível neste ambiente de desenvolvimento.\n\nO checkout funciona apenas na versão publicada do site. Se você está no site oficial e viu este erro, entre em contato com o suporte.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }

            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                await _cleanupPendingRegs();
                if (errText.includes('Missing MP_ACCESS_TOKEN')) {
                    alert('Integração com Mercado Pago não configurada. Entre em contato com o suporte.');
                } else if (errText.includes('unit_price')) {
                    alert('Erro no valor do pagamento. Por favor, recarregue a página e tente novamente.');
                } else {
                    alert(`Erro ao iniciar pagamento (${resp.status}). ${errText ? errText.slice(0, 120) : 'Tente novamente.'}`);
                }
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }

            const data = await resp.json().catch(() => null);
            if (!data) {
                await _cleanupPendingRegs();
                alert('Resposta inválida do servidor de pagamento. Tente novamente.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }

            localStorage.setItem('pendingPaymentRefs', JSON.stringify([externalRef]));
            const checkoutUrl = data.init_point || data.sandbox_init_point;
            if (!checkoutUrl) {
                await _cleanupPendingRegs();
                alert('Não foi possível obter o link de pagamento. Tente novamente.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
                return;
            }

            closeScheduleModal();
            try { sessionStorage.setItem('lastCheckoutUrl', checkoutUrl); } catch (_) { }
            try {
                window.open(checkoutUrl, '_blank');
                if (typeof showToast === 'function') showToast('success', 'Checkout aberto em nova aba. Finalize o pagamento no Mercado Pago.', 'Pagamento');
            } catch (_) {
                window.location.href = checkoutUrl;
            }

        } catch (paymentError) {
            console.error('Erro pagamento evento:', paymentError);
            await _cleanupPendingRegs();
            alert('Erro inesperado ao iniciar pagamento. Recarregue a página e tente novamente.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
        }

    } catch (error) {
        
        alert('Ocorreu um erro inesperado. Atualize a página e tente novamente.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
    } finally {
        window._scheduleSubmitting = false;
        const _tb = document.getElementById('schedPayTokens');
        if (_tb) _tb.disabled = false;
    }
}

// ===== Helper: busca registrações por eventType (raw + normalizado) — uso admin only =====
// Regras do Firestore bloqueiam leitura de registrations de outros usuários para usuários normais
async function fetchRegsForSlotCount(rawEventType) {
    try {
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const regsRef = collection(window.firebaseDb, 'registrations');
        const normalizedType = String(rawEventType || '').toLowerCase().trim().replace(/\s+/g, '-');
        const promises = [getDocs(query(regsRef, where('eventType', '==', rawEventType)))];
        if (normalizedType !== rawEventType) {
            promises.push(getDocs(query(regsRef, where('eventType', '==', normalizedType))));
        }
        const snaps = await Promise.all(promises);
        const seen = new Set();
        const docs = [];
        snaps.forEach(snap => {
            snap.docs.forEach(d => {
                if (!seen.has(d.id)) { seen.add(d.id); docs.push(d); }
            });
        });
        return docs;
    } catch(_) { return []; }
}

// ===== Helper: aloca slots a partir do maior slot já no banco =====
// scheduleCounts: { "schedule_key": numSlotsNeeded }
// Retorna: { "schedule_key": firstSlotNumber } ou null se ambos os métodos falharem
// Nível 1: transação atômica via slotCounters (sem race condition quando regras estiverem deployadas)
// Nível 2: fallback — busca o maior slotNumber existente nas registrations (requer allow list)
async function allocateSlotsFromDB(rawEventType, scheduleCounts) {
    // --- Nível 1: transação atômica via slotCounters ---
    try {
        const { doc, runTransaction } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const counterRef = doc(window.firebaseDb, 'slotCounters', rawEventType);
        const startSlots = {};
        await runTransaction(window.firebaseDb, async (tx) => {
            const counterDoc = await tx.get(counterRef);
            const counts = counterDoc.exists() ? { ...counterDoc.data() } : {};
            for (const [sched, n] of Object.entries(scheduleCounts)) {
                const current = Number(counts[sched]) || 0;
                startSlots[sched] = current + 1;
                counts[sched] = current + n;
            }
            tx.set(counterRef, counts, { merge: true });
        });
        console.log('[SlotDB] transação atômica OK | evento:', rawEventType, '| slots:', JSON.stringify(startSlots));
        return startSlots;
    } catch (txErr) {
        console.warn('[SlotDB] transação slotCounters falhou, buscando máx. no banco:', txErr.message);
    }

    // --- Nível 2: buscar maior slotNumber por horário nas registrations ---
    try {
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getDocs(query(
            collection(window.firebaseDb, 'registrations'),
            where('eventType', '==', rawEventType)
        ));
        const maxSlotPerSchedule = {};
        snap.forEach(docSnap => {
            const r = docSnap.data();
            if (!r.schedule) return;
            const sn = Number(r.slotNumber || r.slot || 0);
            if (!isNaN(sn) && sn > (maxSlotPerSchedule[r.schedule] || 0)) {
                maxSlotPerSchedule[r.schedule] = sn;
            }
        });
        const startSlots = {};
        for (const [sched, numNeeded] of Object.entries(scheduleCounts)) {
            const maxExisting = maxSlotPerSchedule[sched] || 0;
            startSlots[sched] = maxExisting + 1;
            console.log(`[SlotDB] evento="${rawEventType}" horário="${sched}" máx.existente=${maxExisting} → próxSlot=${maxExisting + 1} (${numNeeded} inscrição/ões)`);
        }
        console.log('[SlotDB] startSlots (via DB):', JSON.stringify(startSlots), '| evento:', rawEventType);
        return startSlots;
    } catch (dbErr) {
        console.error('[SlotDB] erro crítico ao buscar slots no banco:', dbErr.message, '| evento:', rawEventType);
        return null;
    }
}

// ===== Helper: calcula o texto do slot (Vaga #N ou Grupo X • Vaga Y) =====
function computeSlotDisplay(slotNumber, vagas, grupos, isLiga) {
    if (isLiga) return null;
    const slotsPerGroup = grupos > 1 ? Math.ceil(vagas / grupos) : vagas;
    if (vagas > 0 && grupos > 1 && slotsPerGroup > 0) {
        const groupNum = Math.ceil(slotNumber / slotsPerGroup);
        const posInGroup = slotNumber - (groupNum - 1) * slotsPerGroup;
        return `Grupo ${groupNum} • Vaga ${posInGroup}`;
    }
    return `Vaga #${slotNumber}`;
}

// ===== EVENTO GRÁTIS: Inscrição direta com atribuição de slot =====
async function handleFreeEventRegistration(rawEventType, cfg, teamsData, datesToUse, selectedTimesArg) {
    try {
        if (!window.isLoggedIn || !window.firebaseAuth?.currentUser) {
            closeScheduleModal();
            if (typeof openLoginModal === 'function') openLoginModal();
            alert('Faça login para se inscrever.');
            return;
        }

        const { collection, query, where, getDocs, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        const isLiga = (cfg.modo || '').toUpperCase().includes('LIGA');
        const vagas = cfg.vagas || 0;
        const grupos = Math.max(1, cfg.grupos || 1);
        const slotsPerGroup = grupos > 1 ? Math.ceil(vagas / grupos) : vagas;

        // scheduleSlotCount será pré-populado via transação atômica logo após construir timesByDate/dates
        const scheduleSlotCount = {};

        // Construir timesByDate a partir de selectedTimes
        const timesByDate = {};
        if (selectedTimesArg && selectedTimesArg.length > 0) {
            selectedTimesArg.forEach(item => {
                if (!timesByDate[item.date]) timesByDate[item.date] = [];
                timesByDate[item.date].push(item.schedule);
            });
        }

        const externalRef = `free_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const assignedSlots = []; // { team, slot, schedule }

        const dates = datesToUse && datesToUse.length > 0 ? datesToUse : [Object.keys(timesByDate)[0] || new Date().toISOString().slice(0, 10)];

        // Alocar slots via transação atômica (slotCounters) — sem ler registrations de outros usuários
        {
            const _sc = {};
            for (const _d of dates) {
                for (const _t of (timesByDate[_d] || ['—'])) {
                    const _k = _t !== '—' ? _t : cfg.label;
                    _sc[_k] = (_sc[_k] || 0) + teamsData.length;
                }
            }
            if (Object.keys(_sc).length > 0) {
                const _ss = await allocateSlotsFromDB(rawEventType, _sc);
                if (_ss) {
                    for (const [_k, _v] of Object.entries(_ss)) scheduleSlotCount[_k] = _v - 1;
                }
            }
        }

        for (const d of dates) {
            const dayTimes = timesByDate[d] || ['—'];
            for (const schedule of dayTimes) {
                const schedKey = schedule !== '—' ? schedule : cfg.label;

                // Slot counter por horário
                if (!scheduleSlotCount[schedKey]) scheduleSlotCount[schedKey] = 0;

                // Verificar lotação por horário (se não é LIGA)
                if (!isLiga && vagas > 0 && scheduleSlotCount[schedKey] >= vagas) {
                    alert(`Horário ${schedKey} está lotado! Não há mais vagas disponíveis neste horário.`);
                    continue;
                }

                for (const team of teamsData) {
                    scheduleSlotCount[schedKey]++;
                    const slotNumber = scheduleSlotCount[schedKey];

                    if (!isLiga && vagas > 0 && slotNumber > vagas) {
                        alert('Evento lotado durante o processamento. Algumas inscrições não foram concluídas.');
                        closeScheduleModal();
                        showSlotConfirmationModal(assignedSlots, cfg.label, isLiga, rawEventType);
                        return;
                    }

                    let slotDisplay = null;
                    if (!isLiga) {
                        if (vagas > 0 && grupos > 1 && slotsPerGroup > 0) {
                            const groupNum = Math.ceil(slotNumber / slotsPerGroup);
                            const posInGroup = slotNumber - (groupNum - 1) * slotsPerGroup;
                            slotDisplay = `Grupo ${groupNum} • Vaga ${posInGroup}`;
                        } else {
                            slotDisplay = `Vaga #${slotNumber}`;
                        }
                    }

                    await addDoc(collection(window.firebaseDb, 'registrations'), {
                        userId: window.firebaseAuth.currentUser.uid,
                        teamName: team.name,
                        leaderName: window.currentUserProfile?.name || team.name,
                        email: team.email,
                        phone: team.phone,
                        schedule: schedKey,
                        date: d,
                        eventType: rawEventType,
                        title: isLiga ? `${cfg.label} - ${schedKey}` : `${cfg.label} - ${slotDisplay}`,
                        price: 0,
                        slot: isLiga ? null : slotNumber,
                        slotNumber: isLiga ? null : slotNumber,
                        slotDisplay: slotDisplay,
                        status: 'confirmed',
                        createdAt: serverTimestamp(),
                        external_reference: externalRef,
                        isFreeEvent: true,
                        isLiga,
                    });

                    assignedSlots.push({ team: team.name, slot: slotDisplay, schedule: schedKey, isLiga });
                }
            }
        }

        // Invalidar cache de ocupação para que a barra atualize na próxima abertura
        Object.keys(scheduleCache).forEach(k => delete scheduleCache[k]);

        // Buscar link do WhatsApp do grupo para exibir no modal
        let freeGroupLink = null;
        try {
            if (typeof getWhatsAppLink === 'function') {
                const firstSchedule = assignedSlots[0]?.schedule || null;
                const firstDate = datesToUse?.[0] || null;
                freeGroupLink = await getWhatsAppLink(rawEventType, firstSchedule, firstDate);
            }
        } catch (_) {}

        closeScheduleModal();
        showSlotConfirmationModal(assignedSlots, cfg.label, isLiga, rawEventType, freeGroupLink);

    } catch (err) {
        console.error('Erro ao registrar inscrição gratuita:', err);
        alert('Erro ao confirmar inscrição. Tente novamente.');
    }
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        [880, 1100, 1320].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.connect(gain);
            osc.frequency.value = freq;
            osc.start(ctx.currentTime + i * 0.13);
            osc.stop(ctx.currentTime + i * 0.13 + 0.2);
        });
    } catch (_) {}
}

function showSlotConfirmationModal(slots, eventName, isLiga, eventId, groupLink) {
    const existing = document.getElementById('slotConfirmModal');
    if (existing) existing.remove();
    playNotificationSound();

    // Agrupar por horário
    const bySchedule = {};
    slots.forEach(s => {
        const key = s.schedule || eventName;
        if (!bySchedule[key]) bySchedule[key] = [];
        bySchedule[key].push(s);
    });

    const schedules = Object.keys(bySchedule);

    let slotsHtml = '';
    if (isLiga) {
        // Modo LIGA: sem slots, só info de acesso à sala
        slotsHtml = `
        <div class="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-center">
            <div class="text-3xl mb-2">🏆</div>
            <div class="font-bold text-yellow-800 text-base mb-1">Modo Liga — Acesso à Sala</div>
            <div class="text-sm text-yellow-700 leading-relaxed">Salas no modo Liga não possuem slots numerados.<br>Aguarde o link da sala ser enviado pelo admin nas notificações.<br>Fique de olho no sininho 🔔!</div>
        </div>
        ${schedules.map(sched => `
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div class="text-xs font-bold text-blue-600 uppercase mb-1">⏰ Horário</div>
            <div class="font-semibold text-blue-900">${sched}</div>
            ${bySchedule[sched].map(s => `<div class="text-xs text-gray-600 mt-0.5">✅ ${s.team}</div>`).join('')}
        </div>`).join('')}`;
    } else {
        slotsHtml = schedules.map(sched => `
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div class="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1">⏰ Horário: <span class="text-blue-800">${sched}</span></div>
            ${bySchedule[sched].map(s => `
            <div class="flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded-lg mb-1">
                <span class="text-xl">✅</span>
                <div class="flex-1">
                    <div class="font-semibold text-gray-800 text-sm">${s.team}</div>
                    ${s.slot != null
                        ? `<div class="mt-0.5">
                            <span class="text-2xl font-black text-orange-600">${s.slot}</span>
                            <span class="text-xs font-semibold text-gray-500 ml-1">← Esse é o seu SLOT na Sala.</span>
                           </div>`
                        : `<div class="text-sm font-semibold text-green-700">Inscrição confirmada!</div>`
                    }
                </div>
            </div>`).join('')}
        </div>`).join('');
    }

    const div = document.createElement('div');
    div.id = 'slotConfirmModal';
    div.className = 'fixed inset-0 bg-black bg-opacity-60 z-[200] flex items-center justify-center p-4';
    div.innerHTML = `
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="text-center mb-5">
                <div class="text-5xl mb-2">🎉</div>
                <h3 class="text-xl font-bold text-gray-900">Inscrição Confirmada!</h3>
                <p class="text-gray-500 text-sm mt-1">${eventName}</p>
            </div>
            <div class="space-y-3 mb-6">${slotsHtml}</div>
            ${!isLiga ? `<div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 mb-4 text-center">
                💡 Guarde o número da sua vaga — ela é a sua posição no evento!
            </div>` : ''}
            <div class="flex flex-col gap-2">
                ${groupLink ? `<a href="${groupLink}" target="_blank" rel="noopener noreferrer"
                        class="w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white py-3 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2">
                    <i class="fab fa-whatsapp text-xl"></i> Entrar no Grupo WhatsApp
                </a>` : ''}
                ${eventId ? `<button onclick="window.location.href='evento.html#${eventId}'"
                        class="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-base transition-colors">
                    <i class="fas fa-external-link-alt mr-2"></i>VER PÁGINA DO EVENTO
                </button>` : ''}
                <button onclick="document.getElementById('slotConfirmModal').remove()"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-base transition-colors">
                    OK, entendido! 👍
                </button>
            </div>
        </div>`;
    document.body.appendChild(div);
}


function normalizeHour(h) {
    if (!h) return null;
    const s = String(h).toLowerCase().trim();
    const m = s.match(/(\d{1,2})/);
    return m ? `${parseInt(m[1], 10)}h` : s;
}

// XTreino Gratuito: abrir WhatsApp com mensagem
function openFreeWhatsModal() {
    const modal = document.getElementById('freeWhatsModal');
    const link = document.getElementById('freeWhatsLink');
    const number = '5581986103152'; // ajuste se necessário
    const message = 'Vim do site e quero uma vaga gratuita. Quais horários têm disponível?';
    if (link) link.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    if (modal) modal.classList.remove('hidden');
    if (window.innerWidth <= 767) document.body.classList.add('modal-open-mobile');
}
function closeFreeWhatsModal() {
    const modal = document.getElementById('freeWhatsModal');
    if (modal) modal.classList.add('hidden');
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}

// Modal confirmação
function openPaymentConfirmModal(title, msg, groupLink) {
    
    const m = document.getElementById('paymentConfirmModal');
    const t = document.getElementById('paymentConfirmTitle');
    const p = document.getElementById('paymentConfirmMsg');
    const g = document.getElementById('paymentGroupBtn');
    const payBtn = document.getElementById('paymentPayNowBtn');
    const acctBtn = document.getElementById('paymentGoAccountBtn');

    if (!m) {
        
        return;
    }

    if (t) t.textContent = title || 'Pagamento';
    if (p) p.textContent = msg || '';
    if (g) {
        if (groupLink) { g.href = groupLink; g.classList.remove('hidden'); }
        else { g.classList.add('hidden'); }
    }

    // Lógica dos botões conforme o estado
    const isProcessing = String(title || '').toLowerCase().includes('processamento') || String(title || '').toLowerCase().includes('pendente');
    const lastUrl = (() => { try { return sessionStorage.getItem('lastCheckoutUrl') || ''; } catch (_) { return ''; } })();

    if (payBtn) {
        if (isProcessing && lastUrl) {
            payBtn.classList.remove('hidden');
            payBtn.onclick = function () {
                const u = (() => { try { return sessionStorage.getItem('lastCheckoutUrl'); } catch (_) { return null; } })();
                if (u) { window.location.href = u; }
                else { alert('Link de pagamento indisponível. Volte ao produto para gerar um novo.'); }
            };
        } else {
            payBtn.classList.add('hidden');
            payBtn.onclick = null;
        }
    }
    if (acctBtn) {
        if (isProcessing) { acctBtn.classList.add('hidden'); } else { acctBtn.classList.remove('hidden'); }
    }
    // Garantir centralização: container precisa estar em display:flex
    m.classList.remove('hidden');
    m.classList.add('flex');
    
}
function closePaymentConfirmModal() {
    const m = document.getElementById('paymentConfirmModal');
    if (m) m.classList.add('hidden');
}

// Verificar status do pagamento via API do Mercado Pago
async function checkPaymentStatus(preferenceId) {
    try {
        

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
        

        if (data.status === 'approved') {
            
            processSuccessfulPayment();
        } else if (data.status === 'pending') {
            
            setTimeout(() => checkPaymentStatus(preferenceId), 10000);
        } else if (data.status === 'rejected') {
            
            openPaymentConfirmModal('Pagamento Rejeitado', 'Seu pagamento foi rejeitado. Tente novamente ou use outro método de pagamento.');
        } else {
            
            // Para outros status, não mostrar modal automaticamente
            // O usuário pode verificar o status na área do cliente
        }

    } catch (error) {
        
        // Fallback: apenas logar o erro, não mostrar modal
        // O usuário pode verificar o status na área do cliente
    }
}

async function processSuccessfulPayment(externalRef = null) {
    const extRef = externalRef || sessionStorage.getItem('lastExternalRef');
  
    if (!extRef) {
        
        return;
    }

    // Recuperar IDs salvos (se houver)
    let regIds = [];
    try {
        const storedIds = sessionStorage.getItem('lastRegIds');
        if (storedIds) regIds = JSON.parse(storedIds);
    } catch(e) {}

    try {
        const { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        // 1) Atualizar todas as registrations com este external_reference
        // CRÍTICO: campo único (external_reference) para evitar índice composto no Firestore
        // userId é filtrado em JS
        const regsRef = collection(window.firebaseDb, 'registrations');
        const q = query(regsRef, where('external_reference', '==', extRef));
        const snap = await getDocs(q);
        const currentUid = auth.currentUser?.uid || window.firebaseAuth?.currentUser?.uid;
        let groupLink = null;

        // Atualizar em lote — apenas docs do usuário atual
        const batch = writeBatch(window.firebaseDb);
        snap.forEach(d => {
            const data = d.data();
            if (currentUid && data.userId && data.userId !== currentUid) return; // filtrar userId em JS
            const ref = doc(window.firebaseDb, 'registrations', d.id);
            batch.update(ref, { status: 'paid', paidAt: serverTimestamp() });
            if (!groupLink && data.groupLink) groupLink = data.groupLink;
        });
        await batch.commit();

        // 2) Garantir que exista um pedido correspondente em orders
        if (!snap.empty) {
            const firstReg = snap.docs[0].data();
            const ordersRef = collection(window.firebaseDb, 'orders');
            const orderQ = query(ordersRef, where('external_reference', '==', extRef));
            const orderSnap = await getDocs(orderQ);
            if (orderSnap.empty) {
                const totalAmount = firstReg.price || 0;
                await addDoc(ordersRef, {
                    title: firstReg.title || firstReg.eventType || 'Evento',
                    description: firstReg.title || firstReg.eventType || 'Evento',
                    item: firstReg.title || firstReg.eventType || 'Evento',
                    amount: totalAmount,
                    total: totalAmount,
                    quantity: 1,
                    currency: 'BRL',
                    status: 'paid',
                    customer: firstReg.email || firstReg.contact || '',
                    customerName: firstReg.teamName || '',
                    buyerEmail: firstReg.email || '',
                    userId: firstReg.userId || null,
                    uid: firstReg.userId || null,
                    external_reference: extRef,
                    createdAt: serverTimestamp(),
                    timestamp: Date.now(),
                    type: 'event'
                });
            } else {
                const existingOrder = orderSnap.docs[0];
                if (existingOrder.data().status !== 'paid') {
                    await updateDoc(doc(window.firebaseDb, 'orders', existingOrder.id), { status: 'paid', paidAt: serverTimestamp() });
                }
            }
        }

        // 3) Mostrar modal de confirmação "Parabéns" para o cliente
        if (!snap.empty) {
            const assignedSlots = [];
            let regEventName = '';
            let regIsLiga = false;
            let regEventType = '';
            snap.forEach(d => {
                const data = d.data();
                if (!regEventType) {
                    regEventType = data.eventType || '';
                    regIsLiga = data.isLiga || false;
                    regEventName = data.eventType || 'Evento';
                }
                assignedSlots.push({
                    team: data.teamName || data.email || 'Time',
                    slot: data.slotDisplay || null,
                    schedule: data.schedule || '',
                    isLiga: data.isLiga || false
                });
            });
            if (assignedSlots.length > 0 && typeof showSlotConfirmationModal === 'function') {
                // Invalidar cache de ocupação para que a barra atualize na próxima abertura
                Object.keys(scheduleCache).forEach(k => delete scheduleCache[k]);
                // Se o groupLink não veio salvo na registration, buscar dinamicamente
                let paidGroupLink = groupLink;
                if (!paidGroupLink && typeof getWhatsAppLink === 'function') {
                    try {
                        const firstSlot = assignedSlots[0];
                        paidGroupLink = await getWhatsAppLink(regEventType, firstSlot?.schedule || null, null);
                    } catch (_) {}
                }
                setTimeout(() => {
                    showSlotConfirmationModal(assignedSlots, regEventName, regIsLiga, regEventType, paidGroupLink);
                }, 400);
            }
        }

    } catch (error) {
               
    }
}

function closeTokensModal() {
    const modal = document.getElementById('tokensModal');
    if (modal) modal.classList.add('hidden');
    if (window.innerWidth <= 767) maybeClearMobileModalState();
}

async function useTokensForEvent(eventType, totalReservations, finalPrice, teamsData, selectedTimes, datesToUse) {
    // Verificar saldo (redundante, mas seguro)
    if (!canSpendTokens(finalPrice)) {
        showErrorToast('Saldo insuficiente', 'TOKEN_001');
        return;
    }

    // Construir timesByDate a partir de selectedTimes
    const timesByDate = {};
    selectedTimes.forEach(item => {
        if (!timesByDate[item.date]) timesByDate[item.date] = [];
        timesByDate[item.date].push(item.schedule);
    });

    // Verificar disponibilidade
    for (const d of datesToUse) {
        const times = timesByDate[d] || [];
        if (times.length === 0) continue;
        const availabilityCheck = await checkMultipleSlotAvailability(d, times, eventType, teamsData.length);
        if (!availabilityCheck.available) {
            showErrorToast(availabilityCheck.message || 'Horário indisponível', 'EVENT_001');
            return;
        }
    }

    // Debitar tokens
    const debitSuccess = await spendTokens(finalPrice);
    if (!debitSuccess) {
        showErrorToast('Erro ao debitar tokens', 'TOKEN_002');
        return;
    }

    // Criar registros com status 'confirmed'
    const externalRef = `tokens_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
        const { regIds, assignedSlots: assignedSlotsTokens } = await createRegistrationsForEvent(eventType, datesToUse, teamsData, timesByDate, externalRef, 'confirmed', appliedScheduleCoupon);

        closeScheduleModal();

        // Invalidar cache de ocupação para que a barra atualize na próxima abertura
        Object.keys(scheduleCache).forEach(k => delete scheduleCache[k]);

        const cfgTokens = scheduleConfig[eventType] || {};
        const isLigaTokens = cfgTokens.isLiga || false;

        if (typeof showSlotConfirmationModal === 'function' && assignedSlotsTokens.length > 0) {
            // Buscar link do WhatsApp para exibir no modal
            let tokensGroupLink = null;
            try {
                if (typeof getWhatsAppLink === 'function') {
                    const firstSched = assignedSlotsTokens[0]?.schedule || null;
                    tokensGroupLink = await getWhatsAppLink(eventType, firstSched, datesToUse?.[0] || null);
                }
            } catch (_) {}
            showSlotConfirmationModal(assignedSlotsTokens, cfgTokens.label || eventType, isLigaTokens, eventType, tokensGroupLink);
        } else {
            showSuccessToast('Pagamento com tokens confirmado! Verifique seus pedidos.', 'Sucesso');
        }
    } catch (error) {
        // Reembolsar tokens
        await grantTokens(finalPrice);
        showErrorToast('Erro ao criar agendamento. Tokens devolvidos.', 'ERRO');
    }
}

async function loadCampSemifinalLinksFromFirestore() {
    if (!window.firebaseDb) return {};
    if (campSemifinalLinksCache.data && (Date.now() - campSemifinalLinksCache.timestamp) < CAMP_SEMIFINAL_LINK_CACHE_TTL) {
        return campSemifinalLinksCache.data;
    }
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const snap = await getDocs(collection(window.firebaseDb, 'camp_semifinal_links'));
        const data = {};
        snap.forEach(doc => { data[doc.id] = doc.data(); });
        campSemifinalLinksCache = { data, timestamp: Date.now() };
        return data;
    } catch (error) {
        
        return campSemifinalLinksCache.data || {};
    }
}

async function getCampSemifinalLinkByDate(date) {
    if (!date) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    if (!normalized || !CAMP_SEMIFINAL_DATES.includes(normalized)) return null;
    const map = await loadCampSemifinalLinksFromFirestore();
    const entry = map[normalized];
    return entry?.link || entry?.url || null;
}

// Função para obter link do WhatsApp dinamicamente
async function getWhatsAppLink(eventType, schedule = null, date = null) {
    try {
        const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        

        const whatsappLinksRef = collection(window.firebaseDb, 'whatsapp_links');
        // Aceitar `eventType` como string ou objeto (compatibilidade com chamadas que passam cfg)
        const rawTypeInput = (typeof eventType === 'object' && eventType !== null) ? (eventType.eventType || eventType.type || eventType.key || eventType.label || '') : eventType;
        // Normalizar parâmetros
        const normalizeType = (t) => String(t || '').toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace('xtreino-tokens', 'xtreino-tokens')
            .replace('xtreino-gratuito', 'xtreino-gratuito')
            .replace('modo-liga', 'modo-liga')
            .replace('camp', 'camp-freitas');
        const normalizeHour = (h) => {
            if (!h) return null;
            const s = String(h).toLowerCase().trim();
            const m = s.match(/(\d{1,2})/);
            return m ? `${parseInt(m[1], 10)}h` : s;
        };
        const type = normalizeType(rawTypeInput);
        const hour = normalizeHour(schedule);
        

        // Aliases para compatibilidade com cadastros antigos
        const typeAliases = Array.from(new Set([
            type,
            type.replace('semanal-freitas', 'semanal'),
            type.replace('semanal-freitas', 'semanal freitas'),
            type.replace('camp-freitas', 'camp'),
            type.replace('camp-freitas', 'camp freitas'),
        ])).filter(Boolean);
        

        const generalScheduleAliases = [null, '', 'geral', 'general', 'todos', 'all'];

        const normalizedDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : null;
        if (type === 'camp-freitas' && normalizedDate && CAMP_SEMIFINAL_DATES.includes(normalizedDate)) {
            
            const semifinalLink = await getCampSemifinalLinkByDate(normalizedDate);
            if (semifinalLink) {
                
                return semifinalLink;
            }
        }

        // Primeiro, tentar encontrar link específico para o horário (testando aliases)
        if (hour) {
            
            for (const t of typeAliases) {
                const specificQuery = query(
                    whatsappLinksRef,
                    where('eventType', '==', t),
                    where('schedule', '==', hour),
                    where('status', '==', 'active')
                );
                const specificSnapshot = await getDocs(specificQuery);
                if (!specificSnapshot.empty) {
                    const link = specificSnapshot.docs[0].data().link;
                    
                    return link;
                }
            }
            
        }

        // Se não encontrou específico, buscar link geral para o evento
        
        for (const t of typeAliases) {
            for (const sched of generalScheduleAliases) {
                const generalQuery = query(
                    whatsappLinksRef,
                    where('eventType', '==', t),
                    where('schedule', '==', sched),
                    where('status', '==', 'active')
                );
                const generalSnapshot = await getDocs(generalQuery);
                if (!generalSnapshot.empty) {
                    const link = generalSnapshot.docs[0].data().link;
                    
                    return link;
                }
            }
        }

        

        // Fallback: apenas retornar string vazia com log
        return '';

    } catch (error) {
        
        
        return '';
    }
}

// Expor função globalmente
window.getWhatsAppLink = getWhatsAppLink;


async function createRegistrationsForEvent(eventType, datesToUse, teamsData, timesByDate, externalRef, status = 'pending', couponInfo = null) {
    const cfg = scheduleConfig[eventType] || {};
    const isLiga = (cfg.modo || '').toUpperCase().includes('LIGA');
    const vagas = cfg.vagas || 0;
    const grupos = Math.max(1, cfg.grupos || 1);
    const regIds = [];
    const assignedSlots = []; // para o modal de confirmação
    const { collection, query, where, getDocs, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

    // Alocar slots via transação atômica (slotCounters) — fonte unificada para admin e usuários normais
    const slotCount = {};
    {
        const _sc = {};
        for (const _d of datesToUse) {
            for (const _t of (timesByDate[_d] || [])) {
                _sc[_t] = (_sc[_t] || 0) + teamsData.length;
            }
        }
        if (Object.keys(_sc).length > 0) {
            const _ss = await allocateSlotsFromDB(eventType, _sc);
            if (_ss) {
                for (const [_k, _v] of Object.entries(_ss)) slotCount[_k] = _v - 1;
            }
        }
    }

    for (const d of datesToUse) {
        const times = timesByDate[d] || [];
        for (let schedule of times) {
            const hour = (schedule.split(' - ')[1] || '').trim();
            const normalizedHour = normalizeHour(hour);
            const price = getEventPrice(eventType, hour, d);
            const whatsappLink = await getWhatsAppLink(eventType, normalizedHour, d);

            for (let team of teamsData) {
                // Slot por horário independente (cada horário tem sua sequência própria)
                slotCount[schedule] = (slotCount[schedule] || 0) + 1;
                const slotNum = slotCount[schedule];
                const slotDisplay = computeSlotDisplay(slotNum, vagas, grupos, isLiga);

                const docRef = await addDoc(collection(window.firebaseDb, 'registrations'), {
                    userId: window.firebaseAuth.currentUser.uid,
                    teamName: team.name,
                    leaderName: window.currentUserProfile?.name || team.name,
                    email: team.email,
                    phone: team.phone,
                    schedule: schedule,
                    date: d,
                    eventType: eventType,
                    title: isLiga ? `${cfg.label} - ${schedule}` : `${cfg.label} - ${slotDisplay || schedule}`,
                    price: price,
                    slot: isLiga ? null : slotNum,
                    slotNumber: isLiga ? null : slotNum,
                    slotDisplay: slotDisplay,
                    status: status,
                    createdAt: serverTimestamp(),
                    external_reference: externalRef,
                    groupLink: whatsappLink || null,
                    whatsappLink: whatsappLink || null,
                    hour: normalizedHour || null,
                    affiliateCode: getActiveAffiliateCode(couponInfo?.affiliateId || null),
                    ...(status === 'confirmed' || status === 'paid' ? {
                        paidWithTokens: true,
                        tokensUsed: price,
                    } : {})
                });
                regIds.push(docRef.id);
                assignedSlots.push({ team: team.name, slot: slotDisplay, schedule, isLiga });

                await createPendingAffiliateSale(docRef.id, getActiveAffiliateCode(couponInfo?.affiliateId || null), {
                    amount: price,
                    title: `${cfg.label} - ${schedule}`,
                    customer: team.email,
                    customerName: team.name
                }, 'event');
            }
        }
    }
    return { regIds, assignedSlots };
}

// --- Edição de Perfil ---
function loadProfileData() {
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

function updateProfile(event) {
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
                    
                })
                .catch((e) => {
                    
                });
        }
    } catch (e) {
        
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
        try {
            if (!window.firebaseReady) { alertBar.classList.add('hidden'); return; }
            const { doc, getDoc, collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
            const ref = doc(collection(window.firebaseDb, 'config'), 'topAlert');
            const apply = (data) => {
                const enabled = !!data?.enabled;
                const text = data?.text || '';
                if (enabled && text) {
                    alertBar.innerHTML = text;
                    alertBar.classList.remove('hidden');
                } else {
                    alertBar.classList.add('hidden');
                }
            };
            try {
                const snap = await getDoc(ref);
                if (snap.exists()) apply(snap.data()); else alertBar.classList.add('hidden');
            } catch (_) { alertBar.classList.add('hidden'); }
            try {
                onSnapshot(ref, (snap) => { if (snap.exists()) apply(snap.data()); });
            } catch (_) { }
        } catch (_) { /* fallback: manter oculto */ }
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

// Mobile menu expandido - aparece ao rolar para baixo
let lastScrollY = 0;
const mobileMenuExpanded = document.getElementById('mobileMenuExpanded');
if (mobileMenuExpanded) {
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Mostrar menu expandido quando rolar para baixo (scroll > 50px)
        if (currentScrollY > 50) {
            mobileMenuExpanded.classList.remove('hidden');
        } else {
            mobileMenuExpanded.classList.add('hidden');
        }

        lastScrollY = currentScrollY;
    }, { passive: true });
}

function maybeClearMobileModalState() {
    const anyOpen = [
        document.getElementById('loginModal'),
        document.getElementById('purchaseModal'),
        document.getElementById('clientAreaModal'),
        document.getElementById('tokensModal'),
        document.getElementById('freeWhatsModal'),
        document.getElementById('scheduleModal')
    ].some(el => el && !el.classList.contains('hidden'));
    if (!anyOpen) document.body.classList.remove('modal-open-mobile');
}

// Expor função de cupom globalmente
// Aplicar cupom no modal de agendamento
async function applyScheduleCoupon() {
    const couponCode = document.getElementById('schedCouponCodeInput')?.value?.trim().toUpperCase();
    const messageDiv = document.getElementById('schedCouponMessage');

    if (!couponCode) {
        showScheduleCouponMessage('Digite um código de cupom', 'error');
        return;
    }

    if (appliedScheduleCoupon) {
        showScheduleCouponMessage('Já existe um cupom aplicado. Remova-o antes de aplicar outro.', 'error');
        return;
    }

    if (!scheduleOriginalTotal || scheduleOriginalTotal <= 0) {
        showScheduleCouponMessage('Selecione ao menos um horário antes de aplicar o cupom.', 'error');
        return;
    }

    try {
        

        // Importar Firebase
        const { collection, getDocs, query, where, limit } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        // Buscar cupom no Firestore
        const couponsRef = collection(window.firebaseDb, 'coupons');
        const q = query(couponsRef, where('code', '==', couponCode), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showScheduleCouponMessage('Cupom não encontrado', 'error');
            return;
        }

        const couponDoc = snapshot.docs[0];
        const coupon = { id: couponDoc.id, ...couponDoc.data() };

        // Validar cupom para eventos
        const validation = validateScheduleCoupon(coupon);
        if (!validation.valid) {
            showScheduleCouponMessage(validation.message, 'error');
            return;
        }

        // Aplicar cupom
        appliedScheduleCoupon = coupon;
        updateSchedulePriceWithCoupon();
        showScheduleCouponMessage(`Cupom aplicado! Desconto: ${getDiscountText(coupon)}`, 'success');
        updateScheduleCouponUI();

        

    } catch (error) {
        
        showScheduleCouponMessage('Erro ao validar cupom. Tente novamente.', 'error');
    }
}

// Validar cupom para eventos
function validateScheduleCoupon(coupon) {
    // Verificar se está ativo
    if (!coupon.isActive) {
        return { valid: false, message: 'Cupom inativo' };
    }

    // Verificar data de expiração
    if (coupon.expirationDate) {
        const expirationDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
        if (expirationDate < new Date()) {
            return { valid: false, message: 'Cupom expirado' };
        }
    }

    // Verificar se o cupom pode ser usado em eventos
    if (coupon.usageType === 'store') {
        return { valid: false, message: 'Cupom válido apenas para loja virtual' };
    }

    return { valid: true };
}

// Obter total atual do agendamento
function getCurrentScheduleTotal() {
    const totalElement = document.getElementById('totalPrice');
    if (!totalElement) return 0;

    const totalText = totalElement.textContent.replace('R$ ', '').replace(',', '.');
    return parseFloat(totalText) || 0;
}

// Atualizar preço do agendamento com cupom
function updateSchedulePriceWithCoupon() {
    if (!appliedScheduleCoupon) return;

    const totalElement = document.getElementById('totalPrice');
    if (!totalElement) return;

    const baseTotal = Number(scheduleOriginalTotal || 0);
    if (!baseTotal || baseTotal <= 0) return;

    let discountAmount = 0;
    if (appliedScheduleCoupon.discountType === 'percentage') {
        discountAmount = baseTotal * (appliedScheduleCoupon.discountValue / 100);
    } else {
        discountAmount = appliedScheduleCoupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, baseTotal);
    const finalTotal = Math.max(0, baseTotal - discountAmount);
    totalElement.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
}

function removeScheduleCoupon() {
    if (!appliedScheduleCoupon) return;
    const removedCode = appliedScheduleCoupon.code;
    appliedScheduleCoupon = null;
    const totalElement = document.getElementById('totalPrice');
    if (totalElement) {
        const base = Number(scheduleOriginalTotal || 0);
        totalElement.textContent = `R$ ${base.toFixed(2).replace('.', ',')}`;
    }
    updateScheduleCouponUI();
    showScheduleCouponMessage(`Cupom "${removedCode}" removido`, 'success');
}

function updateScheduleCouponUI() {
    const input = document.getElementById('schedCouponCodeInput');
    const applyBtn = document.getElementById('applyScheduleCouponBtn');
    const removeBtn = document.getElementById('removeScheduleCouponBtn');
    if (!input || !applyBtn || !removeBtn) return;

    if (appliedScheduleCoupon) {
        input.value = appliedScheduleCoupon.code;
        input.disabled = true;
        applyBtn.disabled = true;
        applyBtn.textContent = 'Aplicado';
        applyBtn.classList.add('opacity-60', 'cursor-not-allowed');
        removeBtn.classList.remove('hidden');
    } else {
        input.disabled = false;
        applyBtn.disabled = false;
        applyBtn.textContent = 'Aplicar';
        applyBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        removeBtn.classList.add('hidden');
        input.value = '';
    }
}

// Mostrar mensagem de cupom no agendamento
function showScheduleCouponMessage(message, type) {
    const messageDiv = document.getElementById('schedCouponMessage');
    messageDiv.textContent = message;
    messageDiv.className = `text-sm ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    messageDiv.classList.remove('hidden');

    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}

// Registrar uso de cupom
async function recordCouponUsage(couponId, couponCode, orderValue, discountAmount, context, orderId, productInfo = null) {
    try {
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        const usageData = {
            couponId: couponId,
            couponCode: couponCode,
            customerEmail: window.currentUser?.email || 'guest',
            customerName: window.currentUser?.displayName || 'Cliente',
            orderValue: orderValue,
            discountAmount: discountAmount,
            finalValue: orderValue - discountAmount,
            context: context, // 'store' ou 'events'
            orderId: orderId,
            usedAt: new Date(),
            userId: window.currentUser?.uid || null,
            // Informações do produto
            productId: productInfo?.productId || productInfo?.id || null,
            productName: productInfo?.name || productInfo?.title || productInfo?.item || null,
            discountPercentage: orderValue > 0 ? ((discountAmount / orderValue) * 100).toFixed(2) : 0
        };

        await addDoc(collection(window.firebaseDb, 'couponUsage'), usageData);

        // Atualizar contador de uso do cupom
        await updateCouponUsageCount(couponId);

        
    } catch (error) {
        
    }
}

// Atualizar contador de uso do cupom
async function updateCouponUsageCount(couponId) {
    try {
        const { doc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

        const couponRef = doc(window.firebaseDb, 'coupons', couponId);
        await updateDoc(couponRef, {
            usageCount: increment(1)
        });

        
    } catch (error) {
        
    }
}

function setImageProducts(productId, product){
    if (imgMap[productId]) {               
            imgMap[productId].image = product.image;             
            
    } else {        
        imgMap[productId] = {                   
            image: product.image
        };
    }
    
}


function setScheduleConfig(productId, product) {
    const base = {
        label: product.name,
        price: Number(product.price) || 0,
        isProduct: true,
        description: product.description,
        details: product.details,
        benefits: product.benefits,
        image: product.image,
        category: product.category,
        downloadLink: product.downloadLink
    };
    if (scheduleConfig[productId]) {
        scheduleConfig[productId] = { ...scheduleConfig[productId], ...base,
            label: product.name || scheduleConfig[productId].label,
            price: Number(product.price) || scheduleConfig[productId].price
        };
    } else {
        scheduleConfig[productId] = base;
    }
}

function setProducts(productId, product) {
    const base = {
        name: product.name,
        price: Number(product.price) || 0,
        isProduct: true,
        description: product.description,
        details: product.details,
        benefits: product.benefits,
        image: product.image,
        category: product.category,
        downloadLink: product.downloadLink
    };
    if (products[productId]) {
        products[productId] = { ...products[productId], ...base,
            name: product.name || products[productId].name,
            price: Number(product.price) || products[productId].price
        };
    } else {
        products[productId] = base;
    }
}

async function loadProductsFromFirestore() {
    try {
        if (!window.firebaseDb) {
            
            return;
        }

        const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const productsRef = collection(window.firebaseDb, 'products');
        // Busca apenas produtos ativos (campo active = true)
        const q = query(productsRef, where('active', '==', true));
        const snapshot = await getDocs(q);

        const container = document.getElementById('productsContainer');
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = '<p class="col-span-full text-center text-gray-500">Nenhum produto disponível no momento.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
 
            setScheduleConfig(productId, product);
            setProducts(productId, product);

            // Define badge (destaque) se existir
            let badgeHtml = '';
            if (product.badge) {
                const badgeColor = product.badgeColor || 'bg-yellow-400 text-black';
                badgeHtml = `<div class="absolute top-4 right-4 ${badgeColor} text-xs font-bold px-2 py-1 rounded">${product.badge}</div>`;
            }

            // Define ícone/indicador de categoria
            const catVal = (product.category || '').toLowerCase();
            const catLabel = catVal === 'fisico' || catVal === 'physical' ? 'Físico'
                : catVal === 'servico' || catVal === 'service' ? 'Serviço'
                : 'Digital';
            const categoryIcon = `<span class="text-sm text-gray-500">${catLabel}</span>`;

            // Monta a descrição resumida (primeiras linhas)
            const descriptionLines = (product.description || '').split('\n').slice(0, 3).join('<br>');

            // Imagem (usa imagem padrão se não houver)
            const imageUrl = product.image || 'assets/images/Logo - Xtreino Freitas.png';

            // Preço seguro
            const priceNum = Number(product.price) || 0;

            html += `
                <div class="product-card relative">
                    ${badgeHtml}
                    <div class="product-media">
                        <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                    </div>
                    <div class="product-title">${product.name}</div>
                    <div class="product-desc">
                        <div class="space-y-1">
                            <div><strong>Valor:</strong> R$ ${priceNum.toFixed(2)}</div>
                            ${descriptionLines ? `<div>${descriptionLines}</div>` : ''}
                        </div>
                    </div>
                    <div class="product-meta flex justify-between items-center mb-3">
                        <span class="text-2xl font-bold text-blue-matte">R$ ${priceNum.toFixed(2)}</span>
                        ${categoryIcon}
                    </div>
                    <button onclick="openScheduleModal('${productId}')" class="w-full btn-primary py-2 rounded-lg font-semibold transition-colors">
                        COMPRAR
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        // Reaplica animações se necessário
        if (typeof reinitAnimations === 'function') {
            reinitAnimations(container);
        }

    } catch (error) {
        
        const container = document.getElementById('productsContainer');
        if (container) {
            container.innerHTML = '<p class="col-span-full text-center text-red-500">Erro ao carregar produtos. Tente novamente mais tarde.</p>';
        }
    }
}

window.applyCoupon = applyCoupon;
window.applyScheduleCoupon = applyScheduleCoupon;
window.removeScheduleCoupon = removeScheduleCoupon;
window.recordCouponUsage = recordCouponUsage;
window.openScheduleModal = openScheduleModal;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openPurchaseModal = openPurchaseModal;
window.closePurchaseModal = closePurchaseModal;
//window.openTokensModal = openTokensModal;
window.closeTokensModal = closeTokensModal;
window.openFreeWhatsModal = openFreeWhatsModal;
window.closeFreeWhatsModal = closeFreeWhatsModal;
window.processSuccessfulPayment = processSuccessfulPayment;
window.getActiveAffiliateCode = getActiveAffiliateCode;

// ==================== EVENTOS DINÂMICOS (adminEvents) ====================

async function loadDynamicEvents() {
    const grid = document.getElementById('dynamicEventsGrid');
    const fallback = document.getElementById('staticEventsGrid');
    if (!grid) return;

    const waitForFirebase = () => new Promise(resolve => {
        if (window.firebaseDb) { resolve(); return; }
        const t = setInterval(() => { if (window.firebaseDb) { clearInterval(t); resolve(); } }, 200);
        setTimeout(() => { clearInterval(t); resolve(); }, 8000);
    });
    await waitForFirebase();

    if (!window.firebaseDb) {
        grid.classList.add('hidden');
        if (fallback) { fallback.classList.remove('hidden'); fallback.classList.add('grid'); }
        return;
    }

    try {
        const { collection, query, where, getDocs, orderBy } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const colRef = collection(window.firebaseDb, 'adminEvents');
        let snap;
        try {
            snap = await getDocs(query(colRef, where('status', '==', 'Aberto'), orderBy('createdAt', 'desc')));
        } catch (_) {
            snap = await getDocs(query(colRef, where('status', '==', 'Aberto')));
        }

        if (snap.empty) {
            grid.classList.add('hidden');
            if (fallback) { fallback.classList.remove('hidden'); fallback.classList.add('grid'); }
            return;
        }

        const placeholderImg = 'assets/images/events/CAMP.jpeg';
        const categoryLabels = { camp: 'CAMP', xtreino: 'XTREINO', diario: 'DIÁRIO' };

        const cards = snap.docs.map(d => {
            const ev = d.data();
            const _isFreeEv = !ev.preco || ev.entrada === 'GRÁTIS' || Number(ev.preco) === 0;
            // Registrar no scheduleConfig para openScheduleModal funcionar com eventos dinâmicos
            scheduleConfig[d.id] = {
                label: ev.name || 'Evento',
                price: Number(ev.preco) || 0,
                payWithToken: ev.entrada === 'TOKENS',
                vagas: Number(ev.vagas) || 0,
                grupos: Number(ev.grupos) || 0,
                isFree: _isFreeEv,
                modo: (ev.modo || '').toUpperCase(),
                // Padrão: segunda a sexta, 14h-23h, sem data de corte automática
                allowedWeekdays: [1, 2, 3, 4, 5],
                slots: ['14h','15h','16h','17h','18h','19h','20h','21h','22h','23h'],
            };
            const imgSrc = ev.imageUrl || placeholderImg;
            const preco = ev.preco ? `R$ ${Number(ev.preco).toFixed(2)}` : 'GRÁTIS';
            const catLabel = categoryLabels[ev.category] || ev.category || '';
            const descLines = ev.descricao ? ev.descricao.split('\n').slice(0, 3).map(l => `<div>${l}</div>`).join('') : '';
            const formatoStr = (ev.formato || '').toUpperCase();
            const modoStr = (ev.modo || '').toUpperCase();
            const tipoStr = (ev.tipo || '').toUpperCase();
            const btnLabel = ev.entrada === 'PAGO' && ev.preco ? `INSCREVER — ${preco}` : 'RESERVAR VAGA';
            const btnHtml = `<div class="flex flex-col gap-2">
                <button onclick="openScheduleModal('${d.id}')" class="w-full btn-primary py-2 rounded-lg font-semibold">${btnLabel}</button>
                <a href="evento.html#${d.id}" class="w-full text-center border border-gray-300 hover:border-orange-400 text-gray-600 hover:text-orange-600 py-2 rounded-lg font-semibold text-sm transition-colors block">
                    <i class="fas fa-info-circle mr-1"></i>Ver Detalhes
                </a>
            </div>`;

            const quedasStr = ev.quedas ? `${ev.quedas}x` : null;
            const mapasList = Array.isArray(ev.mapas) && ev.mapas.length ? ev.mapas.join(' • ') : null;
            return `<article class="product-card" data-category="${ev.category || ''}" data-event-id="${d.id}">
                <div class="px-1 pb-1 flex flex-wrap gap-1">
                    ${catLabel ? `<span class="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded">${catLabel}</span>` : ''}
                    ${formatoStr ? `<span class="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">${formatoStr}</span>` : ''}
                    ${quedasStr ? `<span class="inline-block bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded">${quedasStr} QUEDAS</span>` : ''}
                </div>
                <div class="product-media">
                    <img src="${imgSrc}" alt="${ev.name || 'Evento'}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='${placeholderImg}'">
                </div>
                <div class="product-title">${ev.name || 'Evento'}</div>
                <div class="product-desc">
                    <div class="space-y-1">
                        <div><strong>Entrada:</strong> ${preco}</div>
                        <div><strong>Vagas por horário:</strong> ${ev.vagas || '—'}</div>
                        <div><strong>Modalidade:</strong> ${tipoStr} | ${modoStr}${formatoStr ? ' | ' + formatoStr : ''}</div>
                        ${mapasList ? `<div><strong>Mapas:</strong> ${mapasList}</div>` : ''}
                        ${descLines ? `<div class="text-xs text-gray-500 mt-1">${descLines}</div>` : ''}
                    </div>
                </div>
                ${btnHtml}
            </article>`;
        });

        grid.innerHTML = cards.join('');
        grid.classList.add('grid');

    } catch (err) {
        console.error('Erro ao carregar eventos dinâmicos:', err);
        grid.classList.add('hidden');
        if (fallback) { fallback.classList.remove('hidden'); fallback.classList.add('grid'); }
    }
}

function filterEventsByCategory(cat) {
    const grid = document.getElementById('dynamicEventsGrid');
    if (!grid) return;
    const tabs = document.querySelectorAll('#eventSubTabs .event-sub-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
    const cards = grid.querySelectorAll('article[data-category]');
    let visible = 0;
    cards.forEach(card => {
        const show = cat === 'all' || card.dataset.category === cat;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    const empty = document.getElementById('eventsEmptyMsg');
    if (empty) empty.remove();
    if (visible === 0) {
        const msg = document.createElement('p');
        msg.id = 'eventsEmptyMsg';
        msg.className = 'col-span-full text-center text-gray-400 py-8';
        msg.textContent = 'Nenhum evento nesta categoria no momento.';
        grid.appendChild(msg);
    }
}

async function openEventPayment(eventId, eventName, preco) {
    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        showToast('info', 'Faça login para se inscrever no evento.', 'Login necessário');
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
    }

    const btn = event?.target;
    const originalText = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = 'Aguarde...'; }

    try {
        const externalRef = `event_${eventId}_${user.uid}_${Date.now()}`;
        const payload = {
            title: eventName,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(preco),
            userId: user.uid,
            customerEmail: user.email,
            external_reference: externalRef,
            type: 'event_registration',
            back_url: `${window.location.origin}/evento.html#${eventId}`
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('/.netlify/functions/create-preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Erro ${response.status}`);
        }

        const data = await response.json();
        const checkoutUrl = data.init_point || data.sandbox_init_point;
        if (!checkoutUrl) throw new Error('Não foi possível obter o link de pagamento.');

        try { sessionStorage.setItem('lastCheckoutUrl', checkoutUrl); } catch (_) {}
        try {
            window.open(checkoutUrl, '_blank');
            showToast('success', 'Checkout aberto em nova aba. Finalize o pagamento no Mercado Pago.', 'Pagamento');
        } catch (_) {
            window.location.href = checkoutUrl;
        }
    } catch (err) {
        console.error('Erro ao criar preferência de pagamento:', err);
        if (err.name === 'AbortError') {
            showToast('error', 'Conexão expirou. Verifique sua internet e tente novamente.', 'Timeout');
        } else {
            showToast('error', err.message || 'Erro ao processar pagamento.', 'Erro');
        }
    } finally {
        if (btn) { btn.disabled = false; if (originalText) btn.textContent = originalText; }
    }
}

window.openEventPayment = openEventPayment;

// Auto-abrir modal de evento via ?openEvent=ID na URL
(function checkOpenEventParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const openEventId = urlParams.get('openEvent');
    if (!openEventId) return;
    // Remove param da URL sem recarregar
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('openEvent');
        window.history.replaceState({}, '', url.toString());
    } catch (_) {}
    // Aguarda Firebase + openScheduleModal estar disponível
    const tryOpen = (attempts = 0) => {
        if (typeof openScheduleModal === 'function' && window.firebaseDb) {
            // Garante que a aba de eventos está ativa
            if (typeof switchMainTab === 'function') switchMainTab('eventos');
            setTimeout(() => openScheduleModal(openEventId), 400);
        } else if (attempts < 40) {
            setTimeout(() => tryOpen(attempts + 1), 250);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => tryOpen());
    } else {
        tryOpen();
    }
})();

// Inicializa eventos dinâmicos quando a página carrega
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicEvents);
} else {
    loadDynamicEvents();
}
