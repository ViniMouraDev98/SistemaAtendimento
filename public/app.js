const API_URL = '/api/atendimentos';

// Mobile Menu
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

if (menuToggle && sidebar) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

// Formatters
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Toast
const showToast = (message, isError = false) => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${isError ? 'error' : ''}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
};

// --- LOGIC FOR INDEX.HTML (Cadastro) ---
const cadastroForm = document.getElementById('cadastroForm');
const statusSelect = document.getElementById('status');

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');

const atendenteSelect = document.getElementById('atendente');

if (atendenteSelect && atendenteSelect.tagName === 'SELECT') {
  fetch('/api/atendentes')
    .then(res => res.json())
    .then(data => {
      atendenteSelect.innerHTML = '<option value="" disabled selected>Selecione um atendente...</option>';
      data.forEach(at => {
        const opt = document.createElement('option');
        opt.value = at.nomeAtendente;
        opt.textContent = at.nomeAtendente;
        atendenteSelect.appendChild(opt);
      });
      if (window._loadedAtendente) {
        atendenteSelect.value = window._loadedAtendente;
      }
    });
}

if (cadastroForm && editId) {
  const pageHeader = document.querySelector('.page-header h1');
  if (pageHeader) pageHeader.textContent = 'Alterar Atendimento';
  const submitBtn = cadastroForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Salvar Alterações';
  
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      const item = data.find(d => d.id === editId);
      if (item) {
        document.getElementById('data').value = item.data;
        
        window._loadedAtendente = item.atendente;
        const atInput = document.getElementById('atendente');
        if (atInput.tagName === 'SELECT' && atInput.options.length > 1) {
          atInput.value = item.atendente;
        } else {
          atInput.value = item.atendente;
        }

        document.getElementById('cliente').value = item.cliente;
        document.getElementById('status').value = item.status;
        document.getElementById('servico').value = item.servico;
        document.getElementById('valor').value = item.valor;
        document.getElementById('cidade').value = item.cidade;
        document.getElementById('estado').value = item.estado;
        
        if (statusSelect) statusSelect.dispatchEvent(new Event('change'));
      }
    })
    .catch(err => console.error('Erro ao carregar dados para edição:', err));
}

if (statusSelect) {
  statusSelect.addEventListener('change', (e) => {
    statusSelect.classList.remove('status-pago', 'status-naopago');
    if (e.target.value === 'Pago') {
      statusSelect.classList.add('status-pago');
    } else if (e.target.value === 'Não Pago') {
      statusSelect.classList.add('status-naopago');
    }
  });
}

if (cadastroForm) {
  cadastroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Basic validation
    let hasError = false;
    const inputs = cadastroForm.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.classList.remove('error');
      if (!input.value) {
        input.classList.add('error');
        hasError = true;
      }
    });

    if (hasError) {
      showToast('Preencha todos os campos corretamente.', true);
      return;
    }

    const data = {
      data: document.getElementById('data').value,
      atendente: document.getElementById('atendente').value,
      cliente: document.getElementById('cliente').value,
      status: document.getElementById('status').value,
      servico: document.getElementById('servico').value,
      valor: parseFloat(document.getElementById('valor').value),
      cidade: document.getElementById('cidade').value,
      estado: document.getElementById('estado').value,
    };

    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_URL}/${editId}` : API_URL;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast(editId ? 'Atendimento alterado com sucesso!' : 'Atendimento salvo com sucesso!');
        if (!editId) {
          cadastroForm.reset();
          if (statusSelect) statusSelect.classList.remove('status-pago', 'status-naopago');
        } else {
          setTimeout(() => { window.location.href = 'controle.html'; }, 1500);
        }
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar o atendimento.', true);
    }
  });
}

// --- LOGIC FOR CONTROLE.HTML (Dashboard) ---
const listContainer = document.getElementById('atendimentos-list');
let allData = [];
let chartInstance = null;

if (listContainer) {
  // Elements
  const mTotal = document.getElementById('metric-total');
  const mPagos = document.getElementById('metric-pagos');
  const mNaoPagos = document.getElementById('metric-naopagos');
  const mRecebido = document.getElementById('metric-recebido');
  const mAReceber = document.getElementById('metric-areceber');
  
  const fCliente = document.getElementById('filter-cliente');
  const fAtendente = document.getElementById('filter-atendente');
  const fData = document.getElementById('filter-data');
  const pills = document.querySelectorAll('.pill');
  let currentStatusFilter = 'Todos';

  const initControle = async () => {
    try {
      const res = await fetch(API_URL);
      allData = await res.json();
      // Sort by date (newest first)
      allData.sort((a, b) => new Date(b.data) - new Date(a.data));
      applyFilters();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados da API.', true);
    }
  };

  const updateDashboard = (filteredData) => {
    const total = filteredData.length;
    const pagos = filteredData.filter(d => d.status === 'Pago');
    const naoPagos = filteredData.filter(d => d.status === 'Não Pago');
    
    const vRecebido = pagos.reduce((acc, curr) => acc + (curr.valor || 0), 0);
    const vAReceber = naoPagos.reduce((acc, curr) => acc + (curr.valor || 0), 0);

    mTotal.textContent = total;
    mPagos.textContent = pagos.length;
    mNaoPagos.textContent = naoPagos.length;
    mRecebido.textContent = formatCurrency(vRecebido);
    mAReceber.textContent = formatCurrency(vAReceber);

    updateChart(filteredData);
  };

  const updateChart = (filteredData) => {
    const atendentesCount = {};
    filteredData.forEach(d => {
      atendentesCount[d.atendente] = (atendentesCount[d.atendente] || 0) + 1;
    });

    const labels = Object.keys(atendentesCount);
    const data = Object.values(atendentesCount);

    const ctx = document.getElementById('atendentesChart');
    if (!ctx) return;

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nº de Atendimentos',
          data: data,
          backgroundColor: '#3C3B6E',
          hoverBackgroundColor: '#B22234',
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  };

  const renderList = (filteredData) => {
    listContainer.innerHTML = '';
    
    if (filteredData.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">Nenhum atendimento encontrado.</div>';
      return;
    }

    filteredData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card list-item interactive';
      
      const isPago = item.status === 'Pago';
      const badgeClass = isPago ? 'pago' : 'naopago';

      card.innerHTML = `
        <div class="list-item-details" style="cursor: pointer;" onclick="openAtendimentoModal('${item.id}')" title="Clique para ver os detalhes">
          <div><strong>Data</strong>${formatDate(item.data)}</div>
          <div><strong>Atendente</strong>${item.atendente}</div>
          <div><strong>Cliente</strong>${item.cliente}</div>
          <div><strong>Serviço</strong>${item.servico}</div>
          <div><strong>Local</strong>${item.cidade} / ${item.estado}</div>
          <div><strong>Valor</strong>${formatCurrency(item.valor)}</div>
          <div><strong>Status</strong><span class="badge ${badgeClass}">${item.status}</span></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center; min-width: 100px;">
          <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="window.location.href='index.html?edit=${item.id}'">
            ✏️ Alterar
          </button>
          <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.85rem; width: 100%;" onclick="deleteAtendimento('${item.id}')">
            🗑️ Excluir
          </button>
        </div>
      `;
      listContainer.appendChild(card);
    });
  };

  const applyFilters = () => {
    const qCliente = fCliente.value.toLowerCase();
    const qAtendente = fAtendente.value.toLowerCase();
    const qData = fData.value;

    const filtered = allData.filter(item => {
      const matchCliente = item.cliente.toLowerCase().includes(qCliente);
      const matchAtendente = item.atendente.toLowerCase().includes(qAtendente);
      const matchData = qData ? item.data === qData : true;
      const matchStatus = currentStatusFilter === 'Todos' ? true : item.status === currentStatusFilter;

      return matchCliente && matchAtendente && matchData && matchStatus;
    });

    updateDashboard(filtered);
    renderList(filtered);
  };

  // Event Listeners for Filters
  fCliente.addEventListener('input', applyFilters);
  fAtendente.addEventListener('input', applyFilters);
  fData.addEventListener('input', applyFilters);

  pills.forEach(pill => {
    if (pill.id === 'btn-limpar-filtros') return;
    pill.addEventListener('click', (e) => {
      pills.forEach(p => {
        if (p.id !== 'btn-limpar-filtros') p.classList.remove('active');
      });
      e.target.classList.add('active');
      currentStatusFilter = e.target.getAttribute('data-status');
      applyFilters();
    });
  });

  const btnLimpar = document.getElementById('btn-limpar-filtros');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      fCliente.value = '';
      fAtendente.value = '';
      fData.value = '';
      currentStatusFilter = 'Todos';
      
      pills.forEach(p => p.classList.remove('active'));
      const pillTodos = document.querySelector('.pill[data-status="Todos"]');
      if (pillTodos) pillTodos.classList.add('active');
      
      applyFilters();
    });
  }

  // Global Delete Function
  window.deleteAtendimento = async (id) => {
    if (confirm('Tem certeza que deseja excluir este atendimento?')) {
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          showToast('Atendimento excluído!');
          initControle(); // Reload
        } else {
          throw new Error('Erro ao excluir');
        }
      } catch (error) {
        console.error(error);
        showToast('Erro ao excluir atendimento.', true);
      }
    }
  };

  // Modal Logic
  const modal = document.getElementById('atendimentoModal');
  const closeModalBtn = document.getElementById('closeModal');
  const modalDetails = document.getElementById('modal-details');

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => modal.classList.remove('open'));
    window.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  window.openAtendimentoModal = (id) => {
    const item = allData.find(d => d.id === id);
    if (!item) return;

    modalDetails.innerHTML = `
      <p><strong>Data:</strong> ${formatDate(item.data)}</p>
      <p><strong>Cliente:</strong> ${item.cliente}</p>
      <p><strong>Atendente:</strong> ${item.atendente}</p>
      <p><strong>Serviço:</strong> ${item.servico}</p>
      <p><strong>Local:</strong> ${item.cidade} - ${item.estado}</p>
      <p><strong>Valor:</strong> ${formatCurrency(item.valor)}</p>
      <p><strong>Status:</strong> ${item.status}</p>
    `;
    modal.classList.add('open');
  };

  // Init
  initControle();
}

// --- LOGIC FOR ATENDENTES.HTML ---
const atendenteForm = document.getElementById('atendenteForm');
const atendentesListContainer = document.getElementById('atendentes-list');

if (atendenteForm) {
  const loadAtendentes = async () => {
    try {
      const res = await fetch('/api/atendentes');
      const data = await res.json();
      atendentesListContainer.innerHTML = '';
      if (data.length === 0) {
        atendentesListContainer.innerHTML = '<div class="empty-state">Nenhum atendente cadastrado.</div>';
        return;
      }
      data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card list-item interactive';
        card.innerHTML = `
          <div class="list-item-details" style="grid-template-columns: 1fr;">
            <div><strong>Nome do Atendente</strong>${item.nomeAtendente}</div>
          </div>
          <button class="btn btn-danger" onclick="deleteAtendente('${item.id}')">🗑️ Excluir</button>
        `;
        atendentesListContainer.appendChild(card);
      });
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar atendentes', true);
    }
  };

  atendenteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nomeAtendente = document.getElementById('nomeAtendente').value;
    if (!nomeAtendente) return;

    try {
      const res = await fetch('/api/atendentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeAtendente })
      });
      if (res.ok) {
        showToast('Atendente salvo com sucesso!');
        atendenteForm.reset();
        loadAtendentes();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar atendente', true);
    }
  });

  window.deleteAtendente = async (id) => {
    if (confirm('Deseja excluir este atendente?')) {
      try {
        const res = await fetch('/api/atendentes/' + id, { method: 'DELETE' });
        if (res.ok) {
          showToast('Atendente excluído!');
          loadAtendentes();
        } else {
          throw new Error('Erro ao excluir');
        }
      } catch (e) {
        console.error(e);
        showToast('Erro ao excluir atendente', true);
      }
    }
  };

  loadAtendentes();
}
