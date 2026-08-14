// ==================================================================
// 1. CONFIGURAÇÕES GERAIS E VARIÁVEIS GLOBAIS
// ==================================================================
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyJ9K7N1O_dYyO6z_Wk1N9r7T9gKqg4lT0w-pP5/exec";
const MAX_RED_PALLETS = 10;
const MAX_YELLOW_PALLETS = 6;
const MAX_GREEN_PALLETS = 12;

let currentIdCounter = 1;
let selectedElement = null;
let palletMUs = {}; 

const LANE_CODES = {
    'RUA A': 'R-A',
    'RUA B': 'R-B',
    'RUA C': 'R-C',
    'RUA D': 'R-D',
    'RUA E': 'R-E'
};

// ==================================================================
// 2. SISTEMA DE LOGIN E AUTENTICAÇÃO
// ==================================================================
function initApp() {
    // Verifica se já existe um usuário logado
    const usuarioAtivo = sessionStorage.getItem('usuarioAtivo');
    
    if (usuarioAtivo) {
        mostrarTelaApp();
        carregarEstadoGeral();
        updateStatus(`👋 Bem-vindo de volta, ${JSON.parse(usuarioAtivo).nome}!`);
    } else {
        mostrarTelaLogin();
    }
}

function login() {
    const userInput = document.getElementById('username')?.value.trim();
    // const passInput = document.getElementById('password')?.value; // Caso queira validar senha depois

    if (!userInput) {
        alert("Por favor, insira seu nome de usuário ou matrícula.");
        return;
    }

    // Salva o usuário na sessão
    const userData = { nome: userInput, timestamp: new Date().toISOString() };
    sessionStorage.setItem('usuarioAtivo', JSON.stringify(userData));

    mostrarTelaApp();
    carregarEstadoGeral();
    updateStatus(`🟢 <strong>Login Realizado!</strong><br>Operador: ${userInput}`);
}

function logout() {
    if(confirm("Deseja realmente sair?")) {
        sessionStorage.removeItem('usuarioAtivo');
        salvarEstadoGeral(); // Salva antes de sair para garantir
        mostrarTelaLogin();
        // Limpa a tela para o próximo usuário não ver os dados se não estiver logado
        document.querySelectorAll('.pallet').forEach(p => p.remove()); 
    }
}

// Funções auxiliares de UI para alternar as telas
function mostrarTelaApp() {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    if(loginScreen) loginScreen.style.display = 'none';
    if(appScreen) appScreen.style.display = 'block';
}

function mostrarTelaLogin() {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    if(loginScreen) loginScreen.style.display = 'flex'; // ou block
    if(appScreen) appScreen.style.display = 'none';
}

// ==================================================================
// 3. PERSISTÊNCIA DE DADOS (LOCALSTORAGE)
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
    if (savedMUs) Object.assign(palletMUs, JSON.parse(savedMUs));

    const savedCounter = localStorage.getItem('buffer_idCounter');
    if (savedCounter) currentIdCounter = parseInt(savedCounter);

    const savedLayout = localStorage.getItem('buffer_layout');
    if (savedLayout) {
        document.querySelectorAll('.pallet').forEach(p => p.remove());

        JSON.parse(savedLayout).forEach(data => {
            const p = document.createElement('div');
            p.id = data.id;
            p.innerText = data.text;
            p.className = data.className;
            p.draggable = true;
            p.setAttribute('ondragstart', 'drag(event)');
            
            const nomePainel = data.text.includes('PL') ? data.text : `Pallet ${data.text}`;
            p.setAttribute('onclick', `selectPalletElement(this, '${nomePainel}')`);

            let parent = document.getElementById(data.parentId) || document.querySelector(`[data-lane="${data.parentId}"]`);
            if (parent) parent.appendChild(p);
        });
    }
    updateRedCounter();
}

// ==================================================================
// 4. INTERAÇÕES CORE (DRAG & DROP E SELEÇÃO)
// ==================================================================
function selectPalletElement(element, name) {
    document.querySelectorAll('.pallet').forEach(p => p.classList.remove('selected'));
    element.classList.add('selected');
    selectedElement = element;
    
    const displayName = document.getElementById('selected-pallet-name');
    if (displayName) displayName.innerText = name || element.id;
}

function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
    document.querySelectorAll('.pallet').forEach(p => p.classList.remove('selected'));
    event.target.classList.add('selected');
    selectedElement = event.target;
    
    const displayName = document.getElementById('selected-pallet-name');
    if (displayName) displayName.innerText = event.target.innerText;
}

function clearDragEffects() {
    // Pode ser usado para remover classes de hover nas zonas durante o drag
}

// ==================================================================
// 5. REGRAS DO PAINEL OPERACIONAL (BOTÕES)
// ==================================================================
function acaoChecagemHH() {
    if (!selectedElement) return alert("Selecione um palete primeiro clicando nele.");
    
    if (selectedElement.classList.contains('yellow-no-id')) {
        selectedElement.className = 'pallet yellow-checked selected';
        updateStatus(`✅ <strong>Checagem HH Realizada!</strong><br>O palete ${selectedElement.innerText} foi verificado (Ficou Amarelo).`);
        salvarEstadoGeral();
    } else {
        alert("A Checagem HH só pode ser feita em paletes na fase 'No ID' (Laranja) na Zona Amarela.");
    }
}

function acaoCadastrarMU() {
    if (!selectedElement) return alert("Selecione um palete primeiro.");
    if (!selectedElement.classList.contains('yellow-checked')) return alert("Você precisa realizar a 'Checagem HH' (Palete Amarelo) antes de cadastrar MUs.");

    const inputMU = prompt(`📦 Cadastro de MU para o palete ${selectedElement.innerText}\n\nBipe ou digite o código da MU:`);
    if (!inputMU || inputMU.trim() === '') return;

    if (!palletMUs[selectedElement.id]) palletMUs[selectedElement.id] = [];
    if (palletMUs[selectedElement.id].length >= 30) return alert("❌ Limite atingido: Um palete não pode ter mais de 30 MUs.");
    if (palletMUs[selectedElement.id].includes(inputMU.trim())) return alert("⚠️ Esta MU já foi cadastrada neste palete!");

    palletMUs[selectedElement.id].push(inputMU.trim());
    updateStatus(`📦 <strong>MU Cadastrada!</strong><br>MU <code>${inputMU}</code> adicionada ao palete.<br><small>Total: ${palletMUs[selectedElement.id].length}/30</small>`);
    salvarEstadoGeral();
}

function acaoVincularID() {
    if (!selectedElement) return alert("Selecione um palete primeiro.");
    if (!selectedElement.classList.contains('yellow-checked')) return alert("O palete precisa estar verificado (Amarelo) para receber um ID.");
    if (!palletMUs[selectedElement.id] || palletMUs[selectedElement.id].length === 0) return alert("❌ Você precisa cadastrar pelo menos 1 MU antes de vincular um ID ao palete!");

    const formatId = String(currentIdCounter).padStart(5, '0');
    const novoID = `PL${formatId}`;

    if (confirm(`Vincular o ID: ${novoID} a este palete?\n(Ele contém ${palletMUs[selectedElement.id].length} MUs)`)) {
        selectedElement.innerText = novoID;
        selectedElement.className = 'pallet blue selected';
        document.getElementById('selected-pallet-name').innerText = novoID;
        currentIdCounter++;
        updateStatus(`🔗 <strong>ID Vinculado!</strong><br>O palete agora é o <strong>${novoID}</strong> (Liberado / Azul).`);
        salvarEstadoGeral();
    }
}

async function despacharPL() {
    if (!selectedElement) return alert("Selecione um palete na Zona Verde para despachar.");
    if (!selectedElement.classList.contains('green')) return alert("❌ Apenas paletes que estão na Zona Verde (Expedição) podem ser despachados!");

    const palletId = selectedElement.innerText;
    const mus = palletMUs[selectedElement.id] || [];

    if (!confirm(`🚀 DESPACHO DE PL\n\nDeseja confirmar o despacho da ${palletId}?\nTotal de MUs vinculadas: ${mus.length}`)) return;

    let operadorNome = "Desconhecido";
    const userJson = sessionStorage.getItem('usuarioAtivo');
    if (userJson) operadorNome = JSON.parse(userJson).nome;

    const locData = getPalletStatusAndLocation(selectedElement);

    const payload = {
        operador: operadorNome,
        acao: "Despacho PL",
        pallet_id: palletId,
        area: locData.area,
        status: "Despachado",
        mus_vinculadas: mus.join(", "),
        quantidade_mus: mus.length,
        timestamp: new Date().toISOString()
    };

    updateStatus(`⏳ <strong>Enviando ${palletId} para o servidor...</strong>`);

    try {
        await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "save_historico", data: payload })
        });

        selectedElement.remove();
        delete palletMUs[selectedElement.id];
        selectedElement = null;
        document.getElementById('selected-pallet-name').innerText = "Nenhum";

        updateStatus(`✅ <strong>Despacho Concluído!</strong><br>${palletId} foi salvo no histórico.`);
        salvarEstadoGeral();
    } catch (error) {
        alert("Erro ao comunicar com o servidor. Verifique sua conexão.");
        updateStatus(`❌ <strong>Erro no Despacho</strong>`);
    }
}

// ==================================================================
// 6. ZONAS DE MOVIMENTAÇÃO (REGRAS DE DRAG & DROP)
// ==================================================================

// ---- ZONA VERMELHA ----
function getNextAvailableRedNumber() {
    const stack = document.getElementById('red-stack');
    if (!stack) return 1;
    const usedNumbers = Array.from(stack.children).map(p => {
        const match = p.innerText.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    for (let i = 1; i <= MAX_RED_PALLETS; i++) {
        if (!usedNumbers.includes(i)) return i;
    }
    return null;
}

function updateRedCounter() {
    const stack = document.getElementById('red-stack');
    const countElement = document.getElementById('red-count');
    if (stack && countElement) countElement.innerText = stack.children.length;
}

function addRedPallet() {
    const stack = document.getElementById('red-stack');
    if (!stack) return;
    if (stack.children.length >= MAX_RED_PALLETS) return alert('Capacidade máxima da Zona Vermelha atingida (10 pallets)!');
    
    const availableNumber = getNextAvailableRedNumber();
    if (availableNumber === null) return alert('Todos os slots P01-P10 estão cheios!');

    const palletLabel = `P${String(availableNumber).padStart(2, '0')}`;
    const pallet = document.createElement('div');
    pallet.className = 'pallet red';
    pallet.id = `pallet-${Date.now()}-${Math.floor(Math.random() * 1000)}`; 
    pallet.draggable = true;
    pallet.innerText = palletLabel;
    pallet.setAttribute('ondragstart', 'drag(event)');
    pallet.setAttribute('onclick', `selectPalletElement(this, '${palletLabel}')`);

    stack.appendChild(pallet);
    updateRedCounter();
    updateStatus(`🔴 <strong>Pallet Adicionado:</strong> ${palletLabel}`);
    salvarEstadoGeral();
}

function removeRedPallet() {
    const stack = document.getElementById('red-stack');
    if (!stack || stack.children.length === 0) return alert('A Zona Vermelha está vazia!');
    
    const lastPallet = stack.lastElementChild;
    delete palletMUs[lastPallet.id];
    
    if (selectedElement === lastPallet) {
        selectedElement = null;
        document.getElementById('selected-pallet-name').innerText = "Nenhum";
    }
    stack.removeChild(lastPallet);
    updateRedCounter();
    updateStatus(`🗑️ <strong>Pallet Removido!</strong>`);
    salvarEstadoGeral();
}

function dropPalletRed(event, redContainer) {
    event.preventDefault();
    clearDragEffects();
    const draggedPallet = document.getElementById(event.dataTransfer.getData("text/plain"));
    if (!draggedPallet || draggedPallet.parentElement === redContainer) return;
    if (redContainer.children.length >= MAX_RED_PALLETS) return alert('Capacidade máxima da Zona Vermelha atingida!');

    if (!confirm(`⚠️ [RETORNO À ZONA VERMELHA]\nDeseja mover o palete para a Zona Vermelha?\nATENÇÃO: Todo o registro (ID e MUs) será EXCLUÍDO e resetado!`)) return;

    delete palletMUs[draggedPallet.id];
    draggedPallet.className = 'pallet red';
    draggedPallet.innerText = `P${String(getNextAvailableRedNumber()).padStart(2, '0')}`;
    
    redContainer.appendChild(draggedPallet);
    updateRedCounter();
    updateStatus(`🔴 <strong>Palete Retornado à Zona Vermelha!</strong> (Registro Apagado)`);
    salvarEstadoGeral();
}

// ---- ZONA AMARELA ----
function dropPalletYellow(event, yellowContainer) {
    event.preventDefault();
    clearDragEffects();
    const draggedPallet = document.getElementById(event.dataTransfer.getData("text/plain"));
    if (!draggedPallet || draggedPallet.parentElement === yellowContainer) return;
    if (yellowContainer.querySelectorAll('.pallet').length >= MAX_YELLOW_PALLETS) return alert("A Zona Amarela já atingiu a capacidade máxima (06 paletes)!");

    if (draggedPallet.parentElement.id === 'red-stack') {
        yellowContainer.appendChild(draggedPallet);
        draggedPallet.className = 'pallet yellow-no-id';
        draggedPallet.innerText = 'No ID';
        updateRedCounter();
        updateStatus(`🟠 <strong>Pallet Entrou na Triagem</strong>`);
        salvarEstadoGeral();
        return;
    }

    if (confirm(`❓ [REFAZER TRIAGEM]\nDeseja mover o palete de volta para a Zona Amarela?\nO ID será desvinculado e todas as MUs serão apagadas!`)) {
        palletMUs[draggedPallet.id] = [];
        yellowContainer.appendChild(draggedPallet);
        draggedPallet.className = 'pallet yellow-no-id';
        draggedPallet.innerText = 'No ID';
        updateRedCounter();
        updateStatus(`🟠 <strong>Pallet Retornou para Triagem!</strong>`);
        salvarEstadoGeral();
    }
}

// ---- ZONA CINZA (RUAS) ----
function getTargetLaneCode(laneElement) {
    const attrData = laneElement.getAttribute('data-lane') || '';
    if (LANE_CODES[attrData.toUpperCase()]) return LANE_CODES[attrData.toUpperCase()];
    const parentLane = laneElement.closest('.street-lane');
    if (parentLane) {
        const titleEl = parentLane.querySelector('.lane-title');
        if (titleEl && LANE_CODES[titleEl.innerText.trim().toUpperCase()]) return LANE_CODES[titleEl.innerText.trim().toUpperCase()];
    }
    return attrData || "R-A";
}

function dropPallet(event, laneElement) {
    event.preventDefault();
    clearDragEffects();
    const draggedPallet = document.getElementById(event.dataTransfer.getData("text/plain"));
    if (!draggedPallet || draggedPallet.parentElement === laneElement) return;

    if (draggedPallet.parentElement.id === 'red-stack') return alert("🔒 TRAVA: Paletes da Zona Vermelha devem passar pela Amarela antes de irem para as ruas!");
    if (draggedPallet.parentElement.id === 'yellow-stack' && !draggedPallet.classList.contains('blue')) return alert("🔒 TRAVA: O palete na Zona Amarela precisa ter o 'ID Bipado' (AZUL) para ir às ruas!");
    if (laneElement.querySelectorAll('.pallet').length >= 6) return alert("Esta rua já atingiu o limite máximo de 6 paletes!");

    const expectedID = draggedPallet.innerText.trim();
    const targetLaneCode = getTargetLaneCode(laneElement);

    const inputPL = prompt(`🔒 [ALOCAÇÃO NA RUA - PASSO 1/2]\nBipe ou digite o ID do palete:\n(Esperado: ${expectedID})`, expectedID);
    if (inputPL === null || inputPL.trim().toUpperCase() !== expectedID.toUpperCase()) return alert("❌ Validação de ID incorreta!");

    const inputRua = prompt(`🔒 [ALOCAÇÃO NA RUA - PASSO 2/2]\nPalete ${expectedID} confirmado!\nBipe o código da rua:\n(Esperado: ${targetLaneCode})`);
    if (inputRua === null || inputRua.trim().toUpperCase() !== targetLaneCode.toUpperCase()) return alert("❌ Validação de Rua falhou!");

    laneElement.appendChild(draggedPallet);
    draggedPallet.className = `pallet blue ${draggedPallet.classList.contains('selected') ? 'selected' : ''}`;
    updateRedCounter();
    updateStatus(`🚚 <strong>Palete Alocado na Rua!</strong><br>Destino: ${targetLaneCode}`);
    salvarEstadoGeral();
}

// ---- ZONA VERDE ----
function dropPalletGreen(event, greenContainer) {
    event.preventDefault();
    clearDragEffects();
    const draggedPallet = document.getElementById(event.dataTransfer.getData("text/plain"));
    if (!draggedPallet || draggedPallet.parentElement === greenContainer) return;
    if (greenContainer.querySelectorAll('.pallet').length >= MAX_GREEN_PALLETS) return alert("A Zona Verde já atingiu a capacidade máxima!");

    if (!draggedPallet.classList.contains('blue')) return alert("🔒 TRAVA: Somente paletes liberados com ID (AZUL) podem ir para a Zona Verde!");

    if (confirm(`❓ [LIBERAÇÃO DE EXPEDIÇÃO]\nConfirma que o palete "${draggedPallet.innerText}" está liberado para a Zona Verde?`)) {
        greenContainer.appendChild(draggedPallet);
        draggedPallet.className = `pallet green ${draggedPallet.classList.contains('selected') ? 'selected' : ''}`;
        updateRedCounter();
        updateStatus(`🟢 <strong>Pallet Liberado para Expedição!</strong>`);
        salvarEstadoGeral();
    }
}

// ==================================================================
// 7. UX / UI E FUNÇÕES AUXILIARES
// ==================================================================
function updateStatus(htmlContent) {
    const statusElement = document.getElementById('app-status');
    if (statusElement) statusElement.innerHTML = htmlContent;
}

function getPalletStatusAndLocation(palletElement) {
    if (!palletElement) return { status: 'Desconhecido', area: 'N/A' };
    const parent = palletElement.parentElement;
    if (parent && parent.id === 'red-stack') return { status: 'Pendentes', area: 'Zona Vermelha' };
    if (parent && parent.id === 'yellow-stack') return { status: 'Triagem', area: 'Zona Amarela' };
    if (parent && parent.id === 'green-stack') return { status: 'Liberado', area: 'Zona Verde' };
    if (parent && parent.classList.contains('street-lane')) return { status: 'Processando', area: `Rua (${getTargetLaneCode(parent)})` };
    return { status: 'Processando', area: 'Área Operacional' };
}

// Modal (Duplo Clique)
document.addEventListener('dblclick', (event) => {
    const p = event.target.closest('.pallet');
    if (!p) return;

    const mus = palletMUs[p.id] || [];
    let estadoAtual = "Pendente";
    if (p.classList.contains('blue')) estadoAtual = "Liberado (Azul)";
    else if (p.classList.contains('green')) estadoAtual = "Expedição (Verde)";
    else if (p.classList.contains('yellow-checked')) estadoAtual = "Check Realizado (Amarelo)";
    else if (p.classList.contains('yellow-no-id')) estadoAtual = "Sem ID (Laranja)";

    let html = `<strong>📊 Estado:</strong> ${estadoAtual}<br><strong>📦 Total de MUs:</strong> ${mus.length}/30<br><br><strong>--- PRIMEIRAS MUs ---</strong><br>`;
    
    if (mus.length > 0) {
        html += mus.slice(0, 3).map(mu => `• ${mu}`).join('<br>');
        if (mus.length > 3) html += `<br><span style="color:gray;">... e mais ${mus.length - 3}</span>`;
    } else {
        html += '<em>Nenhuma MU cadastrada.</em>';
    }

    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modal = document.getElementById('pallet-modal');
    
    if (modalTitle && modalContent && modal) {
        modalTitle.innerText = `📦 Detalhes: ${p.innerText}`;
        modalContent.innerHTML = html;
        modal.style.display = 'flex';
    }
});

function fecharModalPalete() {
    const modal = document.getElementById('pallet-modal');
    if (modal) modal.style.display = 'none';
}

// Inicializa o app ao carregar o script
window.addEventListener('DOMContentLoaded', initApp);