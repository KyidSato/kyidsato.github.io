// ==================================================================
// CONFIGURAÇÃO, VARIÁVEIS GLOBAIS E UTILITÁRIOS
// ==================================================================

let muSelecionadaGlobal = null;
let paleteAtualGlobal = null;

// Retorna o operador ativo no sistema (padrão 'OPERADOR_WMS' ou salvo na sessão)
function obterUsuarioAtual() {
    return localStorage.getItem('usuario_ativo_wms') || 'OPERADOR_WMS';
}

const LISTA_ERROS_PADRAO = [
    'Audit',
    'Cubing',
    'Montagem de Hu',
    'Sor',
    'P2M',
    'Checkin',
    'Usuário Travado',
    'Transfer Volume',
    'Viagem em Curso',
    'Despacho em HU',
    'Vincular em HU',
    'Invoincing',
    'Decating',
    'Saldo em outro CAD'
];

// Funções para persistência no LocalStorage
function getDetalhesMUs() {
    return JSON.parse(localStorage.getItem('buffer_mu_detalhes')) || {};
}

function salvarDetalhesMUs(dados) {
    localStorage.setItem('buffer_mu_detalhes', JSON.stringify(dados));
}

function getHistoricoMUs() {
    return JSON.parse(localStorage.getItem('buffer_mu_historico')) || {};
}

function salvarHistoricoMUs(dados) {
    localStorage.setItem('buffer_mu_historico', JSON.stringify(dados));
}

function getHistoricoDespachoGeral() {
    return JSON.parse(localStorage.getItem('buffer_historico_despacho')) || [];
}

function salvarHistoricoDespachoGeral(dados) {
    localStorage.setItem('buffer_historico_despacho', JSON.stringify(dados));
}

// ==================================================================
// GERENCIADOR DE HISTÓRICO E LINHA DO TEMPO (USANDO CLASSES CSS)
// ==================================================================

/**
 * Grava uma ação com Timestamp fixo e Usuário na MU
 */
function registrarHistoricoMU(muCode, eventoTexto, usuario) {
    if (!muCode) return;

    const todosHistoricos = getHistoricoMUs();
    if (!todosHistoricos[muCode]) {
        todosHistoricos[muCode] = [];
    }

    const agora = new Date();
    const dataHoraFixa = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');
    const operador = usuario || obterUsuarioAtual();

    // Adiciona o novo log no array histórico da MU
    todosHistoricos[muCode].push({
        timestamp: dataHoraFixa,
        evento: eventoTexto,
        usuario: operador
    });

    salvarHistoricoMUs(todosHistoricos);
    renderizarHistoricoMU(muCode);
}

/**
 * Renderiza o histórico gravado delegando estilo, cores e scroll ao CSS
 */
function renderizarHistoricoMU(muCode) {
    const timeline = document.getElementById('detail-mu-timeline');
    if (!timeline) return;

    const todosHistoricos = getHistoricoMUs();
    const logsMU = todosHistoricos[muCode] || [];

    if (logsMU.length === 0) {
        timeline.innerHTML = `
            <div class="timeline-empty" style="padding: 12px; background: rgba(0,0,0,0.05); border-radius: 6px; color: var(--text-muted, #64748b); font-size: 0.85rem; text-align: center;">
                Nenhum histórico registrado para esta MU ainda.
            </div>
        `;
        return;
    }

    // RENDERIZA OS REGISTROS COM ESTRUTURA LIMPA PARA O CSS ESTILIZAR
    timeline.innerHTML = logsMU.slice().reverse().map(log => `
        <div class="timeline-item">
            <div class="timeline-date">📅 ${log.timestamp}</div>
            <div class="timeline-content">${log.evento}</div>
            <div class="timeline-user">👤 ${log.usuario}</div>
        </div>
    `).join('');
}

/**
 * Finaliza e envia a MU para a Planilha/Arquivo de Histórico Geral ao Despachar na Zona Verde
 */
function arquivarEDespacharMU(muCode, localizacaoAtual) {
    const historicos = getHistoricoMUs();
    const detalhes = getDetalhesMUs();
    const planilhaDespacho = getHistoricoDespachoGeral();

    const logsDaMU = historicos[muCode] || [];
    const detalheMU = detalhes[muCode] || {};
    const operadorFinal = obterUsuarioAtual();

    const registroDespachado = {
        mu: muCode,
        dataDespacho: new Date().toLocaleString('pt-BR'),
        ultimoUsuario: operadorFinal,
        localDespacho: localizacaoAtual,
        statusFinal: detalheMU.status || 'Liberado',
        errosFinais: detalheMU.erros || [],
        historicoCompleto: logsDaMU
    };

    // Salva na planilha geral de despachos
    planilhaDespacho.push(registroDespachado);
    salvarHistoricoDespachoGeral(planilhaDespacho);

    // Limpa o histórico e detalhes ativos do sistema
    delete historicos[muCode];
    delete detalhes[muCode];

    salvarHistoricoMUs(historicos);
    salvarDetalhesMUs(detalhes);
}

// ==================================================================
// CONSULTA E SELEÇÃO DE MUs
// ==================================================================

function obterStatusMU(localizacao) {
    if (!localizacao) return { texto: 'Desconhecido', cssClass: 'tag-default' };

    const locUpper = localizacao.toString().toUpperCase();

    if (locUpper.includes('YELLOW') || locUpper.includes('TRIAGEM')) {
        return { texto: 'Em Triagem', cssClass: 'tag-triagem' };
    }
    if (locUpper.includes('GREEN') || locUpper.includes('EXPEDIÇÃO') || locUpper.includes('EXPEDICAO') || locUpper.includes('DESPACHO')) {
        return { texto: 'Em Despacho', cssClass: 'tag-despacho' };
    }
    if (locUpper.includes('RUA') || locUpper.includes('R-') || locUpper.includes('CANALIZAÇÃO') || locUpper.includes('CANALIZACAO') || locUpper.includes('GRAY') || locUpper.includes('PROCESSANDO')) {
        return { texto: 'Em Andamento', cssClass: 'tag-andamento' };
    }

    return { texto: 'Em Andamento', cssClass: 'tag-andamento' };
}

document.addEventListener('DOMContentLoaded', () => {
    const btnSearch = document.querySelector('.btn-search');
    if (btnSearch) btnSearch.addEventListener('click', realizarConsulta);

    const inputSearch = document.getElementById('search-input');
    if (inputSearch) {
        inputSearch.addEventListener('keypress', function (e) {
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

function realizarConsulta() {
    const input = document.getElementById('search-input').value.trim().toUpperCase();
    
    if (!input) {
        alert("Por favor, digite um ID de Palete (Ex: PL-01) ou o código de uma MU.");
        return;
    }

    const palletMUs = JSON.parse(localStorage.getItem('buffer_pallets')) || {};
    const bufferLayout = JSON.parse(localStorage.getItem('buffer_layout')) || {};

    let idPalvoEncontrado = null; 
    let nomeExibicao = "";        
    let listaMUs = [];
    let localizacaoPalete = "Desconhecido";

    const nomesZonas = {
        'green-stack': 'Expedição',
        'yellow-stack': 'Triagem',
        'red-stack': 'Pendentes',
        'R-A': 'Rua A',
        'R-B': 'Rua B',
        'R-C': 'Rua C',
        'R-D': 'Rua D',
        'R-E': 'Rua E'
    };

    if (input.startsWith('PL') || input.startsWith('P')) {
        const encontradoNoLayout = bufferLayout.find(p => p.text.toUpperCase() === input);
        
        if (encontradoNoLayout) {
            idPalvoEncontrado = encontradoNoLayout.id;
            nomeExibicao = encontradoNoLayout.text;
            listaMUs = palletMUs[idPalvoEncontrado] || [];
            localizacaoPalete = nomesZonas[encontradoNoLayout.parentId] || `Local: ${encontradoNoLayout.parentId}`;
        }
    } 
    else if (input.startsWith('MU')) {
        for (const [idInterno, mus] of Object.entries(palletMUs)) {
            if (mus.includes(input)) {
                idPalvoEncontrado = idInterno;
                listaMUs = mus;
                
                const layoutItem = bufferLayout.find(p => p.id === idInterno);
                if (layoutItem) {
                    nomeExibicao = layoutItem.text;
                    localizacaoPalete = nomesZonas[layoutItem.parentId] || `Local: ${layoutItem.parentId}`;
                } else {
                    nomeExibicao = idInterno;
                }
                break;
            }
        }
    } else {
        alert("Formato inválido. Pesquise iniciando com 'PL-', 'P' (ex: P01) ou 'MU-'.");
        return;
    }

    if (!idPalvoEncontrado && listaMUs.length === 0) {
        alert(`Nenhum registro encontrado para: ${input}`);
        return;
    }

    renderizarTabelaPalete(idPalvoEncontrado, nomeExibicao, localizacaoPalete, listaMUs, input);
}

function renderizarTabelaPalete(idInterno, idPalete, localizacao, listaMUs, termoPesquisado) {
    const headerTitle = document.querySelector('.card-header-flex h2');
    const badgeCapacity = document.querySelector('.badge-capacity');
    
    if (headerTitle) {
        headerTitle.innerHTML = `📦 Conteúdo do Palete: <span class="highlight-id">${idPalete}</span> <small style="display:block; font-size:0.8rem; color:var(--text-muted); margin-top:2px;">📍 ${localizacao}</small>`;
    }
    if (badgeCapacity) {
        badgeCapacity.innerText = `MUs Cadastradas: ${listaMUs.length}/30`;
    }

    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (listaMUs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Este palete não possui MUs cadastradas.</td></tr>`;
        
        const elCode = document.getElementById('detail-mu-code');
        const elLoc = document.getElementById('detail-mu-location');
        const elDesc = document.getElementById('detail-mu-desc');
        
        if (elCode) elCode.innerText = "Nenhuma MU";
        if (elLoc) elLoc.innerText = "Localização: ---";
        if (elDesc) elDesc.innerText = "Palete vazio.";
        
        document.querySelectorAll('.action-buttons .btn-action').forEach(btn => btn.setAttribute('disabled', 'true'));
        return;
    }

    const statusMUInfo = obterStatusMU(localizacao);

    listaMUs.forEach(mu => {
        const isSelected = mu === termoPesquisado ? 'selected-row' : '';
        const tr = document.createElement('tr');
        if (isSelected) tr.classList.add('selected-row');

        tr.innerHTML = `
            <td><strong>${mu}</strong></td>
            <td><span class="tag ${statusMUInfo.cssClass}">${statusMUInfo.texto}</span></td>
            <td>${new Date().toLocaleDateString('pt-BR')}</td>
            <td>${obterUsuarioAtual()}</td>
            <td><button class="btn-table" onclick="selecionarMU('${mu}', '${idInterno}', '${idPalete}', '${localizacao}')">Selecionar</button></td>
        `;
        tbody.appendChild(tr);
    });

    const muParaSelecionar = listaMUs.includes(termoPesquisado) ? termoPesquisado : listaMUs[0];
    selecionarMU(muParaSelecionar, idInterno, idPalete, localizacao);
}

function selecionarMU(muCode, idInterno, idPalete, localizacao) {
    muSelecionadaGlobal = muCode;
    
    paleteAtualGlobal = { 
        idInterno: idInterno, 
        idPalete: idPalete, 
        localizacao: localizacao 
    };

    const elCode = document.getElementById('detail-mu-code');
    const elLoc = document.getElementById('detail-mu-location');
    const elDesc = document.getElementById('detail-mu-desc');

    if (elCode) elCode.innerText = muCode;
    if (elLoc) elLoc.innerText = `Localização: ${localizacao} (Palete: ${idPalete})`;
    if (elDesc) elDesc.innerText = `MU vinculada ativamente no palete ${idPalete}, posicionado em ${localizacao}.`;

    // Se a MU ainda não possuir nenhum registro de histórico, adiciona o registro de entrada
    const historicos = getHistoricoMUs();
    if (!historicos[muCode] || historicos[muCode].length === 0) {
        registrarHistoricoMU(muCode, `MU localizada/vinculada no palete ${idPalete} em ${localizacao}`);
    } else {
        renderizarHistoricoMU(muCode);
    }

    document.querySelectorAll('.action-buttons .btn-action').forEach(btn => btn.removeAttribute('disabled'));
    renderizarStatusEErrosMU(muCode);
}

// ==================================================================
// AÇÕES OPERACIONAIS (COM LOGS E DESPACHO NA ZONA VERDE)
// ==================================================================

function removerMUAtual() {
    if (!muSelecionadaGlobal || !paleteAtualGlobal || !paleteAtualGlobal.idInterno) {
        alert("⚠️ Nenhuma MU ou palete válido selecionado para remoção!");
        return;
    }

    const locUpper = (paleteAtualGlobal.localizacao || '').toUpperCase();
    const ehZonaVerdeExpedicao = locUpper.includes('GREEN') || locUpper.includes('EXPEDIÇÃO') || locUpper.includes('EXPEDICAO') || locUpper.includes('DESPACHO');

    const mensagemConfirmacao = ehZonaVerdeExpedicao
        ? `🚚 [DESPACHO FINAL]\n\nA MU "${muSelecionadaGlobal}" está na Zona Verde (${paleteAtualGlobal.localizacao}).\n\nConfirma o DESPACHO definitivo? O histórico ativo será arquivado na Planilha Geral.`
        : `🗑️ Deseja remover a MU "${muSelecionadaGlobal}" do palete ${paleteAtualGlobal.idPalete}?`;

    if (confirm(mensagemConfirmacao)) {
        let palletMUs = JSON.parse(localStorage.getItem('buffer_pallets')) || {};
        let musDoPalete = palletMUs[paleteAtualGlobal.idInterno] || [];
        
        palletMUs[paleteAtualGlobal.idInterno] = musDoPalete.filter(m => m !== muSelecionadaGlobal);
        localStorage.setItem('buffer_pallets', JSON.stringify(palletMUs));

        if (ehZonaVerdeExpedicao) {
            registrarHistoricoMU(muSelecionadaGlobal, `Despachado e concluído na Expedição (${paleteAtualGlobal.localizacao})`);
            arquivarEDespacharMU(muSelecionadaGlobal, paleteAtualGlobal.localizacao);
            alert(`🚀 MU "${muSelecionadaGlobal}" DESPACHADA com sucesso! Histórico enviado para a planilha.`);
        } else {
            registrarHistoricoMU(muSelecionadaGlobal, `Removida do palete ${paleteAtualGlobal.idPalete} (${paleteAtualGlobal.localizacao})`);
            alert(`✅ MU "${muSelecionadaGlobal}" removida do palete!`);
        }

        const paleteFoiExcluido = verificarPaleteVazio(paleteAtualGlobal.idInterno, paleteAtualGlobal.idPalete, paleteAtualGlobal.localizacao);

        if (!paleteFoiExcluido) {
            document.getElementById('search-input').value = paleteAtualGlobal.idPalete;
            realizarConsulta();
        }
    }
}

function moverMUAtual() {
    if (!muSelecionadaGlobal || !paleteAtualGlobal || !paleteAtualGlobal.idInterno) {
        alert("⚠️ Nenhuma MU ou palete válido selecionado para movimentação!");
        return;
    }

    const destinoInput = prompt(
        `🔄 [MOVER MU PARA OUTRO PALETE]\n\n` +
        `MU Selecionada: ${muSelecionadaGlobal}\n` +
        `Palete Atual: ${paleteAtualGlobal.idPalete}\n\n` +
        `Digite o ID do palete de destino (Ex: PL-02):`
    );

    if (!destinoInput || destinoInput.trim() === "") return;

    const destinoFormatado = destinoInput.trim().toUpperCase();

    if (destinoFormatado === paleteAtualGlobal.idPalete.toUpperCase()) {
        alert("❌ A MU já está neste palete!");
        return;
    }

    const palletMUs = JSON.parse(localStorage.getItem('buffer_pallets')) || {};
    const bufferLayout = JSON.parse(localStorage.getItem('buffer_layout')) || {};

    const destinoLayout = bufferLayout.find(p => p.text.toUpperCase() === destinoFormatado);

    if (!destinoLayout) {
        alert(`❌ Palete de destino "${destinoFormatado}" não foi encontrado no mapa!`);
        return;
    }

    const idInternoDestino = destinoLayout.id;
    const musDestino = palletMUs[idInternoDestino] || [];

    if (musDestino.length >= 30) {
        alert(`❌ O palete de destino "${destinoFormatado}" já atingiu o limite de 30 MUs!`);
        return;
    }

    if (confirm(`Deseja mover a MU "${muSelecionadaGlobal}" do palete ${paleteAtualGlobal.idPalete} para ${destinoFormatado}?`)) {
        palletMUs[paleteAtualGlobal.idInterno] = palletMUs[paleteAtualGlobal.idInterno].filter(m => m !== muSelecionadaGlobal);

        if (!palletMUs[idInternoDestino]) palletMUs[idInternoDestino] = [];
        palletMUs[idInternoDestino].push(muSelecionadaGlobal);

        localStorage.setItem('buffer_pallets', JSON.stringify(palletMUs));

        registrarHistoricoMU(
            muSelecionadaGlobal, 
            `Movida do palete ${paleteAtualGlobal.idPalete} (${paleteAtualGlobal.localizacao}) para o palete ${destinoFormatado}`
        );

        alert(`✅ MU movida com sucesso para o palete ${destinoFormatado}!`);

        const paleteFoiExcluido = verificarPaleteVazio(paleteAtualGlobal.idInterno, paleteAtualGlobal.idPalete, paleteAtualGlobal.localizacao);

        if (!paleteFoiExcluido) {
            document.getElementById('search-input').value = destinoFormatado;
            realizarConsulta();
        }
    }
}

function verificarPaleteVazio(idInterno, idPalete, localizacao) {
    let palletMUs = JSON.parse(localStorage.getItem('buffer_pallets')) || {};
    const musRestantes = palletMUs[idInterno] || [];

    if (musRestantes.length === 0) {
        setTimeout(() => {
            const retiradaFisica = confirm(
                `⚠️ [ALERTA: PALETE VAZIO]\n\n` +
                `O palete ${idPalete} ficou sem nenhuma MU cadastrada!\n\n` +
                `O palete foi retirado/despachado fisicamente da operação?`
            );

            let bufferLayout = JSON.parse(localStorage.getItem('buffer_layout')) || {};

            if (retiradaFisica) {
                delete palletMUs[idInterno];
                localStorage.setItem('buffer_pallets', JSON.stringify(palletMUs));

                bufferLayout = bufferLayout.filter(p => p.id !== idInterno);
                localStorage.setItem('buffer_layout', JSON.stringify(bufferLayout));

                alert(`🗑️ O palete ${idPalete} foi excluído do sistema e do mapa!`);

                document.getElementById('search-input').value = "";
                location.reload(); 
            } else {
                alert(`🛑 [AÇÃO NECESSÁRIA]\n\nRetire o palete ${idPalete} do pátio assim que possível.`);
                location.reload();
            }
        }, 100);

        return true;
    }
    return false;
}

// ==================================================================
// TRATATIVAS DE STATUS E ERROS DA MU
// ==================================================================

function renderizarStatusEErrosMU(muCode) {
    if (!muCode) return;

    const detalhes = getDetalhesMUs();
    const infoMU = detalhes[muCode] || { status: 'Liberado', erros: [] };

    const containerStatus = document.getElementById('detail-mu-status-container');
    if (!containerStatus) return;

    let statusClass = 'tag-liberado';
    let statusEmoji = '✅';

    if (infoMU.status === 'Erro') {
        statusClass = 'tag-erro';
        statusEmoji = '❌';
    } else if (infoMU.status === 'Em Ticket') {
        statusClass = 'tag-ticket';
        statusEmoji = '🎫';
    }

    let htmlContent = `<span class="tag ${statusClass}" id="detail-mu-status">${statusEmoji} ${infoMU.status || 'Liberado'}</span>`;

    if (infoMU.status === 'Erro' && infoMU.erros && infoMU.erros.length > 0) {
        const tagsErros = infoMU.erros.map(e => `<span class="tag tag-erro-item">⚠️ ${e}</span>`).join(' ');
        htmlContent += ` <span class="erros-wrapper">${tagsErros}</span>`;
    }

    containerStatus.innerHTML = htmlContent;
}

function alterarStatusMUAtual() {
    if (!muSelecionadaGlobal || muSelecionadaGlobal === 'Nenhuma MU') {
        alert("⚠️ Selecione uma MU válida para alterar o status.");
        return;
    }

    const detalhes = getDetalhesMUs();
    const statusAtual = detalhes[muSelecionadaGlobal]?.status || 'Liberado';

    const opcao = prompt(
        `Defina o novo Status para a MU: ${muSelecionadaGlobal}\n\n` +
        `1 - Liberado\n` +
        `2 - Em Ticket\n` +
        `3 - Erro\n\n` +
        `Status Atual: ${statusAtual}`,
        "1"
    );

    let novoStatus = statusAtual;
    if (opcao === '1') novoStatus = 'Liberado';
    else if (opcao === '2') novoStatus = 'Em Ticket';
    else if (opcao === '3') novoStatus = 'Erro';
    else return;

    if (!detalhes[muSelecionadaGlobal]) {
        detalhes[muSelecionadaGlobal] = { status: novoStatus, erros: [] };
    } else {
        detalhes[muSelecionadaGlobal].status = novoStatus;
    }

    salvarDetalhesMUs(detalhes);

    registrarHistoricoMU(muSelecionadaGlobal, `Status alterado de "${statusAtual}" para "${novoStatus}"`);

    renderizarStatusEErrosMU(muSelecionadaGlobal);

    if (novoStatus === 'Erro' && (!detalhes[muSelecionadaGlobal].erros || detalhes[muSelecionadaGlobal].erros.length === 0)) {
        abrirModalSelecaoErros();
    }
}

// MODAL DE ERROS
function abrirModalSelecaoErros() {
    if (!muSelecionadaGlobal || muSelecionadaGlobal === 'Nenhuma MU') {
        alert("⚠️ Selecione uma MU válida para gerenciar os erros.");
        return;
    }

    const detalhes = getDetalhesMUs();
    const errosAtuais = detalhes[muSelecionadaGlobal]?.erros || [];

    const modalAntigo = document.getElementById('modal-erros-mu');
    if (modalAntigo) modalAntigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-erros-mu';
    modal.className = 'custom-modal-overlay';

    const listaCheckboxes = LISTA_ERROS_PADRAO.map((erro, index) => {
        const checado = errosAtuais.includes(erro) ? 'checked' : '';
        return `
            <label class="modal-checkbox-item">
                <input type="checkbox" value="${erro}" ${checado} id="err-check-${index}">
                <span>${erro}</span>
            </label>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="custom-modal-card">
            <h3>⚠️ Selecionar Erros - ${muSelecionadaGlobal}</h3>
            <p>Marque os erros identificados na MU:</p>
            <div class="modal-checklist-container">
                ${listaCheckboxes}
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-modal btn-cancel" id="btn-modal-cancelar">Cancelar</button>
                <button type="button" class="btn-modal btn-confirm" id="btn-modal-salvar">Salvar Erros</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-modal-cancelar').addEventListener('click', fecharModalErros);
    document.getElementById('btn-modal-salvar').addEventListener('click', salvarErrosSelecionados);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) fecharModalErros();
    });
}

function fecharModalErros() {
    const modal = document.getElementById('modal-erros-mu');
    if (modal) modal.remove();
}

function salvarErrosSelecionados() {
    if (!muSelecionadaGlobal) return;

    const checkboxes = document.querySelectorAll('#modal-erros-mu input[type="checkbox"]:checked');
    const errosSelecionados = Array.from(checkboxes).map(cb => cb.value);

    const detalhes = getDetalhesMUs();

    if (!detalhes[muSelecionadaGlobal]) {
        detalhes[muSelecionadaGlobal] = { 
            status: errosSelecionados.length > 0 ? 'Erro' : 'Liberado', 
            erros: errosSelecionados 
        };
    } else {
        detalhes[muSelecionadaGlobal].erros = errosSelecionados;
        if (errosSelecionados.length > 0) {
            detalhes[muSelecionadaGlobal].status = 'Erro';
        }
    }

    salvarDetalhesMUs(detalhes);

    const listaErrosTexto = errosSelecionados.length > 0 ? errosSelecionados.join(', ') : 'Nenhum erro registrado';
    registrarHistoricoMU(muSelecionadaGlobal, `Apontamento de Erros atualizado: [ ${listaErrosTexto} ]`);

    renderizarStatusEErrosMU(muSelecionadaGlobal);
    fecharModalErros();
}

// EXPOSIÇÃO GLOBAL
window.selecionarMU = selecionarMU;
window.fecharModalErros = fecharModalErros;
window.salvarErrosSelecionados = salvarErrosSelecionados;
window.abrirModalSelecaoErros = abrirModalSelecaoErros;
window.getHistoricoDespachoGeral = getHistoricoDespachoGeral; 