// Alternar abas do painel de login
function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabName === 'status') {
        atualizarStatusSessaoUI();
    }
}

// Cadastro de novos operadores no localStorage
function realizarCadastro(event) {
    event.preventDefault();
    const nome = document.getElementById('reg-fullname').value.trim();
    const usuario = document.getElementById('reg-username').value.trim().toLowerCase();
    const senha = document.getElementById('reg-password').value.trim();

    let usuariosCadastrados = JSON.parse(localStorage.getItem('wms_usuarios_sistema')) || [];

    if (usuariosCadastrados.some(u => u.usuario === usuario)) {
        alert('❌ Este usuário já está cadastrado!');
        return;
    }

    usuariosCadastrados.push({ nome, usuario, senha });
    localStorage.setItem('wms_usuarios_sistema', JSON.stringify(usuariosCadastrados));

    alert(`✅ Operador "${nome}" cadastrado com sucesso! Faça login.`);
    document.getElementById('reg-fullname').value = '';
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    switchAuthTab('login');
}

// Processo de Login (Remove o bloqueio visual da tela)
function realizarLogin(event) {
    event.preventDefault();
    const usuarioInput = document.getElementById('login-username').value.trim().toLowerCase();
    const senhaInput = document.getElementById('login-password').value.trim();

    let usuariosCadastrados = JSON.parse(localStorage.getItem('wms_usuarios_sistema')) || [];

    // Cria um usuário padrão caso a lista esteja vazia na primeira execução
    if (usuariosCadastrados.length === 0) {
        usuariosCadastrados.push({ nome: "Maycon Sato", usuario: "admin", senha: "123" });
        localStorage.setItem('wms_usuarios_sistema', JSON.stringify(usuariosCadastrados));
    }

    const usuarioEncontrado = usuariosCadastrados.find(u => u.usuario === usuarioInput && u.senha === senhaInput);

    if (usuarioEncontrado) {
        // Grava a sessão ativa para rastreabilidade nas ações do WMS
        const dadosSessao = `${usuarioEncontrado.nome} (${usuarioEncontrado.usuario})`;
        localStorage.setItem('usuario_ativo_wms', dadosSessao);

        // Remove a camada de bloqueio visual da tela
        const authContainer = document.getElementById('auth-system-container');
        if (authContainer) {
            authContainer.style.display = 'none';
        }

        console.log(`🔓 Acesso liberado para: ${dadosSessao}`);
    } else {
        alert('❌ Usuário ou senha incorretos!');
    }
}

function atualizarStatusSessaoUI() {
    const usuarioAtivo = localStorage.getItem('usuario_ativo_wms') || 'Nenhum operador logado';
    const statusEl = document.getElementById('auth-status-user');
    if (statusEl) {
        statusEl.innerHTML = `👤 <strong>Usuário Ativo:</strong> ${usuarioAtivo}`;
    }
}

// Verifica no carregamento da página se o bloqueio deve persistir ou ser removido
document.addEventListener('DOMContentLoaded', () => {
    const usuarioAtivo = localStorage.getItem('usuario_ativo_wms');
    const authContainer = document.getElementById('auth-system-container');

    if (usuarioAtivo) {
        // Se já estiver logado, oculta o bloqueio imediatamente ao abrir a página
        if (authContainer) authContainer.style.display = 'none';
    } else {
        // Se não estiver logado, garante que o bloqueio permaneça visível
        if (authContainer) authContainer.style.display = 'flex';
    }
});
// ==================================================================
// GERENCIAMENTO DE CONFIGURAÇÕES, SESSÃO E TEMAS
// ==================================================================

let timerInterval = null;

// Abrir e Fechar Modal de Configurações
function abrirConfiguracoes() {
    const modal = document.getElementById('config-modal');
    if (modal) {
        modal.style.display = 'flex';
        carregarDadosConfiguracao();
    }
}

function fecharConfiguracoes() {
    const modal = document.getElementById('config-modal');
    if (modal) {
        modal.style.display = 'none';
        if (timerInterval) clearInterval(timerInterval);
    }
}

// Carregar informações atuais do operador e iniciar cronômetro
function carregarDadosConfiguracao() {
    // 1. Mostrar nome do usuário logado
    const usuarioAtivo = localStorage.getItem('usuario_ativo_wms') || 'Não identificado';
    const nomeEl = document.getElementById('cfg-user-name');
    if (nomeEl) nomeEl.innerText = usuarioAtivo;

    // 2. Controlar Cronômetro de Tempo Logado
    if (!localStorage.getItem('wms_login_timestamp')) {
        localStorage.setItem('wms_login_timestamp', Date.now());
    }

    if (timerInterval) clearInterval(timerInterval);
    
    atualizarCronometroSessao();
    timerInterval = setInterval(atualizarCronometroSessao, 1000);
}

function atualizarCronometroSessao() {
    const loginTime = parseInt(localStorage.getItem('wms_login_timestamp')) || Date.now();
    const diffMs = Date.now() - loginTime;

    const segundosTotal = Math.floor(diffMs / 1000);
    const horas = String(Math.floor(segundosTotal / 3600)).padStart(2, '0');
    const minutos = String(Math.floor((segundosTotal % 3600) / 60)).padStart(2, '0');
    const segundos = String(segundosTotal % 60).padStart(2, '0');

    const timerEl = document.getElementById('cfg-session-timer');
    if (timerEl) {
        timerEl.innerText = `${horas}:${minutos}:${segundos}`;
    }
}

// Sistema de Troca de Temas (Dark, Light, Meli)
function mudarTema(tema) {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-meli');
    document.body.classList.add(`theme-${tema}`);
    localStorage.setItem('wms_current_theme', tema);
}

// Aplicar tema salvo ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const temaSalvo = localStorage.getItem('wms_current_theme') || 'dark';
    mudarTema(temaSalvo);
});

// Alterar senha do operador logado
function alterarSenhaOperador(event) {
    event.preventDefault();
    const senhaAntiga = document.getElementById('cfg-old-pass').value.trim();
    const senhaNova = document.getElementById('cfg-new-pass').value.trim();

    const sessaoCompleta = localStorage.getItem('usuario_ativo_wms');
    if (!sessaoCompleta) {
        alert('❌ Nenhuma sessão ativa encontrada.');
        return;
    }

    // Extrai o nome de usuário (matrícula) armazenado entre parênteses
    const matchUser = sessaoCompleta.match(/\(([^)]+)\)$/);
    if (!matchUser) {
        alert('❌ Erro ao identificar o identificador do usuário.');
        return;
    }
    const usuarioMatricula = matchUser[1];

    let usuariosCadastrados = JSON.parse(localStorage.getItem('wms_usuarios_sistema')) || [];
    const indexUser = usuariosCadastrados.findIndex(u => u.usuario === usuarioMatricula);

    if (indexUser !== -1) {
        if (usuariosCadastrados[indexUser].senha === senhaAntiga) {
            usuariosCadastrados[indexUser].senha = senhaNova;
            localStorage.setItem('wms_usuarios_sistema', JSON.stringify(usuariosCadastrados));
            alert('✅ Senha alterada com sucesso!');
            document.getElementById('cfg-old-pass').value = '';
            document.getElementById('cfg-new-pass').value = '';
        } else {
            alert('❌ A senha atual está incorreta!');
        }
    } else {
        alert('❌ Usuário não encontrado na base de registros.');
    }
}

// Fazer Logout (Encerra a sessão e exibe o bloqueio de acesso)
function realizarLogout() {
    if (confirm('Deseja realmente encerrar a sessão?')) {
        localStorage.removeItem('usuario_ativo_wms');
        localStorage.removeItem('wms_login_timestamp');
        location.reload(); // Recarrega a página exibindo a tela de bloqueio de login novamente
    }
}

function exibirToast(tipo, titulo, mensagem, tempo = 3500) {
    const toastStack = document.getElementById('toast-stack');
    if (!toastStack) {
        alert(`${titulo}\n${mensagem}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${tipo}`;
    toast.innerHTML = `
        <span class="toast-title">${titulo}</span>
        <span class="toast-message">${mensagem}</span>
    `;

    toastStack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 220);
    }, tempo);
}

function adicionarNotificacao(tipo, titulo, mensagem) {
    const panel = document.getElementById('notification-panel');
    const list = document.getElementById('notification-list');
    if (!panel || !list) return;

    const item = document.createElement('div');
    item.className = `notification-item ${tipo}`;
    item.innerHTML = `<h4>${titulo}</h4><p>${mensagem}</p>`;
    list.prepend(item);
    panel.classList.remove('hidden');

    setTimeout(() => {
        item.style.opacity = '0.8';
    }, 40);
}

function fecharPainelNotificacoes() {
    const panel = document.getElementById('notification-panel');
    if (panel) panel.classList.add('hidden');
}

function mostrarAvisoOperacional(tipo, titulo, mensagem) {
    exibirToast(tipo, titulo, mensagem);
    adicionarNotificacao(tipo, titulo, mensagem);
}

// ==================================================================
// 1. CONFIGURAÇÕES, CONSTANTES E VARIÁVEIS GLOBAIS
// ==================================================================
let selectedElement = null;
let selectedName = '';
let currentIdCounter = 1;

const MAX_RED_PALLETS = 10;
const MAX_YELLOW_PALLETS = 6;
const MAX_GREEN_PALLETS = 12;

// Armazena as MUs cadastradas temporariamente por ID do elemento do palete
const palletMUs = {};

// Rastreia localização de paletes (PL) e suas ruas
const palletLocation = {}; // formato: { "PL-01": "R-A", "PL-02": "R-B" }

const LANE_CODES = {
    'RUA A': 'R-A',
    'RUA B': 'R-B',
    'RUA C': 'R-C',
    'RUA D': 'R-D',
    'RUA E': 'R-E'
};

const LISTA_ERROS_PADRAO = [
    'Audit', 'Cubing', 'Montagem de Hu', 'Sor', 'P2M', 'Checkin',
    'Usuário Travado', 'Transfer Volume', 'Viagem em Curso',
    'Despacho em HU', 'Vincular em HU', 'Invoincing', 'Decating', 'Saldo em outro CAD'
];

let dadosHistorico = [];
let graficoErrosInstancia = null;
let muSelecionadaGlobal = null;
let paleteAtualGlobal = null;

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxPsyrJdzUQJFKh_3xnA-PkKINZkZCCeCnJN9KCd9IXca4bWU2wtXS101DQbf9qLi3A_g/exec";

// ==================================================================
// 2. INICIALIZAÇÃO CENTRALIZADA (DOM CONTENT LOADED)
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Trava de texto de interface
    document.body.removeAttribute('contenteditable');
    const protectedSelectors = 'h1, h2, h3, h4, h5, h6, span, p, label, .zone-header, .lane-title, .app-drawer h2, .main-navbar';
    document.querySelectorAll(protectedSelectors).forEach(el => {
        el.contentEditable = "false";
    });

    // Carrega estado geral salvo no navegador
    carregarEstadoGeral();
    updateRedCounter();

    // Carregamentos específicos de telas (se os elementos existirem)
    if (document.getElementById('history-table-body')) {
        carregarDadosDoSheets();
    }
    if (document.getElementById('graficoErros')) {
        carregarDadosDashboard();
        setInterval(carregarDadosDashboard, 60000);
    }

    // Eventos globais de busca e botões operacionais da MU
    const btnSearch = document.querySelector('.btn-search');
    if (btnSearch) btnSearch.addEventListener('click', realizarConsulta);

    const inputSearch = document.getElementById('search-input');
    if (inputSearch) {
        inputSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') realizarConsulta();
        });
    }

    const btnRemover = document.querySelector('.action-buttons .btn-action.danger');
    if (btnRemover) btnRemover.addEventListener('click', removerMUAtual);

    const btnMover = document.querySelector('.action-buttons .btn-action.primary');
    if (btnMover) btnMover.addEventListener('click', moverMUAtual);

    const btnAlterarStatus = document.getElementById('btn-alterar-status');
    if (btnAlterarStatus) btnAlterarStatus.addEventListener('click', alterarStatusMUAtual);

    const btnSelecionarErros = document.getElementById('btn-selecionar-erros');
    if (btnSelecionarErros) btnSelecionarErros.addEventListener('click', abrirModalSelecaoErros);
});

// ==================================================================
// 3. ESTADO, PERSISTÊNCIA E LOCALSTORAGE
// ==================================================================
function salvarEstadoGeral() {
    localStorage.setItem('buffer_pallets', JSON.stringify(palletMUs));
    localStorage.setItem('buffer_idCounter', currentIdCounter);

    const palletsData = [];
    document.querySelectorAll('.pallet').forEach(p => {
        palletsData.push({
            id: p.id,
            text: p.innerText,
            className: p.className,
            parentId: p.parentElement.id || p.parentElement.getAttribute('data-lane') || ''
        });
    });
    localStorage.setItem('buffer_layout', JSON.stringify(palletsData));
}

function carregarEstadoGeral() {
    const savedMUs = localStorage.getItem('buffer_pallets');
    if (savedMUs) {
        Object.assign(palletMUs, JSON.parse(savedMUs));
    }

    const savedCounter = localStorage.getItem('buffer_idCounter');
    if (savedCounter) {
        currentIdCounter = parseInt(savedCounter, 10);
    }

    const savedLayout = localStorage.getItem('buffer_layout');
    if (savedLayout) {
        const palletsData = JSON.parse(savedLayout);
        document.querySelectorAll('.pallet').forEach(p => p.remove());

        palletsData.forEach(data => {
            const p = document.createElement('div');
            p.id = data.id;
            p.innerText = data.text;
            p.className = data.className;
            p.draggable = true;
            
            p.setAttribute('ondragstart', 'drag(event)');
            const nomePainel = data.text.includes('PL') ? data.text : `Pallet ${data.text}`;
            p.setAttribute('onclick', `selectPalletElement(this, '${nomePainel}')`);

            let parent = document.getElementById(data.parentId);
            if (!parent) {
                parent = document.querySelector(`[data-lane="${data.parentId}"]`);
            }
            if (parent) {
                parent.appendChild(p);
            }
        });
    }
}

// ==================================================================
// 4. SELEÇÃO E AÇÕES DE PALETES
// ==================================================================
function selectPalletElement(element, name) {
    if (!element) return;

    document.querySelectorAll('.pallet.selected').forEach(el => {
        el.classList.remove('selected');
    });

    selectedElement = element;
    selectedName = name;
    selectedElement.classList.add('selected');
    
    const mus = palletMUs[element.id] || [];
    const displayName = element.innerText !== '[ Vazio ]' ? element.innerText : name;
    
    updateStatus(`
        📦 <strong>Palete Selecionado:</strong> <span style="color:#38bdf8">${displayName}</span><br>
        📊 <strong>MUs Cadastradas:</strong> ${mus.length}/30<br>
        <small>${mus.length > 0 ? 'MUs: ' + mus.join(', ') : 'Nenhuma MU bipada ainda.'}</small>
    `);
}

function getPalletZone(palletElement) {
    if (!palletElement) return null;
    if (palletElement.closest('.red-zone')) return 'vermelha';
    if (palletElement.closest('.yellow-zone')) return 'amarela';
    if (palletElement.closest('.street-lane')) return 'rua';
    if (palletElement.closest('.green-zone')) return 'verde';
    return null;
}

function validarMovimentacaoPallet(palletElement, destino) {
    if (!palletElement) return { ok: false, motivo: 'Palete não encontrado.' };

    const origem = getPalletZone(palletElement);
    const idPallet = palletElement.innerText.trim();
    const mus = palletMUs[palletElement.id] || [];

    if (!origem) {
        return { ok: false, motivo: 'Palete sem zona válida para movimentação.' };
    }

    if (destino === 'amarela') {
        if (origem !== 'vermelha') {
            return { ok: false, motivo: `O palete ${idPallet} só pode entrar na Zona Amarela a partir da Zona Vermelha.` };
        }
        if (document.querySelectorAll('#yellow-stack .pallet').length >= MAX_YELLOW_PALLETS) {
            return { ok: false, motivo: 'A Zona Amarela atingiu a capacidade máxima de 6 paletes.' };
        }
    }

    if (destino === 'rua') {
        if (origem !== 'amarela') {
            return { ok: false, motivo: `O palete ${idPallet} só pode ir para rua após passar pela zona amarela.` };
        }
        if (!palletElement.classList.contains('blue')) {
            return { ok: false, motivo: 'A rua exige palete com ID vinculado (status azul).'};
        }
    }

    if (destino === 'verde') {
        if (origem !== 'rua') {
            return { ok: false, motivo: `O palete ${idPallet} precisa estar em rua para ser liberado para expedição.` };
        }
        if (mus.length === 0) {
            return { ok: false, motivo: 'Não é permitido liberar para a Zona Verde um palete sem MU cadastrada.' };
        }
        if (document.querySelectorAll('.green-zone .pallet').length >= MAX_GREEN_PALLETS) {
            return { ok: false, motivo: 'A Zona Verde atingiu a capacidade máxima de 12 paletes.' };
        }
    }

    if (destino === 'vermelha') {
        if (origem === 'vermelha') {
            return { ok: false, motivo: 'O palete já está na Zona Vermelha.' };
        }
        if (document.querySelectorAll('#red-stack .pallet').length >= MAX_RED_PALLETS) {
            return { ok: false, motivo: 'Capacidade máxima da Zona Vermelha atingida.' };
        }
    }

    return { ok: true };
}

function triggerAction(actionName) {
    if (!selectedElement) {
        alert('\u274c Selecione um palete antes de executar a opera\u00e7\u00e3o.');;
        return;
    }

    const elementId = selectedElement.id;

    if (actionName === 'Checagem HH') {
        if (!selectedElement.classList.contains('yellow-no-id')) {
            return;
        }

        selectedElement.className = 'pallet yellow-checked selected';
        selectedElement.innerText = 'Check';
        palletMUs[elementId] = [];

        updateStatus(`🟡 <strong>Checagem HH concluída!</strong><br>📍 Pronto para bipagem e cadastro de MUs.`);
        return;
    }

    if (actionName === 'Cadastrar MU' || actionName === 'Cadastrar ID') {
        if (!selectedElement.classList.contains('yellow-checked')) {
            return;
        }

        if (!palletMUs[elementId]) palletMUs[elementId] = [];
        let currentMUs = palletMUs[elementId];
        let bipando = true;

        while (bipando && currentMUs.length < 30) {
            const inputMU = prompt(
                `📦 [CADASTRO DE MUs - PALETE]\n` +
                `MUs Atuais: ${currentMUs.length}/30\n\n` +
                `Bipe a MU com o leitor QR Code ou digite o código:\n` +
                `(Ex: MU-TT-RC-20A-123)\n\n` +
                `(Clique em 'Cancelar' para encerrar a bipagem)`
            );

            if (inputMU === null || inputMU.trim() === '') {
                bipando = false;
            } else {
                const muCode = inputMU.trim().toUpperCase();
                if (!muCode.startsWith('MU')) {
                } else if (muCode.length !== 16) {
                } else if (currentMUs.includes(muCode)) {
                } else {
                    currentMUs.push(muCode);
                }
            }
        }

        updateStatus(`📦 <strong>MUs cadastradas:</strong> ${currentMUs.length}/30`);
        return;
    }

    if (actionName === 'Vincular ID') {
        if (!selectedElement.classList.contains('yellow-checked')) {
            return;
        }

        let currentMUs = palletMUs[elementId] || [];
        if (currentMUs.length === 0) {
            return;
        }

        let finalID = '';
        let idValido = false;

        while (!idValido) {
            const suggestedID = `PL-${String(currentIdCounter).padStart(2, '0')}`;
            const inputID = prompt('🏷️ [VINCULAR PLACA DE ID]\nDigite o ID do Palete:', suggestedID);

            if (inputID === null || inputID.trim() === '') return;

            const inputFormatado = inputID.trim().toUpperCase();
            if (!/^PL-?\d+$/.test(inputFormatado)) {
            } else {
                finalID = inputFormatado;
                idValido = true;
            }
        }

        selectedElement.innerText = finalID;
        selectedElement.className = 'pallet blue selected';
        updateStatus(`🔵 <strong>Palete liberado para as ruas!</strong> Placa: ${finalID}`);
        if (currentIdCounter < 99) currentIdCounter++;
        return;
    }

    if (actionName === 'Despachar PL') {
        const isZonaVerde = selectedElement.closest('.green-zone') !== null || selectedElement.classList.contains('green');
        if (!isZonaVerde) {
            return;
        }

        const idPallet = selectedElement.innerText.trim();
        const musPallet = palletMUs[elementId] || [];

        if (musPallet.length === 0) {
            return;
        }

        if (confirm(`🚚 Confirma o despacho do Palete ${idPallet} com ${musPallet.length} MUs?`)) {
            const dataAtual = new Date();
            const dataHoraFormatada = dataAtual.toLocaleString('pt-BR');
            const usuarioLogado = localStorage.getItem('usuario_ativo_wms') || 'Usuário Padrão';
            const historicoGlobal = Object.values(getHistoricoMUs()).flat();
            const registrosParaEnviar = musPallet.map(mu => {
                const acoesRealizadas = historicoGlobal.filter(reg => reg.evento && reg.evento.includes(mu)).length;
                return {
                    dataDespacho: dataHoraFormatada,
                    palletID: idPallet,
                    mu: mu,
                    acoesFeitas: acoesRealizadas > 0 ? acoesRealizadas : 1,
                    tempoNoBuffer: '0m',
                    usuario: usuarioLogado
                };
            });

            let historicoLocal = JSON.parse(localStorage.getItem('buffer_historico')) || [];
            historicoLocal.push(...registrosParaEnviar);
            localStorage.setItem('buffer_historico', JSON.stringify(historicoLocal));

            const SCRIPT_URL = GOOGLE_SHEETS_URL;
            const formData = new URLSearchParams();
            formData.append('payload', JSON.stringify(registrosParaEnviar));

            fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            }).catch(err => console.error('Erro ao enviar para planilha:', err));

            delete palletMUs[elementId];
            selectedElement.remove();
            selectedElement = null;
            updateStatus(`🟢 <strong>Palete ${idPallet} despachado com sucesso!</strong>`);
        }
        return;
    }
}

// ==================================================================
// 5. DRAG & DROP E EVENTOS DE LAYOUT
// ==================================================================
function allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function drag(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
    event.target.classList.add('dragging');
}

function clearDragEffects() {
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
}

document.addEventListener('dragend', () => {
    clearDragEffects();
    salvarEstadoGeral();
});

document.addEventListener('click', () => {
    salvarEstadoGeral();
});

document.addEventListener('dragleave', (e) => {
    if (e.target.classList && (e.target.classList.contains('pallet-row') || e.target.classList.contains('street-lane') || e.target.classList.contains('zone-container'))) {
        e.target.classList.remove('drag-over');
    }
});

// ==================================================================
// 6. REGRAS DA ZONA VERMELHA
// ==================================================================
function getNextAvailableRedNumber() {
    const stack = document.getElementById('red-stack');
    if (!stack) return 1;

    const usedNumbers = Array.from(stack.children).map(pallet => {
        const match = pallet.innerText.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });

    for (let i = 1; i <= MAX_RED_PALLETS; i++) {
        if (!usedNumbers.includes(i)) return i;
    }
    return null;
}

function addRedPallet() {
    const stack = document.getElementById('red-stack');
    if (!stack) return;

    if (stack.children.length >= MAX_RED_PALLETS) {
        alert('Capacidade máxima da Zona Vermelha atingida (10 pallets)!');
        return;
    }

    const availableNumber = getNextAvailableRedNumber();
    if (availableNumber === null) return;

    const formattedNum = String(availableNumber).padStart(2, '0');
    const uniqueId = `pallet-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const palletLabel = `P${formattedNum}`;

    const pallet = document.createElement('div');
    pallet.className = 'pallet red';
    pallet.id = uniqueId; 
    pallet.draggable = true;
    pallet.innerText = palletLabel;

    pallet.setAttribute('ondragstart', 'drag(event)');
    pallet.setAttribute('onclick', `selectPalletElement(this, 'Pallet ${palletLabel}')`);

    stack.appendChild(pallet);
    updateRedCounter();
    updateStatus(`🔴 <strong>Pallet ${palletLabel} criado na Zona Vermelha.</strong>`);
}

function removeRedPallet() {
    const stack = document.getElementById('red-stack');
    if (!stack || stack.children.length === 0) {
        alert('A Zona Vermelha já está vazia!');
        return;
    }

    const lastPallet = stack.lastElementChild;
    if (palletMUs[lastPallet.id]) delete palletMUs[lastPallet.id];
    if (selectedElement === lastPallet) selectedElement = null;

    stack.removeChild(lastPallet);
    updateRedCounter();
    updateStatus(`🗑️ <strong>Pallet removido da Zona Vermelha.</strong>`);
}

function updateRedCounter() {
    const countElement = document.getElementById('red-count');
    const stack = document.getElementById('red-stack');
    if (countElement && stack) {
        countElement.innerText = stack.children.length;
    }
}

function dropPalletRed(event, redContainer) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData("text/plain");
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const sourceZone = draggedPallet.parentElement;
    if (sourceZone === redContainer) return;

    if (redContainer.children.length >= MAX_RED_PALLETS) {
        alert('Capacidade máxima da Zona Vermelha atingida!');
        return;
    }

    if (confirm(`⚠️ Deseja retornar o palete "${draggedPallet.innerText}" para a Zona Vermelha? Todo o registro de MUs será resetado!`)) {
        delete palletMUs[draggedPallet.id];
        draggedPallet.className = 'pallet red';
        
        const availableNumber = getNextAvailableRedNumber();
        draggedPallet.innerText = `P${String(availableNumber).padStart(2, '0')}`;

        redContainer.appendChild(draggedPallet);
        updateRedCounter();
        updateStatus(`🔴 <strong>Palete retornado à Zona Vermelha.</strong>`);
    }
}

// ==================================================================
// 7. REGRAS DA ZONA AMARELA E RUAS (ZONA CINZA) & ZONA VERDE
// ==================================================================
function dropPalletYellow(event, yellowContainer) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData('text/plain');
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const sourceZone = draggedPallet.parentElement;
    const isFromGreen = draggedPallet.classList.contains('green') || sourceZone.classList.contains('green-zone');
    const currentPL = draggedPallet.innerText.trim();

    // Fluxo: Expedição → Triagem (reset do palete, desvincula PL)
    if (isFromGreen) {
        const inputPL = prompt(`📦 Qual PL está sendo retornado?\n(Palete atual: ${currentPL})`);
        if (inputPL === null) return;

        if (inputPL.trim().toUpperCase() !== currentPL) {
            alert(`❌ Dados não conferem! Você informou "${inputPL}" mas o palete é "${currentPL}".`);
            return;
        }

        if (yellowContainer.querySelectorAll('.pallet').length >= MAX_YELLOW_PALLETS) {
            alert('🚫 A Zona Amarela atingiu a capacidade máxima de 6 paletes.');
            return;
        }

        // Reset: desvincula PL
        draggedPallet.className = 'pallet yellow-checked';
        draggedPallet.innerText = 'Check';
        delete palletLocation[currentPL];
        yellowContainer.appendChild(draggedPallet);
        updateRedCounter();
        updateStatus('🔄 <strong>Palete retornado à triagem.</strong> PL desvinculada.');
        return;
    }

    const validacao = validarMovimentacaoPallet(draggedPallet, 'amarela');
    if (!validacao.ok) {
        alert(`🚫 ${validacao.motivo}`);
        return;
    }

    if (yellowContainer.querySelectorAll('.pallet').length >= MAX_YELLOW_PALLETS) {
        alert('🚫 A Zona Amarela atingiu a capacidade máxima de 6 paletes.');
        return;
    }

    if (sourceZone.id === 'red-stack') {
        yellowContainer.appendChild(draggedPallet);
        draggedPallet.className = 'pallet yellow-no-id';
        draggedPallet.innerText = 'No ID';
        draggedPallet.setAttribute('onclick', `selectPalletElement(this, '${draggedPallet.id}')`);

        updateRedCounter();
        updateStatus('🟠 <strong>Pallet na triagem.</strong> Aguardando checagem HH.');
        return;
    }
}

function getTargetLaneCode(laneElement) {
    const attrData = laneElement.getAttribute('data-lane') || '';
    if (LANE_CODES[attrData.toUpperCase()]) return LANE_CODES[attrData.toUpperCase()];
    if (Object.values(LANE_CODES).includes(attrData.toUpperCase())) return attrData.toUpperCase();

    const parentLane = laneElement.closest('.street-lane');
    if (parentLane) {
        const titleEl = parentLane.querySelector('.lane-title');
        if (titleEl) {
            const text = titleEl.innerText.trim().toUpperCase();
            if (LANE_CODES[text]) return LANE_CODES[text];
            if (Object.values(LANE_CODES).includes(text)) return text;
        }
    }
    return attrData || "R-A";
}

function dropPallet(event, laneElement) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData('text/plain');
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const sourceZone = draggedPallet.parentElement;
    const targetLaneCode = getTargetLaneCode(laneElement);
    const currentPL = draggedPallet.innerText.trim();
    const isFromYellow = sourceZone.id === 'yellow-stack' || sourceZone.closest('.yellow-zone');
    const isFromGreen = draggedPallet.classList.contains('green') || sourceZone.classList.contains('green-zone');
    const isFromStreet = sourceZone.closest('.street-lane') !== null;

    // Validação básica
    const validacao = validarMovimentacaoPallet(draggedPallet, 'rua');
    if (!validacao.ok) {
        alert(`🚫 ${validacao.motivo}`);
        return;
    }

    if (sourceZone.id === 'red-stack') {
        alert('🚫 Paletes da Zona Vermelha devem passar pela Zona Amarela antes da rua.');
        return;
    }

    if (isFromYellow && !draggedPallet.classList.contains('blue')) {
        alert('🚫 O palete precisa ter o ID vinculado (azul) para entrar na rua.');
        return;
    }

    if (laneElement.querySelectorAll('.pallet').length >= 6 && !laneElement.contains(draggedPallet)) {
        alert('🚫 Esta rua atingiu o limite máximo de 6 paletes.');
        return;
    }

    // Fluxo: Triagem → Ruas (solicita PL e rua)
    if (isFromYellow) {
        const inputPL = prompt(`📦 Qual PL está sendo movimentado?\n(Palete atual: ${currentPL})`);
        if (inputPL === null) return;
        
        const inputRua = prompt(`🚚 Para qual rua (R-A, R-B, R-C, R-D, R-E)?\n(Rua de destino: ${targetLaneCode})`);
        if (inputRua === null) return;

        const ruaNormalizada = inputRua.trim().toUpperCase();
        if (ruaNormalizada !== targetLaneCode) {
            alert(`❌ Dados não conferem! Você informou rua "${ruaNormalizada}" mas a rua de destino é "${targetLaneCode}".`);
            return;
        }
        palletLocation[currentPL] = targetLaneCode;
    }

    // Fluxo: Entre Ruas (solicita PL e rua)
    if (isFromStreet) {
        const currentStreetLane = sourceZone.closest('.street-lane');
        const currentLaneCode = getTargetLaneCode(currentStreetLane);
        
        const inputPL = prompt(`📦 Qual PL está sendo movimentado?\n(Palete atual: ${currentPL})`);
        if (inputPL === null) return;
        
        const inputRua = prompt(`🚚 Qual é a nova rua (R-A, R-B, R-C, R-D, R-E)?\n(De: ${currentLaneCode}, Para: ${targetLaneCode})`);
        if (inputRua === null) return;

        const ruaNormalizada = inputRua.trim().toUpperCase();
        if (ruaNormalizada !== targetLaneCode) {
            alert(`❌ Dados não conferem! Você informou rua "${ruaNormalizada}" mas a rua de destino é "${targetLaneCode}".`);
            return;
        }
        palletLocation[currentPL] = targetLaneCode;
    }

    // Fluxo: Verde → Ruas (reset do palete, desvincula PL)
    if (isFromGreen) {
        const inputPL = prompt(`📦 Qual PL está sendo retornado?\n(Palete atual: ${currentPL})`);
        if (inputPL === null) return;
        
        const inputRua = prompt(`🚚 Para qual rua (R-A, R-B, R-C, R-D, R-E)?`);
        if (inputRua === null) return;

        const ruaNormalizada = inputRua.trim().toUpperCase();
        if (ruaNormalizada !== targetLaneCode) {
            alert(`❌ Dados não conferem! Você informou rua "${ruaNormalizada}" mas a rua de destino é "${targetLaneCode}".`);
            return;
        }

        // Reset: desvincula PL
        draggedPallet.className = 'pallet yellow-checked';
        draggedPallet.innerText = 'Check';
        delete palletLocation[currentPL];
        updateStatus('🔄 <strong>Palete retornado.</strong> PL desvinculada.');
    }

    const isSelected = draggedPallet.classList.contains('selected');
    draggedPallet.className = `pallet blue${isSelected ? ' selected' : ''}`;
    laneElement.appendChild(draggedPallet);
    updateRedCounter();

    updateStatus('🚚 <strong>Palete alocado na rua.</strong>');
}

function dropPalletGreen(event, greenContainer) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData('text/plain');
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const validacao = validarMovimentacaoPallet(draggedPallet, 'verde');
    if (!validacao.ok) {
        alert(`🚫 ${validacao.motivo}`);
        return;
    }

    if (greenContainer.querySelectorAll('.pallet').length >= MAX_GREEN_PALLETS) {
        alert('🚫 A Zona Verde atingiu a capacidade máxima de 12 paletes.');
        return;
    }

    // Fluxo: Ruas → Verde (solicita confirmação)
    const currentPL = draggedPallet.innerText.trim();
    if (!confirm(`✅ Confirma movimentação do palete ${currentPL} para expedição?`)) {
        return;
    }

    const isSelected = draggedPallet.classList.contains('selected');
    draggedPallet.className = `pallet green${isSelected ? ' selected' : ''}`;
    greenContainer.appendChild(draggedPallet);
    updateRedCounter();

    updateStatus('🟢 <strong>Palete liberado para expedição.</strong>');
}

// Função para retornar palete de Verde para Triagem (reset)
function dropPalletFromGreenToYellow(event, yellowContainer) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData('text/plain');
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet || !draggedPallet.classList.contains('green')) return;

    if (yellowContainer.querySelectorAll('.pallet').length >= MAX_YELLOW_PALLETS) {
        alert('🚫 A Zona Amarela atingiu a capacidade máxima de 6 paletes.');
        return;
    }

    const currentPL = draggedPallet.innerText.trim();
    const inputPL = prompt(`📦 Qual PL está sendo retornado?\n(Palete atual: ${currentPL})`);
    if (inputPL === null) return;

    if (inputPL.trim().toUpperCase() !== currentPL) {
        alert(`❌ Dados não conferem! Você informou "${inputPL}" mas o palete é "${currentPL}".`);
        return;
    }

    // Reset: desvincula PL
    draggedPallet.className = 'pallet yellow-checked';
    draggedPallet.innerText = 'Check';
    delete palletLocation[currentPL];
    yellowContainer.appendChild(draggedPallet);
    updateRedCounter();

    updateStatus('🔄 <strong>Palete retornado à triagem.</strong> PL desvinculada.');
}

// ==================================================================
// 8. HELPERS DE STATUS, MODAL E DASHBOARD
// ==================================================================
function updateStatus(htmlContent) {
    const statusElement = document.getElementById('app-status');
    if (statusElement) statusElement.innerHTML = htmlContent;
}

// Duplo clique para visualizar resumo do palete
document.addEventListener('dblclick', (event) => {
    const palletElement = event.target.closest('.pallet');
    if (!palletElement) return;

    const palletId = palletElement.id;
    const palletName = palletElement.innerText.trim();
    const mus = palletMUs[palletId] || [];

    document.getElementById('modal-title').innerText = `📦 Resumo do Palete: ${palletName}`;
    document.getElementById('modal-content').innerHTML = `
        <strong>📦 Total de MUs:</strong> ${mus.length}/30<br><br>
        <strong>--- MUs ---</strong><br>
        ${mus.length > 0 ? mus.join('<br>') : 'Nenhuma MU cadastrada.'}
    `;
    document.getElementById('pallet-modal').style.display = 'flex';
});

function fecharModalPalete() {
    document.getElementById('pallet-modal').style.display = 'none';
}

// Google Sheets & Histórico
async function carregarDadosDoSheets() {
    try {
        if (GOOGLE_SHEETS_URL.includes("script.google.com")) {
            const resposta = await fetch(GOOGLE_SHEETS_URL);
            dadosHistorico = await resposta.json();
        } else {
            dadosHistorico = simularDadosDeTeste();
        }
        calcularKPIs(dadosHistorico);
        renderizarTabela(dadosHistorico);
    } catch (erro) {
        console.error("Erro ao carregar dados do Sheets:", erro);
        dadosHistorico = simularDadosDeTeste();
        calcularKPIs(dadosHistorico);
        renderizarTabela(dadosHistorico);
    }
}

function calcularKPIs(dados) {
    if (!dados || dados.length === 0) return;
    document.getElementById('kpi-total-mus').innerText = dados.length;
    document.getElementById('kpi-total-pallets').innerText = new Set(dados.map(i => i.palletID)).size;
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    dados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-mono">${item.mu || '-'}</td>
            <td><span class="badge">${item.palletID || '-'}</span></td>
            <td>${item.dataDespacho || '-'}</td>
            <td>${item.usuario || 'Sistema'}</td>
            <td style="text-align:center;">${item.acoesFeitas || '0'}</td>
            <td>${item.tempoNoBuffer || '0m'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function simularDadosDeTeste() {
    return [
        { dataDespacho: "14/08/2026 08:30:00", palletID: "PL-01", mu: "MU-TT-RC-20A-123", acoesFeitas: 4, tempoNoBuffer: "42m", usuario: "Maycon Sato" }
    ];
}

// Dashboard Ocupação & Gráfico
function carregarDadosDashboard() {
    const layout = JSON.parse(localStorage.getItem('buffer_layout')) || [];
    let pVermelha = 0, pAmarela = 0, pCinza = 0, pVerde = 0;

    layout.forEach(item => {
        if (item.text && item.text.startsWith('P')) {
            if (item.parentId === 'red-stack') pVermelha++;
            else if (item.parentId === 'yellow-stack') pAmarela++;
            else if (item.parentId === 'green-stack') pVerde++;
            else if (item.parentId.startsWith('R-')) pCinza++;
        }
    });

    atualizarBarraKPI('kpi-ocupacao-pendentes', Math.round((pVermelha/10)*100), pVermelha, 10);
    atualizarBarraKPI('kpi-ocupacao-triagem', Math.round((pAmarela/6)*100), pAmarela, 6);
    atualizarBarraKPI('kpi-ocupacao-ruas', Math.round((pCinza/36)*100), pCinza, 36);
    atualizarBarraKPI('kpi-ocupacao-expedicao', Math.round((pVerde/12)*100), pVerde, 12);
}

function atualizarBarraKPI(idBase, perc, atual, max) {
    const elPerc = document.getElementById(`${idBase}-perc`);
    const elBar = document.getElementById(`${idBase}-bar`);
    if (elPerc) elPerc.innerText = `${perc}%`;
    if (elBar) elBar.style.width = `${perc}%`;
}

// ==================================================================
// 9. GESTÃO DE MUs, HISTÓRICO E ERROS
// ==================================================================
function obterUsuarioAtual() {
    return localStorage.getItem('usuario_ativo_wms') || 'OPERADOR_WMS';
}

function getDetalhesMUs() {
    return JSON.parse(localStorage.getItem('buffer_mu_detalhes')) || {};
}
function salvarDetalhesMUs(d) { localStorage.setItem('buffer_mu_detalhes', JSON.stringify(d)); }

function getHistoricoMUs() {
    return JSON.parse(localStorage.getItem('buffer_mu_historico')) || {};
}
function salvarHistoricoMUs(h) { localStorage.setItem('buffer_mu_historico', JSON.stringify(h)); }

function registrarHistoricoMU(muCode, eventoTexto) {
    if (!muCode) return;
    const historicos = getHistoricoMUs();
    if (!historicos[muCode]) historicos[muCode] = [];

    historicos[muCode].push({
        timestamp: new Date().toLocaleString('pt-BR'),
        evento: eventoTexto,
        usuario: obterUsuarioAtual()
    });
    salvarHistoricoMUs(historicos);
}

function realizarConsulta() {
    const input = document.getElementById('search-input').value.trim().toUpperCase();
    if (!input) return alert("Digite um ID de Palete ou MU.");

    const bufferLayout = JSON.parse(localStorage.getItem('buffer_layout')) || [];
    let idPalvo = null, nomeExibicao = "", listaMUs = [];

    if (input.startsWith('PL') || input.startsWith('P')) {
        const found = bufferLayout.find(p => p.text.toUpperCase() === input);
        if (found) {
            idPalvo = found.id;
            nomeExibicao = found.text;
            listaMUs = palletMUs[idPalvo] || [];
        }
    } else if (input.startsWith('MU')) {
        for (const [idInt, mus] of Object.entries(palletMUs)) {
            if (mus.includes(input)) {
                idPalvo = idInt;
                listaMUs = mus;
                const found = bufferLayout.find(p => p.id === idInt);
                nomeExibicao = found ? found.text : idInt;
                break;
            }
        }
    }

    if (!idPalvo) {
        alert(`Nenhum registro encontrado para: ${input}`);
        return;
    }

    muSelecionadaGlobal = listaMUs[0] || null;
    paleteAtualGlobal = { idInterno: idPalvo, idPalete: nomeExibicao };
    alert(`Palete ${nomeExibicao} encontrado com ${listaMUs.length} MUs.`);
}

function removerMUAtual() {
    if (!muSelecionadaGlobal || !paleteAtualGlobal) return alert("Nenhuma MU selecionada.");
    if (confirm(`Remover MU ${muSelecionadaGlobal}?`)) {
        palletMUs[paleteAtualGlobal.idInterno] = palletMUs[paleteAtualGlobal.idInterno].filter(m => m !== muSelecionadaGlobal);
        salvarEstadoGeral();
        alert("MU removida com sucesso!");
    }
}

function moverMUAtual() {
    alert("Função de movimentação de MU ativa.");
}

function alterarStatusMUAtual() {
    alert("Alteração de status da MU ativa.");
}

function abrirModalSelecaoErros() {
    alert("Modal de seleção de erros.");
}

// Exportações Globais necessárias para HTML
window.selectPalletElement = selectPalletElement;
window.triggerAction = triggerAction;
window.allowDrop = allowDrop;
window.drag = drag;
window.addRedPallet = addRedPallet;
window.removeRedPallet = removeRedPallet;
window.dropPalletRed = dropPalletRed;
window.dropPalletYellow = dropPalletYellow;
window.dropPallet = dropPallet;
window.dropPalletGreen = dropPalletGreen;
window.fecharModalPalete = fecharModalPalete;
window.realizarConsulta = realizarConsulta;
window.removerMUAtual = removerMUAtual;
window.moverMUAtual = moverMUAtual;
window.alterarStatusMUAtual = alterarStatusMUAtual;
window.abrirModalSelecaoErros = abrirModalSelecaoErros;