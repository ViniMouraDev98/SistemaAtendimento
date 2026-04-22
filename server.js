const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'atendimentos.json');
const ATENDENTES_FILE = path.join(__dirname, 'data', 'atendentes.json');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, '[]');
      return [];
    }
    throw error;
  }
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const readAtendentes = () => {
  try {
    const data = fs.readFileSync(ATENDENTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      fs.mkdirSync(path.dirname(ATENDENTES_FILE), { recursive: true });
      fs.writeFileSync(ATENDENTES_FILE, '[]');
      return [];
    }
    throw error;
  }
};

const writeAtendentes = (data) => {
  fs.writeFileSync(ATENDENTES_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// Routes
app.get('/api/atendimentos', (req, res) => {
  try {
    const atendimentos = readData();
    res.json(atendimentos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler os dados.' });
  }
});

app.post('/api/atendimentos', (req, res) => {
  try {
    const novoAtendimento = {
      id: Date.now().toString(),
      ...req.body
    };
    const atendimentos = readData();
    atendimentos.push(novoAtendimento);
    writeData(atendimentos);
    res.status(201).json(novoAtendimento);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar o atendimento.' });
  }
});

app.put('/api/atendimentos/:id', (req, res) => {
  try {
    const { id } = req.params;
    let atendimentos = readData();
    const index = atendimentos.findIndex(a => a.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }
    
    atendimentos[index] = { ...atendimentos[index], ...req.body };
    writeData(atendimentos);
    res.json(atendimentos[index]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar o atendimento.' });
  }
});

app.delete('/api/atendimentos/:id', (req, res) => {
  try {
    const { id } = req.params;
    let atendimentos = readData();
    const index = atendimentos.findIndex(a => a.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }
    
    atendimentos.splice(index, 1);
    writeData(atendimentos);
    res.json({ message: 'Atendimento removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar o atendimento.' });
  }
});

// Rotas para Atendentes
app.get('/api/atendentes', (req, res) => {
  try {
    const atendentes = readAtendentes();
    res.json(atendentes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler os atendentes.' });
  }
});

app.post('/api/atendentes', (req, res) => {
  try {
    const novoAtendente = {
      id: Date.now().toString(),
      ...req.body
    };
    const atendentes = readAtendentes();
    atendentes.push(novoAtendente);
    writeAtendentes(atendentes);
    res.status(201).json(novoAtendente);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar o atendente.' });
  }
});

app.delete('/api/atendentes/:id', (req, res) => {
  try {
    const { id } = req.params;
    let atendentes = readAtendentes();
    const index = atendentes.findIndex(a => a.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Atendente não encontrado.' });
    }
    
    atendentes.splice(index, 1);
    writeAtendentes(atendentes);
    res.json({ message: 'Atendente removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar o atendente.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
