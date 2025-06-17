let db;
let map;
let marker;
let routingControl;
let userLocation;
let mapaInicializado = false;

document.addEventListener('DOMContentLoaded', () => {
  let request = indexedDB.open('xmartDriverDB', 1);

  request.onupgradeneeded = event => {
    db = event.target.result;
    db.createObjectStore('ganhos', { keyPath: 'id', autoIncrement: true });
    db.createObjectStore('combustivel', { keyPath: 'id', autoIncrement: true });
  };

  request.onsuccess = event => {
    db = event.target.result;
  };
});

function toggleTab(tabId) {
  document.querySelectorAll('.aba').forEach(aba => aba.style.display = 'none');
  document.getElementById('fundoInicial').style.display = 'none';
  document.getElementById(tabId).style.display = 'block';

  if (tabId === 'taximetro') {
    setTimeout(() => {
      if (!mapaInicializado) exibirMapa();
      map.invalidateSize();
      if (userLocation) map.setView([userLocation.lat, userLocation.lng], 15);
    }, 300);
  }
}

// Ganhos Diários
function salvarGanhosDiarios() {
  const ganhos = {
    data: formatarDataHora(),
    uber: parseFloat(document.getElementById('uber').value) || 0,
    noveNove: parseFloat(document.getElementById('noveNove').value) || 0,
    indriver: parseFloat(document.getElementById('indriver').value) || 0,
    iupe: parseFloat(document.getElementById('iupe').value) || 0,
    rotas: parseFloat(document.getElementById('rotas').value) || 0,
    outras: parseFloat(document.getElementById('outras').value) || 0
  };

  const tx = db.transaction('ganhos', 'readwrite');
  tx.objectStore('ganhos').add(ganhos).onsuccess = () => {
    alert('Ganhos salvos!');
  };
}

function limparGanhosDiarios() {
  const tx = db.transaction('ganhos', 'readwrite');
  tx.objectStore('ganhos').clear().onsuccess = () => {
    alert('Ganhos diários limpos!');
    document.getElementById('uber').value = '';
    document.getElementById('noveNove').value = '';
    document.getElementById('indriver').value = '';
    document.getElementById('iupe').value = '';
    document.getElementById('rotas').value = '';
    document.getElementById('outras').value = '';
    document.getElementById('resultadoPeriodo').innerText = '';
  };
}

function consultarGanhos() {
  const filtro = document.getElementById('filtroPeriodo').value;
  const tx = db.transaction('ganhos', 'readonly');
  const store = tx.objectStore('ganhos');
  const req = store.getAll();

  req.onsuccess = () => {
    let total = 0;
    req.result.forEach(item => {
      total += item.uber + item.noveNove + item.indriver + item.iupe + item.rotas + item.outras;
    });
    document.getElementById('resultadoPeriodo').innerText = `Total de Ganhos (${filtro}): R$ ${total.toFixed(2)}`;
  };
}

// Combustível
function salvarCombustivel() {
  const valor = parseFloat(document.getElementById('gastoCombustivel').value) || 0;
  const tx = db.transaction('combustivel', 'readwrite');
  tx.objectStore('combustivel').add({ valor, data: formatarDataHora() }).onsuccess = () => {
    alert('Gasto com combustível salvo!');
    mostrarTabelaCombustivel();
  };
}

function limparTodosCombustiveis() {
  const tx = db.transaction('combustivel', 'readwrite');
  tx.objectStore('combustivel').clear().onsuccess = () => {
    alert('Todos os gastos de combustível foram limpos!');
    document.getElementById('gastoCombustivel').value = '';
    document.getElementById('tabelaCombustivel').innerHTML = '';
  };
}

function mostrarTabelaCombustivel() {
  const tx = db.transaction('combustivel', 'readonly');
  const store = tx.objectStore('combustivel');
  const req = store.getAll();

  req.onsuccess = () => {
    let html = '<table><tr><th>Data</th><th>Valor</th></tr>';
    req.result.forEach(item => {
      html += `<tr><td>${item.data}</td><td>R$ ${item.valor.toFixed(2)}</td></tr>`;
    });
    html += '</table>';
    document.getElementById('tabelaCombustivel').innerHTML = html;
  };
}

// Taxímetro
function calcularTaximetro() {
  const kmBusca = parseFloat(document.getElementById('kmBusca').value) || 0;
  const kmCorrida = parseFloat(document.getElementById('kmCorrida').value) || 0;
  const totalKm = kmBusca + kmCorrida;
  const valor = totalKm * 3;
  const resultado = valor < 10 ? 10 : valor;
  document.getElementById('resultadoTaximetro').innerText = "Valor da corrida: R$ " + resultado.toFixed(2);
}

function limparTaximetro() {
  document.getElementById('kmBusca').value = '';
  document.getElementById('kmCorrida').value = '';
  document.getElementById('resultadoTaximetro').innerText = '';
}

// Mapa e Rotas
function exibirMapa() {
  map = L.map('mapa').setView([-15.793889, -47.882778], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const locateButton = L.control({ position: 'topright' });

  locateButton.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.style.backgroundColor = 'white';
    div.style.backgroundImage = "url('https://cdn-icons-png.flaticon.com/512/684/684908.png')";
    div.style.backgroundSize = "25px 25px";
    div.style.backgroundRepeat = 'no-repeat';
    div.style.backgroundPosition = 'center';
    div.style.width = '30px';
    div.style.height = '30px';
    div.style.cursor = 'pointer';
    div.title = 'Centralizar em mim';
    div.onclick = () => {
      if (userLocation) map.setView([userLocation.lat, userLocation.lng], 15);
    };
    return div;
  };

  locateButton.addTo(map);

  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    userLocation = { lat: latitude, lng: longitude };

    if (marker) marker.setLatLng(userLocation);
    else marker = L.marker(userLocation).addTo(map).bindPopup('Você está aqui').openPopup();
  }, () => {
    alert('Não foi possível obter sua localização.');
  });

  mapaInicializado = true;
}

function buscarEndereco() {
  const endereco = document.getElementById('enderecoDestino').value;
  if (!endereco.trim()) {
    alert('Digite um endereço.');
    return;
  }

  if (!userLocation) {
    alert('Aguardando localização atual...');
    return;
  }

  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(userLocation.lat, userLocation.lng),
      L.Routing.waypoint(undefined, endereco)
    ],
    routeWhileDragging: false
  }).addTo(map);

  alert(`Rota para "${endereco}" calculada!`);
}

function navegarWaze() {
  const endereco = document.getElementById('enderecoDestino').value;
  if (endereco.trim()) {
    const url = `https://waze.com/ul?q=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  } else {
    alert('Digite um endereço para navegar.');
  }
}

function limparRota() {
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  document.getElementById('enderecoDestino').value = '';
  if (userLocation) map.setView([userLocation.lat, userLocation.lng], 15);
}

function calcularLucroLiquido() {
  let totalGanhos = 0;
  let totalCombustivel = 0;

  const ganhosTx = db.transaction('ganhos', 'readonly');
  const combustivelTx = db.transaction('combustivel', 'readonly');
  const ganhosStore = ganhosTx.objectStore('ganhos');
  const combustivelStore = combustivelTx.objectStore('combustivel');

  let ganhosRequest = ganhosStore.getAll();
  let combustivelRequest = combustivelStore.getAll();

  ganhosRequest.onsuccess = () => {
    ganhosRequest.result.forEach(item => {
      totalGanhos += item.uber + item.noveNove + item.indriver + item.iupe + item.rotas + item.outras;
    });

    combustivelRequest.onsuccess = () => {
      combustivelRequest.result.forEach(item => {
        totalCombustivel += item.valor;
      });

      let lucroBruto = totalGanhos - totalCombustivel;

      let divida = 400;
      if (totalGanhos > 4000) {
        divida += (totalGanhos - 4000) * 0.10;
      }

      let lucroLiquido = lucroBruto - divida;

      document.getElementById('resultadoLucro').innerText = `Lucro Líquido: R$ ${lucroLiquido.toFixed(2)}`;
      document.getElementById('dividaIUPE').innerText = `Dívida com a IUPE: R$ ${divida.toFixed(2)}`;
    };
  };
}

function formatarDataHora() {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}