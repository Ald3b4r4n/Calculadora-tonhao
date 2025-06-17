function toggleTab(id) {
  document.querySelectorAll('.aba').forEach(sec => {
    if (sec.id === id) {
      sec.style.display = sec.style.display === 'block' ? 'none' : 'block';
    } else {
      sec.style.display = 'none';
    }
  });

  // Esconde a imagem inicial ao abrir qualquer aba
  const imagem = document.getElementById('imagemPlanoDF');
  if (imagem) imagem.style.display = 'none';
}

function salvarGanhosDiarios() {
  const ganhos = {
    uber: parseFloat(document.getElementById('uber').value) || 0,
    noveNove: parseFloat(document.getElementById('noveNove').value) || 0,
    indriver: parseFloat(document.getElementById('indriver').value) || 0,
    iupe: parseFloat(document.getElementById('iupe').value) || 0,
    rotas: parseFloat(document.getElementById('rotas').value) || 0,
    outras: parseFloat(document.getElementById('outras').value) || 0,
    data: new Date().toLocaleDateString('pt-BR')
  };
  localStorage.setItem('ganhos_' + ganhos.data, JSON.stringify(ganhos));
  atualizarLucro();
}

function limparGanhosDiarios() {
  ['uber', 'noveNove', 'indriver', 'iupe', 'rotas', 'outras'].forEach(id => document.getElementById(id).value = '');
  const data = new Date().toLocaleDateString('pt-BR');
  localStorage.removeItem('ganhos_' + data);
  atualizarLucro();
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
  const data = new Date().toLocaleDateString('pt-BR');

  let historico = JSON.parse(localStorage.getItem('combustivel_' + data)) || [];
  historico.push(valor);
  localStorage.setItem('combustivel_' + data, JSON.stringify(historico));

  atualizarLucro();
  mostrarTabelaCombustivel();
}

function limparCombustivel() {
  const data = new Date().toLocaleDateString('pt-BR');
  localStorage.removeItem('combustivel_' + data);
  atualizarLucro();
  mostrarTabelaCombustivel();
}

function atualizarLucro() {
  const data = new Date().toLocaleDateString('pt-BR');
  const ganhos = JSON.parse(localStorage.getItem('ganhos_' + data)) || {};
  const combustivelArray = JSON.parse(localStorage.getItem('combustivel_' + data)) || [];
  const combustivel = combustivelArray.reduce((a, b) => a + b, 0);

  const totalGanhos = (ganhos.uber || 0) + (ganhos.noveNove || 0) + (ganhos.indriver || 0) + (ganhos.iupe || 0) + (ganhos.rotas || 0) + (ganhos.outras || 0);
  const lucro = totalGanhos - combustivel;

  let divida = 400;
  if ((ganhos.iupe || 0) > 4000) {
    divida += ((ganhos.iupe || 0) - 4000) * 0.1;
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
    const chave = 'ganhos_' + data.toLocaleDateString('pt-BR');
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

function limparMemoriaGanhosPeriodo() {
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (chave.startsWith('ganhos_')) {
      localStorage.removeItem(chave);
      i--;
    }
  }
  document.getElementById('resultadoPeriodo').innerText = 'Memória de ganhos por período limpa.';
}

function mostrarTabelaCombustivel() {
  const container = document.getElementById('resultadoCombustivel');
  container.innerHTML = '<table><tr><th>Data</th><th>Gastos</th></tr>';

  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (chave.startsWith('combustivel_')) {
      const data = chave.replace('combustivel_', '');
      const gastos = JSON.parse(localStorage.getItem(chave)) || [];
      const totalDia = gastos.reduce((a, b) => a + b, 0);
      container.innerHTML += `<tr><td>${data}</td><td>R$ ${totalDia.toFixed(2)}</td></tr>`;
    }
  }
  container.innerHTML += '</table>';
}