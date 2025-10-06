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

// Login modal functions
function openLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

function handleLogin(event) {
    event.preventDefault();
    // Simula login bem-sucedido
    closeLoginModal();
    openClientArea();
}

async function loginWithGoogle() {
    try {
        if (!window.firebaseReady) {
            alert('Autenticação indisponível no momento. Configure o Firebase.');
            return;
        }
        const { signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
        const result = await signInWithPopup(window.firebaseAuth, window.firebaseProviders.google);
        const user = result.user;
        closeLoginModal();
        // Exibir nome do usuário na Área do Cliente (exemplo)
        const nameEl = document.querySelector('#clientAreaModal p.text-gray-300');
        if (nameEl) nameEl.textContent = `Bem-vindo, ${user.displayName || 'Usuário'}!`;
        openClientArea();
    } catch (err) {
        console.error('Login Google falhou:', err);
        alert('Falha no login com Google.');
    }
}

function showRegisterForm() {
    alert('Formulário de cadastro será implementado. Esta é uma demonstração da interface.');
}

// Client Area Functions
function openClientArea() {
    document.getElementById('clientAreaModal').classList.remove('hidden');
}

function closeClientArea() {
    document.getElementById('clientAreaModal').classList.add('hidden');
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
        'aim': 'Aim Training',
        'strategy': 'Estratégia',
        'mental': 'Mentalidade'
    };
    
    alert(`Agendando ${trainings[trainingType]}...\n\nEm uma implementação real, isso abriria um calendário para seleção de horário.`);
}

function handleContactForm(event) {
    event.preventDefault();
    const form = event.target;
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
    'passe-booyah': { name: 'Passe Booyah', price: 'R$ 99,90', description: 'Assinatura mensal com acesso completo' },
    'aim-training': { name: 'XTreino - Aim Training', price: 'R$ 49,90', description: 'Sessão de 2 horas de treinamento' },
    'estrategia': { name: 'XTreino - Estratégia', price: 'R$ 79,90', description: 'Sessão de 3 horas de treinamento' },
    'mentalidade': { name: 'XTreino - Mentalidade', price: 'R$ 39,90', description: 'Sessão de 1.5 horas de treinamento' },
    'camisa': { name: 'Camisa Oficial', price: 'R$ 89,90', description: 'Produto físico - Camisa premium' },
    'planilhas': { name: 'Planilhas de Análise', price: 'R$ 29,90', description: 'Download digital imediato' },
    'imagens': { name: 'Imagens Aéreas', price: 'R$ 19,90', description: 'Download digital imediato' },
    'sensibilidades': { name: 'Sensibilidades', price: 'R$ 14,90', description: 'Download digital imediato' }
};

function openPurchaseModal(productId) {
    currentProduct = productId;
    const product = products[productId];
    
    document.getElementById('purchaseTitle').textContent = product.name;
    document.getElementById('purchaseDescription').textContent = product.description;
    document.getElementById('purchasePrice').textContent = product.price;
    document.getElementById('purchaseModal').classList.remove('hidden');
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').classList.add('hidden');
    currentProduct = null;
}

function handlePurchase(event) {
    event.preventDefault();
    alert(`Compra do produto "${products[currentProduct].name}" será processada via Mercado Pago. Esta é uma demonstração da interface.`);
    closePurchaseModal();
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const purchaseModal = document.getElementById('purchaseModal');
    const clientAreaModal = document.getElementById('clientAreaModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === purchaseModal) {
        closePurchaseModal();
    }
    if (event.target === clientAreaModal) {
        closeClientArea();
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


