function toggleTab(id) {
  document.querySelectorAll('.aba').forEach(sec => sec.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.getElementById('imagemInicial').style.display = 'none';
  atualizarLucro();
  mostrarTabelaCombustivel();
}

function salvarGanhosDiarios() {
  const ganhos = {
    uber: parseFloat(document.getElementById('uber').value) || 0,
    noveNove: parseFloat(document.getElementById('noveNove').value) || 0,
    indriver: parseFloat(document.getElementById('indriver').value) || 0,
    iupe: parseFloat(document.getElementById('iupe').value) || 0,
    rotas: parseFloat(document.getElementById('rotas').value) || 0,
    outras: parseFloat(document.getElementById('outras').value) || 0,
    data: formatarData(new Date())
  };
  localStorage.setItem('ganhos_' + ganhos.data, JSON.stringify(ganhos));
  atualizarLucro();
}

function limparGanhosDiarios() {
  const data = formatarData(new Date());
  localStorage.removeItem('ganhos_' + data);
  atualizarLucro();
}

function limparTodosGanhos() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('ganhos_')) {
      localStorage.removeItem(key);
    }
  });
  atualizarLucro();
  document.getElementById('resultadoPeriodo').innerText = '';
}

function calcularTaximetro() {
  const kmBusca = parseFloat(document.getElementById('kmBusca').value) || 0;
  const kmCorrida = parseFloat(document.getElementById('kmCorrida').value) || 0;
  const totalKm = kmBusca + kmCorrida;
  const valor = totalKm * 2;
  const resultado = valor < 10 ? 10 : valor;
  document.getElementById('resultadoTaximetro').innerText = "Valor da corrida: R$ " + resultado.toFixed(2);
}

function limparTaximetro() {
  document.getElementById('kmBusca').value = '';
  document.getElementById('kmCorrida').value = '';
  document.getElementById('resultadoTaximetro').innerText = '';
}

function salvarCombustivel() {
  const valor = parseFloat(document.getElementById('gastoCombustivel').value) || 0;
  const dataHora = formatarDataHora(new Date());
  localStorage.setItem('combustivel_' + dataHora, valor);
  document.getElementById('gastoCombustivel').value = '';
  atualizarLucro();
  mostrarTabelaCombustivel();
}

function limparCombustivel() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('combustivel_')) {
      localStorage.removeItem(key);
    }
  });
  atualizarLucro();
  mostrarTabelaCombustivel();
}

function atualizarLucro() {
  let totalGanhos = 0;
  let totalCombustivel = 0;
  let totalIUPE = 0;

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('ganhos_')) {
      const ganhos = JSON.parse(localStorage.getItem(key));
      totalGanhos += (ganhos.uber || 0) + (ganhos.noveNove || 0) + (ganhos.indriver || 0) + (ganhos.iupe || 0) + (ganhos.rotas || 0) + (ganhos.outras || 0);
      totalIUPE += (ganhos.iupe || 0);
    }
    if (key.startsWith('combustivel_')) {
      totalCombustivel += parseFloat(localStorage.getItem(key)) || 0;
    }
  });

  const lucro = totalGanhos - totalCombustivel;
  let divida = 400;
  if (totalIUPE > 4000) {
    divida += (totalIUPE - 4000) * 0.1;
  }

  document.getElementById('resultadoLucro').innerText = "Lucro líquido: R$ " + lucro.toFixed(2);
  document.getElementById('dividaIUPE').innerText = "Dívida IUPE: R$ " + divida.toFixed(2);
}

function consultarGanhos() {
  const tipo = document.getElementById('filtroPeriodo').value;
  const hoje = new Date();
  let total = 0;

  for (let i = 0; i < 365; i++) {
    const data = new Date(hoje);
    data.setDate(data.getDate() - i);
    const chave = 'ganhos_' + formatarData(data);
    const ganhos = JSON.parse(localStorage.getItem(chave));
    if (!ganhos) continue;

    if (
      (tipo === 'diario' && i === 0) ||
      (tipo === 'semanal' && i < 7) ||
      (tipo === 'mensal' && i < 31) ||
      (tipo === 'anual' && i < 365)
    ) {
      total += (ganhos.uber || 0) + (ganhos.noveNove || 0) + (ganhos.indriver || 0) + (ganhos.iupe || 0) + (ganhos.rotas || 0) + (ganhos.outras || 0);
    }
  }

  document.getElementById('resultadoPeriodo').innerText = "Total de ganhos " + tipo + ": R$ " + total.toFixed(2);
}

function mostrarTabelaCombustivel() {
  let html = '<h3>Histórico de Combustível</h3><table><tr><th>Data e Hora</th><th>Valor</th></tr>';
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('combustivel_')) {
      const dataHora = key.replace('combustivel_', '');
      const valor = parseFloat(localStorage.getItem(key)).toFixed(2);
      html += `<tr><td>${dataHora}</td><td>R$ ${valor}</td></tr>`;
    }
  });
  html += '</table>';
  document.getElementById('tabelaCombustivel').innerHTML = html;
}

function formatarData(data) {
  return data.toLocaleDateString('pt-BR').split('/').reverse().join('-');
}

function formatarDataHora(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}