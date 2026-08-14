// ==================================================================
// CONFIGURAÇÕES DO BUFFER (CAPACIDADE MÁXIMA DE PALETES POR ZONA)
// ==================================================================
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyWvQ8Anvus1la6b58rb0PDCB5miiiYo0gVUevofddG8Sm1owo20hx1cZXm-9AX8ivVNA/exec";

const CAPACIDADE_MAXIMA = {
    VERMELHA: 10, // Pendentes
    AMARELA: 6,   // Triagem
    CINZA: 36,    // Ruas
    VERDE: 12     // Expedição
};

let graficoErrosInstancia = null; // Variável global para armazenar o gráfico e evitar duplicações

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDashboard();
    
    // Atualizar o dashboard automaticamente a cada 60 segundos
    setInterval(carregarDadosDashboard, 60000); 
});

async function carregarDadosDashboard() {
    try {
        // 1. Busca os dados em paralelo diretamente do Google Apps Script
        const [resLayout, resHistorico] = await Promise.all([
            fetch(`${GOOGLE_SHEETS_URL}?action=get_layout`),
            fetch(`${GOOGLE_SHEETS_URL}?action=get_historico`)
        ]);

        const layoutRaw = await resLayout.json();
        const historicoDespachoRaw = await resHistorico.json();

        // Garante o formato em Array caso o Apps Script retorne nulo ou objeto
        const layout = Array.isArray(layoutRaw) ? layoutRaw : [];
        const historicoDespacho = Array.isArray(historicoDespachoRaw) ? historicoDespachoRaw : [];

        // 2. Variáveis de Contagem de Paletes
        let paletesVermelha = 0;
        let paletesAmarela = 0;
        let paletesCinza = 0;
        let paletesVerde = 0;

        // Analisa o layout vindo da planilha para descobrir onde os paletes estão
        layout.forEach(item => {
            if (item.text && (item.text.toUpperCase().startsWith('P') || (item.id && item.id.includes('PL')))) {
                const parent = item.parentId || '';
                
                if (parent === 'red-stack') {
                    paletesVermelha++;
                } else if (parent === 'yellow-stack') {
                    paletesAmarela++;
                } else if (parent === 'green-stack') {
                    paletesVerde++;
                } else if (parent.startsWith('R-') || parent.includes('RUA')) {
                    paletesCinza++;
                }
            }
        });

        // 3. Cálculo de Ocupação (%)
        const percVermelha = calcularPercentual(paletesVermelha, CAPACIDADE_MAXIMA.VERMELHA);
        const percAmarela = calcularPercentual(paletesAmarela, CAPACIDADE_MAXIMA.AMARELA);
        const percCinza = calcularPercentual(paletesCinza, CAPACIDADE_MAXIMA.CINZA);
        const percVerde = calcularPercentual(paletesVerde, CAPACIDADE_MAXIMA.VERDE);

        // Atualiza as barras de progresso e textos no HTML
        atualizarBarraKPI('kpi-ocupacao-pendentes', percVermelha, paletesVermelha, CAPACIDADE_MAXIMA.VERMELHA);
        atualizarBarraKPI('kpi-ocupacao-triagem', percAmarela, paletesAmarela, CAPACIDADE_MAXIMA.AMARELA);
        atualizarBarraKPI('kpi-ocupacao-ruas', percCinza, paletesCinza, CAPACIDADE_MAXIMA.CINZA);
        atualizarBarraKPI('kpi-ocupacao-expedicao', percVerde, paletesVerde, CAPACIDADE_MAXIMA.VERDE);

        // 4. Cálculo de MUs (Volume)
        // MUs em estoque calculadas via contagem do layout (considerando média estimada de 30 MUs por Palete)
        const totalPaletesEstoque = paletesVermelha + paletesAmarela + paletesCinza + paletesVerde;
        const totalMUs = totalPaletesEstoque * 30;

        document.getElementById('kpi-total-mus').innerHTML = `${totalMUs} <span class="kpi-unit">MUs</span>`;

        // 5. Atualização dos KPIs Informativos
        document.getElementById('info-mus-cadastro').innerText = totalMUs;
        
        // Paletes que já passaram da triagem (Cinza + Verde) representam o que foi separado
        document.getElementById('info-paletes-separacao').innerText = paletesCinza + paletesVerde;

        // Mapeamento de Erros e Tickets
        let musErros = 0;
        let musTickets = 0;
        const contagemPorErro = {};

        // Contabiliza se houver itens com marcadores no layout
        layout.forEach(item => {
            if (item.status === 'Erro') musErros++;
            if (item.status === 'Em Ticket') musTickets++;

            if (item.erros && Array.isArray(item.erros)) {
                item.erros.forEach(erro => {
                    contagemPorErro[erro] = (contagemPorErro[erro] || 0) + 1;
                });
            }
        });

        document.getElementById('info-mus-erros').innerText = musErros;
        document.getElementById('info-mus-tickets').innerText = musTickets;

        // Cálculo de Despachos: Histórico da planilha
        const totalMusDespachadas = historicoDespacho.length;
        const paletesDespachados = Math.ceil(totalMusDespachadas / 30);
        document.getElementById('info-paletes-despacho').innerText = paletesDespachados;

        // 6. Plota o Gráfico
        renderizarGraficoErros(contagemPorErro);

    } catch (erro) {
        console.error("Erro ao carregar dados do Dashboard via Apps Script:", erro);
    }
}

// ==================================================================
// FUNÇÕES AUXILIARES E GRÁFICO
// ==================================================================

function calcularPercentual(atual, maximo) {
    if (maximo === 0) return 0;
    let percentual = Math.round((atual / maximo) * 100);
    return percentual > 100 ? 100 : percentual;
}

function atualizarBarraKPI(idBase, percentual, atual, maximo) {
    const elPerc = document.getElementById(`${idBase}-perc`);
    const elBar = document.getElementById(`${idBase}-bar`);
    const elText = document.getElementById(`${idBase}-text`);

    if (elPerc) elPerc.innerText = `${percentual}%`;
    if (elBar) elBar.style.width = `${percentual}%`;
    if (elText) elText.innerText = `${atual} de ${maximo} posições ocupadas`;
}

function renderizarGraficoErros(dadosErros) {
    const ctx = document.getElementById('graficoErros');
    if (!ctx) return;

    if (graficoErrosInstancia) {
        graficoErrosInstancia.destroy();
    }

    const labels = Object.keys(dadosErros);
    const data = Object.values(dadosErros);

    if (labels.length === 0) {
        labels.push('Nenhum erro na operação');
        data.push(1);
    }

    const cores = labels[0] === 'Nenhum erro na operação'
        ? ['#10b981']
        : ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6', '#64748b'];

    graficoErrosInstancia = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'MUs Afetadas',
                data: data,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#334155',
                        font: { size: 12, family: "'Segoe UI', Tahoma, sans-serif" },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (labels[0] === 'Nenhum erro na operação') return ' Tudo operando normalmente!';
                            return ` ${context.label}: ${context.raw} MUs impactadas`;
                        }
                    }
                }
            }
        }
    });
}