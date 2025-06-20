let db;
let map;
let marker;
let routingControl;
let userLocation;
let mapaInicializado = false;
let currentRoute = null;
let routeData = null;

// Funções de Rotas
async function calcularRotaCompleta() {
    const localEmbarque = document.getElementById('localEmbarque').value;
    const destinoFinal = document.getElementById('destinoFinal').value;

    if (!localEmbarque || !destinoFinal) {
        alert('Preencha ambos os endereços!');
        return;
    }

    if (!userLocation) {
        alert('Aguardando sua localização atual...');
        return;
    }

    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    try {
        document.getElementById('resultadoTaximetro').innerText = "Calculando rota...";

        const [embarqueCoords, destinoCoords] = await Promise.all([
            geocodeAddress(localEmbarque),
            geocodeAddress(destinoFinal)
        ]);

        const waypoints = [
            L.latLng(userLocation.lat, userLocation.lng),
            L.latLng(embarqueCoords.lat, embarqueCoords.lng),
            L.latLng(destinoCoords.lat, destinoCoords.lng)
        ];

        // Criar rota visual no mapa principal
        routingControl = L.Routing.control({
            waypoints,
            routeWhileDragging: false,
            show: false,
            addWaypoints: false,
            lineOptions: {
                styles: [{ color: '#820ad1', opacity: 0.8, weight: 5 }]
            }
        }).addTo(map);

        const router = L.Routing.osrmv1();

        // Cálculo da distância de busca (ponto 0 → 1)
        router.route([
            { latLng: waypoints[0] },
            { latLng: waypoints[1] }
        ], (err1, res1) => {
            const distanciaBusca = res1[0].summary.totalDistance / 1000;

            // Cálculo da distância da corrida (ponto 1 → 2)
            router.route([
                { latLng: waypoints[1] },
                { latLng: waypoints[2] }
            ], async (err2, res2) => {
                const distanciaCorrida = res2[0].summary.totalDistance / 1000;

                document.getElementById('kmBusca').value = distanciaBusca.toFixed(2);
                document.getElementById('kmCorrida').value = distanciaCorrida.toFixed(2);

                routeData = {
                    localEmbarque,
                    destinoFinal,
                    distanciaBusca,
                    distanciaCorrida,
                    waypoints
                };

                calcularTaximetro();
                map.fitBounds(L.latLngBounds(waypoints));
                document.getElementById('resultadoTaximetro').innerText = "Rota encontrada!";
                document.getElementById('btnWazeEmbarque').style.display = 'inline-block';
                document.getElementById('btnWazeDestino').style.display = 'inline-block';

                // Tirar print do mapa principal e salvar no routeData
                const mapaDiv = document.getElementById('mapa');
                await html2canvas(mapaDiv, {
                    scale: 2,
                    logging: false,
                    useCORS: true
                }).then(canvas => {
                    routeData.imagemMapa = canvas.toDataURL('image/png');
                });
            });
        });

    } catch (error) {
        console.error("Erro ao calcular rota:", error);
        document.getElementById('resultadoTaximetro').innerText = "Erro ao calcular rota.";
    }
}



function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    resolve({
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon)
                    });
                } else {
                    reject("Endereço não encontrado");
                }
            })
            .catch(reject);
    });
}

function limparRota() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    document.getElementById('localEmbarque').value = '';
    document.getElementById('destinoFinal').value = '';
    document.getElementById('resultadoTaximetro').innerText = '';
    if (userLocation) map.setView([userLocation.lat, userLocation.lng], 15);
}

function navegarWaze(tipo) {
    let destino;

    if (tipo === 'embarque') {
        destino = document.getElementById('localEmbarque').value;
    } else if (tipo === 'destino') {
        destino = document.getElementById('destinoFinal').value;
    } else {
        alert('Endereço inválido.');
        return;
    }

    if (destino.trim()) {
        const url = `https://waze.com/ul?q=${encodeURIComponent(destino)}`;
        window.open(url, '_blank');
    } else {
        alert('Informe o endereço antes de navegar.');
    }
}


// Recibo
async function gerarRecibo() {
    if (!routeData || !routeData.imagemMapa) {
        alert('Calcule uma rota primeiro!');
        return;
    }

    const nome = document.getElementById('nomeMotorista').value;
    const cpf = document.getElementById('cpfMotorista').value;
    const placa = document.getElementById('placaVeiculo').value;
    const valor = document.getElementById('valorRecibo').value || document.getElementById('resultadoTaximetro').innerText.replace('Valor da corrida: R$ ', '');

    if (!nome || !cpf || !placa || !valor) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    const agora = new Date();
    const reciboHTML = `
        <div id="reciboContent" style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 2px solid #820ad1; border-radius: 10px; background: white; color: black;">
            <h2 style="text-align: center; color: #820ad1;">RECIBO DE CORRIDA</h2>
            <hr style="border-color: #820ad1;">
            
            <div style="margin-bottom: 15px;">
                <p><strong>Motorista:</strong> ${nome}</p>
                <p><strong>CPF:</strong> ${cpf}</p>
                <p><strong>Placa:</strong> ${placa}</p>
            </div>

            <div style="margin-bottom: 15px;">
                <img src="${routeData.imagemMapa}" alt="Mapa da rota" style="width: 100%; border-radius: 8px;" />
            </div>

            <div style="margin-bottom: 15px;">
                <p><strong>Data:</strong> ${agora.toLocaleDateString()} ${agora.toLocaleTimeString()}</p>
                <p><strong>Embarque:</strong> ${routeData.localEmbarque}</p>
                <p><strong>Destino:</strong> ${routeData.destinoFinal}</p>
                <p><strong>Distância Total:</strong> ${(routeData.distanciaBusca + routeData.distanciaCorrida).toFixed(2)} km</p>
            </div>

            <div style="text-align: center; font-size: 1.5em; font-weight: bold; color: #820ad1; margin: 15px 0;">
                VALOR: R$ ${parseFloat(valor).toFixed(2)}
            </div>

            <hr style="border-color: #820ad1;">
            <p style="text-align: center; font-size: 0.8em;">XmartDriver - ${agora.getFullYear()}</p>
        </div>
    `;

    const preview = document.getElementById('previewRecibo');
    preview.innerHTML = reciboHTML;
    preview.style.display = 'block';

    currentRoute = {
        preview,
        dados: {
            nome,
            cpf,
            placa,
            valor,
            ...routeData,
            data: agora.toLocaleString()
        }
    };
}




function enviarWhatsApp() {
    if (!currentRoute || !currentRoute.preview) {
        alert('Gere um recibo primeiro!');
        return;
    }

    const dados = currentRoute.dados;

    html2canvas(currentRoute.preview, {
        scale: 2,
        logging: false,
        useCORS: true
    }).then(canvas => {
        const imagemDataUrl = canvas.toDataURL('image/png');

        fetch(imagemDataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "recibo.png", { type: "image/png" });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    return navigator.share({
                        title: "Recibo da corrida",
                        text: `Recibo de ${dados.nome}\nValor: R$ ${dados.valor}`,
                        files: [file]
                    });
                } else {
                    // Fallback: baixa imagem e abre WhatsApp com texto
                    const link = document.createElement('a');
                    link.href = imagemDataUrl;
                    link.download = `recibo-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    const texto = `Recibo de Corrida\nMotorista: ${dados.nome}\nValor: R$ ${dados.valor}\nData: ${dados.data}`;
                    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                    window.open(url, '_blank');

                    alert("Recibo baixado! Agora é só anexar a imagem no WhatsApp.");
                }
            });
    }).catch(error => {
        console.error("Erro ao capturar recibo:", error);
        alert("Erro ao compartilhar o recibo.");
    });
}




// Funções do Banco de Dados
document.addEventListener('DOMContentLoaded', () => {
    let request = indexedDB.open('xmartDriverDB', 1);

    request.onupgradeneeded = event => {
        db = event.target.result;
        db.createObjectStore('ganhos', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('combustivel', { keyPath: 'id', autoIncrement: true });
    };

    request.onsuccess = event => {
        db = event.target.result;

        // ✅ Garante que os dados de combustível sejam exibidos ao abrir o app
        mostrarTabelaCombustivel();
    };
});


// Funções de Navegação
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
        data: new Date().toLocaleDateString("pt-BR"),
        uber: parseFloat(document.getElementById('uber').value) || 0,
        noveNove: parseFloat(document.getElementById('noveNove').value) || 0,
        indriver: parseFloat(document.getElementById('indriver').value) || 0,
        iupe: parseFloat(document.getElementById('iupe').value) || 0,
        rotas: parseFloat(document.getElementById('rotas').value) || 0,
        outras: parseFloat(document.getElementById('outras').value) || 0
    };

    const tx = db.transaction('ganhos', 'readwrite');
    tx.objectStore('ganhos').add(ganhos).onsuccess = () => {
        // ✅ limpa os campos corretamente
        ['uber','noveNove','indriver','iupe','rotas','outras'].forEach(id => {
            document.getElementById(id).value = '';
        });

        // ✅ dispara feedback visual
        const div = document.createElement('div');
        div.className = 'feedbackSucesso';
        div.textContent = '✅ Ganhos salvos com sucesso!';
        document.getElementById('ganhosDiarios').appendChild(div);
        setTimeout(() => div.remove(), 3000);
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
        const hoje = new Date();
        const ganhosFiltrados = [];

        req.result.forEach(item => {
            const dataStr = item.data;
            const hojeStr = hoje.toLocaleDateString("pt-BR");
            let incluir = false;

            if (filtro === "diario") {
                incluir = dataStr === hojeStr;
            } else if (filtro === "semanal") {
                const [dia, mes, ano] = dataStr.split("/");
                const dataItem = new Date(`${ano}-${mes}-${dia}`);
                const diffDias = (hoje - dataItem) / (1000 * 60 * 60 * 24);
                incluir = diffDias <= 7;
            } else if (filtro === "mensal") {
                const [dia, mes, ano] = dataStr.split("/");
                const dataItem = new Date(`${ano}-${mes}-${dia}`);
                incluir = dataItem.getMonth() === hoje.getMonth() &&
                          dataItem.getFullYear() === hoje.getFullYear();
            } else {
                incluir = true;
            }

            if (incluir) {
                total += item.uber + item.noveNove + item.indriver + item.iupe + item.rotas + item.outras;
                ganhosFiltrados.push(item);
            }
        });

        const nomes = {
            diario: "Hoje",
            semanal: "Últimos 7 dias",
            mensal: "Este mês"
        };

        const titulo = nomes[filtro] || "Todos os registros";
        document.getElementById('resultadoPeriodo').innerText =
            `Ganhos (${titulo}): R$ ${total.toFixed(2)}`;

        // plugin para forçar fundo branco no gráfico
        const pluginFundoBranco = {
            id: 'fundoBranco',
            beforeDraw: (chart) => {
                const ctx = chart.canvas.getContext('2d');
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        };

        // gerar dados para o gráfico
        const agrupado = {};
        ganhosFiltrados.forEach(item => {
            const data = item.data;
            if (!agrupado[data]) agrupado[data] = 0;
            agrupado[data] += item.uber + item.noveNove + item.indriver +
                              item.iupe + item.rotas + item.outras;
        });

        const labels = Object.keys(agrupado).sort((a, b) => {
            const [da, ma, aa] = a.split("/");
            const [db, mb, ab] = b.split("/");
            return new Date(`${aa}-${ma}-${da}`) - new Date(`${ab}-${mb}-${db}`);
        });

        const valores = labels.map(label => agrupado[label]);

        const ctx = document.getElementById('graficoGanhosLinha').getContext('2d');
        if (window.graficoGanhos) window.graficoGanhos.destroy();

        window.graficoGanhos = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Ganhos por dia',
                    data: valores,
                    borderColor: '#820ad1',
                    backgroundColor: 'rgba(130,10,209,0.15)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: v => `R$ ${v.toFixed(0)}`
                        }
                    }
                }
            },
            plugins: [pluginFundoBranco]
        });
    };
}




// Combustível
function salvarCombustivel() {
    const valor = parseFloat(document.getElementById('gastoCombustivel').value) || 0;
    
    if (valor <= 0) {
        alert('Informe um valor válido para o combustível!');
        return;
    }

    const tx = db.transaction('combustivel', 'readwrite');
    const store = tx.objectStore('combustivel');
    
    const gasto = {
        valor: valor,
        data: formatarDataHora() // Usando a função formatarDataHora já existente
    };

    const request = store.add(gasto);

    request.onsuccess = () => {
        // Limpa o campo
        document.getElementById('gastoCombustivel').value = '';
        
        // Feedback visual melhorado
        const feedback = document.createElement('div');
        feedback.style.color = 'white';
        feedback.style.backgroundColor = '#25D366';
        feedback.style.padding = '10px';
        feedback.style.borderRadius = '5px';
        feedback.style.marginTop = '10px';
        feedback.style.textAlign = 'center';
        feedback.textContent = '✅ Gasto com combustível salvo com sucesso!';
        
        const abaCombustivel = document.getElementById('combustivel');
        abaCombustivel.appendChild(feedback);
        
        // Remove o feedback após 3 segundos
        setTimeout(() => {
            feedback.remove();
        }, 3000);
        
        // Atualiza a tabela
        mostrarTabelaCombustivel();
    };

    request.onerror = () => {
        alert('Erro ao salvar o gasto de combustível!');
    };
}


// Função adicional para remover gastos
function removerGasto(id) {
    if (!confirm('Tem certeza que deseja remover este gasto?')) {
        return;
    }

    const tx = db.transaction('combustivel', 'readwrite');
    const store = tx.objectStore('combustivel');
    
    store.delete(id).onsuccess = () => {
        mostrarTabelaCombustivel();
        alert('Gasto removido com sucesso!');
    };
}

function limparTodosCombustiveis() {
    if (!confirm('Tem certeza que deseja remover TODOS os gastos de combustível? Esta ação não pode ser desfeita.')) {
        return;
    }

    const tx = db.transaction('combustivel', 'readwrite');
    tx.objectStore('combustivel').clear().onsuccess = () => {
        document.getElementById('tabelaCombustivel').innerHTML = 
            '<p style="color: white; text-align: center;">Nenhum gasto registrado</p>';
        alert('Todos os gastos de combustível foram removidos!');
    };
}
function mostrarTabelaCombustivel() {
    const tx = db.transaction('combustivel', 'readonly');
    const store = tx.objectStore('combustivel');
    const request = store.getAll();

    request.onsuccess = () => {
        const gastos = request.result;
        
        if (gastos.length === 0) {
            document.getElementById('tabelaCombustivel').innerHTML = 
                '<p style="color: white; text-align: center;">Nenhum gasto registrado ainda</p>';
            return;
        }

        // Ordena por data (mais recente primeiro)
        gastos.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        let html = `
            <table class="tabela-combustivel">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Valor (R$)</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        gastos.forEach(gasto => {
            html += `
                <tr>
                    <td>${gasto.data}</td>
                    <td>${gasto.valor.toFixed(2)}</td>
                    <td>
                        <button onclick="removerGasto(${gasto.id})" class="btn-remover">
                            Remover
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        document.getElementById('tabelaCombustivel').innerHTML = html;
    };

    request.onerror = () => {
        document.getElementById('tabelaCombustivel').innerHTML = 
            '<p style="color: red;">Erro ao carregar gastos</p>';
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
    document.getElementById('valorRecibo').value = resultado.toFixed(2);
}

function limparTaximetro() {
    document.getElementById('kmBusca').value = '';
    document.getElementById('kmCorrida').value = '';
    document.getElementById('resultadoTaximetro').innerText = '';
    document.getElementById('valorRecibo').value = '';
}

// Mapa
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

// Lucro Líquido
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

// Utilitários
function formatarDataHora() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}