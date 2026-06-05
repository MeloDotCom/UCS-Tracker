// ─── STATE ───────────────────────────────────────────────────────────────────
let disciplinas = JSON.parse(localStorage.getItem('ucs_disciplinas') || '[]');
 
function salvarLS() {
  localStorage.setItem('ucs_disciplinas', JSON.stringify(disciplinas));
}
 
// ─── NOME ────────────────────────────────────────────────────────────────────
const modalNome = document.getElementById('modalNome');
const usuarioEl = document.getElementById('usuario');
const pageTitleEl = document.getElementById('pageTitle');
 
function carregarNome() {
  const nome = localStorage.getItem('ucs_nome');
  if (nome) {
    usuarioEl.textContent = 'Olá, ' + nome;
    modalNome.style.display = 'none';
  }
}
 
function salvarNome() {
  const nome = document.getElementById('inputNome').value.trim();
  if (!nome) return;
  localStorage.setItem('ucs_nome', nome);
  usuarioEl.textContent = 'Olá, ' + nome;
  modalNome.style.display = 'none';
}
 
document.getElementById('inputNome').addEventListener('keypress', e => {
  if (e.key === 'Enter') salvarNome();
});
 
// ─── MODAL DISCIPLINA ────────────────────────────────────────────────────────
function abrirFormDisciplina() {
  document.getElementById('nd_nome').value = '';
  document.getElementById('nd_num').value = 3;
  document.getElementById('nd_tipo').value = 'arith';
  document.getElementById('nd_minAprov').value = '';
  renderPesos();
  document.getElementById('modalDisciplina').style.display = 'flex';
}
 
function fecharModalDisciplina() {
  document.getElementById('modalDisciplina').style.display = 'none';
}
 
function renderPesos() {
  const n = parseInt(document.getElementById('nd_num').value) || 1;
  const tipo = document.getElementById('nd_tipo').value;
  const cont = document.getElementById('pesosContainer');
  const usaPeso = tipo === 'ponderada' || tipo === 'harmonica';
  if (!usaPeso) { cont.innerHTML = ''; return; }
  let html = '<div class="aval-section-title" style="margin-top:4px;">Pesos das Avaliações</div><div class="form-row">';
  for (let i = 0; i < n; i++) {
    html += `<div class="form-group" style="min-width:80px;">
      <label>Aval. ${i+1}</label>
      <input type="number" id="peso_${i}" min="0.1" step="0.1" value="1" placeholder="Peso">
    </div>`;
  }
  html += '</div>';
  cont.innerHTML = html;
}
 
document.getElementById('nd_tipo').addEventListener('change', renderPesos);
 
function salvarDisciplina() {
  const nome = document.getElementById('nd_nome').value.trim();
  const n = parseInt(document.getElementById('nd_num').value) || 1;
  const tipo = document.getElementById('nd_tipo').value;
  const minAprov = parseFloat(document.getElementById('nd_minAprov').value);
  if (!nome) { alert('Informe o nome da disciplina.'); return; }
 
  const usaPeso = tipo === 'ponderada' || tipo === 'harmonica';
  let pesos = [];
  for (let i = 0; i < n; i++) {
    const el = document.getElementById('peso_' + i);
    pesos.push(el ? parseFloat(el.value) || 1 : 1);
  }
 
  const avaliacoes = Array.from({length: n}, (_, i) => ({
    nome: 'Avaliação ' + (i+1),
    peso: usaPeso ? pesos[i] : 1,
    nota: null
  }));
 
  const disc = {
    id: Date.now(),
    nome,
    tipo,
    minAprov: isNaN(minAprov) ? null : minAprov,
    avaliacoes,
    modoCalc: 'media', // 'media' ou 'ultima'
    notaMinMedia: null,
    aberto: true
  };
 
  disciplinas.push(disc);
  salvarLS();
  fecharModalDisciplina();
  renderDisciplinas();
}
 
// ─── CALCULOS ────────────────────────────────────────────────────────────────
function calcMedia(disc) {
  const todas = disc.avaliacoes;
  const comNota = todas.filter(a => a.nota !== null && a.nota !== '');
 
  // Só calcula média quando TODAS as avaliações têm nota
  if (comNota.length < todas.length) return null;
 
  const notas = comNota.map(a => a.nota);
  const pesos = comNota.map(a => a.peso);
 
  if (disc.tipo === 'arith') {
    return notas.reduce((s, n) => s + n, 0) / notas.length;
  }
  if (disc.tipo === 'ponderada') {
    const sumPN = notas.reduce((s, n, i) => s + n * pesos[i], 0);
    const sumP = pesos.reduce((s, p) => s + p, 0);
    return sumPN / sumP;
  }
  if (disc.tipo === 'harmonica') {
    if (notas.some(n => n === 0)) return null;
    // Harmônica ponderada: M = sumP / sum(p_i / n_i)
    const sumP = pesos.reduce((s, p) => s + p, 0);
    const sumPoverN = notas.reduce((s, n, i) => s + pesos[i] / n, 0);
    return sumP / sumPoverN;
  }
  return null;
}
 
function calcNotaMinUltima(disc, notaMinMedia) {
  // Primeira avaliação sem nota
  const idx = disc.avaliacoes.findIndex(a => a.nota === null || a.nota === '');
  if (idx === -1) return null;
 
  const notasAnt = disc.avaliacoes.filter((a, i) => i < idx && a.nota !== null && a.nota !== '');
  const notasAntVal = notasAnt.map(a => a.nota);
  const pesosAnt = notasAnt.map(a => a.peso);
  const pesoUlt = disc.avaliacoes[idx].peso;
 
  if (disc.tipo === 'arith') {
    const n = disc.avaliacoes.length;
    const somaAnt = notasAntVal.reduce((s, x) => s + x, 0);
    return n * notaMinMedia - somaAnt;
  }
  if (disc.tipo === 'ponderada') {
    const sumPTotal = disc.avaliacoes.reduce((s, a) => s + a.peso, 0);
    const sumPNAnt = notasAntVal.reduce((s, x, i) => s + x * pesosAnt[i], 0);
    return (notaMinMedia * sumPTotal - sumPNAnt) / pesoUlt;
  }
  if (disc.tipo === 'harmonica') {
    // M = sumPTotal / (sumPoverNAnt + pesoUlt/Xn)
    // → pesoUlt/Xn = sumPTotal/M - sumPoverNAnt
    // → Xn = pesoUlt / (sumPTotal/M - sumPoverNAnt)
    const sumPTotal = disc.avaliacoes.reduce((s, a) => s + a.peso, 0);
    const sumPoverNAnt = notasAnt.reduce((s, a) => s + (a.nota !== 0 ? a.peso / a.nota : Infinity), 0);
    const inv = sumPTotal / notaMinMedia - sumPoverNAnt;
    return inv > 0 ? pesoUlt / inv : null;
  }
  return null;
}
 
function tipoLabel(tipo) {
  return { arith: 'Aritmética', ponderada: 'Ponderada', harmonica: 'Harmônica' }[tipo] || tipo;
}
 
// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderDisciplinas() {
  const container = document.getElementById('disciplinasList');
  if (disciplinas.length === 0) {
    container.innerHTML = `
    <div class="empty-state">
        <div class="emoji">
            <img src="images/cactus.svg" alt="Cactus" class="empty-icon">
        </div>
        Nenhuma disciplina adicionada.<br>
        Clique em <b>Adicionar Disciplina</b> para começar.
    </div>`;
    return;
  }
  container.innerHTML = disciplinas.map((d, di) => renderCard(d, di)).join('');
}
 
function renderCard(d, di) {
  const media = calcMedia(d);
  const totalNotas = d.avaliacoes.filter(a => a.nota !== null && a.nota !== '').length;
  const totalAval = d.avaliacoes.length;
 
  let badgeClass = 'neutral', badgeText = '–';
  if (media !== null) {
    badgeText = media.toFixed(2);
    if (d.minAprov !== null) {
      badgeClass = media >= d.minAprov ? 'ok' : 'fail';
    } else {
      badgeClass = media >= 6 ? 'ok' : media >= 5 ? 'warn' : 'fail';
    }
  }
 
  const aberto = d.aberto ? 'open' : '';
 
  // Tabela de avaliações — peso sempre visível e editável
  const usaPesoTipo = d.tipo === 'ponderada' || d.tipo === 'harmonica';
  const linhasAval = d.avaliacoes.map((av, ai) => {
    return `<tr>
      <td class="nota-label">${av.nome}</td>
      <td><input type="number" min="0.1" step="0.1"
        value="${av.peso}"
        oninput="setPeso(${di},${ai},this.value)"
        style="max-width:70px; ${!usaPesoTipo ? 'opacity:0.4; pointer-events:none;' : ''}"></td>
      <td><input type="number" min="0" max="10" step="0.1" placeholder="–"
        value="${av.nota !== null ? av.nota : ''}"
        oninput="setNota(${di},${ai},this.value)"
        style="max-width:90px;"></td>
    </tr>`;
  }).join('');
 
  const thPeso = `<th title="${usaPesoTipo ? 'Peso usado no cálculo' : 'Peso (inativo neste tipo de média)'}">Peso${!usaPesoTipo ? ' ⚪' : ''}</th>`;
 
  // Resultado
  let resultadoHTML = '';
  if (media !== null) {
    const cls = badgeClass === 'ok' ? 'val-ok' : badgeClass === 'fail' ? 'val-fail' : badgeClass === 'warn' ? 'val-warn' : 'val-neutral';
    const situacao = d.minAprov !== null
      ? (media >= d.minAprov ? '✅ Aprovado' : '❌ Reprovado')
      : (media >= 6 ? '✅ Aprovado (≥6)' : media >= 5 ? '⚠️ Recuperação (≥5)' : '❌ Reprovado');
    resultadoHTML += `<div class="resultado-line">Média atual: <span class="${cls}">${media.toFixed(2)}</span></div>`;
    resultadoHTML += `<div class="resultado-line">Situação: <strong>${situacao}</strong></div>`;
  }
 
  // Nota mínima na última
  const ultimaIdx = d.avaliacoes.findIndex(a => a.nota === null || a.nota === '');
  const notasAntCount = ultimaIdx > 0
    ? d.avaliacoes.filter((a, i) => i < ultimaIdx && a.nota !== null && a.nota !== '').length
    : 0;
  let notaMinResultHTML = '';
  if (d.modoCalc === 'ultima' && ultimaIdx !== -1 && notasAntCount > 0 && d.notaMinMedia !== null) {
    const minNec = calcNotaMinUltima(d, d.notaMinMedia);
    if (minNec !== null) {
      const clamped = Math.max(0, Math.min(10, minNec));
      const possivel = minNec <= 10 && minNec >= 0;
      notaMinResultHTML = `<div class="resultado-line">
        Para média ≥ <strong>${d.notaMinMedia}</strong> na ${d.avaliacoes[ultimaIdx].nome}:
        <span class="${possivel ? (minNec > 8 ? 'val-warn' : 'val-ok') : 'val-fail'}">
          ${possivel ? minNec.toFixed(2) : 'Impossível (> 10)'}
        </span>
      </div>`;
    }
  }
 
  const minAprovVal = d.minAprov !== null ? d.minAprov : '';
 
  return `<div class="card" id="card_${di}">
    <div class="card-header" onclick="toggleCard(${di})">
      <div class="card-header-left">
        <span class="card-title">${d.nome}</span>
        <span class="card-meta">${tipoLabel(d.tipo)} · ${totalNotas}/${totalAval} notas</span>
      </div>
      <div class="card-header-right">
        ${media !== null ? `<span class="media-badge ${badgeClass}">${badgeText}</span>` : ''}
        <button class="btn-del"
            onclick="event.stopPropagation(); deletar(${di})"
            title="Remover disciplina">
            <img src="images/recyclebin.svg" alt="Remover" class="icon-delete">
        </button>
        <button class="collapse-btn ${aberto}" onclick="event.stopPropagation(); toggleCard(${di})">▼</button>
      </div>
    </div>
    <div class="card-body ${aberto}">
      <div class="aval-section">
        <div class="aval-section-title">Notas</div>
        <table class="aval-table">
          <thead><tr><th>Avaliação</th>${thPeso}<th>Nota (0–10)</th></tr></thead>
          <tbody>${linhasAval}</tbody>
        </table>
      </div>
 
      <div class="modo-section" style="margin-top:18px;">
        <div class="aval-section-title">Modo de Cálculo</div>
        <label>
          <input type="radio" name="modo_${di}" value="media" ${d.modoCalc === 'media' ? 'checked' : ''}
            onchange="setModo(${di},'media')">
          Calcular média com as notas disponíveis
        </label>
        <label>
          <input type="radio" name="modo_${di}" value="ultima" ${d.modoCalc === 'ultima' ? 'checked' : ''}
            onchange="setModo(${di},'ultima')">
          Calcular nota mínima para a próxima avaliação
        </label>
        ${d.modoCalc === 'ultima' ? `
        <div class="nota-min-row">
          <div class="form-group">
            <label>Nota mínima de média desejada</label>
            <input type="number" min="0" max="10" step="0.1" value="${d.notaMinMedia !== null ? d.notaMinMedia : ''}"
              placeholder="${d.minAprov !== null ? d.minAprov : '6.0'}"
              oninput="setNotaMinMedia(${di}, this.value)">
          </div>
        </div>` : ''}
      </div>
 
      <div class="form-row" style="margin-top:16px; align-items:flex-end;">
        <div class="form-group" style="max-width:180px;">
          <label>Mínimo para aprovação</label>
          <input type="number" min="0" max="10" step="0.1" value="${minAprovVal}"
            placeholder="Ex: 6.0"
            oninput="setMinAprov(${di}, this.value)">
        </div>
      </div>
 
      ${(resultadoHTML || notaMinResultHTML) ? `
        <div class="resultado-box">
          ${resultadoHTML}
          ${notaMinResultHTML}
        </div>` : ''}
    </div>
  </div>`;
}
 
// ─── INTERAÇÕES ──────────────────────────────────────────────────────────────
function toggleCard(di) {
  disciplinas[di].aberto = !disciplinas[di].aberto;
  salvarLS();
  renderDisciplinas();
}
 
function setNota(di, ai, val) {
  const num = parseFloat(val);
  disciplinas[di].avaliacoes[ai].nota = isNaN(num) ? null : Math.min(10, Math.max(0, num));
  salvarLS();
  // Atualiza só o badge e resultado sem re-render total (para não perder foco)
  atualizarBadge(di);
  atualizarResultado(di);
}
 
function setModo(di, modo) {
  disciplinas[di].modoCalc = modo;
  if (modo === 'media') disciplinas[di].notaMinMedia = null;
  salvarLS();
  renderDisciplinas();
}
 
function setNotaMinMedia(di, val) {
  const num = parseFloat(val);
  disciplinas[di].notaMinMedia = isNaN(num) ? null : num;
  salvarLS();
  atualizarResultado(di);
}
 
function setMinAprov(di, val) {
  const num = parseFloat(val);
  disciplinas[di].minAprov = isNaN(num) ? null : num;
  salvarLS();
  atualizarBadge(di);
  atualizarResultado(di);
}
 
function deletar(di) {
  if (!confirm('Remover a disciplina "' + disciplinas[di].nome + '"?')) return;
  disciplinas.splice(di, 1);
  salvarLS();
  renderDisciplinas();
}
 
function atualizarBadge(di) {
  const d = disciplinas[di];
  const media = calcMedia(d);
  const header = document.querySelector(`#card_${di} .card-header-right`);
  if (!header) return;
  let badge = header.querySelector('.media-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'media-badge neutral';
    header.insertBefore(badge, header.firstChild);
  }
  if (media === null) { badge.remove(); return; }
  badge.textContent = media.toFixed(2);
  badge.className = 'media-badge ';
  if (d.minAprov !== null) {
    badge.className += media >= d.minAprov ? 'ok' : 'fail';
  } else {
    badge.className += media >= 6 ? 'ok' : media >= 5 ? 'warn' : 'fail';
  }
  // meta
  const totalNotas = d.avaliacoes.filter(a => a.nota !== null && a.nota !== '').length;
  const meta = document.querySelector(`#card_${di} .card-meta`);
  if (meta) meta.textContent = tipoLabel(d.tipo) + ' · ' + totalNotas + '/' + d.avaliacoes.length + ' notas';
}
 
function atualizarResultado(di) {
  const d = disciplinas[di];
  const cardBody = document.querySelector(`#card_${di} .card-body`);
  if (!cardBody) return;
  let box = cardBody.querySelector('.resultado-box');
 
  const media = calcMedia(d);
  let resultadoHTML = '';
  if (media !== null) {
    let badgeClass = 'neutral';
    if (d.minAprov !== null) badgeClass = media >= d.minAprov ? 'ok' : 'fail';
    else badgeClass = media >= 6 ? 'ok' : media >= 5 ? 'warn' : 'fail';
    const cls = badgeClass === 'ok' ? 'val-ok' : badgeClass === 'fail' ? 'val-fail' : badgeClass === 'warn' ? 'val-warn' : 'val-neutral';
    const situacao = d.minAprov !== null
      ? (media >= d.minAprov ? '✅ Aprovado' : '❌ Reprovado')
      : (media >= 6 ? '✅ Aprovado (≥6)' : media >= 5 ? '⚠️ Recuperação (≥5)' : '❌ Reprovado');
    resultadoHTML += `<div class="resultado-line">Média atual: <span class="${cls}">${media.toFixed(2)}</span></div>`;
    resultadoHTML += `<div class="resultado-line">Situação: <strong>${situacao}</strong></div>`;
  }
 
  const ultimaIdx = d.avaliacoes.findIndex(a => a.nota === null || a.nota === '');
  const notasAntCount2 = ultimaIdx > 0
    ? d.avaliacoes.filter((a, i) => i < ultimaIdx && a.nota !== null && a.nota !== '').length
    : 0;
  let notaMinResultHTML = '';
  if (d.modoCalc === 'ultima' && ultimaIdx !== -1 && notasAntCount2 > 0 && d.notaMinMedia !== null) {
    const minNec = calcNotaMinUltima(d, d.notaMinMedia);
    if (minNec !== null) {
      const possivel = minNec <= 10 && minNec >= 0;
      notaMinResultHTML = `<div class="resultado-line">
        Para média ≥ <strong>${d.notaMinMedia}</strong> na ${d.avaliacoes[ultimaIdx].nome}:
        <span class="${possivel ? (minNec > 8 ? 'val-warn' : 'val-ok') : 'val-fail'}">
          ${possivel ? minNec.toFixed(2) : 'Impossível (> 10)'}
        </span>
      </div>`;
    }
  }
 
  if (!resultadoHTML && !notaMinResultHTML) {
    if (box) box.remove();
    return;
  }
 
  if (!box) {
    box = document.createElement('div');
    box.className = 'resultado-box';
    cardBody.appendChild(box);
  }
  box.innerHTML = resultadoHTML + notaMinResultHTML;
}
 
// ─── INIT ─────────────────────────────────────────────────────────────────────
carregarNome();
renderDisciplinas();