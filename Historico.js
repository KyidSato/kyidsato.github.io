const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyWvQ8Anvus1la6b58rb0PDCB5miiiYo0gVUevofddG8Sm1owo20hx1cZXm-9AX8ivVNA/exec";

let dadosHistorico = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDoSheets();
});

/**
 * BUXAR DADOS (GET)
 */
async function carregarDadosDoSheets() {
    try {
        // Envia o parâmetro de ação para a rota correspondente no Apps Script
        const response = await fetch(`${GOOGLE_SHEETS_URL}?action=get_historico`);
        const data = await response.json();

        if (Array.isArray(data)) {
            dadosHistorico = data;
        } else {
            console.error("Erro retornado pelo Script:", data);
            dadosHistorico = [];
        }

        calcularKPIs(dadosHistorico);
        renderizarTabela(dadosHistorico);

    } catch (erro) {
        console.error("Erro ao buscar dados do Sheets:", erro);
        document.getElementById('history-table-body').innerHTML = 
            `<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar dados do servidor.</td></tr>`;
    }
}

/**
 * GRAVAR DADOS (POST)
 * @param {Array<Object>} registros Exemplo: [{mu: "MU123", palletID: "PL01", dataDespacho: "14/08/2026 10:00", usuario: "Nome"}]
 */
async function salvarHistoricoNoSheets(registros) {
    try {
        // O Apps Script espera dados no formato de formulário URL-encoded
        const payload = new URLSearchParams({
            action: 'save_historico',
            data: JSON.stringify(registros)
        });

        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString()
        });

        const resultado = await response.json();
        
        if (resultado.status === 'success') {
            // Recarrega os dados atualizados da planilha
            await carregarDadosDoSheets();
            return true;
        } else {
            console.error("Erro ao salvar:", resultado.message);
            return false;
        }
    } catch (erro) {
        console.error("Erro de rede ao salvar:", erro);
        return false;
    }
}

function calcularKPIs(dados) {
    if (!dados || dados.length === 0) {
        document.getElementById('kpi-total-mus').innerText = 0;
        document.getElementById('kpi-total-pallets').innerText = 0;
        document.getElementById('kpi-media-acoes').innerText = 0;
        return;
    }

    const totalMUs = dados.length;
    const paletesUnicos = new Set(dados.map(item => item.palletID));
    const totalPallets = paletesUnicos.size;

    let somaAcoes = 0;
    dados.forEach(item => {
        somaAcoes += Number(item.acoesFeitas) || 0;
    });
    const mediaAcoes = totalMUs > 0 ? (somaAcoes / totalMUs).toFixed(1) : 0;

    document.getElementById('kpi-total-mus').innerText = totalMUs;
    document.getElementById('kpi-total-pallets').innerText = totalPallets;
    document.getElementById('kpi-media-acoes').innerText = mediaAcoes;
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (!dados || dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    dados.forEach(item => {
        const nomeUsuario = item.usuario || 'Desconhecido';
        const nomePartes = nomeUsuario.trim().split(' ');
        const iniciais = nomePartes.length > 1 
            ? (nomePartes[0][0] + nomePartes[1][0]).toUpperCase() 
            : nomePartes[0][0].toUpperCase();

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-mono highlight-mu">${item.mu || '-'}</td>
            <td><span class="badge badge-pallet">${item.palletID || '-'}</span></td>
            <td>${item.dataDespacho || '-'}</td>
            <td>
                <div class="user-cell">
                    <span class="avatar">${iniciais}</span>
                    ${nomeUsuario}
                </div>
            </td>
            <td style="text-align: center; font-weight: bold;">${item.acoesFeitas || '0'}</td>
            <td><span class="badge badge-time">${item.tempoNoBuffer || '0m'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}