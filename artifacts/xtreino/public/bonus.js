// bonus.js — Vaga Bônus (Org Freitas)
// Permite que jogadores se inscrevam via link exclusivo gerado pelo admin.

const _FS_URL = 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
const _AUTH_URL = 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

const _LABELS_EVENTO = {
    'xtreino-tokens': 'XTreino Freitas',
    'modo-liga': 'XTreino Modo Liga',
    'semanal-freitas': 'Semanal Freitas',
    'semanal': 'Semanal Freitas',
    'camp-freitas': 'Campeonato Freitas'
};

let _bonusLink = null;
let _bonusLinkId = null;
let _usuarioAtual = null;
let _perfilUsuario = null;

// ── Inicialização ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.visibility = 'visible';

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
        _mostrarErro('Link inválido', 'Nenhum código de vaga bônus encontrado na URL.');
        return;
    }

    await _aguardarFirebase();
    await _carregarBonusLink(code);

    if (!_bonusLink) return; // erro já exibido

    const { onAuthStateChanged } = await import(_AUTH_URL);
    onAuthStateChanged(window.firebaseAuth, async (user) => {
        _usuarioAtual = user;
        if (user) {
            await _carregarPerfilUsuario(user.uid);
        }
        _renderizarParticipacao();
    });
});

// ── Firebase: aguardar inicialização ──────────────────────────────────────────

function _aguardarFirebase() {
    return new Promise((resolve) => {
        const check = () => {
            if (window.firebaseDb && window.firebaseAuth) return resolve();
            setTimeout(check, 100);
        };
        check();
    });
}

// ── Carregar dados do link bônus ──────────────────────────────────────────────

async function _carregarBonusLink(code) {
    try {
        const { collection, query, where, getDocs } = await import(_FS_URL);
        const q = query(
            collection(window.firebaseDb, 'bonus_links'),
            where('code', '==', code.toUpperCase())
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            _mostrarErro('Link não encontrado', 'Este link de vaga bônus não existe ou foi removido.');
            return;
        }

        const docSnap = snap.docs[0];
        _bonusLink = { id: docSnap.id, ...docSnap.data() };
        _bonusLinkId = docSnap.id;

        // Validações de estado
        if (_bonusLink.status === 'pausado') {
            _mostrarErro('Link pausado', 'Este link de vaga bônus está temporariamente pausado pela organização.');
            return;
        }
        if (_bonusLink.status === 'expirado') {
            _mostrarErro('Vagas esgotadas', 'Todas as vagas bônus disponíveis já foram preenchidas.');
            return;
        }
        if ((_bonusLink.usedCount || 0) >= (_bonusLink.quantity || 0)) {
            _mostrarErro('Vagas esgotadas', 'Todas as vagas bônus disponíveis já foram preenchidas.');
            return;
        }
        if (_bonusLink.expiresAt) {
            const expiry = new Date(_bonusLink.expiresAt);
            if (expiry < new Date()) {
                _mostrarErro('Prazo encerrado', 'O período de inscrição para esta vaga bônus já encerrou.');
                return;
            }
        }

        _renderizarInfoBonus();

    } catch (err) {
        console.error('[Bonus] Erro ao carregar link:', err);
        _mostrarErro('Erro ao carregar', 'Não foi possível carregar os dados. Tente novamente em instantes.');
    }
}

// ── Renderizar informações do evento ──────────────────────────────────────────

function _renderizarInfoBonus() {
    const vagasRestantes = (_bonusLink.quantity || 0) - (_bonusLink.usedCount || 0);
    const nomeEvento = _LABELS_EVENTO[_bonusLink.eventType] || _bonusLink.eventName || _bonusLink.eventType;

    document.getElementById('bonusEventName').textContent = nomeEvento;
    document.getElementById('bonusSchedule').textContent = _bonusLink.schedule || '--';
    document.getElementById('bonusVagasRestantes').textContent = vagasRestantes;

    if (_bonusLink.date) {
        const [ano, mes, dia] = _bonusLink.date.split('-');
        document.getElementById('bonusDate').textContent = `${dia}/${mes}/${ano}`;
        document.getElementById('bonusDateRow').classList.remove('hidden');
    }

    if (_bonusLink.expiresAt) {
        const expiry = new Date(_bonusLink.expiresAt);
        document.getElementById('bonusExpiry').textContent = expiry.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        document.getElementById('bonusExpiryRow').classList.remove('hidden');
    }

    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('bonusCard').classList.remove('hidden');
}

// ── Carregar perfil do usuário no Firestore ───────────────────────────────────

async function _carregarPerfilUsuario(uid) {
    try {
        const { doc, getDoc } = await import(_FS_URL);
        const snap = await getDoc(doc(window.firebaseDb, 'users', uid));
        if (snap.exists()) {
            _perfilUsuario = snap.data();
        }
    } catch (err) {
        console.warn('[Bonus] Erro ao carregar perfil:', err);
    }
}

// ── Renderizar área de participação ───────────────────────────────────────────

function _renderizarParticipacao() {
    const container = document.getElementById('participacaoContainer');
    if (!container || !_bonusLink) return;

    if (!_usuarioAtual) {
        container.innerHTML = `
            <p class="text-gray-400 text-sm text-center mb-3">Faça login para participar desta vaga bônus</p>
            <a href="/" class="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors btn-participar">
                <i class="fas fa-sign-in-alt mr-2"></i>Entrar / Cadastrar
            </a>
        `;
        return;
    }

    const teamName = _perfilUsuario?.teamName || _perfilUsuario?.name || _usuarioAtual.displayName || '';
    const phone = _perfilUsuario?.phone || '';

    container.innerHTML = `
        ${teamName ? `
            <div class="bg-gray-700/50 rounded-xl p-3 mb-4 flex items-center gap-3">
                <div class="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-users text-white text-xs"></i>
                </div>
                <div class="text-sm">
                    <div class="text-gray-400 text-xs">Sua equipe</div>
                    <div class="font-bold text-white">${_esc(teamName)}</div>
                </div>
            </div>
        ` : `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-1">
                    <i class="fas fa-users text-orange-400 mr-1"></i>Nome da equipe *
                </label>
                <input type="text" id="bonusTeamName" placeholder="Ex: Alpha Squad"
                    class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            </div>
        `}
        <div class="mb-5">
            <label class="block text-sm font-medium text-gray-300 mb-1">
                <i class="fas fa-whatsapp text-green-400 mr-1"></i>WhatsApp
            </label>
            <input type="tel" id="bonusPhone" placeholder="(99) 99999-9999"
                value="${_esc(phone)}"
                class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
        </div>
        <button onclick="window.confirmarParticipacao()" id="btnParticipar"
            class="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 px-6 rounded-xl transition-colors btn-participar text-lg tracking-wide">
            <i class="fas fa-gamepad mr-2"></i>QUERO PARTICIPAR
        </button>
        <p class="text-center text-xs text-gray-500 mt-3">Sua inscrição é gratuita e será confirmada imediatamente.</p>
    `;
}

// ── Confirmar participação ────────────────────────────────────────────────────

window.confirmarParticipacao = async function() {
    const btn = document.getElementById('btnParticipar');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Processando...';
    }

    try {
        // Validações básicas
        if (!_usuarioAtual) throw new Error('Faça login para participar.');
        if (!_bonusLink) throw new Error('Dados da vaga bônus não carregados. Recarregue a página.');

        const teamName = _perfilUsuario?.teamName || _perfilUsuario?.name || _usuarioAtual.displayName
            || document.getElementById('bonusTeamName')?.value?.trim();
        const phone = document.getElementById('bonusPhone')?.value?.trim() || _perfilUsuario?.phone || '';

        if (!teamName) throw new Error('Informe o nome da sua equipe.');

        // Verificar expiração
        if (_bonusLink.expiresAt && new Date(_bonusLink.expiresAt) < new Date()) {
            throw new Error('O prazo desta vaga bônus já expirou.');
        }

        const {
            collection, addDoc, runTransaction, doc,
            serverTimestamp, query, where, getDocs
        } = await import(_FS_URL);

        const regsRef = collection(window.firebaseDb, 'registrations');

        // Verificar se já está inscrito neste bonus (pelo código)
        const jaBonusSnap = await getDocs(query(regsRef,
            where('bonusCode', '==', _bonusLink.code),
            where('userId', '==', _usuarioAtual.uid)
        ));
        if (!jaBonusSnap.empty) throw new Error('Você já está inscrito nesta vaga bônus.');

        // Verificar inscrição ativa no mesmo evento/data
        const jaInscritoSnap = await getDocs(query(regsRef,
            where('eventType', '==', _bonusLink.eventType),
            where('date', '==', _bonusLink.date),
            where('userId', '==', _usuarioAtual.uid)
        ));
        const statusValidos = new Set(['paid', 'confirmed', 'approved']);
        const jaInscrito = jaInscritoSnap.docs.some(d => {
            const r = d.data();
            if (!statusValidos.has(r.status)) return false;
            // Verificar mesmo horário
            const rHour = String(r.schedule || '').match(/(\d{1,2})/)?.[1];
            const bHour = String(_bonusLink.schedule || '').match(/(\d{1,2})/)?.[1];
            return !bHour || rHour === bHour;
        });
        if (jaInscrito) throw new Error('Você já tem uma inscrição ativa neste evento/horário.');

        // Contar vagas ocupadas para determinar número do slot
        const ocupadosSnap = await getDocs(query(regsRef,
            where('eventType', '==', _bonusLink.eventType),
            where('date', '==', _bonusLink.date)
        ));
        const bHourRef = String(_bonusLink.schedule || '').match(/(\d{1,2})/)?.[1];
        let ocupados = 0;
        ocupadosSnap.forEach(d => {
            const r = d.data();
            if (!statusValidos.has(r.status)) return;
            const rHour = String(r.schedule || '').match(/(\d{1,2})/)?.[1];
            if (!bHourRef || rHour === bHourRef) ocupados++;
        });
        const slotNum = ocupados + 1;
        const slotDisplay = `Vaga #${slotNum}`;

        // Transação atômica: verificar vagas + incrementar usedCount
        const bonusRef = doc(window.firebaseDb, 'bonus_links', _bonusLinkId);
        await runTransaction(window.firebaseDb, async (tx) => {
            const bonusSnap = await tx.get(bonusRef);
            if (!bonusSnap.exists()) throw new Error('Link bônus não encontrado.');

            const bd = bonusSnap.data();
            if (bd.status !== 'ativo') throw new Error('Este link bônus não está mais ativo.');
            if ((bd.usedCount || 0) >= bd.quantity) throw new Error('Todas as vagas bônus já foram preenchidas.');

            const novoUsed = (bd.usedCount || 0) + 1;
            const novoStatus = novoUsed >= bd.quantity ? 'expirado' : 'ativo';
            tx.update(bonusRef, { usedCount: novoUsed, status: novoStatus });
        });

        // Criar inscrição (igual às inscrições normais)
        const nomeEvento = _LABELS_EVENTO[_bonusLink.eventType] || _bonusLink.eventName || _bonusLink.eventType;
        await addDoc(regsRef, {
            userId: _usuarioAtual.uid,
            teamName,
            teamLogoUrl: _perfilUsuario?.teamLogoUrl || null,
            teamId: _perfilUsuario?.teamId || null,
            leaderName: _perfilUsuario?.name || _usuarioAtual.displayName || teamName,
            email: _usuarioAtual.email,
            phone,
            schedule: _bonusLink.schedule,
            date: _bonusLink.date,
            eventType: _bonusLink.eventType,
            title: `${nomeEvento} - ${_bonusLink.schedule}`,
            price: 0,
            slot: slotNum,
            slotNumber: slotNum,
            slotDisplay,
            status: 'confirmed',
            origem: 'bonus',
            bonusCode: _bonusLink.code,
            bonusLinkId: _bonusLinkId,
            createdAt: serverTimestamp()
        });

        _mostrarSucesso(teamName, nomeEvento);

    } catch (err) {
        console.error('[Bonus] Erro ao confirmar:', err);
        alert('❌ ' + (err.message || 'Erro ao confirmar participação. Tente novamente.'));
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-gamepad mr-2"></i>QUERO PARTICIPAR';
        }
    }
};

// ── Exibir sucesso ─────────────────────────────────────────────────────────────

function _mostrarSucesso(teamName, nomeEvento) {
    document.getElementById('bonusCard').classList.add('hidden');
    document.getElementById('successTeamName').textContent = teamName;
    document.getElementById('successEventName').textContent = nomeEvento;
    document.getElementById('successState').classList.remove('hidden');
}

// ── Exibir erro ───────────────────────────────────────────────────────────────

function _mostrarErro(titulo, mensagem) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('bonusCard').classList.add('hidden');
    document.getElementById('errorTitle').textContent = titulo;
    document.getElementById('errorMessage').textContent = mensagem;
    document.getElementById('errorState').classList.remove('hidden');
}

// ── Utilitário: escape HTML ───────────────────────────────────────────────────

function _esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
