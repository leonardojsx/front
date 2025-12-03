import React, { useState, useMemo, useEffect, useRef, Suspense, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Index.css';
import './Performance.css';
import './Discounts.css';
import './ModernDeductions.css';
import './DiscountMobile.css';
import './LargeScreenUsers.css';
import './HighlightCard.css';
import './Niveis.css';
import './template-styles.css';
import logo from '../../images/logo.png';

import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { toast, ToastContainer } from 'react-toastify';

import { FaSearch, FaEdit, FaTrashAlt, FaCalendarAlt, FaTimes, FaSort, FaInfoCircle } from "react-icons/fa";
import { SiCashapp } from "react-icons/si";
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
  const [mesAnoAtual, setMesAnoAtual] = useState('');

  const [selectedId, setSelectedId] = useState(null);

  const [activeView, setActiveView] = useState('inicio');
  
  // Função para trocar de view com reset de filtros para usuários sup
  const handleViewChange = useCallback((newView) => {
    const isNonAdmin = user && user.role !== 'admin';
    
    if (isNonAdmin && newView === 'comissoes') {
      // Para usuários sup, sempre resetar filtros ao ir para comissões
      setSearchTerm('');
      setSearchDateFrom('');
      setSearchDateTo('');
      // Calcular total de comissões diretamente dos registros filtrados
      setTimeout(() => {
        fetchRegistros();
      }, 100);
    }
    
    setActiveView(newView);
  }, [user]);
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
  const { sidebarOpen, closeSidebar, toggleSidebar } = useSidebar();
  const [editingComissao, setEditingComissao] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingSalary, setEditingSalary] = useState('');
  const [editingNivel, setEditingNivel] = useState('');
  const [summaryData, setSummaryData] = useState([]);
  const [userSummaryData, setUserSummaryData] = useState(null); // Para dados do usuário logado (sup)

  // Estados para templates de comissão
  const [comissaoTemplates, setComissaoTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [modalTab, setModalTab] = useState('list');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
  });
  const [templateForm, setTemplateForm] = useState({
    titulo: '',
    valor: '',
    porcentagem: ''
  });
  const [templateErrors, setTemplateErrors] = useState({});

  // Estados para descontos
  const [descontos, setDescontos] = useState([]);
  const [descontosDoUsuario, setDescontosDoUsuario] = useState([]);
  const [loadingDescontos, setLoadingDescontos] = useState(false);
  const [formDescricaoDesconto, setFormDescricaoDesconto] = useState('');
  const [formValorDesconto, setFormValorDesconto] = useState('');
  const [formUsuarioDesconto, setFormUsuarioDesconto] = useState('');
  const [editingDesconto, setEditingDesconto] = useState(null);
  const [showDescontoModal, setShowDescontoModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [activeDiscountTab, setActiveDiscountTab] = useState('novo');

  const [erros, setErros] = useState({
    titulo: '',
    valorVenda: '',
    porcentagem: '',
    usuario: '',
    dataHora: '',
    cnpj: '',
    descricaoDesconto: '',
    valorDesconto: '',
    usuarioDesconto: ''
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteDescontoModal, setShowDeleteDescontoModal] = useState(false);
  const [descontoToDelete, setDescontoToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Níveis de suporte e suas porcentagens de aumento
  const niveisSupoerte = {
    '01': { nome: 'Júnior', porcentagem: 0 },
    '02': { nome: 'Pleno', porcentagem: 7 },
    '03': { nome: 'Sênior', porcentagem: 15 },
    '04': { nome: 'Tech Lead', porcentagem: 25 },
    '05': { nome: 'Premium', porcentagem: 30 }
  };

  // Função para calcular salário com aumento por nível
  const calcularSalarioComNivel = (salarioBruto, nivel) => {
    if (!nivel || !niveisSupoerte[nivel]) return salarioBruto;
    const porcentagem = niveisSupoerte[nivel].porcentagem;
    return salarioBruto * (1 + porcentagem / 100);
  };

  const registrosMock = useMemo(() => ([
  ]), []);

  // Cache para otimizar chamadas
  const dashboardCacheRef = useRef({
    data: null,
    timestamp: 0,
    cacheTime: 30000 // 30 segundos
  });

  // Função otimizada para buscar dados do mês atual (para dashboard)
  const fetchRegistrosMesAtual = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const cache = dashboardCacheRef.current;
    
    // Usar cache se disponível e não forçar refresh
    if (!forceRefresh && cache.data && (now - cache.timestamp) < cache.cacheTime) {
      setRegistros(cache.data.registros);
      setTotalComissoes(cache.data.totalComissoes);
      setLoadingRegistros(false);
      return;
    }

    setLoadingRegistros(true);
    setRegistrosError(null);
    try {
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1;

      // Para usuários não-admin, buscar dados com summary para incluir salário
      const isNonAdmin = user && user.role !== 'admin';
      const params = isNonAdmin 
        ? `?ano=${anoAtual}&mes=${mesAtual}&summary=true`
        : `?ano=${anoAtual}&mes=${mesAtual}`;

      const res = await api.get(`/schedule${params}`);
      
      if (isNonAdmin && res.data && typeof res.data === 'object' && res.data.items) {
        // Dados com summary (inclui salário + comissões)
        const dadosApi = Array.isArray(res.data.items) && res.data.items.length > 0 ? res.data.items : registrosMock;
        
        const dadosOrdenados = dadosApi.sort((a, b) => {
          const dataA = new Date(a.data || a.created_at || 0);
          const dataB = new Date(b.data || b.created_at || 0);
          return dataB - dataA;
        });

        const totalFinalCalculado = res.data.totalFinal || 0;
        
        // Atualizar cache
        dashboardCacheRef.current = {
          data: {
            registros: dadosOrdenados,
            totalComissoes: totalFinalCalculado
          },
          timestamp: now,
          cacheTime: cache.cacheTime
        };

        setRegistros(dadosOrdenados);
        setTotalComissoes(totalFinalCalculado);
        
        // Para usuários sup, salvar dados individuais para uso na tela de deduções
        if (user && user.role === 'sup') {
          setUserSummaryData({
            totalComissoes: res.data.totalComissoes || 0,
            salarioBruto: res.data.salarioBruto || 0,
            totalDescontos: res.data.totalDescontos || 0,
            totalFinal: res.data.totalFinal || 0
          });
        }
        
      } else {
        // Dados normais apenas para admin (só comissões)
        const dadosApi = Array.isArray(res.data) && res.data.length > 0 ? res.data : registrosMock;

        const dadosOrdenados = dadosApi.sort((a, b) => {
          const dataA = new Date(a.data || a.created_at || 0);
          const dataB = new Date(b.data || b.created_at || 0);
          return dataB - dataA;
        });

        const totalCalculado = dadosOrdenados.reduce((soma, registro) => {
          const comissao = typeof registro.valorPorcentagem === 'number' ? registro.valorPorcentagem : 0;
          return soma + comissao;
        }, 0);

        // Atualizar cache
        dashboardCacheRef.current = {
          data: {
            registros: dadosOrdenados,
            totalComissoes: totalCalculado
          },
          timestamp: now,
          cacheTime: cache.cacheTime
        };

        setRegistros(dadosOrdenados);
        setTotalComissoes(totalCalculado);
      }

    } catch (err) {
      setRegistros(registrosMock);
      setRegistrosError(err);
    } finally {
      setLoadingRegistros(false);
    }
  }, [user, registrosMock]);

  // Função para buscar todos os registros (para outras views)
  // Função para buscar registros com filtro correto para usuários sup
  async function fetchRegistros() {
    setLoadingRegistros(true);
    setRegistrosError(null);
    try {
      const isNonAdmin = user && user.role !== 'admin';
      
      if (isNonAdmin) {
        // Para usuários não-admin, buscar apenas do mês atual para manter consistência
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;
        

        const res = await api.get(`/schedule?ano=${anoAtual}&mes=${mesAtual}`);
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
        
      } else {
        // Para admin, buscar todos os registros

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
      }

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

  // Função para buscar dados resumidos dos usuários com salários e comissões
  // Debounce para fetchSummaryData
  const fetchSummaryDataTimeoutRef = useRef(null);
  
  const fetchSummaryData = useCallback(async (immediate = false) => {
    // Cancelar chamada anterior se existir
    if (fetchSummaryDataTimeoutRef.current) {
      clearTimeout(fetchSummaryDataTimeoutRef.current);
    }

    const executeFetch = async () => {
      try {
        const res = await api.get('/schedule/users-summary');
        setSummaryData(res.data || []);
      } catch (err) {
        setSummaryData([]);
        toast.warn('Não foi possível carregar o resumo dos usuários.', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    };

    if (immediate) {
      await executeFetch();
    } else {
      // Debounce de 300ms para evitar chamadas excessivas
      fetchSummaryDataTimeoutRef.current = setTimeout(executeFetch, 300);
    }
  }, []);

  // Função para atualizar salário e nível do usuário
  const handleUpdateSalary = async (userId, novoSalario, nivel = null) => {
    try {
      // Indicar que está salvando
      setEditingUser(userId + '_saving');
      
      const updateData = { salarioBruto: novoSalario };
      if (nivel !== null && nivel !== '') {
        updateData.nivel = nivel;
        updateData.porcentagem_aumento = niveisSupoerte[nivel]?.porcentagem || 0;
      }
      
      await api.put(`/users/${userId}`, updateData);
      
      // Atualizar dados localmente (otimístico) para resposta mais rápida
      setSummaryData(prevData => 
        prevData.map(userData => 
          userData.id === userId 
            ? { 
                ...userData, 
                salarioBruto: novoSalario,
                nivel: nivel || userData.nivel,
                porcentagem_aumento: nivel ? niveisSupoerte[nivel]?.porcentagem || 0 : userData.porcentagem_aumento,
                totalFinal: Number((calcularSalarioComNivel(novoSalario, nivel || userData.nivel) + userData.totalComissoes).toFixed(2))
              }
            : userData
        )
      );
      
      toast.success('Salário atualizado!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Limpar estados de edição
      setEditingUser(null);
      setEditingSalary('');
      setEditingNivel('');
      
      // Invalidar cache do dashboard e atualizar dados em background
      dashboardCacheRef.current.timestamp = 0; // Força refresh no próximo acesso
      setTimeout(() => {
        fetchSummaryData();
        if (user && user.role !== 'admin') {
          fetchRegistrosMesAtual(true); // Forçar refresh do dashboard
        }
      }, 200);
      
    } catch (error) {
      const mensagemErro = error.response?.data?.message || error.message || 'Erro desconhecido';
      toast.error(`Erro ao atualizar salário: ${mensagemErro}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Reverter otimização em caso de erro
      fetchSummaryData();
      setEditingUser(null);
      setEditingSalary('');
    }
  };

  // Função para formatar valor monetário
  const formatarSalario = (valor) => {
    const numero = valor.replace(/\D/g, '');
    const numeroFormatado = (Number(numero) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
    return numeroFormatado;
  };

  const obterValorNumericoSalario = (valorFormatado) => {
    return valorFormatado.replace(/[^\d]/g, '') / 100;
  };

  // FUNÇÕES PARA DESCONTOS
  const fetchDescontos = async () => {
    setLoadingDescontos(true);
    try {
      const res = await api.get('/discount');
      setDescontos(res.data || []);
    } catch (error) {
      toast.error('Erro ao carregar descontos');
    } finally {
      setLoadingDescontos(false);
    }
  };

  const handleDescontoSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formDescricaoDesconto.trim()) {
      setErros(prev => ({ ...prev, descricaoDesconto: '📝 Descrição é obrigatória' }));
      return;
    }
    if (!formValorDesconto || obterValorNumerico(formValorDesconto) <= 0) {
      setErros(prev => ({ ...prev, valorDesconto: '💰 Valor deve ser maior que zero' }));
      return;
    }
    if (!selectedUserId && !formUsuarioDesconto) {
      toast.error('👤 Usuário não foi selecionado', {
        style: {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white'
        }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const descontoData = {
        descricao: formDescricaoDesconto,
        valor: obterValorNumerico(formValorDesconto),
        idUsuario: selectedUserId || formUsuarioDesconto || user.id
      };

      if (editingDesconto) {
        await api.put(`/discount/${editingDesconto.id}`, descontoData);
        toast.success('✅ Desconto atualizado com sucesso!', {
          icon: '✏️',
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white'
          }
        });
      } else {
        await api.post('/discount', descontoData);
        toast.success('✅ Desconto cadastrado com sucesso!', {
          icon: '💾',
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white'
          }
        });
      }

      // Limpar formulário
      setFormDescricaoDesconto('');
      setFormValorDesconto('');
      setFormUsuarioDesconto('');
      setEditingDesconto(null);
      setActiveDiscountTab('lista');
      setErros(prev => ({ ...prev, descricaoDesconto: '', valorDesconto: '', usuarioDesconto: '' }));
      
      // Recarregar lista de descontos do usuário
      if (selectedUserId) {
        await fetchDescontosDoUsuario(selectedUserId);
      }
      
      // Recarregar dados dependendo da tela atual
      if (activeView === 'descontos') {
        fetchDescontos();
      } else if (activeView === 'usuarios') {
        fetchSummaryData();
      }
    } catch (error) {
      const mensagemErro = error.response?.data?.message || 'Erro ao salvar desconto';
      toast.error(`❌ ${mensagemErro}`, {
        style: {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white'
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDesconto = (desconto) => {
    setEditingDesconto(desconto);
    setFormDescricaoDesconto(desconto.descricao);
    setFormValorDesconto(formatarMoeda(desconto.valor.toString()));
    if (user?.role === 'admin') {
      setFormUsuarioDesconto(desconto.idUsuario);
    }
    setShowDescontoModal(true);
  };

  const handleDeleteDesconto = (desconto) => {
    setDescontoToDelete(desconto);
    setShowDeleteDescontoModal(true);
  };

  const confirmarExclusaoDesconto = async () => {
    if (!descontoToDelete) return;
    
    try {
      await api.delete(`/discount/${descontoToDelete.id}`);
      toast.success('Desconto removido com sucesso!');
      
      // Recarregar lista de descontos do usuário
      if (selectedUserId) {
        await fetchDescontosDoUsuario(selectedUserId);
      }
      
      // Recarregar dados dependendo da tela atual
      if (activeView === 'descontos') {
        fetchDescontos();
      } else if (activeView === 'usuarios') {
        fetchSummaryData();
      }

      // Fechar modal e limpar dados
      setShowDeleteDescontoModal(false);
      setDescontoToDelete(null);
    } catch (error) {
      toast.error('Erro ao remover desconto');
    }
  };

  const cancelarExclusaoDesconto = () => {
    setShowDeleteDescontoModal(false);
    setDescontoToDelete(null);
  };

  // Função para buscar descontos de um usuário específico
  const fetchDescontosDoUsuario = async (userId) => {
    if (!userId) {
      setDescontosDoUsuario([]);
      return;
    }
    
    setLoadingDescontos(true);
    try {
      // Obter ano e mês atuais para filtrar descontos
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1;
      
      const res = await api.get(`/discount/user/${userId}?ano=${anoAtual}&mes=${mesAtual}`);
      
      const descontosData = Array.isArray(res.data) ? res.data : [];
      
      setDescontosDoUsuario(descontosData);
    } catch (error) {
      setDescontosDoUsuario([]);
      toast.error('Erro ao carregar descontos do usuário');
    } finally {
      setLoadingDescontos(false);
    }
  };

  // Função para formatar data/hora para datetime-local (considerando fuso horário local)
  const formatarDataHoraParaInput = (data) => {
    if (!data) return '';
    
    try {
      const dataObj = new Date(data);
      
      // Verificar se a data é válida
      if (isNaN(dataObj.getTime())) {
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
        return '';
      }
      
      return dataObj.toISOString();
    } catch (error) {
      return '';
    }
  };

  useEffect(() => {
    // Inicializar com dados do mês atual para o dashboard
    fetchRegistrosMesAtual();
    fetchUsuarios();

    const agora = new Date();
    const dataHoraAtual = formatarDataHoraParaInput(agora);
    setFormDataHora(dataHoraAtual);
    
    // Definir mês/ano atual para exibição
    const mesAnoTexto = agora.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
    setMesAnoAtual(mesAnoTexto);
  }, [registrosMock]);

  // Effect para trocar entre dados do mês atual e todos os dados baseado na view
  useEffect(() => {
    if (activeView === 'inicio') {
      // Na tela inicial, mostrar apenas dados do mês atual
      fetchRegistrosMesAtual();
      // Para usuários sup, carregar também os descontos para exibir no salário líquido
      if (user?.role === 'sup' && user?.id) {
        fetchDescontosDoUsuario(user.id);
      }
    } else if (activeView === 'pesquisar') {
      // Na tela de pesquisa, mostrar todos os dados
      fetchRegistros();
    } else if (activeView === 'usuarios') {
      // Na tela de usuários, buscar dados resumidos
      fetchSummaryData();
    } else if ((activeView === 'descontos' || activeView === 'comissoes') && user?.role === 'sup') {
      // Na tela de descontos ou comissões (apenas para sup), buscar descontos do próprio usuário
      if (user?.id) {
        fetchDescontosDoUsuario(user.id);
        // Se não temos dados de comissão do usuário, buscar
        if (!userSummaryData) {
          fetchRegistrosMesAtual();
        }
      }
    }
  }, [activeView]);

  // Effect para sincronizar descontosDoUsuario com descontos para usuário sup (tela inicial, deduções e comissões)
  useEffect(() => {
    if ((activeView === 'descontos' || activeView === 'inicio' || activeView === 'comissoes') && user?.role === 'sup' && descontosDoUsuario.length >= 0) {
      setDescontos(descontosDoUsuario);
    }
  }, [descontosDoUsuario, activeView, user?.role]);

  // Effect para limpar e recarregar descontos quando trocar de usuário
  useEffect(() => {
    if (selectedUserId) {
      // Limpar dados anteriores
      setDescontosDoUsuario([]);
      setLoadingDescontos(true);
      
      // Buscar novos dados
      fetchDescontosDoUsuario(selectedUserId);
    } else {
      // Se não há usuário selecionado, limpar dados
      setDescontosDoUsuario([]);
    }
  }, [selectedUserId]);

  // Effect para lidar com redirecionamento do treinamento
  useEffect(() => {
    if (location.state?.redirectToCommissions && location.state?.prefilledData) {
      const { cnpj, titulo } = location.state.prefilledData;
      
      // Mudar para a view de comissões
      handleViewChange('comissoes');
      
      // Pré-preencher os dados
      if (cnpj) {
        setFormCnpj(formatarDocumento(cnpj));
      }
      if (titulo) {
        setFormTitulo(titulo);
      }
      
      // Limpar o state para evitar re-execução
      navigate('/home', { replace: true, state: {} });
      
      // Mostrar toast informativo
      toast.info('Dados do treinamento carregados no formulário de comissão!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else if (location.state?.activeView) {
      // Navegar para a view específica vinda da página de treinamento
      setActiveView(location.state.activeView);
      
      // Limpar o state
      navigate('/home', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Effect para carregar templates de comissão
  useEffect(() => {
    if (activeView === 'comissoes') {
      carregarTemplates();
    } else {
      // Limpar campo de busca quando sai da view de comissões
      setTemplateSearchTerm('');
      setShowTemplateDropdown(false);
    }
  }, [activeView]);

  // Effect para limpar busca de template ao entrar na view de comissões
  useEffect(() => {
    if (activeView === 'comissoes') {
      setTemplateSearchTerm('');
      setShowTemplateDropdown(false);
    }
  }, [activeView]);

  // Templates filtrados para busca no modal
  const filteredTemplates = useMemo(() => {
    if (!searchTemplate) return comissaoTemplates;
    return comissaoTemplates.filter(template => 
      template.titulo.toLowerCase().includes(searchTemplate.toLowerCase())
    );
  }, [comissaoTemplates, searchTemplate]);

  // Templates filtrados para o campo de autocompletar (máximo 10)
  const filteredTemplatesForDropdown = useMemo(() => {
    if (!templateSearchTerm.trim()) return [];
    return comissaoTemplates
      .filter(template => 
        template.titulo.toLowerCase().includes(templateSearchTerm.toLowerCase())
      )
      .slice(0, 10);
  }, [comissaoTemplates, templateSearchTerm]);

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

  // Função para formatar CPF
  const formatarCPF = (valor) => {
    const numero = valor.replace(/\D/g, '');
    return numero
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Função para detectar tipo de documento automaticamente
  const detectarTipoDocumento = (valor) => {
    const numero = valor.replace(/\D/g, '');
    if (numero.length <= 11) {
      return 'cpf';
    } else {
      return 'cnpj';
    }
  };

  // Função para formatar documento automaticamente
  const formatarDocumento = (valor) => {
    const tipo = detectarTipoDocumento(valor);
    return tipo === 'cpf' ? formatarCPF(valor) : formatarCNPJ(valor);
  };

  // Função para validar documento automaticamente
  const validarDocumento = (valor) => {
    if (!valor) return 'CPF ou CNPJ é obrigatório';
    const numero = valor.replace(/\D/g, '');
    
    // Se não tem dígitos suficientes, não mostrar erro ainda
    if (numero.length === 0) return 'CPF ou CNPJ é obrigatório';
    if (numero.length < 11) return ''; // Não mostrar erro enquanto digita
    
    const tipo = detectarTipoDocumento(valor);
    return tipo === 'cpf' ? validarCPF(valor) : validarCNPJ(valor);
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
    
    // Se tem menos de 14 dígitos e não está completo, não validar ainda
    if (numero.length < 14) {
      return numero.length > 0 ? '' : 'CNPJ é obrigatório';
    }
    
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

  // Função para validar CPF
  const validarCPF = (cpf) => {
    if (!cpf) return 'CPF é obrigatório';
    const numero = cpf.replace(/\D/g, '');
    
    // Se tem menos de 11 dígitos e não está completo, não validar ainda
    if (numero.length < 11) {
      return numero.length > 0 ? '' : 'CPF é obrigatório';
    }
    
    if (numero.length !== 11) return 'CPF deve ter 11 dígitos';
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(numero)) return 'CPF inválido';
    
    // Validar primeiro dígito verificador
    let soma = 0;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(numero.substring(i - 1, i)) * (11 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(numero.substring(9, 10))) return 'CPF inválido';
    
    // Validar segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(numero.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(numero.substring(10, 11))) return 'CPF inválido';
    
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

  // Calcular total de comissões baseado nos registros filtrados (não no estado totalComissoes)
  const totalComissoesCalculado = useMemo(() => {
    return filteredRegistros.reduce((soma, registro) => {
      const comissao = typeof registro.valorPorcentagem === 'number' ? registro.valorPorcentagem : 0;
      return soma + comissao;
    }, 0);
  }, [filteredRegistros]);

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
    const valorFormatado = formatarDocumento(valor);
    setFormCnpj(valorFormatado);
    const erro = validarDocumento(valorFormatado);
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

      const documentoFormatado = formatarDocumento(comissao.cnpj || '');
      setFormCnpj(documentoFormatado);
      setEditingComissao(comissao);
      handleViewChange('comissoes');

      toast.info('Dados carregados para edição!', {
        ...toastConfig,
        autoClose: 2000,
      });
    } catch (error) {
      toast.error('Erro ao carregar dados para edição.');
    }
  };

  // Funções para templates de comissão
  const carregarTemplates = async () => {
    try {
      const response = await api.get('/comissao-template');
      setComissaoTemplates(response.data || []);
    } catch (error) {
      setComissaoTemplates([]);
      // Não mostrar erro se for apenas problema de carregamento de templates
    }
  };

  const handleTemplateFormChange = (field, value) => {
    setTemplateForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpar erro do campo específico
    if (templateErrors[field]) {
      setTemplateErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validarTemplateForm = () => {
    const errors = {};
    
    if (!templateForm.titulo.trim()) {
      errors.titulo = 'Título é obrigatório';
    }
    
    // Validar porcentagem apenas se fornecida
    if (templateForm.porcentagem && templateForm.porcentagem !== '') {
      const porcentagem = Number(templateForm.porcentagem);
      if (isNaN(porcentagem) || porcentagem < 0 || porcentagem > 100) {
        errors.porcentagem = 'Porcentagem deve ser um número válido entre 0 e 100';
      }
    }

    return errors;
  };

  const handleSalvarTemplate = async (e) => {
    e.preventDefault();
    
    const errors = validarTemplateForm();
    setTemplateErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const templateData = {
        titulo: templateForm.titulo.trim(),
        valor: templateForm.valor && templateForm.valor.trim() !== '' ? templateForm.valor.replace(/[^0-9.,]/g, '').replace(',', '.') : null,
        porcentagem: templateForm.porcentagem && templateForm.porcentagem.trim() !== '' ? templateForm.porcentagem : null
      };

      await api.post('/comissao-template', templateData);
      
      toast.success('Template salvo com sucesso!');
      setShowTemplateModal(false);
      setTemplateForm({
        titulo: '',
        valor: '',
        porcentagem: ''
      });
      setTemplateErrors({});
      carregarTemplates();
    } catch (error) {
      toast.error(editingTemplate ? 'Erro ao atualizar template' : 'Erro ao salvar template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      titulo: template.titulo,
      valor: template.valor ? formatarMoeda(template.valor.toString()) : '',
      porcentagem: template.porcentagem ? template.porcentagem.toString() : ''
    });
    setTemplateErrors({});
    setModalTab('create');
  };

  const showConfirmModal = (title, message, onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar') => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  const hideConfirmModal = () => {
    setConfirmModal({
      show: false,
      title: '',
      message: '',
      onConfirm: null,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar'
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal.onConfirm) {
      confirmModal.onConfirm();
    }
    hideConfirmModal();
  };

  const deleteTemplate = async (templateId) => {
    try {
      await api.delete(`/comissao-template/${templateId}`);
      toast.success('Template excluído com sucesso!');
      carregarTemplates();
    } catch (error) {
      toast.error('Erro ao excluir template');
    }
  };

  const handleDeleteTemplate = (templateId, templateTitle) => {
    showConfirmModal(
      'Excluir Template',
      `Tem certeza que deseja excluir o template "${templateTitle}"? Esta ação não pode ser desfeita.`,
      () => deleteTemplate(templateId),
      'Excluir',
      'Cancelar'
    );
  };

  const handleCancelTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      titulo: '',
      valor: '',
      porcentagem: ''
    });
    setTemplateErrors({});
    setModalTab('list');
    setSearchTemplate('');
    setShowTemplateModal(false);
  };

  const aplicarTemplate = (template) => {
    setFormTitulo(template.titulo);
    if (template.porcentagem) {
      setFormPorcentagem(template.porcentagem.toString());
    }
    if (template.valor) {
      setFormValorVenda(formatarMoeda(template.valor.toString()));
    }
    
    // Limpar erros relacionados
    setErros(prev => ({
      ...prev,
      titulo: '',
      porcentagem: '',
      valorVenda: template.valor ? '' : prev.valorVenda
    }));

    toast.success(`Template "${template.titulo}" aplicado!`);
  };

  const handleTemplateSearchChange = (value) => {
    setTemplateSearchTerm(value);
    setShowTemplateDropdown(value.length > 0);
  };

  const handleTemplateSearchFocus = () => {
    if (templateSearchTerm.length > 0) {
      setShowTemplateDropdown(true);
    }
  };

  const handleTemplateSearchBlur = () => {
    // Delay para permitir clique nas opções
    setTimeout(() => setShowTemplateDropdown(false), 200);
  };

  const clearTemplateSearch = () => {
    setTemplateSearchTerm('');
    setShowTemplateDropdown(false);
  };

  // Effect para fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.template-search-container')) {
        setShowTemplateDropdown(false);
      }
    };

    if (showTemplateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTemplateDropdown]);

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
    const documentoLimpo = formCnpj.replace(/\D/g, '');
    const tipoDocumento = detectarTipoDocumento(documentoLimpo);
    
    const novaComissao = {
      titulo: formTitulo.trim(),
      cnpj: documentoLimpo,
      tipoDocumento: tipoDocumento,
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

      // Atualizar dados baseado na view que vai ser ativada
      if (activeView === 'inicio') {
        await fetchRegistrosMesAtual();
      } else {
        await fetchRegistros();
      }
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
      // Atualizar dados baseado na view ativa
      if (activeView === 'inicio') {
        await fetchRegistrosMesAtual();
      } else {
        await fetchRegistros();
      }
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
        onClose={closeSidebar} 
        onNavigate={handleViewChange} 
        currentPage={activeView}
      />
      <div id="container-menu" role="banner">
        <div className="menu-toggle-wrapper">
          <HamburgerButton open={sidebarOpen} onClick={toggleSidebar} />
        </div>
        <h1>Comissões BMS</h1>
        <img src={logo} alt="Logo Comissões BMS" />
      </div>

      <main>
        {activeView === 'inicio' && (
          <>
            <div id="summary-container">
              <div id="summary">
                <p id="text-body">
                  {user && user.role === 'admin' ? 'Total de Comissões' : 'Salário Líquido do Mês'}
                </p>
                <h1 id="total">
                  {(() => {
                    if (user && user.role === 'admin') {
                      return totalComissoes?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    } else {
                      const salarioBruto = user?.salarioBruto || 0;
                      const salarioComNivel = calcularSalarioComNivel(salarioBruto, user?.nivel);
                      const comissoes = totalComissoesCalculado || 0;
                      const totalDescontos = descontos?.reduce((total, d) => total + d.valor, 0) || 0;
                      const salarioLiquido = salarioComNivel + comissoes - totalDescontos;
                      return salarioLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    }
                  })()}
                </h1>
                <p>
                  {registros.length} registros
                </p>
              </div>
              <button id="card-button" onClick={() => handleViewChange('comissoes')}>Comissões</button>
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
                <h1>Últimas Comissões - {mesAnoAtual}</h1>
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
                <div className="titulo-input-container">
                  <input
                    id="titulo"
                    type="text"
                    value={formTitulo}
                    onChange={(e) => handleTituloChange(e.target.value)}
                    className={erros.titulo ? 'error' : ''}
                    placeholder="Digite o título da comissão"
                    maxLength="100"
                  />
                  {comissaoTemplates.length > 0 && (
                    <div className="template-search-container">
                      <input
                        type="text"
                        className="template-search-input"
                        placeholder="Buscar template..."
                        value={templateSearchTerm}
                        onChange={(e) => handleTemplateSearchChange(e.target.value)}
                        onFocus={handleTemplateSearchFocus}
                        onBlur={handleTemplateSearchBlur}
                      />
                      {templateSearchTerm && (
                        <button
                          type="button"
                          className="template-clear-btn"
                          onClick={clearTemplateSearch}
                        >
                          ×
                        </button>
                      )}
                      {showTemplateDropdown && filteredTemplatesForDropdown.length > 0 && (
                        <div className="template-dropdown">
                          {filteredTemplatesForDropdown.map(template => (
                            <div
                              key={template.id}
                              className="template-dropdown-item"
                              onClick={() => aplicarTemplate(template)}
                            >
                              <div className="template-dropdown-title">{template.titulo}</div>
                              <div className="template-dropdown-details">
                                {template.valor && `Valor: ${formatarMoeda(template.valor.toString())}`}
                                {template.valor && template.porcentagem && ' • '}
                                {template.porcentagem && `${template.porcentagem}%`}
                                {!template.valor && !template.porcentagem && 'Sem valores'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showTemplateDropdown && templateSearchTerm && filteredTemplatesForDropdown.length === 0 && (
                        <div className="template-dropdown template-no-results">
                          <div className="template-dropdown-item">
                            Nenhum template encontrado
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-add-template"
                    onClick={() => {
                      setModalTab(comissaoTemplates.length > 0 ? 'list' : 'create');
                      setShowTemplateModal(true);
                    }}
                    title={comissaoTemplates.length > 0 ? 'Gerenciar templates de comissão' : 'Criar novo template de comissão'}
                  >
                    +
                  </button>
                </div>
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
                <label htmlFor="cnpj">CPF/CNPJ *</label>
                <input
                  id="cnpj"
                  type="text"
                  value={formCnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  className={erros.cnpj ? 'error' : ''}
                  placeholder="Digite CPF ou CNPJ"
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
                  <h3>Quantidade de Comissões</h3>
                  <p className="stat-value">{filteredRegistros.length}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <SiCashapp />
                </div>
                <div className="stat-content">
                  <h3>Total de Comissões</h3>
                  <p className="stat-value">{totalComissoesCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <SiCashapp />
                </div>
                <div className="stat-content">
                  <h3>Salário Comercial</h3>
                  <p className="stat-value">
                    {(() => {
                      if (!user?.salarioBruto) return 'R$ 0,00';
                      const salarioComNivel = calcularSalarioComNivel(user.salarioBruto, user.nivel);
                      return salarioComNivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    })()}
                  </p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <SiCashapp />
                </div>
                <div className="stat-content">
                  <h3>Total Descontos</h3>
                  <p className="stat-value">
                    {(descontos?.reduce((total, d) => total + d.valor, 0) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              <div className="stat-card highlight-card">
                <div className="stat-icon">
                  <SiCashapp />
                </div>
                <div className="stat-content">
                  <h3>Salário Líquido Total</h3>
                  <p className="stat-value highlight-value">
                    {(() => {
                      const salarioComNivel = calcularSalarioComNivel(user?.salarioBruto || 0, user?.nivel);
                      const totalDescontos = descontos?.reduce((total, d) => total + d.valor, 0) || 0;
                      return (totalComissoesCalculado + salarioComNivel - totalDescontos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    })()}
                  </p>
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
              <h2 className="search-title">
                <FaSearch className="title-icon" />
                Pesquisar Comissões
              </h2>
              <p className="search-subtitle">
                Encontre comissões usando filtros avançados de busca
              </p>
            </div>

            <div className="search-filters">
              {/* Filtro Principal de Busca */}
              <div className="filter-section primary-search">
                <div className="filter-header">
                  <h3>Busca por Texto</h3>
                </div>
                <div className="filter-content">
                  <div className="search-input-container">
                    <div className="search-input-wrapper">
                      <FaSearch className="search-icon" />
                      <input
                        type="text"
                        placeholder={`Digite ${searchType === 'todos' ? 'qualquer termo' : searchType.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                            if (searchTerm.trim()) {
                              toast.info(`Resultados para "${searchTerm}": ${filteredRegistros.length} registro${filteredRegistros.length !== 1 ? 's' : ''} encontrado${filteredRegistros.length !== 1 ? 's' : ''}`);
                            }
                          }
                        }}
                        className="search-input"
                      />
                      <button 
                        className="btn-search"
                        title={searchTerm.trim() ? "Executar busca" : "Limpar busca"}
                        onClick={() => {
                          if (searchTerm.trim()) {
                            toast.info(`Resultados para "${searchTerm}": ${filteredRegistros.length} registro${filteredRegistros.length !== 1 ? 's' : ''} encontrado${filteredRegistros.length !== 1 ? 's' : ''}`);
                          } else {
                            setSearchTerm('');
                            setSearchDateFrom('');
                            setSearchDateTo('');
                            setSearchType('todos');
                            setSortOrder('desc');
                            toast.success('Filtros limpos!');
                          }
                        }}
                      >
                        {searchTerm.trim() ? 'Buscar' : 'Limpar Tudo'}
                      </button>
                    </div>
                    <div className="search-type-wrapper">
                      <label>Buscar em:</label>
                      <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value)}
                        className="search-type-select"
                      >
                        <option value="todos">Todos os campos</option>
                        <option value="titulo">Título</option>
                        <option value="usuario">Usuário</option>
                        <option value="cnpj">CPF/CNPJ</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtro de Data */}
              <div className="filter-section date-filter">
                <div className="filter-header">
                  <h3>
                    <FaCalendarAlt className="filter-icon" />
                    Filtro por Data
                  </h3>
                </div>
                <div className="filter-content">
                  <div className="date-range-container">
                    <div className="date-input-group">
                      <label>Data Inicial:</label>
                      <input
                        type="date"
                        value={searchDateFrom}
                        onChange={(e) => setSearchDateFrom(e.target.value)}
                        className="date-input"
                      />
                    </div>
                    <div className="date-separator">até</div>
                    <div className="date-input-group">
                      <label>Data Final:</label>
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
                        toast.success('Datas limpa!');
                      }}
                      className="btn-clear-dates"
                      title="Limpar filtro de datas"
                    >
                      <FaTimes />
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtro de Ordenação */}
              <div className="filter-section sort-filter">
                <div className="filter-header">
                  <h3>
                    <FaSort className="filter-icon" />
                    Ordenação
                  </h3>
                </div>
                <div className="filter-content">
                  <div className="sort-controls">
                    <div className="sort-option">
                      <label>Ordenar por:</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="sort-select"
                      >
                        <option value="desc">Mais recente primeiro</option>
                        <option value="asc">Mais antigo primeiro</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status dos Resultados */}
            <div className="search-results-info">
              <div className="results-count">
                <FaInfoCircle className="info-icon" />
                <span>
                  {filteredRegistros.length} resultado{filteredRegistros.length !== 1 ? 's' : ''} encontrado{filteredRegistros.length !== 1 ? 's' : ''}
                  {searchTerm && ` para "${searchTerm}"`}
                </span>
              </div>
              {(searchTerm || searchDateFrom || searchDateTo) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSearchDateFrom('');
                    setSearchDateTo('');
                    setSearchType('todos');
                    setSortOrder('desc');
                    toast.success('Todos os filtros foram limpos!');
                  }}
                  className="btn-clear-all"
                >
                  <FaTimes />
                  Limpar todos os filtros
                </button>
              )}
            </div>

            <div className="results-section">
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
                        <th>CPF/CNPJ</th>
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

        {activeView === 'usuarios' && user?.role === 'admin' && (
          <div className="users-container">
            <div className="users-header">
              <h2 className="users-title">
                <FaSearch className="title-icon" />
                Gerenciar Usuários
              </h2>
              <p className="users-subtitle">
                Visualize e gerencie salários e resumos de comissões dos usuários
              </p>
            </div>

            <div className="users-summary">
              {!summaryData || summaryData.length === 0 ? (
                <div className="loading-state">
                  <p>Carregando dados dos usuários...</p>
                </div>
              ) : (
                <div className="users-grid">
                  {Array.isArray(summaryData) && summaryData.map((userData) => (
                    <div key={userData.id} className="user-card">
                      <div className="user-card-header">
                        <div className="user-info">
                          <h3>{userData.nome}</h3>
                          <p className="user-email">{userData.email}</p>
                          <span className={`user-role ${userData.role}`}>
                            {userData.role === 'admin' ? 'Administrador' : 'Suporte'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="user-card-body">
                        <div className="salary-section">
                          <div className="salary-info">
                            <label>Salário Comercial:</label>
                            {editingUser === userData.id ? (
                              <div className="salary-edit">
                                <input
                                  type="text"
                                  value={editingSalary}
                                  onChange={(e) => setEditingSalary(formatarSalario(e.target.value))}
                                  placeholder="R$ 0,00"
                                  className="salary-input"
                                  autoFocus
                                />
                                <select
                                  value={editingNivel}
                                  onChange={(e) => setEditingNivel(e.target.value)}
                                  className="nivel-select"
                                >
                                  <option value="">Selecione o nível</option>
                                  {Object.entries(niveisSupoerte).map(([codigo, info]) => (
                                    <option key={codigo} value={codigo}>
                                      {codigo} - {info.nome} ({info.porcentagem}% aumento)
                                    </option>
                                  ))}
                                </select>
                                <div className="salary-actions">
                                  <button
                                    onClick={() => {
                                      const valorNumerico = obterValorNumericoSalario(editingSalary);
                                      const nivel = editingNivel || userData.nivel;
                                      handleUpdateSalary(userData.id, valorNumerico, nivel);
                                    }}
                                    className="btn-save-salary"
                                    disabled={!editingSalary || obterValorNumericoSalario(editingSalary) === 0 || editingUser === userData.id + '_saving'}
                                  >
                                    {editingUser === userData.id + '_saving' ? (
                                      <>
                                        <span className="spinner-mini"></span>
                                        Salvando...
                                      </>
                                    ) : (
                                      'Salvar'
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUser(null);
                                      setEditingSalary('');
                                      setEditingNivel('');
                                    }}
                                    className="btn-cancel-salary"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="salary-display">
                                <span className="salary-value">
                                  {userData.salarioBruto ? 
                                    calcularSalarioComNivel(userData.salarioBruto, userData.nivel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
                                    'R$ 0,00'
                                  }
                                </span>
                                {userData.nivel && (
                                  <div className="nivel-badge">
                                    <span className="nivel-codigo">Nível {userData.nivel}</span>
                                    <span className="nivel-nome">{niveisSupoerte[userData.nivel]?.nome}</span>
                                    <span className="nivel-porcentagem">+{userData.porcentagem_aumento || 0}%</span>
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingUser(userData.id);
                                    const valorAtual = userData.salarioBruto || 0;
                                    const valorEmCentavos = valorAtual * 100;
                                    setEditingSalary(formatarSalario(valorEmCentavos.toString()));
                                    setEditingNivel(userData.nivel || '');
                                  }}
                                  className="btn-edit-salary"
                                  title="Editar salário"
                                >
                                  <FaEdit />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="commission-summary">
                          <div className="summary-item">
                            <label>Comissões do Mês:</label>
                            <span className="commission-value">
                              {userData.totalComissoes ? 
                                userData.totalComissoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
                                'R$ 0,00'
                              }
                            </span>
                          </div>

                          <div className="summary-item">
                            <label>Descontos do Mês:</label>
                            <div className="monthly-discount-info">
                              <span className="discount-value">
                                {userData.totalDescontos ? 
                                  userData.totalDescontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
                                  'R$ 0,00'
                                }
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedUserId(userData.id);
                                  setSelectedUserName(userData.nome);
                                  setFormUsuarioDesconto(userData.id);
                                  setEditingDesconto(null);
                                  setFormDescricaoDesconto('');
                                  setFormValorDesconto('');
                                  setShowDescontoModal(true);
                                }}
                                className="btn-manage-discount"
                                title="Gerenciar descontos"
                              >
                                <SiCashapp />
                                Gerenciar
                              </button>
                            </div>
                          </div>
                          
                          <div className="summary-item total">
                            <label>Salário Líquido:</label>
                            <span className="total-value">
                              {(() => {
                                const salarioComNivel = calcularSalarioComNivel(userData.salarioBruto || 0, userData.nivel);
                                const salarioLiquido = salarioComNivel + (userData.totalComissoes || 0) - (userData.totalDescontos || 0);
                                return salarioLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'descontos' && user?.role === 'sup' && (
          <div className="modern-deductions-container">
            {/* Header Moderno */}
            <div className="modern-header">
              <div className="header-content">
                <div className="header-title">
                  <div className="title-icon-container">
                    💸
                  </div>
                  <div>
                    <h1 className="main-title">Minhas Deduções Salariais</h1>
                    <p className="subtitle">Acompanhe todas as deduções aplicadas ao seu salário</p>
                  </div>
                </div>
                <div className="header-decoration">
                  <div className="decoration-circle circle-1"></div>
                  <div className="decoration-circle circle-2"></div>
                  <div className="decoration-circle circle-3"></div>
                </div>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="salary-summary-grid">
              {/* Salário Comercial */}
              <div className="summary-card salary-card">
                <div className="card-header">
                  <div className="card-icon salary-icon">💰</div>
                  <h3>Salário Comercial</h3>
                </div>
                <div className="card-value salary-value">
                  {(() => {
                    if (!user?.salarioBruto) return 'R$ 0,00';
                    const salarioComNivel = calcularSalarioComNivel(user.salarioBruto, user.nivel);
                    return salarioComNivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  })()}
                </div>
                <div className="card-subtitle">
                  {user?.nivel ? `Com nível ${user.nivel} (+${user.porcentagem_aumento || 0}%)` : 'Valor mensal'}
                </div>
              </div>

              {/* Total de Comissões */}
              <div className="summary-card commission-card">
                <div className="card-header">
                  <div className="card-icon commission-icon">🎆</div>
                  <h3>Comissões</h3>
                </div>
                <div className="card-value commission-value">
                  {userSummaryData?.totalComissoes ? 
                    userSummaryData.totalComissoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
                    'R$ 0,00'
                  }
                </div>
                <div className="card-subtitle">Total este mês</div>
              </div>

              {/* Total de Deduções */}
              <div className="summary-card deduction-card">
                <div className="card-header">
                  <div className="card-icon deduction-icon">📉</div>
                  <h3>Deduções</h3>
                </div>
                <div className="card-value deduction-value">
                  {descontos.length > 0 ? 
                    descontos.reduce((total, d) => total + d.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) :
                    'R$ 0,00'
                  }
                </div>
                <div className="card-subtitle">{descontos.length} deduções</div>
              </div>

              {/* Salário Líquido */}
              <div className="summary-card net-salary-card">
                <div className="card-header">
                  <div className="card-icon net-salary-icon">🌟</div>
                  <h3>Salário Líquido</h3>
                </div>
                <div className="card-value net-salary-value">
                  {(() => {
                    const salarioBruto = userSummaryData?.salarioBruto || user?.salarioBruto || 0;
                    const salarioComNivel = calcularSalarioComNivel(salarioBruto, user?.nivel);
                    const totalComissoes = userSummaryData?.totalComissoes || 0;
                    const totalDescontos = descontos.reduce((total, d) => total + d.valor, 0);
                    const salarioLiquido = salarioComNivel + totalComissoes - totalDescontos;
                    return salarioLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  })()}
                </div>
                <div className="card-subtitle">Valor final</div>
              </div>
            </div>

            {/* Lista de Deduções Moderna */}
            <div className="modern-deductions-list">
              <div className="list-header">
                <h2>📋 Detalhamento das Deduções</h2>
                <div className="list-stats">
                  {descontos.length} {descontos.length === 1 ? 'dedução' : 'deduções'} encontrada{descontos.length !== 1 ? 's' : ''}
                </div>
              </div>

              {loadingDescontos ? (
                <div className="modern-loading-state">
                  <div className="loading-spinner-modern"></div>
                  <h3>Carregando deduções...</h3>
                  <p>Aguarde enquanto buscamos suas informações</p>
                </div>
              ) : descontos.length === 0 ? (
                <div className="modern-empty-state">
                  <div className="empty-illustration">
                    <div className="empty-icon-large">🎉</div>
                    <div className="empty-sparkles">
                      <span className="sparkle sparkle-1">✨</span>
                      <span className="sparkle sparkle-2">✨</span>
                      <span className="sparkle sparkle-3">✨</span>
                    </div>
                  </div>
                  <h3>Nenhuma dedução encontrada!</h3>
                  <p>Parabéns! Você não possui deduções em seu salário neste momento.</p>
                  <div className="empty-action">
                    <button className="btn-celebrate" onClick={() => {
                      toast.success('🎉 Que ótimo! Seu salário está livre de deduções!', {
                        style: {
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white'
                        }
                      });
                    }}>
                      🎆 Comemorar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="deductions-grid">
                  {descontos.map((desconto, index) => (
                    <div key={desconto.id} className="deduction-card" style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="deduction-header">
                        <div className="deduction-type">
                          <div className="type-icon">💸</div>
                          <div className="type-info">
                            <h4>{desconto.descricao}</h4>
                            <span className="deduction-category">Dedução Salarial</span>
                          </div>
                        </div>
                        <div className="deduction-amount">
                          <span className="amount-value">
                            {desconto.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>
                      <div className="deduction-footer">
                        <div className="deduction-date">
                          <div className="date-icon">📅</div>
                          <span>
                            {new Intl.DateTimeFormat('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(new Date(desconto.data))}
                          </span>
                        </div>
                        <div className="deduction-status">
                          <span className="status-badge active">✓ Aplicado</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé com Informações Adicionais */}
            {descontos.length > 0 && (
              <div className="deductions-footer">
                <div className="footer-info">
                  <div className="info-item">
                    <strong>📈 Média por dedução:</strong>
                    <span>
                      {(descontos.reduce((total, d) => total + d.valor, 0) / descontos.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="info-item">
                    <strong>📅 Última atualização:</strong>
                    <span>
                      {descontos.length > 0 ? 
                        new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).format(new Date(Math.max(...descontos.map(d => new Date(d.data))))) :
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Desconto Moderno com Tabs */}
      {showDescontoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                Gerenciar Descontos
                {selectedUserName && ` - ${selectedUserName}`}
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowDescontoModal(false);
                  setEditingDesconto(null);
                  setFormDescricaoDesconto('');
                  setFormValorDesconto('');
                  setFormUsuarioDesconto('');
                  setErros(prev => ({ ...prev, descricaoDesconto: '', valorDesconto: '', usuarioDesconto: '' }));
                }}
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            {/* Sistema de Tabs */}
            <div className="discount-tabs">
              <button
                className={`tab-button ${activeDiscountTab === 'novo' ? 'active' : ''}`}
                onClick={() => {
                  setActiveDiscountTab('novo');
                  setEditingDesconto(null);
                  setFormDescricaoDesconto('');
                  setFormValorDesconto('');
                }}
              >
                ➕ Novo Desconto
              </button>
              <button
                className={`tab-button ${activeDiscountTab === 'lista' ? 'active' : ''}`}
                onClick={() => {
                  setActiveDiscountTab('lista');
                  if (selectedUserId) {
                    fetchDescontosDoUsuario(selectedUserId);
                  }
                }}
              >
                📋 Descontos Cadastrados
              </button>
            </div>

            <div className="tab-content">
              {/* Tab: Novo/Editar Desconto */}
              {activeDiscountTab === 'novo' && (
                <form onSubmit={handleDescontoSubmit}>
                  {selectedUserName && (
                    <div className="form-group">
                      <div className="selected-user-info">
                        <span>{selectedUserName}</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="descricaoDesconto" data-icon="📝">
                      Descrição do Desconto *
                    </label>
                    <input
                      type="text"
                      id="descricaoDesconto"
                      value={formDescricaoDesconto}
                      onChange={(e) => {
                        setFormDescricaoDesconto(e.target.value);
                        setErros(prev => ({ ...prev, descricaoDesconto: '' }));
                      }}
                      className={`form-control ${erros.descricaoDesconto ? 'error' : ''}`}
                      placeholder="Ex: INSS, Vale Transporte, Plano de Saúde..."
                      disabled={isSubmitting}
                    />
                    {erros.descricaoDesconto && (
                      <span className="error-message">{erros.descricaoDesconto}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="valorDesconto" data-icon="💰">
                      Valor do Desconto *
                    </label>
                    <input
                      type="text"
                      id="valorDesconto"
                      value={formValorDesconto}
                      onChange={(e) => {
                        const valorFormatado = formatarMoeda(e.target.value);
                        setFormValorDesconto(valorFormatado);
                        setErros(prev => ({ ...prev, valorDesconto: '' }));
                      }}
                      className={`form-control ${erros.valorDesconto ? 'error' : ''}`}
                      placeholder="R$ 0,00"
                      disabled={isSubmitting}
                    />
                    {erros.valorDesconto && (
                      <span className="error-message">{erros.valorDesconto}</span>
                    )}
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowDescontoModal(false);
                        setEditingDesconto(null);
                        setFormDescricaoDesconto('');
                        setFormValorDesconto('');
                        setFormUsuarioDesconto('');
                        setSelectedUserId(null);
                        setSelectedUserName('');
                        setErros(prev => ({ ...prev, descricaoDesconto: '', valorDesconto: '', usuarioDesconto: '' }));
                      }}
                      disabled={isSubmitting}
                    >
                      🚫 Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '⏳ Salvando...' : (editingDesconto ? '✏️ Atualizar' : '💾 Cadastrar')}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab: Lista de Descontos */}
              {activeDiscountTab === 'lista' && (
                <div>
                  {loadingDescontos ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>Carregando descontos...</p>
                    </div>
                  ) : !Array.isArray(descontosDoUsuario) || descontosDoUsuario.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📭</div>
                      <h3>Nenhum desconto encontrado</h3>
                      <p>Este usuário ainda não possui descontos cadastrados.</p>
                    </div>
                  ) : (
                    <div className="discounts-list-container">
                      {Array.isArray(descontosDoUsuario) && descontosDoUsuario.map((desconto) => (
                        <div key={desconto.id} className="discount-item">
                          <div className="discount-header">
                            <div className="discount-info">
                              <h4>{desconto.descricao}</h4>
                              <div className="discount-value">
                                {desconto.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                            </div>
                            <div className="discount-actions">
                              <button
                                className="btn-edit-discount"
                                onClick={() => {
                                  setEditingDesconto(desconto);
                                  setFormDescricaoDesconto(desconto.descricao);
                                  setFormValorDesconto(desconto.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                                  setActiveDiscountTab('novo');
                                }}
                                title="Editar desconto"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-delete-discount"
                                onClick={() => handleDeleteDesconto(desconto)}
                                title="Excluir desconto"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="discount-meta">
                            <div className="discount-user">
                              {selectedUserName}
                            </div>
                            <div className="discount-date">
                              {new Intl.DateTimeFormat('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }).format(new Date(desconto.data))}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Resumo Total */}
                      <div className="discount-item" style={{background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', borderColor: '#f87171'}}>
                        <div className="discount-header">
                          <div className="discount-info">
                            <h4 style={{color: '#dc2626'}}>💯 Total de Descontos</h4>
                            <div className="discount-value" style={{fontSize: '28px'}}>
                              {Array.isArray(descontosDoUsuario) ? 
                                descontosDoUsuario.reduce((total, d) => total + (d.valor || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) :
                                'R$ 0,00'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de confirmação de exclusão de desconto */}
      {showDeleteDescontoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirmar Exclusão de Desconto</h3>
            </div>
            <div className="modal-body">
              {descontoToDelete && (
                <>
                  <p>
                    Você tem certeza que deseja excluir o desconto{' '}
                    <strong>"{descontoToDelete.descricao}"</strong>?
                  </p>
                  <p>
                    Valor: <strong>R$ {descontoToDelete.valor?.toFixed(2)?.replace('.', ',')}</strong>
                  </p>
                  <p className="modal-warning">
                    ⚠️ Esta ação não pode ser desfeita.
                  </p>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="btn-modal-cancel"
                onClick={cancelarExclusaoDesconto}
              >
                Cancelar
              </button>
              <button
                className="btn-modal-confirm"
                onClick={confirmarExclusaoDesconto}
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Templates de Comissão */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Gerenciar Templates de Comissão</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowTemplateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-tabs">
              <button 
                className={`modal-tab ${modalTab === 'list' ? 'active' : ''}`}
                onClick={() => setModalTab('list')}
              >
                Templates Salvos
              </button>
              <button 
                className={`modal-tab ${modalTab === 'create' ? 'active' : ''}`}
                onClick={() => setModalTab('create')}
              >
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </button>
            </div>

            {modalTab === 'list' ? (
              <>
                {comissaoTemplates.length > 0 && (
                  <div className="search-template">
                    <input
                      type="text"
                      placeholder="Pesquisar templates..."
                      value={searchTemplate}
                      onChange={(e) => setSearchTemplate(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="templates-list">
                  {filteredTemplates.length > 0 ? (
                    filteredTemplates.map(template => (
                      <div key={template.id} className="template-item">
                        <div className="template-info">
                          <div className="template-title">{template.titulo}</div>
                          <div className="template-details">
                            {template.valor && `Valor: ${formatarMoeda(template.valor.toString())}`}
                            {template.valor && template.porcentagem && ' • '}
                            {template.porcentagem && `${template.porcentagem}%`}
                            {!template.valor && !template.porcentagem && 'Sem valores definidos'}
                          </div>
                        </div>
                        <div className="template-actions">
                          <button
                            className="btn-template-action btn-edit"
                            onClick={() => handleEditTemplate(template)}
                            title="Editar template"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-template-action btn-delete"
                            onClick={() => handleDeleteTemplate(template.id, template.titulo)}
                            title="Excluir template"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-templates">
                      <i>📋</i>
                      {searchTemplate ? 'Nenhum template encontrado' : 'Nenhum template cadastrado'}
                      <br />
                      {!searchTemplate && (
                        <button 
                          className="btn-save" 
                          style={{marginTop: '16px'}}
                          onClick={() => setModalTab('create')}
                        >
                          Criar Primeiro Template
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={handleSalvarTemplate} className="template-form">
                <div className="form-field">
                  <label htmlFor="template-titulo">Título do Template *</label>
                  <input
                    id="template-titulo"
                    type="text"
                    value={templateForm.titulo}
                    onChange={(e) => handleTemplateFormChange('titulo', e.target.value)}
                    className={templateErrors.titulo ? 'error' : ''}
                    placeholder="Ex: Comissão Padrão 10%"
                    maxLength="100"
                  />
                  {templateErrors.titulo && <span className="error-message">{templateErrors.titulo}</span>}
                </div>

                <div className="form-field-group">
                  <div className="form-field">
                    <label htmlFor="template-valor">Valor Fixo (opcional)</label>
                    <input
                      id="template-valor"
                      type="text"
                      value={templateForm.valor}
                      onChange={(e) => handleTemplateFormChange('valor', formatarMoeda(e.target.value))}
                      placeholder="R$ 0,00"
                    />
                    <small>Deixe em branco se não quiser valor fixo</small>
                  </div>

                  <div className="form-field">
                    <label htmlFor="template-porcentagem">Porcentagem (opcional)</label>
                    <input
                      id="template-porcentagem"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={templateForm.porcentagem}
                      onChange={(e) => handleTemplateFormChange('porcentagem', e.target.value)}
                      placeholder="10.5"
                    />
                    <small>Deixe em branco se não quiser porcentagem</small>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCancelTemplate}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-save"
                  >
                    {editingTemplate ? 'Atualizar Template' : 'Salvar Template'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {confirmModal.show && (
        <div className="modal-overlay" onClick={hideConfirmModal}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{confirmModal.title}</h3>
            </div>
            
            <div className="confirm-modal-body">
              <div className="confirm-icon">
                ⚠️
              </div>
              <p>{confirmModal.message}</p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={hideConfirmModal}
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={handleConfirmAction}
              >
                {confirmModal.confirmText}
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