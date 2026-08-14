// URL do seu Google Apps Script (Web App) configurado para GET
// Você precisará de um script lá no Google Sheets que retorne os dados em formato JSON.
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxPsyrJdzUQJFKh_3xnA-PkKINZkZCCeCnJN9KCd9IXca4bWU2wtXS101DQbf9qLi3A_g/exec";

// Variável global para armazenar os dados e permitir filtros depois
let dadosHistorico = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDoSheets();
});

async function carregarDadosDoSheets() {
    try {
        // Se ainda não tiver a URL, usamos dados falsos (Mock) apenas para você ver funcionando o visual
        if (GOOGLE_SHEETS_URL === "https://script.google.com/macros/s/AKfycbxPsyrJdzUQJFKh_3xnA-PkKINZkZCCeCnJN9KCd9IXca4bWU2wtXS101DQbf9qLi3A_g/exec") {
            console.warn("URL do Web App não configurada. Carregando dados de teste...");
            dadosHistorico = simularDadosDeTeste();
        } else {
            // Faz a requisição na planilha
            const resposta = await fetch(GOOGLE_SHEETS_URL);
            dadosHistorico = await resposta.json(); 
        }

        calcularKPIs(dadosHistorico);
        renderizarTabela(dadosHistorico);

    } catch (erro) {
        console.error("Erro ao buscar dados do Sheets:", erro);
        document.getElementById('history-table-body').innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar dados. Verifique sua conexão ou a URL do Apps Script.</td></tr>`;
    }
}

function calcularKPIs(dados) {
    if (!dados || dados.length === 0) return;

    // 1. Total de MU Liberadas (Cada linha é uma MU)
    const totalMUs = dados.length;

    // 2. Total de Paletes (Contar quantos IDs de paletes únicos existem)
    const paletesUnicos = new Set(dados.map(item => item.palletID));
    const totalPallets = paletesUnicos.size;

    // 3. Média de Ações (Soma de todas as ações dividida pelo total de MUs)
    let somaAcoes = 0;
    dados.forEach(item => {
        somaAcoes += Number(item.acoesFeitas) || 0;
    });
    const mediaAcoes = totalMUs > 0 ? (somaAcoes / totalMUs).toFixed(1) : 0;

    // Atualiza os valores no HTML
    document.getElementById('kpi-total-mus').innerText = totalMUs;
    document.getElementById('kpi-total-pallets').innerText = totalPallets;
    document.getElementById('kpi-media-acoes').innerText = mediaAcoes;
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = ''; // Limpa o "Carregando..."

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    dados.forEach(item => {
        // Pega as iniciais do operador (Ex: "Maycon Sato" -> "MS")
        const nomePartes = (item.usuario || 'Desconhecido').split(' ');
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
                    ${item.usuario || 'Sistema'}
                </div>
            </td>
            <td style="text-align: center; font-weight: bold;">${item.acoesFeitas || '0'}</td>
            <td><span class="badge badge-time">${item.tempoNoBuffer || '0m'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// =========================================================
// FUNÇÃO TEMPORÁRIA: Só para você ver a tela funcionando 
// enquanto não conecta o Google Apps Script real.
// =========================================================
function simularDadosDeTeste() {
    return [
        { dataDespacho: "13/08/2026 14:32:05", palletID: "PL-01", mu: "MU-TT-RC-20A-123", acoesFeitas: 4, tempoNoBuffer: "42m", usuario: "Maycon Sato" },
        { dataDespacho: "13/08/2026 14:32:05", palletID: "PL-01", mu: "MU-TT-RC-20A-124", acoesFeitas: 2, tempoNoBuffer: "42m", usuario: "Maycon Sato" },
        { dataDespacho: "13/08/2026 13:15:22", palletID: "PL-04", mu: "MU-TT-RC-18B-889", acoesFeitas: 7, tempoNoBuffer: "3h 10m", usuario: "Wilton" },
        { dataDespacho: "13/08/2026 11:05:40", palletID: "PL-02", mu: "MU-TT-RC-15A-002", acoesFeitas: 3, tempoNoBuffer: "1h 05m", usuario: "Gesleane Morais" }
    ];
}