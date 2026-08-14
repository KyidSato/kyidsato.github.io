// ==================================================================
// 1. GERENCIAMENTO DE AUTENTICAÇÃO E LOGIN
// ==================================================================

// Alternar abas do painel de login
function switchAuthTab(tabName, event) {
    document.querySelectorAll('.auth-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

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

    if (!nome || !usuario || !senha) {
        exibirToast('error', 'Erro no Cadastro', 'Preencha todos os campos obrigatórios.');
        return;
    }

    let usuariosCadastrados = JSON.parse(localStorage.getItem('wms_usuarios_sistema')) || [];

    if (usuariosCadastrados.some(u => u.usuario === usuario)) {
        exibirToast('warning', 'Usuário duplicado', 'Este usuário já está cadastrado!');
        return;
    }

    usuariosCadastrados.push({ nome, usuario, senha });
    localStorage.setItem('wms_usuarios_sistema', JSON.stringify(usuariosCadastrados));

    exibirToast('success', 'Cadastro concluído', `Operador "${nome}" cadastrado com sucesso! Faça login.`);
    
    document.getElementById('reg-fullname').value = '';
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    switchAuthTab('login', null);
}

// Processo de Login (Remove o bloqueio visual da tela)
function realizarLogin(event) {
    event.preventDefault();
    const usuarioInput = document.getElementById('login-username').value.trim().toLowerCase();
    const senhaInput = document.getElementById('login-password').value.trim();

    let usuariosCadastrados = JSON.parse(localStorage.getItem('wms_usuarios_sistema')) || [];

    // Cria um usuário admin padrão caso a base esteja vazia
    if (usuariosCadastrados.length === 0) {
        usuariosCadastrados.push({ nome: "Maycon Sato", usuario: "admin", senha: "123" });
        localStorage.setItem('wms_usuarios_sistema', JSON.stringify(usuariosCadastrados));
    }

    const usuarioEncontrado = usuariosCadastrados.find(u => u.usuario === usuarioInput && u.senha === senhaInput);

    if (usuarioEncontrado) {
        const dadosSessao = `${usuarioEncontrado.nome} (${usuarioEncontrado.usuario})`;
        localStorage.setItem('usuario_ativo_wms', dadosSessao);
        localStorage.setItem('wms_login_timestamp', Date.now()); // Reseta o timer no login

        const authContainer = document.getElementById('auth-system-container');
        if (authContainer) authContainer.style.display = 'none';

        console.log(`🔓 Acesso liberado para: ${dadosSessao}`);
        exibirToast('success', 'Login bem-sucedido', `Bem-vindo, ${usuarioEncontrado.nome}!`);
    } else {
        exibirToast('error', 'Falha de autenticação', 'Usuário ou senha incorretos!');
    }
}

function atualizarStatusSessaoUI() {
    const usuarioAtivo = localStorage.getItem('usuario_ativo_wms') || 'Nenhum operador logado';
    const statusEl = document.getElementById('auth-status-user');
    if (statusEl) {
        statusEl.innerHTML = `👤 <strong>Usuário Ativo:</strong> ${usuarioAtivo}`;
    }
}

// ==================================================================
// 2. CONFIGURAÇÕES, SESSÃO E TEMAS
// ==================================================================

let timerInterval = null;

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

function carregarDadosConfiguracao() {
    const usuarioAtivo = localStorage.getItem('usuario_ativo_wms') || 'Não identificado';
    const nomeEl = document.getElementById('cfg-user-name');
    if (nomeEl) nomeEl.innerText = usuarioAtivo;

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

function mudarTema(tema) {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-meli');
    document.body.classList.add(`theme-${tema}`);
    localStorage.setItem('wms_current_theme', tema);
}

function alterarSenhaOperador(event) {
    event.preventDefault();
    const senhaAntiga = document.getElementById('cfg-old-pass').value.trim();
    const senhaNova = document.getElementById('cfg-new-pass').value.trim();

    const sessaoCompleta = localStorage.getItem('usuario_ativo_wms');
    if (!sessaoCompleta) {
        exibirToast('error', 'Sessão inativa', 'Nenhuma sessão ativa encontrada.');
        return;
    }

    const matchUser = sessaoCompleta.match(/\(([^)]+)\)$/);
    if (!matchUser) {
        exibirToast('error', 'Erro', 'Não foi possível identificar seu usuário.');
        return;
    }
    
    const usuarioMatricula = matchUser[1];
    let usuariosCadastrados = JSON.parse(localStorage.getItem('wms_usuarios_sistema')) || [];
    const indexUser = usuariosCadastrados.findIndex(u => u.usuario === usuarioMatricula);

    if (indexUser !== -1 && usuariosCadastrados[indexUser].senha === senhaAntiga) {
        usuariosCadastrados[indexUser].senha = senhaNova;
        localStorage.setItem('wms_usuarios_sistema', JSON.stringify(usuariosCadastrados));
        exibirToast('success', 'Senha alterada', 'Sua senha foi alterada com sucesso!');
        document.getElementById('cfg-old-pass').value = '';
        document.getElementById('cfg-new-pass').value = '';
    } else {
        exibirToast('error', 'Senha incorreta', 'A senha atual informada está errada.');
    }
}

function realizarLogout() {
    if (confirm('Deseja realmente encerrar a sessão?')) {
        localStorage.removeItem('usuario_ativo_wms');
        localStorage.removeItem('wms_login_timestamp');
        location.reload(); 
    }
}

// ==================================================================
// 3. FEEDBACK VISUAL (TOASTS E NOTIFICAÇÕES)
// ==================================================================

function exibirToast(tipo, titulo, mensagem, tempo = 3500) {
    const toastStack = document.getElementById('toast-stack');
    
    // CORREÇÃO: Impede loop infinito caso o HTML não tenha a div toast-stack
    if (!toastStack) {
        console.warn(`[Toast ${tipo.toUpperCase()}] ${titulo}: ${mensagem}`);
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
// 4. INICIALIZAÇÃO DE PÁGINA (CHECK DE SESSÃO)
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Checa Tema
    const temaSalvo = localStorage.getItem('wms_current_theme') || 'dark';
    mudarTema(temaSalvo);

    // 2. Checa Bloqueio de Tela (Login)
    const usuarioAtivo = localStorage.getItem('usuario_ativo_wms');
    const authContainer = document.getElementById('auth-system-container');

    if (usuarioAtivo) {
        if (authContainer) authContainer.style.display = 'none';
    } else {
        if (authContainer) authContainer.style.display = 'flex';
    }
});

/// ==================================================================
// 5. CONFIGURAÇÕES GLOBAIS (VARIÁVEIS) E ESTADO
// ==================================================================
let selectedElement = null;
let selectedName = '';
let currentIdCounter = 1;

const MAX_RED_PALLETS = 10;
const MAX_YELLOW_PALLETS = 6;
const MAX_GREEN_PALLETS = 12;

// Armazena as MUs cadastradas temporariamente por ID do elemento do palete
const palletMUs = {};
const palletLocation = {}; // { "PL-01": "R-A" }

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
// 6. INICIALIZAÇÃO CENTRALIZADA (DOM CONTENT LOADED)
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Trava de texto de interface (Evita edição acidental)
    document.body.removeAttribute('contenteditable');
    const protectedSelectors = 'h1, h2, h3, h4, h5, h6, span, p, label, .zone-header, .lane-title, .app-drawer h2, .main-navbar';
    document.querySelectorAll(protectedSelectors).forEach(el => {
        el.contentEditable = "false";
    });

    // 2. Carrega estado geral salvo no navegador
    carregarEstadoGeral();
    updateRedCounter();

    // 3. Verifica e inicializa telas específicas
    if (document.getElementById('history-table-body')) {
        if (typeof carregarDadosDoSheets === 'function') carregarDadosDoSheets();
    }
    if (document.getElementById('graficoErros')) {
        if (typeof carregarDadosDashboard === 'function') {
            carregarDadosDashboard();
            setInterval(carregarDadosDashboard, 60000); // Atualiza a cada 1 min
        }
    }

    // 4. Eventos Globais da Tela de Consulta
    const btnSearch = document.querySelector('.btn-search');
    if (btnSearch && typeof realizarConsulta === 'function') btnSearch.addEventListener('click', realizarConsulta);

    const inputSearch = document.getElementById('search-input');
    if (inputSearch) {
        inputSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && typeof realizarConsulta === 'function') realizarConsulta();
        });
    }

    const btnRemover = document.querySelector('.action-buttons .btn-action.danger');
    if (btnRemover && typeof removerMUAtual === 'function') btnRemover.addEventListener('click', removerMUAtual);

    const btnMover = document.querySelector('.action-buttons .btn-action.primary');
    if (btnMover && typeof moverMUAtual === 'function') btnMover.addEventListener('click', moverMUAtual);

    const btnAlterarStatus = document.getElementById('btn-alterar-status');
    if (btnAlterarStatus && typeof alterarStatusMUAtual === 'function') btnAlterarStatus.addEventListener('click', alterarStatusMUAtual);

    const btnSelecionarErros = document.getElementById('btn-selecionar-erros');
    if (btnSelecionarErros && typeof abrirModalSelecaoErros === 'function') btnSelecionarErros.addEventListener('click', abrirModalSelecaoErros);
});

// ==================================================================
// 7. PERSISTÊNCIA (LOCALSTORAGE)
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
// 8. SELEÇÃO E AÇÕES DE PALETES (PAINEL INFERIOR)
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

function updateStatus(htmlContent) {
    const statusElement = document.getElementById('app-status');
    if (statusElement) {
        statusElement.innerHTML = htmlContent;
    }
}

// Função utilitária para buscar zona
function getPalletZone(palletElement) {
    if (!palletElement) return null;
    if (palletElement.closest('.red-zone')) return 'vermelha';
    if (palletElement.closest('.yellow-zone')) return 'amarela';
    if (palletElement.closest('.street-lane')) return 'rua';
    if (palletElement.closest('.green-zone')) return 'verde';
    return null;
}

function triggerAction(actionName) {
    if (!selectedElement) {
        exibirToast('info', 'Atenção', 'Selecione um palete no mapa antes de executar a operação.');
        return;
    }

    const elementId = selectedElement.id;

    if (actionName === 'Checagem HH') {
        if (!selectedElement.classList.contains('yellow-no-id')) {
            exibirToast('warning', 'Operação Inválida', 'Selecione um palete Laranja na Zona Amarela para fazer a checagem.');
            return;
        }

        selectedElement.className = 'pallet yellow-checked selected';
        selectedElement.innerText = 'Check';
        palletMUs[elementId] = [];

        exibirToast('success', 'Checagem Concluída', 'O palete agora está amarelo e pronto para receber MUs.');
        updateStatus(`🟡 <strong>Checagem HH concluída!</strong><br>📍 Pronto para bipagem e cadastro de MUs.`);
        salvarEstadoGeral();
        return;
    }

    if (actionName === 'Cadastrar MU' || actionName === 'Cadastrar ID') {
        if (!selectedElement.classList.contains('yellow-checked')) {
            exibirToast('error', 'Ação Bloqueada', 'Realize a "Checagem HH" primeiro!');
            return;
        }

        if (!palletMUs[elementId]) palletMUs[elementId] = [];
        let currentMUs = palletMUs[elementId];
        let bipando = true;

        while (bipando && currentMUs.length < 30) {
            const inputMU = prompt(
                `📦 [CADASTRO DE MUs]\n` +
                `MUs Atuais: ${currentMUs.length}/30\n\n` +
                `Bipe a MU com o leitor QR Code ou digite o código:\n\n` +
                `(Clique em 'Cancelar' para encerrar a bipagem)`
            );

            if (inputMU === null || inputMU.trim() === '') {
                bipando = false;
            } else {
                const muCode = inputMU.trim().toUpperCase();
                
                // Validações restauradas e ajustadas
                if (!muCode.startsWith('MU')) {
                    alert('Erro: A MU deve começar com a sigla "MU".');
                } else if (muCode.length !== 16) {
                    alert('Erro: O código da MU deve conter exatamente 16 caracteres.');
                } else if (currentMUs.includes(muCode)) {
                    alert('Aviso: Esta MU já foi bipada neste palete!');
                } else {
                    currentMUs.push(muCode);
                }
            }
        }

        salvarEstadoGeral();
        updateStatus(`📦 <strong>MUs cadastradas:</strong> ${currentMUs.length}/30`);
        return;
    }

    if (actionName === 'Vincular ID') {
        if (!selectedElement.classList.contains('yellow-checked')) {
            exibirToast('error', 'Ação Bloqueada', 'Palete não elegível para vínculo de Placa.');
            return;
        }

        let currentMUs = palletMUs[elementId] || [];
        if (currentMUs.length === 0) {
            exibirToast('warning', 'Palete Vazio', 'Cadastre pelo menos uma MU antes de vincular a Placa (ID).');
            return;
        }

        let finalID = '';
        let idValido = false;

        while (!idValido) {
            const suggestedID = `PL-${String(currentIdCounter).padStart(2, '0')}`;
            const inputID = prompt('🏷️ [VINCULAR PLACA DE ID]\nDigite o ID do Palete (Ex: PL-01):', suggestedID);

            if (inputID === null || inputID.trim() === '') return;

            const inputFormatado = inputID.trim().toUpperCase();
            if (!/^PL-?\d+$/.test(inputFormatado)) {
                alert('O ID deve começar com "PL" seguido de números (ex: PL-01).');
            } else {
                finalID = inputFormatado;
                idValido = true;
            }
        }

        selectedElement.innerText = finalID;
        selectedElement.className = 'pallet blue selected';
        
        exibirToast('success', 'Vínculo Concluído', `Palete registrado como ${finalID} e liberado para as ruas!`);
        updateStatus(`🔵 <strong>Palete liberado para as ruas!</strong> Placa: ${finalID}`);
        
        if (currentIdCounter < 99) currentIdCounter++;
        salvarEstadoGeral();
        return;
    }

    if (actionName === 'Despachar PL') {
        const isZonaVerde = selectedElement.closest('.green-zone') !== null || selectedElement.classList.contains('green');
        if (!isZonaVerde) {
            exibirToast('error', 'Despacho Negado', 'O palete precisa estar na Zona Verde (Expedição) para ser despachado.');
            return;
        }

        const idPallet = selectedElement.innerText.trim();
        const musPallet = palletMUs[elementId] || [];

        if (musPallet.length === 0) {
            exibirToast('warning', 'Erro Crítico', 'Tentativa de despachar palete sem MUs.');
            return;
        }

        if (confirm(`🚚 Confirma o despacho do Palete ${idPallet} com ${musPallet.length} MUs para a nuvem?`)) {
            const dataAtual = new Date();
            const dataHoraFormatada = dataAtual.toLocaleString('pt-BR');
            const usuarioLogado = localStorage.getItem('usuario_ativo_wms') || 'Usuário Padrão';
            
            // Garantindo segurança caso getHistoricoMUs não esteja definida
            const historicoGlobal = typeof getHistoricoMUs === 'function' ? Object.values(getHistoricoMUs()).flat() : [];
            
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

            // Envia para o Google Sheets (em background)
            const SCRIPT_URL = GOOGLE_SHEETS_URL;
            const formData = new URLSearchParams();
            formData.append('payload', JSON.stringify(registrosParaEnviar));

            fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            }).catch(err => console.error('Erro ao enviar para planilha:', err));

            // Limpa o palete da interface e da memória
            delete palletMUs[elementId];
            selectedElement.remove();
            selectedElement = null;
            
            salvarEstadoGeral();
            exibirToast('success', 'Despacho Executado', `Palete ${idPallet} despachado. Planilha em atualização.`);
            updateStatus(`🟢 <strong>Palete ${idPallet} despachado com sucesso!</strong>`);
        }
        return;
    }
}

// ==================================================================
// 9. EVENTOS DRAG & DROP E LAYOUT
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

// Helper para evitar erros de atualizar gráfico em tela de mapa
function chamarDashboardBackground() {
    if (typeof atualizarDashboard === 'function' && document.getElementById('graficoErros')) {
        atualizarDashboard();
    }
}

// ==================================================================
// 10. REGRAS DA ZONA VERMELHA
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
        exibirToast('warning', 'Capacidade máxima', 'A Zona Vermelha atingiu a capacidade máxima de 10 paletes.');
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
    salvarEstadoGeral();
    updateStatus(`🔴 <strong>Pallet ${palletLabel} criado na Zona Vermelha.</strong>`);
}

function removeRedPallet() {
    const stack = document.getElementById('red-stack');
    if (!stack || stack.children.length === 0) {
        exibirToast('info', 'Zona vazia', 'A Zona Vermelha já está vazia!');
        return;
    }

    const lastPallet = stack.lastElementChild;
    if (palletMUs[lastPallet.id]) delete palletMUs[lastPallet.id];
    if (selectedElement === lastPallet) selectedElement = null;

    stack.removeChild(lastPallet);
    updateRedCounter();
    salvarEstadoGeral();
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
        exibirToast('warning', 'Capacidade máxima', 'A Zona Vermelha atingiu a capacidade máxima de 10 paletes.');
        return;
    }

    if (confirm(`⚠️ Deseja retornar o palete "${draggedPallet.innerText}" para a Zona Vermelha? Todo o registro de MUs será resetado!`)) {
        delete palletMUs[draggedPallet.id];
        draggedPallet.className = 'pallet red';
        
        const availableNumber = getNextAvailableRedNumber();
        draggedPallet.innerText = `P${String(availableNumber).padStart(2, '0')}`;

        redContainer.appendChild(draggedPallet);
        updateRedCounter();
        salvarEstadoGeral();
        updateStatus(`🔴 <strong>Palete retornado à Zona Vermelha.</strong>`);
        setTimeout(chamarDashboardBackground, 500);
    }
}

// ==================================================================
// 11. REGRAS DA ZONA AMARELA E RUAS (ZONA CINZA) & ZONA VERDE
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

    // Expedição → Triagem (reset do palete, desvincula PL)
    if (isFromGreen) {
        const inputPL = prompt(`📦 Qual PL está sendo retornado?\n(Palete atual: ${currentPL})`);
        if (inputPL === null) return;

        if (inputPL.trim().toUpperCase() !== currentPL) {
            exibirToast('error', 'Erro', `❌ Dados não conferem! Você informou "${inputPL}" mas o palete é "${currentPL}".`);
            return;
        }

        if (yellowContainer.querySelectorAll('.pallet').length >= MAX_YELLOW_PALLETS) {
            exibirToast('info', 'Limite de Capacidade', 'A Zona Amarela atingiu a capacidade máxima de 6 paletes.');
            return;
        }

        draggedPallet.className = 'pallet yellow-checked';
        draggedPallet.innerText = 'Check';
        delete palletLocation[currentPL];
        
        yellowContainer.appendChild(draggedPallet);
        updateRedCounter();
        salvarEstadoGeral();
        updateStatus('🔄 <strong>Palete retornado à triagem.</strong> PL desvinculada.');
        return;
    }

    const validacao = validarMovimentacaoPallet(draggedPallet, 'amarela');
    if (!validacao.ok) {
        exibirToast('warning', 'Movimento Inválido', validacao.motivo);
        return;
    }

    if (yellowContainer.querySelectorAll('.pallet').length >= MAX_YELLOW_PALLETS) {
        exibirToast('info', 'Limite de Capacidade', 'A Zona Amarela atingiu a capacidade máxima de 6 paletes.');
        return;
    }

    if (sourceZone.id === 'red-stack') {
        yellowContainer.appendChild(draggedPallet);
        draggedPallet.className = 'pallet yellow-no-id';
        draggedPallet.innerText = 'No ID';
        draggedPallet.setAttribute('onclick', `selectPalletElement(this, '${draggedPallet.id}')`);

        updateRedCounter();
        salvarEstadoGeral();
        updateStatus('🟠 <strong>Pallet na triagem.</strong> Aguardando checagem HH.');
        setTimeout(chamarDashboardBackground, 500);
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

    const validacao = validarMovimentacaoPallet(draggedPallet, 'rua');
    if (!validacao.ok) {
        exibirToast('warning', 'Movimento Inválido', validacao.motivo);
        return;
    }

    if (sourceZone.id === 'red-stack') {
        exibirToast('warning', 'Movimento Inválido', 'Paletes da Zona Vermelha devem passar pela Zona Amarela antes da rua.');
        return;
    }

    if (isFromYellow && !draggedPallet.classList.contains('blue')) {
        exibirToast('error', 'Sem Identificação', 'O palete precisa ter a Placa (ID) vinculada antes de entrar na rua.');
        return;
    }

    if (laneElement.querySelectorAll('.pallet').length >= 6 && !laneElement.contains(draggedPallet)) {
        exibirToast('info', 'Rua Cheia', 'Esta rua atingiu o limite máximo de 6 paletes.');
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
            exibirToast('error', 'Dados não conferem', `Rua informada (${ruaNormalizada}) não bate com a rua de destino (${targetLaneCode}).`);
            return;
        }
        
        palletLocation[currentPL] = targetLaneCode;
        const isSelected = draggedPallet.classList.contains('selected');
        draggedPallet.className = `pallet blue${isSelected ? ' selected' : ''}`;
        
        laneElement.appendChild(draggedPallet);
        updateRedCounter();
        salvarEstadoGeral();
        
        exibirToast('success', 'Triagem → Rua', `PL ${currentPL} movido para ${targetLaneCode}`);
        updateStatus('🚚 <strong>Palete alocado na rua.</strong>');
        return;
    }

    // Fluxo: Entre Ruas (Troca)
    if (isFromStreet && !isFromGreen) {
        const currentStreetLane = sourceZone.closest('.street-lane');
        const currentLaneCode = getTargetLaneCode(currentStreetLane);
        
        const inputPL = prompt(`📦 Qual PL está sendo movimentado?\n(Palete atual: ${currentPL})`);
        if (inputPL === null) return;
        
        const inputRua = prompt(`🚚 Qual é a nova rua?\n(De: ${currentLaneCode}, Para: ${targetLaneCode})`);
        if (inputRua === null) return;

        const ruaNormalizada = inputRua.trim().toUpperCase();
        if (ruaNormalizada !== targetLaneCode) {
            exibirToast('error', 'Dados não conferem', `Rua informada (${ruaNormalizada}) não bate com a rua de destino (${targetLaneCode}).`);
            return;
        }
        
        palletLocation[currentPL] = targetLaneCode;
        const isSelected = draggedPallet.classList.contains('selected');
        draggedPallet.className = `pallet blue${isSelected ? ' selected' : ''}`;
        
        laneElement.appendChild(draggedPallet);
        updateRedCounter();
        salvarEstadoGeral();
        
        exibirToast('success', 'Troca de Rua', `PL ${currentPL} movido de ${currentLaneCode} para ${targetLaneCode}`);
        updateStatus('🚚 <strong>Palete movido para outra rua.</strong>');
        return;
    }

    // Fluxo: Expedição → Ruas (Retorno Inverso/Reset)
    if (isFromGreen) {
        const inputPL = prompt(`📦 Qual PL está sendo retornado?\n(Palete atual: ${currentPL})`);
        if (inputPL === null) return;
        
        const inputRua = prompt(`🚚 Para qual rua (R-A, R-B, R-C, R-D, R-E)?`);
        if (inputRua === null) return;

        const ruaNormalizada = inputRua.trim().toUpperCase();
        if (ruaNormalizada !== targetLaneCode) {
            exibirToast('error', 'Dados não conferem', `Rua informada (${ruaNormalizada}) não bate com a rua de destino (${targetLaneCode}).`);
            return;
        }

        draggedPallet.className = 'pallet yellow-checked';
        draggedPallet.innerText = 'Check';
        delete palletLocation[currentPL];
        
        laneElement.appendChild(draggedPallet);
        updateRedCounter();
        salvarEstadoGeral();
        
        exibirToast('info', 'Retorno Inverso', `PL ${currentPL} retornou da Expedição. ID desvinculado.`);
        updateStatus('🔄 <strong>Palete retornado.</strong> PL desvinculada.');
        setTimeout(chamarDashboardBackground, 500);
        return;
    }
    
    setTimeout(chamarDashboardBackground, 500);
}

function dropPalletGreen(event, greenContainer) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData('text/plain');
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const validacao = validarMovimentacaoPallet(draggedPallet, 'verde');
    if (!validacao.ok) {
        exibirToast('warning', 'Movimento Inválido', validacao.motivo);
        return;
    }

    if (greenContainer.querySelectorAll('.pallet').length >= MAX_GREEN_PALLETS) {
        exibirToast('info', 'Limite de Capacidade', 'A Zona Verde atingiu a capacidade máxima de 12 paletes.');
        return;
    }

    const currentPL = draggedPallet.innerText.trim();
    if (!confirm(`✅ Confirma movimentação do palete ${currentPL} para expedição?`)) {
        return;
    }

    const isSelected = draggedPallet.classList.contains('selected');
    draggedPallet.className = `pallet green${isSelected ? ' selected' : ''}`;
    
    greenContainer.appendChild(draggedPallet);
    updateRedCounter();
    salvarEstadoGeral();

    exibirToast('success', 'Pronto para Despacho', `Palete ${currentPL} na expedição.`);
    updateStatus('🟢 <strong>Palete liberado para expedição.</strong>');
    setTimeout(chamarDashboardBackground, 500);
}
// ==================================================================
// 12. DASHBOARD, HISTÓRICO E DUPLO CLIQUE (MAPA)
// ==================================================================

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
        ${mus.length > 0 ? mus.join('<br>') : '<em>Nenhuma MU cadastrada.</em>'}
    `;
    
    const modal = document.getElementById('pallet-modal');
    if (modal) modal.style.display = 'flex';
});

function fecharModalPalete() {
    const modal = document.getElementById('pallet-modal');
    if (modal) modal.style.display = 'none';
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
        console.warn("Aviso: Falha ao carregar do Sheets. Usando cache local.", erro);
        dadosHistorico = JSON.parse(localStorage.getItem('buffer_historico')) || simularDadosDeTeste();
        calcularKPIs(dadosHistorico);
        renderizarTabela(dadosHistorico);
    }
}

function calcularKPIs(dados) {
    if (!dados || dados.length === 0) return;
    const elKpiMus = document.getElementById('kpi-total-mus');
    const elKpiPallets = document.getElementById('kpi-total-pallets');
    
    if (elKpiMus) elKpiMus.innerText = dados.length;
    if (elKpiPallets) elKpiPallets.innerText = new Set(dados.map(i => i.palletID)).size;
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Inverte os dados para mostrar o mais recente no topo
    [...dados].reverse().forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-mono">${item.mu || '-'}</td>
            <td><span class="badge" style="background:#0284c7; padding:4px 8px; border-radius:4px;">${item.palletID || '-'}</span></td>
            <td>${item.dataDespacho || '-'}</td>
            <td>${item.usuario || 'Sistema'}</td>
            <td style="text-align:center;">${item.acoesFeitas || '1'}</td>
            <td>${item.tempoNoBuffer || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function simularDadosDeTeste() {
    return [
        { dataDespacho: new Date().toLocaleString('pt-BR'), palletID: "PL-01", mu: "MU-TT-RC-20A-123", acoesFeitas: 4, tempoNoBuffer: "42m", usuario: "Maycon Sato" }
    ];
}

// Dashboard Ocupação & Gráfico
function carregarDadosDashboard() {
    const layout = JSON.parse(localStorage.getItem('buffer_layout')) || [];
    let pVermelha = 0, pAmarela = 0, pCinza = 0, pVerde = 0;

    layout.forEach(item => {
        // Correção: Agora conta corretamente pelas classes e não apenas textos que começam com 'P'
        if (item.className && item.className.includes('pallet')) {
            if (item.parentId === 'red-stack') pVermelha++;
            else if (item.parentId === 'yellow-stack') pAmarela++;
            else if (item.parentId === 'green-stack') pVerde++;
            else if (item.parentId && item.parentId.startsWith('R-')) pCinza++;
        }
    });

    const maxCinza = 30; // 5 ruas * 6 paletes = 30
    
    atualizarBarraKPI('kpi-ocupacao-pendentes', Math.min(100, Math.round((pVermelha/MAX_RED_PALLETS)*100)), pVermelha, MAX_RED_PALLETS);
    atualizarBarraKPI('kpi-ocupacao-triagem', Math.min(100, Math.round((pAmarela/MAX_YELLOW_PALLETS)*100)), pAmarela, MAX_YELLOW_PALLETS);
    atualizarBarraKPI('kpi-ocupacao-ruas', Math.min(100, Math.round((pCinza/maxCinza)*100)), pCinza, maxCinza);
    atualizarBarraKPI('kpi-ocupacao-expedicao', Math.min(100, Math.round((pVerde/MAX_GREEN_PALLETS)*100)), pVerde, MAX_GREEN_PALLETS);
}

function atualizarBarraKPI(idBase, perc, atual, max) {
    const elPerc = document.getElementById(`${idBase}-perc`);
    const elBar = document.getElementById(`${idBase}-bar`);
    if (elPerc) elPerc.innerText = `${perc}% (${atual}/${max})`;
    if (elBar) elBar.style.width = `${perc}%`;
}


// ==================================================================
// 13. SISTEMA DE CONSULTA E TRATATIVAS (Integrado)
// ==================================================================

function realizarConsulta() {
    const input = document.getElementById('search-input').value.trim().toUpperCase();
    if (!input) {
        exibirToast('warning', 'Pesquisa vazia', 'Digite um ID de Palete ou código de MU.');
        return;
    }

    let idPalvoEncontrado = null; 
    let nomeExibicao = "";        
    let listaMUs = [];
    let localizacaoPalete = "Desconhecido";

    const bufferLayout = JSON.parse(localStorage.getItem('buffer_layout')) || {};

    if (input.startsWith('PL') || input.startsWith('P')) {
        const encontradoNoLayout = bufferLayout.find(p => p.text.toUpperCase() === input);
        if (encontradoNoLayout) {
            idPalvoEncontrado = encontradoNoLayout.id;
            nomeExibicao = encontradoNoLayout.text;
            listaMUs = palletMUs[idPalvoEncontrado] || [];
            localizacaoPalete = LANE_CODES[encontradoNoLayout.parentId] || encontradoNoLayout.parentId;
        }
    } else if (input.startsWith('MU')) {
        for (const [idInterno, mus] of Object.entries(palletMUs)) {
            if (mus.includes(input)) {
                idPalvoEncontrado = idInterno;
                listaMUs = mus;
                const layoutItem = bufferLayout.find(p => p.id === idInterno);
                if (layoutItem) {
                    nomeExibicao = layoutItem.text;
                    localizacaoPalete = LANE_CODES[layoutItem.parentId] || layoutItem.parentId;
                }
                break;
            }
        }
    } else {
        exibirToast('error', 'Formato Inválido', "Pesquise iniciando com 'PL' ou 'MU'.");
        return;
    }

    if (!idPalvoEncontrado && listaMUs.length === 0) {
        exibirToast('error', 'Não encontrado', `Nenhum registro para: ${input}`);
        return;
    }

    renderizarTabelaPalete(idPalvoEncontrado, nomeExibicao, localizacaoPalete, listaMUs, input);
}

function renderizarTabelaPalete(idInterno, idPalete, localizacao, listaMUs, termoPesquisado) {
    const headerTitle = document.querySelector('.card-header-flex h2');
    const badgeCapacity = document.querySelector('.badge-capacity');
    const tbody = document.querySelector('.data-table tbody');
    
    if (headerTitle) headerTitle.innerHTML = `📦 Palete: <span class="highlight-id">${idPalete}</span> <small style="display:block; font-size:0.8rem; color:#94a3b8; margin-top:2px;">📍 ${localizacao}</small>`;
    if (badgeCapacity) badgeCapacity.innerText = `MUs Cadastradas: ${listaMUs.length}/30`;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (listaMUs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Palete vazio.</td></tr>`;
        document.querySelectorAll('.action-buttons .btn-action').forEach(btn => btn.setAttribute('disabled', 'true'));
        return;
    }

    listaMUs.forEach(mu => {
        const isSelected = mu === termoPesquisado ? 'selected-row' : '';
        const tr = document.createElement('tr');
        if (isSelected) tr.classList.add('selected-row');

        tr.innerHTML = `
            <td><strong>${mu}</strong></td>
            <td><span class="tag tag-liberado">Liberado</span></td>
            <td>${new Date().toLocaleDateString('pt-BR')}</td>
            <td>OPERADOR_WMS</td>
            <td><button class="btn-table" onclick="selecionarMU('${mu}', '${idInterno}', '${idPalete}', '${localizacao}')">Selecionar</button></td>
        `;
        tbody.appendChild(tr);
    });

    const muParaSelecionar = listaMUs.includes(termoPesquisado) ? termoPesquisado : listaMUs[0];
    selecionarMU(muParaSelecionar, idInterno, idPalete, localizacao);
}

function selecionarMU(mu, idInterno, idPalete, localizacao) {
    muSelecionadaGlobal = mu;
    paleteAtualGlobal = { idInterno, idPalete, localizacao };

    const elCode = document.getElementById('detail-mu-code');
    const elLoc = document.getElementById('detail-mu-location');
    if (elCode) elCode.innerText = mu;
    if (elLoc) elLoc.innerText = `Localização: ${localizacao} (Palete: ${idPalete})`;
    
    document.querySelectorAll('.action-buttons .btn-action').forEach(btn => btn.removeAttribute('disabled'));
}

// ==================================================================
// 14. GESTÃO AVANÇADA DE MUs E HISTÓRICO INTERNO
// ==================================================================
function obterUsuarioAtual() {
    return localStorage.getItem('usuario_ativo_wms') || 'OPERADOR_WMS';
}

function getDetalhesMUs() {
    return JSON.parse(localStorage.getItem('buffer_mu_detalhes')) || {};
}
function salvarDetalhesMUs(d) { 
    localStorage.setItem('buffer_mu_detalhes', JSON.stringify(d)); 
}

function getHistoricoMUs() {
    return JSON.parse(localStorage.getItem('buffer_mu_historico')) || {};
}
function salvarHistoricoMUs(h) { 
    localStorage.setItem('buffer_mu_historico', JSON.stringify(h)); 
}

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

// ==================================================================
// 15. FUNÇÕES DE TRATATIVAS ATUALIZADAS (AGORA COM HISTÓRICO)
// (Substitua as funções correspondentes da Parte 5 por estas abaixo)
// ==================================================================

function removerMUAtual() {
    if (!muSelecionadaGlobal || !paleteAtualGlobal) return;

    if (confirm(`🗑️ Deseja realmente remover a MU "${muSelecionadaGlobal}" do palete ${paleteAtualGlobal.idPalete}?`)) {
        let musDoPalete = palletMUs[paleteAtualGlobal.idInterno] || [];
        palletMUs[paleteAtualGlobal.idInterno] = musDoPalete.filter(m => m !== muSelecionadaGlobal);
        
        // NOVO: Registra no histórico oculto da MU
        registrarHistoricoMU(muSelecionadaGlobal, `Removida manualmente do palete ${paleteAtualGlobal.idPalete}`);

        salvarEstadoGeral();
        exibirToast('success', 'Removida', `MU removida com sucesso!`);
        verificarPaleteVazio(paleteAtualGlobal.idInterno, paleteAtualGlobal.idPalete);
        
        const input = document.getElementById('search-input');
        if(input) { input.value = paleteAtualGlobal.idPalete; realizarConsulta(); }
    }
}

function moverMUAtual() {
    if (!muSelecionadaGlobal || !paleteAtualGlobal) return;

    const destinoInput = prompt(`🔄 Digite o ID do palete de destino (Ex: PL-02):`);
    if (!destinoInput || destinoInput.trim() === "") return;

    const destinoFormatado = destinoInput.trim().toUpperCase();
    if (destinoFormatado === paleteAtualGlobal.idPalete.toUpperCase()) {
        exibirToast('warning', 'Aviso', 'A MU já está neste palete!');
        return;
    }

    const bufferLayout = JSON.parse(localStorage.getItem('buffer_layout')) || [];
    const destinoLayout = bufferLayout.find(p => p.text.toUpperCase() === destinoFormatado);

    if (!destinoLayout) {
        exibirToast('error', 'Erro', `Palete "${destinoFormatado}" não encontrado!`);
        return;
    }

    const idInternoDestino = destinoLayout.id;
    if ((palletMUs[idInternoDestino] || []).length >= 30) {
        exibirToast('error', 'Cheio', 'O palete de destino já possui 30 MUs!');
        return;
    }

    palletMUs[paleteAtualGlobal.idInterno] = palletMUs[paleteAtualGlobal.idInterno].filter(m => m !== muSelecionadaGlobal);
    if (!palletMUs[idInternoDestino]) palletMUs[idInternoDestino] = [];
    palletMUs[idInternoDestino].push(muSelecionadaGlobal);

    // NOVO: Registra no histórico oculto da MU
    registrarHistoricoMU(muSelecionadaGlobal, `Movida do palete ${paleteAtualGlobal.idPalete} para o palete ${destinoFormatado}`);

    salvarEstadoGeral();
    exibirToast('success', 'Movida', `MU movida para ${destinoFormatado}!`);
    verificarPaleteVazio(paleteAtualGlobal.idInterno, paleteAtualGlobal.idPalete);
    
    const input = document.getElementById('search-input');
    if(input) { input.value = destinoFormatado; realizarConsulta(); }
}

function alterarStatusMUAtual() {
    if (!muSelecionadaGlobal) {
        exibirToast('error', 'Erro', 'Nenhuma MU selecionada.');
        return;
    }
    
    // Simulação de alteração de status
    registrarHistoricoMU(muSelecionadaGlobal, `Status operacional alterado pelo usuário`);
    exibirToast('success', 'Status Atualizado', `O status da MU ${muSelecionadaGlobal} foi alterado no sistema.`);
}

function abrirModalSelecaoErros() {
    if (!muSelecionadaGlobal) {
        exibirToast('error', 'Erro', 'Nenhuma MU selecionada para atrelar erro.');
        return;
    }

    const erroSelecionado = prompt(`Selecione ou digite o erro a ser atrelado à MU:\n(Ex: ${LISTA_ERROS_PADRAO.slice(0, 5).join(', ')}...)`);
    
    if (erroSelecionado && erroSelecionado.trim() !== '') {
        // Grava no histórico o erro
        registrarHistoricoMU(muSelecionadaGlobal, `Erro Reportado: ${erroSelecionado.trim()}`);
        exibirToast('warning', 'Erro Atrelado', `Erro "${erroSelecionado}" vinculado à MU ${muSelecionadaGlobal}.`);
    }
}

// ==================================================================
// 16. DASHBOARD AVANÇADO E INTEGRAÇÃO DE KPIs
// ==================================================================

function obterStatusZonas() {
    const redStack = document.getElementById('red-stack');
    const yellowStack = document.getElementById('yellow-stack');
    const greenContainer = document.querySelector('.green-zone');
    const streetsContainer = document.querySelectorAll('.street-lane');

    const stats = {
        vermelha: { ocupados: redStack ? redStack.children.length : 0, capacidade: MAX_RED_PALLETS },
        amarela: { ocupados: yellowStack ? yellowStack.children.length : 0, capacidade: MAX_YELLOW_PALLETS },
        verde: { ocupados: greenContainer ? greenContainer.querySelectorAll('.pallet').length : 0, capacidade: MAX_GREEN_PALLETS },
        ruas: { ocupados: 0, capacidade: 0 },
        totalMUs: Object.values(palletMUs).reduce((sum, mus) => sum + mus.length, 0)
    };

    if (streetsContainer) {
        streetsContainer.forEach(lane => {
            const pallets = lane.querySelectorAll('.pallet').length;
            stats.ruas.ocupados += pallets;
            stats.ruas.capacidade += 6;
        });
    }

    return stats;
}

function atualizarDashboard() {
    const stats = obterStatusZonas();
    
    // KPI: Total de MUs (Baseado nas ocupadas e projetadas)
    const totalMUsEl = document.getElementById('kpi-total-mus');
    if (totalMUsEl && !document.querySelector('.history-table')) { // Se não estiver na tela de histórico
        const musPendentes = stats.vermelha.ocupados * 30; // Estimativa conservadora de paletes não bipados
        const totalMUs = stats.totalMUs + musPendentes;
        totalMUsEl.innerHTML = `${totalMUs} <span class="kpi-unit" style="font-size:0.5em; opacity:0.7;">MUs</span>`;
    }

    // Função interna para preencher as barras
    const renderBar = (id, ocupados, capacidade) => {
        if (!document.getElementById(`${id}-perc`)) return;
        const perc = capacidade > 0 ? (ocupados / capacidade) * 100 : 0;
        const percRound = Math.min(100, Math.round(perc));
        
        document.getElementById(`${id}-perc`).innerText = percRound + '%';
        document.getElementById(`${id}-bar`).style.width = percRound + '%';
        
        const elText = document.getElementById(`${id}-text`);
        if (elText) elText.innerText = `${ocupados} de ${capacidade} posições ocupadas`;
    };

    renderBar('kpi-ocupacao-pendentes', stats.vermelha.ocupados, stats.vermelha.capacidade);
    renderBar('kpi-ocupacao-triagem', stats.amarela.ocupados, stats.amarela.capacidade);
    renderBar('kpi-ocupacao-ruas', stats.ruas.ocupados, stats.ruas.capacidade);
    renderBar('kpi-ocupacao-expedicao', stats.verde.ocupados, stats.verde.capacidade);
}

// ==================================================================
// 17. HISTÓRICO COM MÉDIAS E DETALHAMENTO DE MU
// ==================================================================

function carregarHistoricoComMedias() {
    const historicoGeral = JSON.parse(localStorage.getItem('buffer_historico')) || [];
    const historicoPorMU = getHistoricoMUs();
    
    const totalMUs = historicoGeral.length;
    const totalPallets = new Set(historicoGeral.map(h => h.palletID)).size;
    const acoesPorMU = Object.values(historicoPorMU).reduce((sum, eventos) => sum + eventos.length, 0);
    const mediaAcoes = totalMUs > 0 ? (acoesPorMU / totalMUs).toFixed(2) : 0;

    if (document.getElementById('kpi-total-mus')) document.getElementById('kpi-total-mus').innerText = totalMUs;
    if (document.getElementById('kpi-total-pallets')) document.getElementById('kpi-total-pallets').innerText = totalPallets;
    if (document.getElementById('kpi-media-acoes')) document.getElementById('kpi-media-acoes').innerText = mediaAcoes;

    const tbody = document.querySelector('.history-table tbody');
    if (tbody) {
        tbody.innerHTML = '';
        historicoGeral.slice().reverse().forEach(registro => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong class="text-highlight">${registro.mu}</strong></td>
                <td><span class="badge" style="background:#0284c7; padding:4px 8px; border-radius:4px;">${registro.palletID || '---'}</span></td>
                <td>${registro.dataDespacho}</td>
                <td>${registro.usuario || 'Sistema'}</td>
                <td style="text-align:center;">${registro.acoesFeitas || 0}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function exibirDetalheMU(muCode) {
    const historico = getHistoricoMUs()[muCode] || [];
    const detailTimeline = document.getElementById('detail-mu-timeline');
    const detailMUCode = document.getElementById('detail-mu-code');
    
    if (detailMUCode) detailMUCode.innerText = muCode;
    
    if (detailTimeline) {
        detailTimeline.innerHTML = '';
        
        if (historico.length === 0) {
            detailTimeline.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:10px;">Sem eventos registrados ainda.</p>';
            return;
        }

        historico.forEach(evento => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-date">${evento.timestamp.split(' ')[1]} - ${evento.timestamp.split(' ')[0]}</div>
                <div class="timeline-content">${evento.evento}</div>
                <div class="timeline-user">👤 ${evento.usuario}</div>
            `;
            detailTimeline.appendChild(item);
        });
    }
}

// ==================================================================
// 18. LOADS GLOBAIS E EXPORTAÇÃO (WINDOW)
// ==================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicia Timer do Dashboard se estiver na tela de Dash
    if (document.getElementById('kpi-ocupacao-pendentes-perc')) {
        atualizarDashboard();
        setInterval(atualizarDashboard, 5000); // Atualiza a cada 5s
    }
    
    // Carrega Histórico detalhado se estiver na tela de histórico
    if (document.querySelector('.history-table')) {
        carregarHistoricoComMedias();
    }
});

// EXPORTAÇÕES OBRIGATÓRIAS PARA HTML
window.switchAuthTab = switchAuthTab;
window.realizarCadastro = realizarCadastro;
window.realizarLogin = realizarLogin;
window.abrirConfiguracoes = abrirConfiguracoes;
window.fecharConfiguracoes = fecharConfiguracoes;
window.mudarTema = mudarTema;
window.alterarSenhaOperador = alterarSenhaOperador;
window.realizarLogout = realizarLogout;

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
window.obterStatusZonas = obterStatusZonas;
window.atualizarDashboard = atualizarDashboard;
window.carregarHistoricoComMedias = carregarHistoricoComMedias;
window.exibirDetalheMU = exibirDetalheMU;