# 🚀 Guia de Uso - Sistema WMS Buffer Meli

## 📍 Acesso ao Sistema

O sistema está rodando em: **http://localhost:8000**

### Páginas Disponíveis:

| Página | URL | Função |
|--------|-----|--------|
| **Mapa (Operação)** | `/index.html` | Controlar movimento de paletes |
| **Dashboard** | `/dashboard.html` | Visualizar ocupação em tempo real |
| **Consulta** | `/consulta.html` | Buscar e analisar MUs |
| **Histórico** | `/historico.html` | Estatísticas e relatórios |
| **Testes** | `/test_integration.html` | Validar integração |

---

## 🎮 Como Usar o Sistema

### 1️⃣ **Operação no Mapa (index.html)**

#### A. Fazer Login
1. Abra `/index.html`
2. Na tela de login, digite:
   - **Usuário**: operador
   - **Senha**: 123456
3. Clique em "Acessar"

#### B. Criar Palete na Zona Vermelha
1. Clique em "➕ Novo Palete" (seção Zona Vermelha)
2. Sistema cria automaticamente: P01, P02, P03...
3. Palete aparece como "P0X" no container vermelho

#### C. Adicionar MUs ao Palete
1. Selecione um palete (clicando nele)
2. Palete ficará destacado em azul
3. Clique em "📊 Cadastrar MU"
4. Sistema solicita "Bipe/Código MU:" até 30 vezes
5. Digite códigos como: MU001, MU002, etc.
6. Após 30 MUs ou "Cancelar", MUs são guardadas no localStorage

#### D. Mover Palete para Zona Amarela
1. Selecione um palete na zona vermelha
2. Clique em "✓ Checagem HH" (ativa modal de checklist)
3. Marque todos os itens do checklist
4. Clique em "Confirmar Checagem"
5. Clique em "🏷️ Vincular ID" para criar identificador (PL-01, PL-02...)
6. **Arraste** o palete para a **Zona Amarela**
7. ✅ Palete move para amarela com status "No ID"

#### E. Despachar Palete
1. Na zona amarela, selecione o palete
2. Clique em "📦 Despachar PL"
3. Sistema registra no `buffer_historico` com timestamp
4. Palete movido para **Zona Verde**

---

### 2️⃣ **Dashboard (dashboard.html)**

#### O que Você Vê:
- **Total de MUs**: Quantidade de MUs pendentes + cadastradas
- **Ocupação Vermelha**: X/10 posições na triagem
- **Ocupação Amarela**: X/6 posições em checagem
- **Ocupação Ruas**: X/30 posições em separação
- **Ocupação Verde**: X/12 posições em expedição

#### Como Funciona:
- Dashboard **atualiza a cada 5 segundos** automaticamente
- Ao mover um palete no mapa, dashboard atualiza em ~500ms
- Dados vêm do localStorage sincronizado entre páginas

#### Exemplo de Leitura:
```
Zona Vermelha: 2 de 10 (20%)  ████░░░░░░
Zona Amarela:  1 de 6  (17%)  █░░░░░
Zona Ruas:     0 de 30 (0%)   ░░░░░░░░░░
Zona Verde:    1 de 12 (8%)   █░░░░░░░░░░
```

---

### 3️⃣ **Consulta (consulta.html)**

#### Como Buscar MUs de um Palete:

1. **Opção A: Buscar por Palete**
   - Digite no campo de busca: `PL-01` (ou o código do palete)
   - Clique em "Consultar"
   - ✅ Tabela mostra todas as MUs desse palete

2. **Opção B: Buscar por MU**
   - Digite no campo de busca: `MU001`
   - Clique em "Consultar"
   - ✅ Sistema encontra e mostra informações

#### Visualizar Detalhes de uma MU:
1. Na tabela de "Conteúdo do Palete", encontre a MU desejada
2. Clique no botão "📊 Ver" à direita
3. Painel de Análise (direita) mostra:
   - **Código da MU**
   - **Timeline de Eventos**:
     - Data/hora de cada ação
     - Qual operador fez
     - Qual foi o evento

#### Exemplo de Timeline:
```
2024-01-15 10:30:45
João Silva
Cadastrada em palete P01

2024-01-15 10:35:12
João Silva
Movida para zona amarela

2024-01-15 10:45:30
Maria Santos
MU verificada - conforme
```

---

### 4️⃣ **Histórico (historico.html)**

#### O que Você Vê:
- **Total de MUs Despachadas**: Quantidade de MUs finalizadas
- **Total de Paletes**: Quantidade de paletes enviados
- **Média de Ações**: Número médio de ações por MU

#### Tabela de Histórico:
| Coluna | O que é |
|--------|---------|
| MU | Código da unidade móvel |
| Palete | ID do palete (PL-XX) |
| Data | Quando foi despachado |
| Operador | Quem realizou a ação |
| Ações | Número de eventos |

#### Como Filtrar:
1. Use o campo de busca acima da tabela
2. Digite nome do operador ou código de MU
3. Tabela filtra em tempo real

#### Exemplo de Relatório:
```
Total de MUs Despachadas: 47
Total de Paletes: 4
Média de Ações por MU: 3.2 eventos

MU001  | PL-01 | 2024-01-15 10:45 | João Silva | 4 ações
MU002  | PL-01 | 2024-01-15 10:46 | João Silva | 3 ações
MU003  | PL-02 | 2024-01-15 11:00 | Maria      | 4 ações
```

---

## 🧪 Como Testar Integração (test_integration.html)

### Teste 1: Criar Dados de Teste
1. Abra `/test_integration.html`
2. Clique em "Criar Paletes de Teste"
3. ✅ Resultado: 3 paletes × 5 MUs criados em localStorage

### Teste 2: Verificar Ocupação
1. Clique em "Verificar Ocupação"
2. ✅ Resultado: Mostra status de cada zona

### Teste 3: Atualizar Dashboard
1. Clique em "Atualizar Dashboard"
2. ✅ Resultado: Dashboard é populado com dados

### Teste 4: Carregar Histórico
1. Clique em "Carregar Histórico"
2. ✅ Resultado: Estatísticas calculadas

### Teste 5: Testar Consulta
1. Clique em "Testar Consulta"
2. ✅ Resultado: Tabela preenchida com MUs

---

## 📊 Fluxo Completo de Exemplo

### Cenário: Processar um Palete com 5 MUs

#### Passo 1: Mapa (index.html)
```
[AÇÃO]                          [RESULTADO]
1. Login                        → Acesso liberado
2. ➕ Novo Palete               → P01 criado (zona vermelha)
3. Selecionar P01               → P01 destaca em azul
4. 📊 Cadastrar MU              → Informa MU001 a MU005 (5 MUs)
5. ✓ Checagem HH                → Checklist completo
6. 🏷️ Vincular ID               → PL-01 gerado
7. Arrastar P01 → Amarela       → P01 na zona amarela (status "No ID")
8. 📦 Despachar PL              → P01 vai para verde e registra em histórico
```

#### Passo 2: Dashboard (dashboard.html)
```
Após o despacho de P01:
- Total de MUs: 5 (+ qualquer outro em processo)
- Zona Vermelha: 0 de 10 (0%)
- Zona Amarela: 0 de 6 (0%)  ← P01 saiu
- Zona Ruas: 0 de 30 (0%)
- Zona Verde: 1 de 12 (8%)   ← P01 agora aqui
```

#### Passo 3: Consulta (consulta.html)
```
[BUSCA]                         [RESULTADO]
1. Buscar: PL-01                → Encontra palete
2. Tabela mostra:
   - MU001 | Ativa | ... | João
   - MU002 | Ativa | ... | João
   - ...até MU005
3. Clicar "Ver" em MU001        → Timeline mostra:
                                  10:30 - Cadastrada
                                  10:35 - Movida para amarela
                                  10:45 - Despachada
```

#### Passo 4: Histórico (historico.html)
```
Após várias operações:
- Total MUs: 5 (esse palete) + anteriores
- Total Paletes: 1 (esse) + anteriores
- Média Ações: ~3.2 por MU

Tabela mostra registro:
MU001 | PL-01 | 2024-01-15 10:45 | João Silva | 3
```

---

## 🔄 Dados Sincronizados Automaticamente

Ao navegar entre páginas:
- ✅ Dados permanecem no localStorage
- ✅ Dashboard sempre mostra estado atual
- ✅ Histórico sempre atualizado
- ✅ Consulta mostra últimas MUs

### Como Dados Fluem:
```
Mapa (index.html)
    ↓ Salva em localStorage
    ├→ Dashboard lê cada 5s
    ├→ Consulta lê ao buscar
    └→ Histórico lê ao abrir
```

---

## ⚠️ Dicas Importantes

1. **Sempre fazer Login primeiro** no mapa
2. **Dados são persistentes**: Fechar aba e abrir novamente = dados continuam
3. **Limite de MUs**: Máximo 30 por palete (validado)
4. **Limite de Paletes**:
   - Zona Vermelha: 10
   - Zona Amarela: 6
   - Zona Verde: 12
   - Ruas: 30 (5 ruas × 6 cada)
5. **Dashboard atualiza automaticamente**: Não precisa recarregar

---

## 🛠️ Troubleshooting

### Problema: Dashboard não atualiza
- **Solução**: Recarregue a página (F5)
- **Causa**: Pode estar em pausa, atualiza cada 5s

### Problema: Consulta não mostra MUs
- **Solução**: Certifique-se de ter criado palete e MUs no mapa
- **Causa**: localStorage vazio

### Problema: Histórico mostra zeros
- **Solução**: Despache um palete completamente (até zona verde)
- **Causa**: Nenhum palete foi finalizado ainda

### Problema: Dados desapareceram
- **Solução**: Verificar console (F12 → Console)
- **Causa**: localStorage pode ter sido limpado pelo navegador

---

## 📱 URLs Rápidas

- Mapa: http://localhost:8000/index.html
- Dashboard: http://localhost:8000/dashboard.html
- Consulta: http://localhost:8000/consulta.html
- Histórico: http://localhost:8000/historico.html
- Testes: http://localhost:8000/test_integration.html

---

**Versão**: 1.0  
**Última Atualização**: 2024  
**Status**: ✅ Operacional
