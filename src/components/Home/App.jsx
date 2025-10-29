import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Index.css';
import logo from '../../images/logo.png';

import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast, ToastContainer } from 'react-toastify';

import { FaSearch, FaEdit, FaTrashAlt } from "react-icons/fa";
import { IoHomeSharp } from "react-icons/io5";
import { SiCashapp } from "react-icons/si";
import { MdSchool } from "react-icons/md";
import HamburgerButton from './HamburgerButton.jsx';
import Sidebar from './Sidebar.jsx';

const BarChart = React.lazy(() => import('./BarChart.jsx'));

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [registros, setRegistros] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(true);
  const [registrosError, setRegistrosError] = useState(null);
  const [totalComissoes, setTotalComissoes] = useState(0);

  const [selectedId, setSelectedId] = useState(null);

  const [activeView, setActiveView] = useState('inicio');
  const [formTitulo, setFormTitulo] = useState('');
  const [formValorVenda, setFormValorVenda] = useState('');
  const [formPorcentagem, setFormPorcentagem] = useState('');
  const [formUsuarioSelecionado, setFormUsuarioSelecionado] = useState('');
  const [formDataHora, setFormDataHora] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('titulo');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const body = document.body;
    if (sidebarOpen) {
      body.classList.add('no-scroll');
    } else {
      body.classList.remove('no-scroll');
    }
    return () => body.classList.remove('no-scroll');
  }, [sidebarOpen]);
  const [editingComissao, setEditingComissao] = useState(null);

  const [erros, setErros] = useState({
    titulo: '',
    valorVenda: '',
    porcentagem: '',
    usuario: '',
    dataHora: '',
    cnpj: ''
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const registrosMock = useMemo(() => ([
  ]), []);

  async function fetchRegistros() {
    setLoadingRegistros(true);
    setRegistrosError(null);
    try {
      const res = await api.get('/schedule');
      const dadosApi = Array.isArray(res.data) && res.data.length > 0 ? res.data : registrosMock;

      const dadosOrdenados = dadosApi.sort((a, b) => {
        const dataA = new Date(a.data || a.created_at || 0);
        const dataB = new Date(b.data || b.created_at || 0);
        return dataB - dataA;
      });

      setRegistros(dadosOrdenados);

      const totalCalculado = dadosOrdenados.reduce((soma, registro) => {
        const comissao = typeof registro.valorPorcentagem === 'number' ? registro.valorPorcentagem : 0;
        return soma + comissao;
      }, 0);
      setTotalComissoes(totalCalculado);

    } catch (err) {
      setRegistros(registrosMock);
      setRegistrosError(err);
    } finally {
      setLoadingRegistros(false);
    }
  }

  async function fetchUsuarios() {
    try {
      const res = await api.get('/users');
      setUsuarios(res.data || []);
    } catch (err) {
      setUsuarios([]);
      toast.warn('Não foi possível carregar a lista de usuários. Tente recarregar a página.', {
        ...toastConfig,
        autoClose: 4000,
      });
    }
  }

  // Função para formatar data/hora para datetime-local (considerando fuso horário local)
  const formatarDataHoraParaInput = (data) => {
    if (!data) return '';
    
    try {
      const dataObj = new Date(data);
      
      // Verificar se a data é válida
      if (isNaN(dataObj.getTime())) {
        console.warn('Data inválida recebida:', data);
        return '';
      }
      
      // Obter o fuso horário local e criar data ajustada
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const hora = String(dataObj.getHours()).padStart(2, '0');
      const minuto = String(dataObj.getMinutes()).padStart(2, '0');
      
      return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
    } catch (error) {
      console.error('Erro ao formatar data para input:', error);
      return '';
    }
  };

  // Função para converter data do input para formato padrão ISO
  const converterDataDoInput = (dataInput) => {
    if (!dataInput) return '';
    
    try {
      // O input datetime-local já vem no formato local, apenas convertemos para ISO
      const dataObj = new Date(dataInput);
      
      if (isNaN(dataObj.getTime())) {
        console.warn('Data do input inválida:', dataInput);
        return '';
      }
      
      return dataObj.toISOString();
    } catch (error) {
      console.error('Erro ao converter data do input:', error);
      return '';
    }
  };

  useEffect(() => {
    fetchRegistros();
    fetchUsuarios();

    const agora = new Date();
    const dataHoraAtual = formatarDataHoraParaInput(agora);
    setFormDataHora(dataHoraAtual);
  }, [registrosMock]);

  // Effect para lidar com redirecionamento do treinamento
  useEffect(() => {
    if (location.state?.redirectToCommissions && location.state?.prefilledData) {
      const { cnpj, titulo } = location.state.prefilledData;
      
      // Mudar para a view de comissões
      setActiveView('comissoes');
      
      // Pré-preencher os dados
      if (cnpj) {
        setFormCnpj(formatarCNPJ(cnpj));
      }
      if (titulo) {
        setFormTitulo(titulo);
      }
      
      // Limpar o state para evitar re-execução
      navigate('/home', { replace: true, state: {} });
      
      // Mostrar toast informativo
      toast.info('Dados do treinamento carregados no formulário de comissão!', {
        ...toastConfig,
        autoClose: 3000,
      });
    } else if (location.state?.activeView) {
      // Navegar para a view específica vinda da página de treinamento
      setActiveView(location.state.activeView);
      
      // Limpar o state
      navigate('/home', { replace: true, state: {} });
    }
  }, [location.state, navigate]);




  const formatarMoeda = (valor) => {
    const numero = valor.replace(/\D/g, '');
    const numeroFormatado = (Number(numero) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
    return numeroFormatado;
  };

  const formatarCNPJ = (valor) => {
    const numero = valor.replace(/\D/g, '');
    return numero
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const obterValorNumerico = (valorFormatado) => {
    return valorFormatado.replace(/[^\d]/g, '') / 100;
  };

  const toastConfig = {
    position: "top-right",
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  const valorComissaoCalculado = useMemo(() => {
    const valorNumerico = obterValorNumerico(formValorVenda);
    return valorNumerico && formPorcentagem ? (valorNumerico * parseFloat(formPorcentagem)) / 100 : 0;
  }, [formValorVenda, formPorcentagem]);
  const validarTitulo = (titulo) => {
    if (!titulo.trim()) return 'Título é obrigatório';
    if (titulo.trim().length < 3) return 'Título deve ter pelo menos 3 caracteres';
    if (titulo.trim().length > 100) return 'Título deve ter no máximo 100 caracteres';
    return '';
  };

  const validarValorVenda = (valor) => {
    const valorNumerico = obterValorNumerico(valor);
    if (!valor || valorNumerico === 0) return 'Valor de venda é obrigatório';
    if (valorNumerico < 0) return 'Valor não pode ser negativo';
    if (valorNumerico > 999999999) return 'Valor muito alto';
    return '';
  };

  const validarPorcentagem = (porcentagem) => {
    if (!porcentagem) return 'Porcentagem é obrigatória';
    const num = parseFloat(porcentagem);
    if (isNaN(num)) return 'Porcentagem deve ser um número';
    if (num <= 0) return 'Porcentagem deve ser maior que 0';
    if (num > 100) return 'Porcentagem não pode ser maior que 100%';
    return '';
  };

  const validarUsuario = (usuarioId) => {
    if (!usuarioId) return 'Selecione um usuário';
    return '';
  };

  const validarDataHora = (dataHora) => {
    if (!dataHora) return 'Data e hora são obrigatórias';
    const data = new Date(dataHora);
    if (isNaN(data.getTime())) return 'Data inválida';
    const agora = new Date();
    const umAnoAtras = new Date(agora.getFullYear() - 1, agora.getMonth(), agora.getDate());
    const umAnoFrente = new Date(agora.getFullYear() + 1, agora.getMonth(), agora.getDate());
    if (data < umAnoAtras) return 'Data não pode ser mais de 1 ano no passado';
    if (data > umAnoFrente) return 'Data não pode ser mais de 1 ano no futuro';
    return '';
  };

  const validarCNPJ = (cnpj) => {
    if (!cnpj) return 'CNPJ é obrigatório';
    const numero = cnpj.replace(/\D/g, '');
    if (numero.length !== 14) return 'CNPJ deve ter 14 dígitos';

    if (/^(\d)\1+$/.test(numero)) return 'CNPJ inválido';

    let tamanho = numero.length - 2;
    let numeros = numero.substring(0, tamanho);
    let digitos = numero.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return 'CNPJ inválido';

    tamanho = tamanho + 1;
    numeros = numero.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return 'CNPJ inválido';

    return '';
  };

  const filteredRegistros = useMemo(() => {
    let filtered = registros.filter(r => {
      let passDateFilter = true;
      let passTextFilter = true;

      // Filtro por data/período (sempre aplicado se as datas estiverem preenchidas)
      if (searchDateFrom || searchDateTo) {
        const recordDate = new Date(r.data);

        if (searchDateFrom) {
          const fromDate = new Date(searchDateFrom);
          if (recordDate < fromDate) passDateFilter = false;
        }

        if (searchDateTo) {
          const toDate = new Date(searchDateTo);
          toDate.setHours(23, 59, 59, 999); // Final do dia
          if (recordDate > toDate) passDateFilter = false;
        }
      }

      // Filtro por texto (aplicado se o termo estiver preenchido)
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase();
        switch (searchType) {
          case 'titulo':
            passTextFilter = r.titulo?.toLowerCase().includes(termo);
            break;
          case 'usuario':
            passTextFilter = r.usuario?.toLowerCase().includes(termo);
            break;
          case 'cnpj':
            passTextFilter = r.cnpj?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''));
            break;
          case 'todos':
            passTextFilter = (
              r.titulo?.toLowerCase().includes(termo) ||
              r.usuario?.toLowerCase().includes(termo) ||
              r.cnpj?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
            );
            break;
          default:
            passTextFilter = true;
        }
      }

      // Registro passa se atende ambos os filtros (ou se o filtro não está ativo)
      return passDateFilter && passTextFilter;
    });

    filtered.sort((a, b) => {
      const dataA = new Date(a.data || 0);
      const dataB = new Date(b.data || 0);
      return sortOrder === 'desc' ? dataB - dataA : dataA - dataB;
    });

    return filtered;
  }, [registros, searchTerm, searchType, sortOrder, searchDateFrom, searchDateTo]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRegistros.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRegistros.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleTituloChange = (valor) => {
    setFormTitulo(valor);
    const erro = validarTitulo(valor);
    setErros(prev => ({ ...prev, titulo: erro }));
  };

  const handleValorVendaChange = (valor) => {
    const valorFormatado = formatarMoeda(valor);
    setFormValorVenda(valorFormatado);
    const erro = validarValorVenda(valorFormatado);
    setErros(prev => ({ ...prev, valorVenda: erro }));
  };

  const handlePorcentagemChange = (valor) => {
    const valorLimpo = valor.replace(/[^0-9.,]/g, '').replace(',', '.');
    setFormPorcentagem(valorLimpo);
    const erro = validarPorcentagem(valorLimpo);
    setErros(prev => ({ ...prev, porcentagem: erro }));
  };

  const handleUsuarioChange = (valor) => {
    setFormUsuarioSelecionado(valor);
    const erro = validarUsuario(valor);
    setErros(prev => ({ ...prev, usuario: erro }));
  };

  const handleDataHoraChange = (valor) => {
    setFormDataHora(valor);
    const erro = validarDataHora(valor);
    setErros(prev => ({ ...prev, dataHora: erro }));
  };

  const handleCnpjChange = (valor) => {
    const valorFormatado = formatarCNPJ(valor);
    setFormCnpj(valorFormatado);
    const erro = validarCNPJ(valorFormatado);
    setErros(prev => ({ ...prev, cnpj: erro }));
  };

  const limparFormulario = () => {
    setFormTitulo('');
    setFormValorVenda('');
    setFormPorcentagem('');
    setFormUsuarioSelecionado('');
    const agora = new Date();
    const dataHoraAtual = formatarDataHoraParaInput(agora);
    setFormDataHora(dataHoraAtual);
    setFormCnpj('');
    setEditingComissao(null);
    setErros({
      titulo: '',
      valorVenda: '',
      porcentagem: '',
      usuario: '',
      dataHora: '',
      cnpj: ''
    });

    if (!editingComissao) {
      toast.info('Formulário limpo!', {
        ...toastConfig,
        autoClose: 2000,
      });
    }
  };

  const carregarComissaoParaEdicao = (comissao) => {
    if (!comissao) {
      toast.error('Erro: Dados da comissão não encontrados.');
      return;
    }

    try {
      setFormTitulo(comissao.titulo || '');

      const valorParaFormatar = comissao.valorPorcentagem || comissao.valor;

      if (valorParaFormatar) {
        const valorEmCentavos = valorParaFormatar < 1000 ? valorParaFormatar * 100 : valorParaFormatar;
        setFormValorVenda(formatarMoeda(valorEmCentavos.toString()));
      }

      setFormPorcentagem(comissao.porcentagem?.toString() || '');
      setFormUsuarioSelecionado(comissao.idUsuario || comissao.usuario_id || '');

      if (comissao.data) {
        const dataFormatada = formatarDataHoraParaInput(comissao.data);
        setFormDataHora(dataFormatada);
      }

      setFormCnpj(formatarCNPJ(comissao.cnpj || ''));
      setEditingComissao(comissao);
      setActiveView('comissoes');

      toast.info('Dados carregados para edição!', {
        ...toastConfig,
        autoClose: 2000,
      });
    } catch (error) {
      toast.error('Erro ao carregar dados para edição.');
    }
  };

  const handleSubmitCadastro = async (e) => {
    e.preventDefault();

    const errosTitulo = validarTitulo(formTitulo);
    const errosValorVenda = validarValorVenda(formValorVenda);
    const errosPorcentagem = validarPorcentagem(formPorcentagem);
    const errosUsuario = validarUsuario(formUsuarioSelecionado);
    const errosDataHora = validarDataHora(formDataHora);
    const errosCnpj = validarCNPJ(formCnpj);

    const novosErros = {
      titulo: errosTitulo,
      valorVenda: errosValorVenda,
      porcentagem: errosPorcentagem,
      usuario: errosUsuario,
      dataHora: errosDataHora,
      cnpj: errosCnpj
    };
    setErros(novosErros);

    const temErros = Object.values(novosErros).some(erro => erro !== '');
    if (temErros) {
      toast.error('Por favor, corrija os erros no formulário antes de continuar.', {
        ...toastConfig,
        autoClose: 3000,
      });
      return;
    }

    if (!user || !user.id) {
      toast.error('Erro: Usuário não autenticado.', {
        ...toastConfig,
        autoClose: 3000,
      });
      return;
    }

    const valorNumerico = obterValorNumerico(formValorVenda);
    const novaComissao = {
      titulo: formTitulo.trim(),
      cnpj: formCnpj.replace(/\D/g, ''),
      valor: valorNumerico,
      porcentagem: parseFloat(formPorcentagem),
      valorPorcentagem: valorComissaoCalculado,
      idUsuario: formUsuarioSelecionado,
      data: converterDataDoInput(formDataHora),
      temTaxa: true
    };

    setIsSubmitting(true);

    const isEditing = !!editingComissao;
    const toastId = toast.loading(isEditing ? 'Atualizando comissão...' : 'Cadastrando comissão...', {
      ...toastConfig,
    });

    try {
      if (isEditing) {
        await api.put(`/schedule/${editingComissao.id}`, novaComissao);
      } else {
        await api.post('/schedule', novaComissao);
      }

      toast.update(toastId, {
        render: isEditing ? 'Comissão atualizada com sucesso!' : 'Comissão cadastrada com sucesso!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        ...toastConfig,
      });

      await fetchRegistros();
      setActiveView('pesquisar');
      limparFormulario();
    } catch (error) {
      const mensagemErro = error.response?.data?.message || error.message || 'Erro desconhecido';

      toast.update(toastId, {
        render: `Erro ao ${isEditing ? 'atualizar' : 'cadastrar'}: ${mensagemErro}`,
        type: 'error',
        isLoading: false,
        autoClose: 5000,
        ...toastConfig,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectNew = (id) => {
    setSelectedIds(prevIds => {
      const isCurrentlySelected = prevIds.includes(id);

      if (isCurrentlySelected) {
        const newIds = prevIds.filter(selectedId => selectedId !== id);
        return newIds;
      } else {
        const newIds = [...prevIds, id];
        return newIds;
      }
    });
  };

  const handleSelectAll = () => {
    const allCurrentIds = currentItems.map(item => item.id);
    const allSelected = allCurrentIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allCurrentIds);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prevIds => {
      const numId = Number(id);
      const isCurrentlySelected = prevIds.some(selectedId => Number(selectedId) === numId);

      let newSelection;
      if (isCurrentlySelected) {
        newSelection = prevIds.filter(selectedId => Number(selectedId) !== numId);
      } else {
        newSelection = [...prevIds, numId];
      }

      return newSelection;
    });
  };
  const clearSelection = () => setSelectedIds([]);

  const abrirModalExclusao = () => {
    if (selectedIds.length === 0) {
      toast.warning('Selecione pelo menos uma comissão para excluir.', {
        ...toastConfig,
        autoClose: 3000,
      });
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmarExclusao = async () => {
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/schedule/${id}`)));
      toast.success(`${selectedIds.length} comissão(ões) excluída(s) com sucesso!`, {
        ...toastConfig,
        autoClose: 3000,
      });
      setSelectedIds([]);
      setShowDeleteModal(false);
      await fetchRegistros();
    } catch (error) {
      toast.error('Erro ao excluir comissões. Tente novamente.', {
        ...toastConfig,
        autoClose: 4000,
      });
    }
  };

  const cancelarExclusao = () => {
    setShowDeleteModal(false);
  };

  const handleSelectRecord = (id) => setSelectedId(prev => (prev === id ? null : id));

  return (
    <>
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNavigate={setActiveView} 
        currentPage={activeView}
      />
      <div id="container-menu" role="banner">
        <div className="menu-toggle-wrapper">
          <HamburgerButton open={sidebarOpen} onClick={() => setSidebarOpen(v => !v)} />
        </div>
        <h1>Comissões BMS</h1>
        <img src={logo} alt="Logo Comissões BMS" />
      </div>

      <div id="pages" role="navigation" aria-label="Páginas">
        <button onClick={() => setActiveView('inicio')} className={`btn-pages ${activeView === 'inicio' ? 'active' : ''}`}><i><IoHomeSharp /></i>Início</button>
        <button onClick={() => setActiveView('comissoes')} id='btn-pg' className={`btn-pages ${activeView === 'comissoes' ? 'active' : ''}`}><i><SiCashapp /></i>Comissões</button>
        <button onClick={() => navigate('/treinamento')} className={`btn-pages`}><i><MdSchool /></i>Treinamento</button>
        <button onClick={() => setActiveView('pesquisar')} className={`btn-pages ${activeView === 'pesquisar' ? 'active' : ''}`}><i><FaSearch /></i>Pesquisar</button>
      </div>

      <main>
        {activeView === 'inicio' && (
          <>
            <div id="summary-container">
              <div id="summary">
                <p id="text-body">Total</p>
                <h1 id="total">{totalComissoes?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h1>
                <p>{registros.length} registros no total</p>
              </div>
              <button id="card-button" onClick={() => setActiveView('comissoes')}>Comissões</button>
            </div>
            <div id="graphic-container">
              <div id="graphic">
                <Suspense fallback={<div className="chart-loading">Carregando gráfico...</div>}>
                  <BarChart />
                </Suspense>
              </div>
            </div>
            <div id="prev-container">
              <div id="prev-comissoes">
                <h1>Últimos registros</h1>
                {loadingRegistros ? (
                  <div className="registros-loading">Carregando registros...</div>
                ) : registrosError ? (
                  <div className="registros-error">Erro ao carregar registros</div>
                ) : registros.length === 0 ? (
                  <div className="registros-empty">
                    <span>Nenhum registro encontrado</span>
                  </div>
                ) : (
                  registros.slice(0, 5).map(reg => {
                    const dataFormatada = reg.data ?
                      new Date(reg.data).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : 'Data não informada';

                    return (
                      <div className={`registro ${reg.id === selectedId ? 'selected' : ''}`} key={reg.id} onClick={() => handleSelectRecord(reg.id)}>
                        <img src={logo} alt={`${reg.titulo} logo`} />
                        <div id="info-registro">
                          <h1>{reg.titulo}</h1>
                          <p>{reg.cnpj}</p>
                          <span className="data-registro">{dataFormatada}</span>
                        </div>
                        <p className="valor-registro">{reg.valorPorcentagem?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {activeView === 'comissoes' && user?.role === 'admin' && (
          <div className="form-container">
            <form className="form-card" onSubmit={handleSubmitCadastro}>
              <h1>{editingComissao ? 'Editar Comissão' : 'Nova Comissão'}</h1>
              {editingComissao && (
                <div className="edit-info">
                  <span>Editando: {editingComissao.titulo}</span>
                  <button type="button" onClick={limparFormulario} className="btn-cancel-edit">
                    Cancelar Edição
                  </button>
                </div>
              )}
              <div className="form-field">
                <label htmlFor="titulo">Título *</label>
                <input
                  id="titulo"
                  type="text"
                  value={formTitulo}
                  onChange={(e) => handleTituloChange(e.target.value)}
                  className={erros.titulo ? 'error' : ''}
                  placeholder="Digite o título da comissão"
                  maxLength="100"
                />
                {erros.titulo && <span className="error-message">{erros.titulo}</span>}
              </div>
              <div className="form-field-group">
                <div className="form-field">
                  <label htmlFor="valorVenda">Valor Venda *</label>
                  <input
                    id="valorVenda"
                    type="text"
                    value={formValorVenda}
                    onChange={(e) => handleValorVendaChange(e.target.value)}
                    className={erros.valorVenda ? 'error' : ''}
                    placeholder="R$ 0,00"
                  />
                  {erros.valorVenda && <span className="error-message">{erros.valorVenda}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="porcentagem">Porcentagem (%) *</label>
                  <input
                    id="porcentagem"
                    type="text"
                    value={formPorcentagem}
                    onChange={(e) => handlePorcentagemChange(e.target.value)}
                    className={erros.porcentagem ? 'error' : ''}
                    placeholder="Ex: 5.5"
                  />
                  {erros.porcentagem && <span className="error-message">{erros.porcentagem}</span>}
                </div>
              </div>
              <div className="form-field">
                <label>Valor Comissão (Calculado)</label>
                <input
                  type="text"
                  value={valorComissaoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  disabled
                  className="calculated-field"
                />
              </div>
              <div className="form-field">
                <label htmlFor="usuario">Usuário *</label>
                <select
                  id="usuario"
                  value={formUsuarioSelecionado}
                  onChange={(e) => handleUsuarioChange(e.target.value)}
                  className={erros.usuario ? 'error' : ''}
                  required
                >
                  <option value="">Selecione um usuário</option>
                  {user && (
                    <option value={user.id} style={{ fontWeight: 'bold' }}>
                      {user.nome} - {user.email} (Você)
                    </option>
                  )}
                  {usuarios.length === 0 ? (
                    <option value="" disabled>Carregando usuários...</option>
                  ) : (
                    usuarios
                      .filter(usuario => usuario.id !== user?.id)
                      .map(usuario => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nome} - {usuario.email}
                        </option>
                      ))
                  )}
                </select>
                {erros.usuario && <span className="error-message">{erros.usuario}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="dataHora">Data e Hora *</label>
                <input
                  id="dataHora"
                  type="datetime-local"
                  value={formDataHora}
                  onChange={(e) => handleDataHoraChange(e.target.value)}
                  className={erros.dataHora ? 'error' : ''}
                />
                {erros.dataHora && <span className="error-message">{erros.dataHora}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="cnpj">CNPJ *</label>
                <input
                  id="cnpj"
                  type="text"
                  value={formCnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  className={erros.cnpj ? 'error' : ''}
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  maxLength="18"
                />
                {erros.cnpj && <span className="error-message">{erros.cnpj}</span>}
              </div>
              <div className="form-buttons">
                <button
                  type="button"
                  className="btn-clear"
                  onClick={limparFormulario}
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={
                    isSubmitting ||
                    Object.values(erros).some(erro => erro !== '') ||
                    !formTitulo ||
                    !formValorVenda ||
                    !formPorcentagem ||
                    !formUsuarioSelecionado ||
                    !formDataHora ||
                    !formCnpj
                  }
                >
                  {isSubmitting
                    ? (editingComissao ? 'Atualizando...' : 'Cadastrando...')
                    : (editingComissao ? 'Atualizar Comissão' : 'Cadastrar Comissão')
                  }
                </button>
              </div>
            </form>
          </div>
        )}

        {activeView === 'comissoes' && user?.role === 'sup' && (
          <div className="summary-container">
            <div className="summary-header">
              <h1>Resumo de Comissões</h1>
              <p className="subtitle">Visualização das suas comissões cadastradas</p>
            </div>
            
            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <SiCashapp />
                </div>
                <div className="stat-content">
                  <h3>Total de Comissões</h3>
                  <p className="stat-value">{filteredRegistros.length}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <SiCashapp />
                </div>
                <div className="stat-content">
                  <h3>Valor Total</h3>
                  <p className="stat-value">{totalComissoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>

            <div className="summary-list">
              <h2>Últimas Comissões</h2>
              <div className="commission-list">
                {loadingRegistros ? (
                  <div className="loading-state">
                    <p>Carregando comissões...</p>
                  </div>
                ) : filteredRegistros.length === 0 ? (
                  <div className="empty-state">
                    <SiCashapp className="empty-icon" />
                    <h3>Nenhuma comissão encontrada</h3>
                    <p>Suas comissões aparecerão aqui quando forem cadastradas pelo administrador.</p>
                  </div>
                ) : (
                  filteredRegistros
                    .slice(0, 10) // Mostrar apenas as 10 últimas
                    .map((reg) => {
                      const dataFormatada = reg.data
                        ? new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(new Date(reg.data))
                        : 'Data não disponível';

                      return (
                        <div key={reg.id} className="commission-item readonly">
                          <div className="commission-info">
                            <h3>{reg.titulo}</h3>
                            <p className="commission-cnpj">{reg.cnpj}</p>
                            <p className="commission-date">{dataFormatada}</p>
                          </div>
                          <div className="commission-value">
                            <span className="value">{reg.valorPorcentagem?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            <span className="percentage">{reg.porcentagem}%</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === 'pesquisar' && (
          <div className="search-container">
            <div className="search-header">
              <div className="search-controls">
                <div className="search-input-wrapper">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder={`Pesquisar por ${searchType === 'todos' ? 'qualquer campo' : searchType}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="date-search-wrapper">
                  <div className="date-input-group">
                    <label>De:</label>
                    <input
                      type="date"
                      value={searchDateFrom}
                      onChange={(e) => setSearchDateFrom(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="date-input-group">
                    <label>Até:</label>
                    <input
                      type="date"
                      value={searchDateTo}
                      onChange={(e) => setSearchDateTo(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSearchDateFrom('');
                      setSearchDateTo('');
                    }}
                    className="btn-clear-dates"
                    title="Limpar datas"
                  >
                    Limpar
                  </button>
                </div>

                <div className="filter-controls">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="filter-select"
                  >
                    <option value="todos">Todos os campos</option>
                    <option value="titulo">Título</option>
                    <option value="usuario">Usuário</option>
                    <option value="cnpj">CNPJ</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="filter-select"
                  >
                    <option value="desc">Mais recente</option>
                    <option value="asc">Mais antigo</option>
                  </select>
                </div>
              </div>
              <div className="action-buttons">
                <button
                  onClick={handleSelectAll}
                  className="btn-select-all"
                  title={currentItems.length > 0 && currentItems.every(item => selectedIds.includes(item.id))
                    ? `Desselecionar todos (${currentItems.length} itens)`
                    : `Selecionar todos (${currentItems.length} itens da página)`
                  }
                >
                  <i>☐</i> {currentItems.length > 0 && currentItems.every(item => selectedIds.includes(item.id))
                    ? `Desselecionar Todos`
                    : `Selecionar Todos (${currentItems.length})`
                  }
                </button>
                {selectedIds.length > 0 && (
                  <button onClick={clearSelection} className="btn-clear">
                    <i>×</i> Limpar Seleção ({selectedIds.length})
                  </button>
                )}
                {user?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => {
                        if (selectedIds.length === 1) {
                          const selectedId = selectedIds[0];
                          const comissaoParaEditar = filteredRegistros.find(r =>
                            r.id === selectedId || Number(r.id) === Number(selectedId)
                          );

                          if (comissaoParaEditar) {
                            carregarComissaoParaEdicao(comissaoParaEditar);
                          } else {
                            toast.error('Erro: Comissão não encontrada para edição.');
                          }
                        }
                      }}
                      disabled={selectedIds.length !== 1}
                      title={
                        selectedIds.length === 0 ? 'Clique em um item da tabela para selecioná-lo e depois editar' :
                          selectedIds.length > 1 ? `${selectedIds.length} itens selecionados - EDIÇÃO DESABILITADA: Selecione apenas 1 item para editar` :
                            'Editar o item selecionado'
                      }
                      className="btn-edit"
                    >
                      <i><FaEdit /></i> Editar
                    </button>
                    <button onClick={abrirModalExclusao} className="btn-delete" disabled={selectedIds.length === 0}>
                      <i><FaTrashAlt /></i> Excluir ({selectedIds.length})
                    </button>
                  </>
                )}
                {user?.role === 'sup' && (
                  <div className="role-info">
                    <p>🔒 Modo visualização - Apenas administradores podem editar comissões</p>
                  </div>
                )}
              </div>
            </div>
            <div className="results-section">
              <div className="comissoes-table-container">
                <div className="comissoes-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Usuário</th>
                        <th>CNPJ</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRegistros ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', height: '350px', verticalAlign: 'middle' }}>Carregando...</td></tr>
                      ) : currentItems.length === 0 ? (
                        <tr className="no-results-row"><td colSpan="4" className="no-results-message">Nenhum registro encontrado.</td></tr>
                      ) : (
                        currentItems.map(r => {
                          const isSelected = selectedIds.includes(r.id);

                          return (
                            <tr
                              key={r.id}
                              data-id={r.id}
                              className={`clickable-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectNew(r.id)}
                              style={{
                                cursor: 'pointer'
                              }}
                            >
                              <td title={r.titulo?.length > 30 ? r.titulo : undefined}>
                                <span className={r.titulo?.length > 30 ? 'truncated-text' : ''}>
                                  {r.titulo}
                                </span>
                              </td>
                              <td title={r.usuario?.length > 20 ? r.usuario : undefined}>
                                <span className={r.usuario?.length > 20 ? 'truncated-text' : ''}>
                                  {r.usuario || '—'}
                                </span>
                              </td>
                              <td title={r.cnpj}>
                                {r.cnpj}
                              </td>
                              <td>
                                {r.valorPorcentagem?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {!loadingRegistros && currentItems.length > 0 && currentItems.length < 6 && (
                    <div className={`table-filler rows-${currentItems.length}`}>
                      {/* Espaço para manter altura consistente */}
                    </div>
                  )}
                </div>
              </div>
              {totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="page-btn"
                    title="Primeira página"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="page-btn"
                    title="Página anterior"
                  >
                    ‹ Anterior
                  </button>
                  <div className="page-info">
                    <span>Página {currentPage} de {totalPages}</span>
                    <span className="total-items">({filteredRegistros.length} registros)</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="page-btn"
                    title="Próxima página"
                  >
                    Próximo ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="page-btn"
                    title="Última página"
                  >
                    »»
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirmar Exclusão</h3>
            </div>
            <div className="modal-body">
              <p>
                Você tem certeza que deseja excluir{' '}
                <strong>{selectedIds.length}</strong>{' '}
                {selectedIds.length === 1 ? 'comissão selecionada' : 'comissões selecionadas'}?
              </p>
              <p className="modal-warning">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-modal-cancel"
                onClick={cancelarExclusao}
              >
                Cancelar
              </button>
              <button
                className="btn-modal-confirm"
                onClick={confirmarExclusao}
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
}

export default Home;