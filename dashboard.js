// ==================================================================
// CONFIGURAÇÕES DO BUFFER (CAPACIDADE MÁXIMA DE PALETES POR ZONA)
// ==================================================================
const CAPACIDADE_MAXIMA = {
    VERMELHA: 10, // Pendentes
    AMARELA: 6,   // Triagem
    CINZA: 36,    // Ruas
    VERDE: 12     // Expedição
};

let graficoErrosInstancia = null; // Variável global para armazenar o gráfico e evitar duplicações

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDashboard();
    
    // Opcional: Atualizar o dashboard automaticamente a cada 60 segundos
    setInterval(carregarDadosDashboard, 60000); 
});

function carregarDadosDashboard() {
    // 1. Busca todos os dados do LocalStorage
    const layout = JSON.parse(localStorage.getItem('buffer_layout')) || [];
    const palletMUs = JSON.parse(localStorage.getItem('buffer_pallets')) || {};
    const muDetalhes = JSON.parse(localStorage.getItem('buffer_mu_detalhes')) || {};
    const historicoDespacho = JSON.parse(localStorage.getItem('buffer_historico_despacho')) || [];

    // 2. Variáveis de Contagem de Paletes
    let paletesVermelha = 0;
    let paletesAmarela = 0;
    let paletesCinza = 0;
    let paletesVerde = 0;

    // Analisa o layout para descobrir onde os paletes estão
    layout.forEach(item => {
        // Verifica se o item é um palete (Geralmente começa com PL ou P)
        if (item.text && (item.text.toUpperCase().startsWith('P') || item.id.includes('PL'))) {
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
    let totalMusBipadas = 0;
    Object.values(palletMUs).forEach(mus => {
        totalMusBipadas += mus.length;
    });

    // Cada palete pendente possui 30 MUs (ainda não bipadas)
    const estimativaPendentes = paletesVermelha * 30;
    const totalMUs = totalMusBipadas + estimativaPendentes;

    document.getElementById('kpi-total-mus').innerHTML = `${totalMUs} <span class="kpi-unit">MUs</span>`;

    // 5. Atualização dos KPIs Informativos
    document.getElementById('info-mus-cadastro').innerText = totalMusBipadas;
    
    // Paletes que já passaram da triagem (Cinza + Verde) representam o que foi separado
    document.getElementById('info-paletes-separacao').innerText = paletesCinza + paletesVerde;

    // Lógica para Erros e Tickets
    let musErros = 0;
    let musTickets = 0;
    const contagemPorErro = {}; // Objeto para agrupar os erros pro Gráfico

    Object.values(muDetalhes).forEach(mu => {
        if (mu.status === 'Erro') musErros++;
        if (mu.status === 'Em Ticket') musTickets++;

        // Conta a frequência de cada tipo de erro
        if (mu.erros && mu.erros.length > 0) {
            mu.erros.forEach(erro => {
                contagemPorErro[erro] = (contagemPorErro[erro] || 0) + 1;
            });
        }
    });

    document.getElementById('info-mus-erros').innerText = musErros;
    document.getElementById('info-mus-tickets').innerText = musTickets;

    // Cálculo de Despachos: O histórico armazena linha por MU despachada. 
    // Divide-se por 30 (arredondando para cima) para achar os paletes aproximados.
    const totalMusDespachadas = historicoDespacho.length;
    const paletesDespachados = Math.ceil(totalMusDespachadas / 30);
    document.getElementById('info-paletes-despacho').innerText = paletesDespachados;

    // 6. Plota o Gráfico
    renderizarGraficoErros(contagemPorErro);
}

// ==================================================================
// FUNÇÕES AUXILIARES E GRÁFICO
// ==================================================================

function calcularPercentual(atual, maximo) {
    if (maximo === 0) return 0;
    let percentual = Math.round((atual / maximo) * 100);
    return percentual > 100 ? 100 : percentual; // Trava em 100% caso estoure
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

    // Se já existe um gráfico renderizado, destrua-o antes de desenhar um novo (evita sobreposição)
    if (graficoErrosInstancia) {
        graficoErrosInstancia.destroy();
    }

    const labels = Object.keys(dadosErros);
    const data = Object.values(dadosErros);

    // Se não houver nenhum erro, cria um gráfico verde indicando "Saudável"
    if (labels.length === 0) {
        labels.push('Nenhum erro na operação');
        data.push(1); // Valor simbólico
    }

    const cores = labels[0] === 'Nenhum erro na operação'
        ? ['#10b981'] // Verde Sucesso
        : ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6', '#64748b'];

    // Instancia o Chart.js
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
            cutout: '65%', // Deixa o gráfico estilo "anel" mais fino e moderno
            plugins: {
                legend: {
                    position: 'right', // Legenda ao lado
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