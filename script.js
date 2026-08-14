
// ==================================================================
// CONFIGURAÇÕES E AUTENTICAÇÃO WMS
// ==================================================================
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyWvQ8Anvus1la6b58rb0PDCB5miiiYo0gVUevofddG8Sm1owo20hx1cZXm-9AX8ivVNA/exec";

// Ao carregar a página, verifica se já existe uma sessão ativa
document.addEventListener('DOMContentLoaded', () => {
    verificarSessaoAtiva();
});

/**
 * Alterna visibilidade entre as abas do Modal de Auth
 */
function switchAuthTab(tabName) {
    // Esconde todos os conteúdos de abas
    document.querySelectorAll('.auth-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Desativa estilo de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Ativa a aba e o botão selecionado
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) selectedTab.classList.add('active');

    const activeBtn = Array.from(document.querySelectorAll('.tab-btn'))
        .find(btn => btn.getAttribute('onclick').includes(tabName));
    if (activeBtn) activeBtn.classList.add('active');
}

/**
 * REALIZAR LOGIN (Consulta o Google Sheets)
 */
async function realizarLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value;
    const btnSubmit = event.target.querySelector('button[type="submit"]');

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Autenticando...";

        // 1. Busca a lista de usuários cadastrados no Apps Script
        const response = await fetch(`${GOOGLE_SHEETS_URL}?action=get_usuarios`);
        const usuarios = await response.json();

        const listaUsuarios = Array.isArray(usuarios) ? usuarios : [];

        // 2. Valida o usuário e a senha
        const usuarioEncontrado = listaUsuarios.find(
            user => user.username.toLowerCase() === usernameInput && user.password === passwordInput
        );

        if (usuarioEncontrado) {
            // Salva na sessão local (sessionStorage limpa ao fechar a aba)
            sessionStorage.setItem('usuarioAtivo', JSON.stringify({
                nome: usuarioEncontrado.fullname,
                username: usuarioEncontrado.username
            }));

            desbloquearTelaSistema(usuarioEncontrado.fullname);
        } else {
            alert("Usuário ou senha incorretos.");
        }

    } catch (erro) {
        console.error("Erro ao realizar login:", erro);
        alert("Falha ao comunicar com o servidor de autenticação.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Acessar Sistema";
    }
}

/**
 * REALIZAR CADASTRO DE OPERADOR (Grava no Google Sheets)
 */
async function realizarCadastro(event) {
    event.preventDefault();

    const fullname = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const btnSubmit = event.target.querySelector('button[type="submit"]');

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Cadastrando...";

        // 1. Puxa os usuários atuais para não sobrescrever
        const response = await fetch(`${GOOGLE_SHEETS_URL}?action=get_usuarios`);
        const usuariosAtuais = await response.json();
        const listaUsuarios = Array.isArray(usuariosAtuais) ? usuariosAtuais : [];

        // 2. Verifica se a matrícula/usuário já existe
        const usuarioExiste = listaUsuarios.some(user => user.username.toLowerCase() === username);
        if (usuarioExiste) {
            alert("Esta matrícula/usuário já está cadastrada no sistema!");
            return;
        }

        // 3. Adiciona o novo usuário na lista
        listaUsuarios.push({
            fullname: fullname,
            username: username,
            password: password,
            dataCadastro: new Date().toLocaleString('pt-BR')
        });

        // 4. Salva a lista atualizada via POST no Apps Script
        const payload = new URLSearchParams({
            action: 'save_usuarios',
            data: JSON.stringify(listaUsuarios)
        });

        const saveResponse = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString()
        });

        const resultado = await saveResponse.json();

        if (resultado.status === 'success') {
            alert("Operador cadastrado com sucesso! Faça login para continuar.");
            event.target.reset(); // Limpa o formulário de cadastro
            switchAuthTab('login'); // Retorna para a aba de login
        } else {
            alert("Erro ao salvar cadastro: " + resultado.message);
        }

    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        alert("Falha ao cadastrar operador no servidor.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Cadastrar Operador";
    }
}

/**
 * VERIFICA SE O USUÁRIO JÁ ESTÁ LOGADO
 */
function verificarSessaoAtiva() {
    const usuarioSalvo = sessionStorage.getItem('usuarioAtivo');
    if (usuarioSalvo) {
        const user = JSON.parse(usuarioSalvo);
        desbloquearTelaSistema(user.nome);
    }
}

/**
 * DESBLOQUEIA A TELA E EXIBE NOME DO OPERADOR
 */
function desbloquearTelaSistema(nomeOperador) {
    const authContainer = document.getElementById('auth-system-container');
    if (authContainer) {
        authContainer.style.display = 'none'; // Esconde o modal de login
    }

    const statusUserEl = document.getElementById('auth-status-user');
    if (statusUserEl) {
        statusUserEl.innerHTML = `👤 <strong>Usuário Ativo:</strong> ${nomeOperador}`;
    }
}

/**
 * LOGOUT DO SISTEMA
 */
function realizarLogout() {
    sessionStorage.removeItem('usuarioAtivo');
    window.location.reload();
}
// ------------------------------------------------------------------
// 1. INICIALIZAÇÃO E TRAVA DE TEXTO DE INTERFACE
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    document.body.removeAttribute('contenteditable');

    const protectedSelectors = 'h1, h2, h3, h4, h5, h6, span, p, label, .zone-header, .lane-title, .app-drawer h2, .main-navbar';
    document.querySelectorAll(protectedSelectors).forEach(el => {
        el.contentEditable = "false";
    });

    // CARREGA TUDO O QUE ESTAVA SALVO NO NAVEGADOR
    carregarEstadoGeral(); 
    updateRedCounter();
});

// ==================================================================
// ESTADO DA APLICAÇÃO & CONFIGURAÇÕES
// ==================================================================
let selectedElement = null;
let selectedName = '';
let currentIdCounter = 1;

const MAX_RED_PALLETS = 10;
const MAX_YELLOW_PALLETS = 6;
const MAX_GREEN_PALLETS = 12;

// Armazena as MUs cadastradas temporariamente por ID do elemento do palete
const palletMUs = {}; 

// ------------------------------------------------------------------
// 1. INICIALIZAÇÃO E TRAVA DE TEXTO DE INTERFACE
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o documento principal não seja editável por padrão
    document.body.removeAttribute('contenteditable');

    // Desativa edição explícita em elementos de texto, títulos e legendas
    const protectedSelectors = 'h1, h2, h3, h4, h5, h6, span, p, label, .zone-header, .lane-title, .app-drawer h2, .main-navbar';
    document.querySelectorAll(protectedSelectors).forEach(el => {
        el.contentEditable = "false";
    });

    // Inicializa o contador da Zona Vermelha
    updateRedCounter();
});

// ------------------------------------------------------------------
// 2. SELEÇÃO E AÇÕES DE PALETES (SINCRONIZADO COM CSS)
// ------------------------------------------------------------------
function selectPalletElement(element, name) {
    if (!element) return;

    // Remove destaque visual de qualquer palete selecionado anteriormente
    document.querySelectorAll('.pallet.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Aplica a classe de seleção CSS no palete atual
    selectedElement = element;
    selectedName = name;
    selectedElement.classList.add('selected');
    
    // Recupera a lista de MUs do palete selecionado
    const mus = palletMUs[element.id] || [];
    const displayName = element.innerText !== '[ Vazio ]' ? element.innerText : name;
    
    updateStatus(`
        📦 <strong>Palete Selecionado:</strong> <span style="color:#38bdf8">${displayName}</span><br>
        📊 <strong>MUs Cadastradas:</strong> ${mus.length}/30<br>
        <small>${mus.length > 0 ? 'MUs: ' + mus.join(', ') : 'Nenhuma MU bipada ainda.'}</small>
    `);
}

function triggerAction(actionName) {
    if (!selectedElement) {
        alert('Por favor, selecione um palete na Zona Amarela primeiro!');
        return;
    }

    const elementId = selectedElement.id;

    // --- GATILHO 1: Concluir Checagem HH (Laranja -> Amarelo Check) ---
    if (actionName === 'Checagem HH') {
        if (!selectedElement.classList.contains('yellow-no-id')) {
            alert('Este palete já passou pela checagem ou não está pendente!');
            return;
        }

        selectedElement.className = 'pallet yellow-checked selected';
        selectedElement.innerText = 'Check';
        
        palletMUs[elementId] = [];

        updateStatus(`
            🟡 <strong>Checagem HH Concluída!</strong><br>
            📍 <strong>Status:</strong> Pronto para Bipagem/Cadastro de MUs.<br>
            <small>Utilize "Cadastrar MU" para bipar pacotes ou "Vincular ID" para atrelar a placa.</small>
        `);
        return;
    }

    // --- GATILHO 2: Cadastrar MUs (Bipagem) ---
    if (actionName === 'Cadastrar MU' || actionName === 'Cadastrar ID') {
        if (!selectedElement.classList.contains('yellow-checked')) {
            alert('Conclua a checagem no HH antes de cadastrar as MUs!');
            return;
        }

        if (!palletMUs[elementId]) {
            palletMUs[elementId] = [];
        }

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

            if (inputMU === null || inputMU.trim() === "") {
                bipando = false;
            } else {
                const muCode = inputMU.trim().toUpperCase();
                
                if (!muCode.startsWith("MU")) {
                    alert(`❌ Código Inválido: "${muCode}"\n\nO código da MU deve começar obrigatoriamente com "MU".`);
                } else if (muCode.length !== 16) {
                    alert(`❌ Tamanho Inválido: "${muCode}" (${muCode.length} caracteres)\n\nO código da MU deve conter EXATAMENTE 16 caracteres.\nExemplo válido: MU-TT-RC-20A-123`);
                } else if (currentMUs.includes(muCode)) {
                    alert(`⚠️ A MU "${muCode}" já foi bipada neste palete!`);
                } else {
                    currentMUs.push(muCode);
                    alert(`✅ MU "${muCode}" adicionada com sucesso! Total: ${currentMUs.length}/30`);
                }
            }
        }

        if (currentMUs.length >= 30) {
            alert("🛑 Limite máximo de 30 Movable Units (MUs) atingido para este palete!");
        }

        updateStatus(`
            📦 <strong>MUs Bipadas com Sucesso!</strong><br>
            📍 <strong>Total no Palete (${currentMUs.length}/30):</strong> ${currentMUs.length > 0 ? currentMUs.join(', ') : 'Nenhuma'}<br>
            <small>Clique em "Vincular ID" para atribuir a placa do palete e liberá-lo.</small>
        `);
        return;
    }

// --- GATILHO 3: Vincular ID (Abertura Direta da Placa) ---
    if (actionName === 'Vincular ID') {
        if (!selectedElement.classList.contains('yellow-checked')) {
            alert('Selecione um palete verificado no HH (estado Check) para vincular o ID!');
            return;
        }

        let currentMUs = palletMUs[elementId] || [];

        if (currentMUs.length === 0) {
            alert('❌ Bloqueado: Não é possível vincular o ID a um palete sem MUs!\n\nCadastre/bipe pelo menos uma MU antes de continuar.');
            return;
        }

        let finalID = "";
        let idValido = false;

        while (!idValido) {
            const suggestedID = `PL-${String(currentIdCounter).padStart(2, '0')}`;
            const inputID = prompt(
                `🏷️ [VINCULAR PLACA DE ID]\n` +
                `Total de MUs vinculadas: ${currentMUs.length}\n\n` +
                `Aproxime o leitor ou digite o ID do Palete: (Ex: PL-01)`, 
                suggestedID
            );

            if (inputID === null || inputID.trim() === "") {
                alert("Operação cancelada. O palete continuará sem ID vinculado.");
                return;
            }

            const inputFormatado = inputID.trim().toUpperCase();
            const regexPL = /^PL-?\d+$/;

            if (!regexPL.test(inputFormatado)) {
                alert(`❌ ID Inválido: "${inputFormatado}"\n\nO código do palete DEVE começar obrigatoriamente com "PL" seguido de números.\nExemplos válidos: PL-01, PL01, PL-12`);
            } else {
                finalID = inputFormatado;
                idValido = true;
            }
        }

        selectedElement.innerText = finalID;
        selectedElement.className = 'pallet blue selected';

        updateStatus(`
            🔵 <strong>Palete Cadastrado & Liberado para as Ruas!</strong><br>
            📍 <strong>Placa Validada:</strong> ${finalID}<br>
            📦 <strong>MUs Vinculadas (${currentMUs.length}/30):</strong> ${currentMUs.length > 0 ? currentMUs.join(', ') : 'Sem MUs'}<br>
            <small>Pronto para canalização nas ruas da Zona Cinza.</small>
        `);

        if (currentIdCounter < 99) currentIdCounter++;
        return;
    }

    // --- GATILHO 4: Despachar Pallet (Zona Verde -> Histórico e Planilha) ---
    if (actionName === 'Despachar PL') {
        const isZonaVerde = selectedElement.closest('.green-zone') !== null || selectedElement.classList.contains('green');

        if (!isZonaVerde) {
            alert('Apenas paletes posicionados na Zona Verde podem ser despachados!');
            return;
        }

        const idPallet = selectedElement.innerText.trim();
        const musPallet = palletMUs[elementId] || [];

        if (musPallet.length === 0) {
            alert('❌ Não é possível despachar um palete sem MUs registradas!');
            return;
        }

if (confirm(`🚚 Confirma o despacho do Palete ${idPallet}?\n\nSerão enviadas ${musPallet.length} linhas de MUs para a planilha.`)) {
            const dataAtual = new Date();
            const dataHoraFormatada = dataAtual.toLocaleString('pt-BR');
            
            // 1. USUÁRIO QUE DESPACHOU:
            // Ajuste para a variável ou localStorage onde você guarda o nome do operador logado
            const usuarioLogado = localStorage.getItem('usuarioLogado') || 'Usuário Padrão';

            const registrosParaEnviar = musPallet.map(mu => {
                
                // 2. QUANTAS AÇÕES FORAM FEITAS (Analisando o histórico):
                // Substitua 'historicoGlobal' pelo array onde você guarda as movimentações.
                // Isso filtra o histórico contando quantas vezes essa MU aparece lá.
                const acoesRealizadas = historicoGlobal.filter(registro => registro.mu === mu).length;

                // 3. TEMPO NO BUFFER:
                // Precisamos achar que horas essa MU entrou. 
                // Substitua 'musAtivas' pelo array que contém os dados atuais dessa MU no buffer.
                const dadosOriginaisMu = musAtivas.find(item => item.mu === mu);
                let tempoNoBufferFormatado = '0 min';

                if (dadosOriginaisMu && dadosOriginaisMu.horaEntrada) {
                    const horaQueEntrou = new Date(dadosOriginaisMu.horaEntrada);
                    const diferencaMs = dataAtual - horaQueEntrou; // Tempo total em milissegundos
                    
                    // Convertendo milissegundos para minutos
                    const minutosTotais = Math.floor(diferencaMs / (1000 * 60));
                    
                    // Formatando para ficar bonito (Ex: "1h 15m" ou apenas "45m")
                    if (minutosTotais >= 60) {
                        const horas = Math.floor(minutosTotais / 60);
                        const minutos = minutosTotais % 60;
                        tempoNoBufferFormatado = `${horas}h ${minutos}m`;
                    } else {
                        tempoNoBufferFormatado = `${minutosTotais}m`;
                    }
                }

                // 4. RETORNO DO OBJETO COMPLETO PARA A PLANILHA
                return {
                    dataDespacho: dataHoraFormatada,
                    palletID: idPallet,
                    mu: mu,
                    acoesFeitas: acoesRealizadas,
                    tempoNoBuffer: tempoNoBufferFormatado,
                    usuario: usuarioLogado
                };
            });

            let historico = JSON.parse(localStorage.getItem('buffer_historico')) || [];
            historico.push(...registrosParaEnviar);
            localStorage.setItem('buffer_historico', JSON.stringify(historico));

            const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxNTGqcULjGg-5f21s9vXQ7sSZrumJ61FKL--yncse7USxbNsl-vAWgjIfqOhEpPEqi3w/exechttps://script.google.com/macros/s/AKfycbxPsyrJdzUQJFKh_3xnA-PkKINZkZCCeCnJN9KCd9IXca4bWU2wtXS101DQbf9qLi3A_g/exec";

            const formData = new URLSearchParams();
            formData.append('payload', JSON.stringify(registrosParaEnviar));

            fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            })
            .then(() => console.log(`✅ ${registrosParaEnviar.length} MUs enviadas com sucesso para a planilha!`))
            .catch(error => console.error("❌ Erro ao enviar para a planilha:", error));

            delete palletMUs[elementId];
            selectedElement.remove();
            selectedElement = null;

            updateStatus(`
                🟢 <strong>Palete Despachado com Sucesso!</strong><br>
                📍 <strong>Placa:</strong> ${idPallet}<br>
                📊 <strong>Registrado na Planilha:</strong> ${registrosParaEnviar.length} linhas de MUs inseridas.<br>
            `);
        }
        return;
    }
}

// ------------------------------------------------------------------
// 3. EVENTOS DRAG & DROP INTEGRADOS COM CLASSES CSS
// ------------------------------------------------------------------
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

document.addEventListener('dragend', clearDragEffects);

document.addEventListener('dragleave', (e) => {
    if (e.target.classList && (e.target.classList.contains('pallet-row') || e.target.classList.contains('street-lane') || e.target.classList.contains('zone-container'))) {
        e.target.classList.remove('drag-over');
    }
});

// Salva o layout toda vez que você terminar de arrastar um palete
document.addEventListener('dragend', () => {
    salvarEstadoGeral();
});

// Salva o layout toda vez que você clicar em qualquer parte da tela 
// (isso garante que botões como "Cadastrar MU", "Vincular ID", "+" e "-" salvem os dados)
document.addEventListener('click', () => {
    salvarEstadoGeral();
});

// ------------------------------------------------------------------
// 4. REGRAS DA ZONA VERMELHA
// ------------------------------------------------------------------
function getNextAvailableRedNumber() {
    const stack = document.getElementById('red-stack');
    if (!stack) return 1;

    const usedNumbers = Array.from(stack.children).map(pallet => {
        const text = pallet.innerText;
        const match = text.match(/\d+/);
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
    if (availableNumber === null) {
        alert('Todos os slots de P01 a P10 na Zona Vermelha já estão preenchidos!');
        return;
    }

    const formattedNum = String(availableNumber).padStart(2, '0');
    
    // ID único para o sistema interno
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

    updateStatus(`
        🔴 <strong>Pallet Adicionado!</strong><br>
        📍 <strong>Item:</strong> ${palletLabel} criado na Zona Vermelha.<br>
        <small>Total na área: ${stack.children.length}/${MAX_RED_PALLETS}</small>
    `);
}

// 🔥 FUNÇÃO RESTAURADA: Remove o Pallet e corrige a contagem
function removeRedPallet() {
    const stack = document.getElementById('red-stack');
    if (!stack || stack.children.length === 0) {
        alert('A Zona Vermelha já está vazia!');
        return;
    }

    const lastPallet = stack.lastElementChild;
    const removedName = lastPallet.innerText;
    
    if (palletMUs[lastPallet.id]) {
        delete palletMUs[lastPallet.id];
    }

    if (selectedElement === lastPallet) {
        selectedElement = null;
    }

    stack.removeChild(lastPallet);
    updateRedCounter();

    updateStatus(`
        🗑️ <strong>Pallet Removido!</strong><br>
        📍 <strong>Item:</strong> ${removedName} retirado da Zona Vermelha.<br>
        <small>Total na área: ${stack.children.length}/${MAX_RED_PALLETS}</small>
    `);
}

// 🔥 FUNÇÃO RESTAURADA: Atualiza o número 0/10 na tela
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
        alert('Capacidade máxima da Zona Vermelha atingida (10 pallets)!');
        return;
    }

    const isFromGreen = sourceZone.id === 'green-stack' || sourceZone.closest('.green-zone') || draggedPallet.classList.contains('green');
    const isFromYellow = sourceZone.id === 'yellow-stack' || sourceZone.closest('.yellow-zone');
    const isFromStreet = sourceZone.classList.contains('street-lane') || sourceZone.closest('.gray-zone');

    if (isFromGreen || isFromYellow || isFromStreet) {
        const confirmReturn = confirm(
            `⚠️ [RETORNO À ZONA VERMELHA]\n` +
            `Deseja mover o palete "${draggedPallet.innerText}" para a Zona Vermelha?\n` +
            `ATENÇÃO: Todo o registro do palete (ID vinculado e MUs cadastradas) será EXCLUÍDO e resetado!`
        );

        if (!confirmReturn) {
            alert("Operação cancelada! O palete permanece no local de origem.");
            return;
        }

        delete palletMUs[draggedPallet.id];

        draggedPallet.className = 'pallet red';
        
        const availableNumber = getNextAvailableRedNumber();
        const formattedNum = String(availableNumber).padStart(2, '0');
        draggedPallet.innerText = `P${formattedNum}`;

        redContainer.appendChild(draggedPallet);
        updateRedCounter();

        updateStatus(`
            🔴 <strong>Palete Retornado à Zona Vermelha!</strong><br>
            📍 <strong>Registro Excluído:</strong> ID e MUs foram removidos. Palete restaurado ao estado original.<br>
            <small>Total na área: ${redContainer.children.length}/${MAX_RED_PALLETS}</small>
        `);
        return;
    }

    alert("❌ Movimentação não permitida para a Zona Vermelha!");
}
// ------------------------------------------------------------------
// 5. REGRAS DA ZONA AMARELA
// ------------------------------------------------------------------
function dropPalletYellow(event, yellowContainer) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData("text/plain");
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const sourceZone = draggedPallet.parentElement;

    if (yellowContainer.querySelectorAll('.pallet').length >= MAX_YELLOW_PALLETS) {
        alert("A Zona Amarela já atingiu a capacidade máxima de 06 paletes!");
        return;
    }

    if (sourceZone.id === 'red-stack') {
        yellowContainer.appendChild(draggedPallet);
        draggedPallet.className = 'pallet yellow-no-id';
        draggedPallet.innerText = 'No ID';
        draggedPallet.setAttribute('onclick', `selectPalletElement(this, '${draggedPallet.id}')`);

        updateRedCounter();
        updateStatus(`
            🟠 <strong>Pallet Entrou na Triagem (Zona Amarela)</strong><br>
            📍 <strong>Estado:</strong> Laranja (Aguardando Checagem HH).<br>
        `);
        return;
    }

    const isFromGreen = sourceZone.id === 'green-stack' || sourceZone.closest('.green-zone') || draggedPallet.classList.contains('green');
    const isFromStreet = sourceZone.classList.contains('street-lane') || sourceZone.closest('.gray-zone');

    if (isFromGreen || isFromStreet) {
        const confirmRetriagem = confirm(
            `❓ [REFAZER TRIAGEM]\n` +
            `Deseja mover o palete "${draggedPallet.innerText}" de volta para a Zona Amarela?\n` +
            `O ID será desvinculado e todas as MUs cadastradas serão apagadas!`
        );
        
        if (!confirmRetriagem) {
            alert("Operação cancelada! O palete permanece onde estava.");
            return;
        }

        palletMUs[draggedPallet.id] = [];

        yellowContainer.appendChild(draggedPallet);
        draggedPallet.className = 'pallet yellow-no-id';
        draggedPallet.innerText = 'No ID';
        draggedPallet.setAttribute('onclick', `selectPalletElement(this, '${draggedPallet.id}')`);

        updateRedCounter();
        updateStatus(`
            🟠 <strong>Pallet Retornou para Triagem!</strong><br>
            📍 <strong>Estado:</strong> Alterado para Laranja (No ID). ID e MUs foram desvinculados.<br>
        `);
        return;
    }

    alert("❌ Movimentação não permitida para a Zona Amarela!");
}

// ------------------------------------------------------------------
// MAPEAMENTO FIXO DE CÓDIGOS DAS RUAS
// ------------------------------------------------------------------
const LANE_CODES = {
    'RUA A': 'R-A',
    'RUA B': 'R-B',
    'RUA C': 'R-C',
    'RUA D': 'R-D',
    'RUA E': 'R-E'
};

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

// ------------------------------------------------------------------
// 6. REGRAS DAS RUAS (ZONA CINZA)
// ------------------------------------------------------------------
function dropPallet(event, laneElement) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData("text/plain");
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const sourceZone = draggedPallet.parentElement;

    if (sourceZone.id === 'red-stack') {
        alert("🔒 TRAVA DE SEGURANÇA: Paletes da Zona Vermelha DEVEM passar obrigatoriamente pela Zona Amarela antes de irem para as ruas!");
        return;
    }

    const isFromYellow = sourceZone.id === 'yellow-stack' || sourceZone.closest('.yellow-zone');
    const isFromGreen = sourceZone.id === 'green-stack' || sourceZone.closest('.green-zone') || draggedPallet.classList.contains('green');
    const isFromStreet = sourceZone.classList.contains('street-lane') || sourceZone.closest('.gray-zone');

    // Transferência Entre Ruas
    if (isFromStreet && sourceZone !== laneElement) {
        const expectedPL = draggedPallet.innerText.trim();
        const targetLaneCode = getTargetLaneCode(laneElement);

        const inputPL = prompt(
            `🔄 [TRANSFERÊNCIA ENTRE RUAS - PASSO 1/2]\n\n` +
            `Bipe ou digite a PLACA (PL) que será transferida:\n` +
            `(Placa esperada: ${expectedPL})`
        );

        if (inputPL === null || inputPL.trim().toUpperCase() !== expectedPL.toUpperCase()) {
            alert("❌ Validação de PL falhou! O palete permanece na rua de origem.");
            return;
        }

        const inputRua = prompt(
            `🔄 [TRANSFERÊNCIA ENTRE RUAS - PASSO 2/2]\n\n` +
            `PL ${expectedPL} confirmada!\n` +
            `Bipe o QR Code ou digite o CÓDIGO FIXO da rua de destino para alocar:\n` +
            `(Código esperado: ${targetLaneCode})`
        );

        if (inputRua === null || inputRua.trim().toUpperCase() !== targetLaneCode.toUpperCase()) {
            alert(`❌ Validação de Rua falhou!\n\nO código informado ("${inputRua ? inputRua.trim().toUpperCase() : ''}") não confere com o código fixo da rua de destino (${targetLaneCode}).`);
            return;
        }
    }

    // Entrada da Amarela/Verde para as Ruas
    if (isFromYellow || isFromGreen) {
        if (isFromYellow && !draggedPallet.classList.contains('blue')) {
            alert("🔒 TRAVA DE MOVIMENTAÇÃO: O palete na Zona Amarela precisa passar pela 'Checagem HH' e ter o 'ID Bipado' (ficando AZUL) para ser liberado para as ruas!");
            return;
        }

        const expectedID = draggedPallet.innerText.trim();
        const targetLaneCode = getTargetLaneCode(laneElement);

        const inputPL = prompt(
            `🔒 [ALOCAÇÃO NA RUA - PASSO 1/2]\n\n` +
            `Bipe o QR Code ou digite o ID do palete para vincular:\n` +
            `(ID esperado: ${expectedID})`,
            expectedID
        );

        if (inputPL === null || inputPL.trim().toUpperCase() !== expectedID.toUpperCase()) {
            alert("❌ Validação de ID incorreta! O palete permanece na zona de origem.");
            return;
        }

        const inputRua = prompt(
            `🔒 [ALOCAÇÃO NA RUA - PASSO 2/2]\n\n` +
            `Palete ${expectedID} confirmado!\n` +
            `Agora bipe o QR Code ou digite o CÓDIGO FIXO da rua para alocar:\n` +
            `(Código esperado: ${targetLaneCode})`
        );

        if (inputRua === null || inputRua.trim().toUpperCase() !== targetLaneCode.toUpperCase()) {
            alert(`❌ Validação de Rua falhou!\n\nO código informado ("${inputRua ? inputRua.trim().toUpperCase() : ''}") não confere com o código fixo da rua de destino (${targetLaneCode}).`);
            return;
        }

        const isSelected = draggedPallet.classList.contains('selected');
        draggedPallet.className = `pallet blue${isSelected ? ' selected' : ''}`;
    }

    if (laneElement.querySelectorAll('.pallet').length >= 6 && !laneElement.contains(draggedPallet)) {
        alert("Esta rua já atingiu o limite máximo de 6 paletes!");
        return;
    }

    laneElement.appendChild(draggedPallet);
    updateRedCounter();

    const currentLaneCode = getTargetLaneCode(laneElement);

    updateStatus(`
        🚚 <strong>Palete Alocado na Rua!</strong><br>
        📍 <strong>Item:</strong> ${draggedPallet.innerText}<br>
        📍 <strong>Rua Destino:</strong> ${currentLaneCode}<br>
        📍 <strong>Estado:</strong> Azul (Vinculado à Rua).<br>
    `);
}

// ------------------------------------------------------------------
// 7. REGRAS DA ZONA VERDE (EXPEDIÇÃO)
// ------------------------------------------------------------------
function dropPalletGreen(event, greenContainer) {
    event.preventDefault();
    clearDragEffects();

    const palletId = event.dataTransfer.getData("text/plain");
    const draggedPallet = document.getElementById(palletId);
    if (!draggedPallet) return;

    const sourceZone = draggedPallet.parentElement;

    if (greenContainer.querySelectorAll('.pallet').length >= MAX_GREEN_PALLETS) {
        alert("A Zona Verde já atingiu a capacidade máxima de 12 paletes!");
        return;
    }

    if (sourceZone.id === 'yellow-stack' || sourceZone.closest('.yellow-zone')) {
        if (!draggedPallet.classList.contains('blue')) {
            alert("🔒 TRAVA DE SEGURANÇA: Somente paletes liberados com ID (AZUL) podem ir para a Zona Verde!");
            return;
        }

        const confirmMUs = confirm(`❓ [LIBERAÇÃO DIRETA DE TRIAGEM]\nVocê está movendo o palete diretamente da Zona Amarela.\nTodas as MUs deste palete estão devidamente liberadas para Expedição?`);

        if (!confirmMUs) {
            alert("❌ Operação cancelada! O palete retornará para a Zona Amarela.");
            return;
        }

        const isSelected = draggedPallet.classList.contains('selected');
        draggedPallet.className = `pallet green${isSelected ? ' selected' : ''}`;
        greenContainer.appendChild(draggedPallet);
        updateRedCounter();

        updateStatus(`
            🟢 <strong>Pallet Liberado Direto da Triagem!</strong><br>
            📍 <strong>Item:</strong> ${draggedPallet.innerText}<br>
            📍 <strong>Estado:</strong> Alterado para Verde (Expedição).<br>
        `);
        return;
    }

    if (sourceZone.classList.contains('street-lane') || sourceZone.closest('.gray-zone')) {
        const isApproved = confirm(`❓ [LIBERAÇÃO DE EXPEDIÇÃO]\nConfirma que o palete "${draggedPallet.innerText}" está realmente liberado para a Zona Verde?`);

        if (!isApproved) {
            alert(`⚠️ Liberação não autorizada! O palete "${draggedPallet.innerText}" voltará para a rua em que estava.`);
            return;
        }

        const isSelected = draggedPallet.classList.contains('selected');
        draggedPallet.className = `pallet green${isSelected ? ' selected' : ''}`;
        greenContainer.appendChild(draggedPallet);
        updateRedCounter();

        updateStatus(`
            🟢 <strong>Pallet Liberado para Expedição!</strong><br>
            📍 <strong>Item:</strong> ${draggedPallet.innerText}<br>
            📍 <strong>Estado:</strong> Alterado para Verde (Expedição).<br>
        `);
        return;
    }

    alert("❌ Origem inválida para a Zona Verde!");
}

// ------------------------------------------------------------------
// 8. HELPER DE STATUS DE INTERFACE
// ------------------------------------------------------------------
function updateStatus(htmlContent) {
    const statusElement = document.getElementById('app-status');
    if (statusElement) {
        statusElement.innerHTML = htmlContent;
    }
}

// Adicione no final do script.js atual
function salvarEstadoPaletes() {
    localStorage.setItem('buffer_pallets', JSON.stringify(palletMUs));
}
// ==================================================================
// SALVAMENTO E CARREGAMENTO DE ESTADO (LOCALSTORAGE)
// ==================================================================

function salvarEstadoGeral() {
    // 1. Salva as MUs vinculadas e o contador de IDs
    localStorage.setItem('buffer_pallets', JSON.stringify(palletMUs));
    localStorage.setItem('buffer_idCounter', currentIdCounter);

    // 2. Salva a posição física e status (cor) de cada palete na tela
    const palletsData = [];
    document.querySelectorAll('.pallet').forEach(p => {
        palletsData.push({
            id: p.id,
            text: p.innerText,
            className: p.className,
            // Pega o ID da zona pai, ou o data-lane se for na rua
            parentId: p.parentElement.id || p.parentElement.getAttribute('data-lane') || ''
        });
    });
    localStorage.setItem('buffer_layout', JSON.stringify(palletsData));
}

function carregarEstadoGeral() {
    // 1. Restaura as MUs e o contador
    const savedMUs = localStorage.getItem('buffer_pallets');
    if (savedMUs) {
        Object.assign(palletMUs, JSON.parse(savedMUs));
    }

    const savedCounter = localStorage.getItem('buffer_idCounter');
    if (savedCounter) {
        currentIdCounter = parseInt(savedCounter);
    }

    // 2. Restaura os paletes na tela
    const savedLayout = localStorage.getItem('buffer_layout');
    if (savedLayout) {
        const palletsData = JSON.parse(savedLayout);
        
        // Limpa a tela antes de recriar para não duplicar
        document.querySelectorAll('.pallet').forEach(p => p.remove());

        palletsData.forEach(data => {
            const p = document.createElement('div');
            p.id = data.id;
            p.innerText = data.text;
            p.className = data.className;
            p.draggable = true;
            
            // Recria os eventos de clique e arraste
            p.setAttribute('ondragstart', 'drag(event)');
            
            // O nome que vai pro painel operacional precisa ser tratado
            const nomePainel = data.text.includes('PL') ? data.text : `Pallet ${data.text}`;
            p.setAttribute('onclick', `selectPalletElement(this, '${nomePainel}')`);

            // Procura onde o palete estava (Zona pai ou Rua)
            let parent = document.getElementById(data.parentId);
            if (!parent) {
                // Se não achou por ID, tenta achar pelo atributo data-lane (Ruas)
                parent = document.querySelector(`[data-lane="${data.parentId}"]`);
            }
            
            if (parent) {
                parent.appendChild(p);
            }
        });
    }
}
// ==================================================================
// VISUALIZAÇÃO RESUMIDA DO PALETE (DUPLO CLIQUE COM MODAL COPIÁVEL)
// ==================================================================

document.addEventListener('dblclick', (event) => {
    const palletElement = event.target.closest('.pallet');
    if (!palletElement) return;

    const palletId = palletElement.id;
    const palletName = palletElement.innerText.trim();
    
    const palletMUs = JSON.parse(localStorage.getItem('buffer_pallets')) || {};
    const mus = palletMUs[palletId] || [];

    const primeirasMUs = mus.slice(0, 3);
    const totalMUs = mus.length;

    let estadoAtual = "Pendente / Vermelho";
    if (palletElement.classList.contains('blue')) estadoAtual = "Liberado / Azul (Na Rua)";
    else if (palletElement.classList.contains('green')) estadoAtual = "Expedição / Verde";
    else if (palletElement.classList.contains('yellow-checked')) estadoAtual = "Check Realizado / Amarelo";
    else if (palletElement.classList.contains('yellow-no-id')) estadoAtual = "Triagem (Sem ID / Laranja)";

    let horaCriada = "Não registrada";
    if (palletId.startsWith('pallet-') && palletId.split('-')[1].length > 5) {
        const timestamp = parseInt(palletId.split('-')[1]);
        horaCriada = new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
        horaCriada = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    let resumoMUs = primeirasMUs.length > 0 
        ? primeirasMUs.map((mu, index) => `• ${mu}`).join('<br>') 
        : '<em>Nenhuma MU cadastrada ainda.</em>';

    if (totalMUs > 3) {
        resumoMUs += `<br><span style="color:#94a3b8;">... e mais ${totalMUs - 3} MU(s).</span>`;
    }

    // Preenche o conteúdo dentro da janelinha modal
    document.getElementById('modal-title').innerText = `📦 Resumo do Palete: ${palletName}`;
    document.getElementById('modal-content').innerHTML = `
        <strong>📊 Estado:</strong> ${estadoAtual}<br>
        <strong>⏰ Horário de Criação:</strong> ${horaCriada}<br>
        <strong>📦 Total de MUs:</strong> ${totalMUs}/30<br><br>
        <strong>--- PRIMEIRAS MUs ---</strong><br>
        ${resumoMUs}
    `;

    // Mostra o modal na tela
    document.getElementById('pallet-modal').style.display = 'flex';
});

function fecharModalPalete() {
    document.getElementById('pallet-modal').style.display = 'none';
}

// Retorna o Status padronizado e o Nome da Área onde o palete está localizado
function getPalletStatusAndLocation(palletElement) {
    if (!palletElement) return { status: 'Desconhecido', area: 'N/A' };

    const parent = palletElement.parentElement;

    // 🔴 1. Zona Vermelha
    if (parent && (parent.id === 'red-stack' || parent.closest('.red-zone'))) {
        return { 
            status: 'Pendentes', 
            area: 'Zona Vermelha (Entrada/Aguardando)' 
        };
    }

    // 🟡 2. Zona Amarela (Triagem)
    if (parent && (parent.id === 'yellow-stack' || parent.closest('.yellow-zone'))) {
        return { 
            status: 'Triagem', 
            area: 'Zona Amarela (Bancada de Triagem)' 
        };
    }

    // 🟢 3. Zona Verde (Expedição)
    if (parent && (parent.id === 'green-stack' || parent.closest('.green-zone'))) {
        return { 
            status: 'Liberado', 
            area: 'Zona Verde (Expedição)' 
        };
    }

    // 🔘 4. Canalização / Ruas (Zona Cinza)
    if (parent && (parent.classList.contains('street-lane') || parent.closest('.gray-zone') || parent.classList.contains('pallet-row'))) {
        const laneCode = typeof getTargetLaneCode === 'function' ? getTargetLaneCode(parent) : 'Ruas';
        return { 
            status: 'Processando', 
            area: `Canalização / Rua (${laneCode})` 
        };
    }

    return { status: 'Processando', area: 'Área Operacional' };
}