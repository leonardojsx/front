import React, { useState, useEffect, useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash, FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";
import { SiCashapp } from "react-icons/si";
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import HamburgerButton from '../Home/HamburgerButton.jsx';
import Sidebar from '../Home/Sidebar.jsx';
import logo from '../../images/logo.png';
import './Index.css';

function Treinamento() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [treinamentos, setTreinamentos] = useState([]);
  const [loadingTreinamentos, setLoadingTreinamentos] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [currentTrainingData, setCurrentTrainingData] = useState(null);
  const { sidebarOpen, closeSidebar, toggleSidebar } = useSidebar();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trainingToDelete, setTrainingToDelete] = useState(null);

  // Estados do formulário
  const [trainingForm, setTrainingForm] = useState({
    titulo: '',
    cnpj: '',
    data: '',
    horaInicio: '',
    horaFim: '',
    status: 'planejado',
    usuario_id: ''
  });

  const [trainingErrors, setTrainingErrors] = useState({
    titulo: '',
    cnpj: '',
    data: '',
    horaInicio: '',
    horaFim: '',
  });

  const toastConfig = {
    position: "top-right",
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  // Funções auxiliares
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

  const getWeekDays = (weekDate) => {
    const days = [];
    const startOfWeek = new Date(weekDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);

    for (let i = 0; i < 5; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      days.push(currentDay);
    }
    return days;
  };

  const formatWeekDay = (date) => {
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const dayName = dayNames[dayIndex];
    const dayDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${dayName} (${dayDate})`;
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Fetch functions
  async function fetchTreinamentos() {
    setLoadingTreinamentos(true);
    try {
      const weekDays = getWeekDays(currentWeek);
      
      // Formatação de data local para evitar problemas de timezone
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const dataInicio = formatLocalDate(weekDays[0]);
      const dataFim = formatLocalDate(weekDays[4]) + 'T23:59:59';

      const res = await api.get(`/training?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      
      setTreinamentos(res.data || []);
    } catch (err) {
      setTreinamentos([]);
    } finally {
      setLoadingTreinamentos(false);
    }
  }

  async function fetchUsuarios() {
    try {
      const res = await api.get('/users');
      setUsuarios(res.data || []);
    } catch (err) {
      setUsuarios([]);
    }
  }

  // Effects
  useEffect(() => {
    fetchTreinamentos();
  }, [currentWeek]);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Modal functions
  const openTrainingModal = (date = null) => {
    setSelectedDate(date);
    if (date) {
      // Formatação correta para evitar problemas de fuso horário
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      setTrainingForm(prev => ({ ...prev, data: dateString }));
    }
    setShowTrainingModal(true);
  };

  const closeTrainingModal = () => {
    setShowTrainingModal(false);
    setSelectedDate(null);
    setEditingTraining(null);
    setSubmittingForm(false);
    setTrainingForm({
      titulo: '',
      cnpj: '',
      data: '',
      horaInicio: '',
      horaFim: '',
      status: 'planejado',
      usuario_id: ''
    });
    setTrainingErrors({
      titulo: '',
      cnpj: '',
      data: '',
      horaInicio: '',
      horaFim: '',
    });
  };

  const closeCommissionModal = () => {
    setShowCommissionModal(false);
    setCurrentTrainingData(null);
  };

  const handleCommissionRedirect = () => {
    // Redirecionar para página de comissões com dados pré-preenchidos
    navigate('/home', { 
      state: { 
        redirectToCommissions: true,
        prefilledData: {
          cnpj: currentTrainingData?.cnpj,
          titulo: currentTrainingData?.titulo
        }
      }
    });
    closeCommissionModal();
  };

  const validateTrainingForm = () => {
    const errors = {};

    if (!trainingForm.titulo.trim()) {
      errors.titulo = 'Título é obrigatório';
    } else if (trainingForm.titulo.trim().length < 3) {
      errors.titulo = 'Título deve ter pelo menos 3 caracteres';
    }

    if (!trainingForm.cnpj.trim()) {
      errors.cnpj = 'CPF/CNPJ é obrigatório';
    } else {
      const documentNumbers = trainingForm.cnpj.replace(/\D/g, '');
      if (documentNumbers.length !== 11 && documentNumbers.length !== 14) {
        errors.cnpj = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos';
      }
    }

    if (!trainingForm.data) {
      errors.data = 'Data é obrigatória';
    } else {
      // Validação para impedir finais de semana
      // Usar Date com partes separadas para evitar problemas de timezone
      const [year, month, day] = trainingForm.data.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day); // month é 0-indexed
      const dayOfWeek = selectedDate.getDay(); // 0 = domingo, 6 = sábado
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        errors.data = 'Treinamentos não podem ser agendados para sábados ou domingos';
      }
    }

    if (!trainingForm.horaInicio) {
      errors.horaInicio = 'Hora de início é obrigatória';
    }

    if (!trainingForm.horaFim) {
      errors.horaFim = 'Hora de fim é obrigatória';
    } else if (trainingForm.horaInicio && trainingForm.horaFim <= trainingForm.horaInicio) {
      errors.horaFim = 'Hora de fim deve ser posterior à hora de início';
    }

    return errors;
  };

  const handleTrainingSubmit = async (e) => {
    e.preventDefault();
    
    if (submittingForm) return;
    
    setSubmittingForm(true);

    const errors = validateTrainingForm();
    setTrainingErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Por favor, corrija os erros no formulário.');
      setSubmittingForm(false);
      return;
    }

    try {
      const dataInicio = `${trainingForm.data}T${trainingForm.horaInicio}:00`;
      const dataFim = `${trainingForm.data}T${trainingForm.horaFim}:00`;

      const documentoLimpo = trainingForm.cnpj.replace(/\D/g, '');
      const tipoDocumento = detectarTipoDocumento(documentoLimpo);
      
      const trainingData = {
        titulo: trainingForm.titulo.trim(),
        cnpj: documentoLimpo,
        tipoDocumento: tipoDocumento,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: trainingForm.status,
        usuario_id: trainingForm.usuario_id || null
      };

      if (editingTraining) {
        await api.put(`/training/${editingTraining.id}`, trainingData);
        toast.success('Treinamento atualizado com sucesso!');
      } else {
        await api.post('/training', trainingData);
        toast.success('Treinamento cadastrado com sucesso!');

        // Fluxo pós-cadastro para admins
        if (user?.role === 'admin') {
          try {
            const commissionCheck = await api.get(`/training/check-commissions/${trainingData.cnpj}`);
            if (!commissionCheck.data.hasCommissions) {
              // Mostrar modal de confirmação personalizado
              setCurrentTrainingData(trainingData);
              setShowCommissionModal(true);
            } else {
              toast.info('Treinamento salvo. Já existe comissão cadastrada para este CPF/CNPJ.');
            }
          } catch (err) {
            // Silenciar erro de verificação de comissões
          }
        }
      }

      closeTrainingModal();
      await fetchTreinamentos();
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erro ao salvar treinamento. Tente novamente.');
      }
    } finally {
      setSubmittingForm(false);
    }
  };

  const editTraining = (training) => {
    // Usar strings de data diretamente do backend para evitar problemas de timezone
    const formatDateFromISO = (isoString) => {
      // Extrair apenas a parte da data (YYYY-MM-DD)
      return isoString.split('T')[0];
    };

    const formatTimeFromISO = (isoString) => {
      // Extrair apenas a parte do tempo (HH:MM)
      const timePart = isoString.split('T')[1];
      return timePart ? timePart.substring(0, 5) : '00:00';
    };

    setEditingTraining(training);
    setTrainingForm({
      titulo: training.titulo,
      cnpj: formatarDocumento(training.cnpj),
      data: formatDateFromISO(training.data_inicio),
      horaInicio: formatTimeFromISO(training.data_inicio),
      horaFim: formatTimeFromISO(training.data_fim),
      status: training.status,
      usuario_id: training.usuario_id || ''
    });
    setShowTrainingModal(true);
  };

  const confirmDeleteTraining = (training) => {
    setTrainingToDelete(training);
    setShowDeleteModal(true);
  };

  const handleDeleteTraining = async () => {
    if (!trainingToDelete) return;

    try {
      await api.delete(`/training/${trainingToDelete.id}`);
      
      toast.success('Treinamento excluído com sucesso!', {
        ...toastConfig,
        autoClose: 3000,
      });

      setShowDeleteModal(false);
      setTrainingToDelete(null);
      await fetchTreinamentos();
    } catch (error) {
      const mensagemErro = error.response?.data?.message || error.message || 'Erro desconhecido';
      toast.error(`Erro ao excluir treinamento: ${mensagemErro}`, {
        ...toastConfig,
        autoClose: 5000,
      });
    }
  };

  const cancelDeleteTraining = () => {
    setShowDeleteModal(false);
    setTrainingToDelete(null);
  };

  const getTrainingsByDay = (date) => {
    return treinamentos.filter(training => {
      const trainingDate = new Date(training.data_inicio);
      return trainingDate.toDateString() === date.toDateString();
    });
  };

  const handleSidebarNavigation = (view) => {
    // Navega para a home com a view específica
    // O sidebar será fechado com delay pela própria lógica do Sidebar
    navigate('/home', { state: { activeView: view } });
  };

  return (
    <>
      <Sidebar 
        open={sidebarOpen} 
        onClose={closeSidebar} 
        onNavigate={handleSidebarNavigation}
        currentPage="treinamento"
      />
      <div id="container-menu" role="banner">
        <div className="menu-toggle-wrapper">
          <HamburgerButton open={sidebarOpen} onClick={toggleSidebar} />
        </div>
        <h1>Comissões BMS</h1>
        <img src={logo} alt="Logo Comissões BMS" />
      </div>

      <main>
        <div className="training-container">
      <div className="training-header">
        <h1>Treinamentos da Semana</h1>
        <div className="week-navigation">
          <button onClick={() => navigateWeek(-1)} className="btn-week-nav btn-week-nav-mobile">
            <FaChevronLeft />
            <span className="week-nav-text">Semana Anterior</span>
          </button>
          <span className="current-week">
            {getWeekDays(currentWeek)[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {getWeekDays(currentWeek)[4].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </span>
          <button onClick={() => navigateWeek(1)} className="btn-week-nav btn-week-nav-mobile">
            <span className="week-nav-text">Próxima Semana</span>
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="kanban-container">
        {getWeekDays(currentWeek).map((day, index) => {
          const dayTrainings = getTrainingsByDay(day);
          return (
            <div key={index} className={`kanban-column ${isToday(day) ? 'today' : ''}`}>
              <div className="kanban-header">
                <h3>{formatWeekDay(day)}</h3>
                <button
                  onClick={() => openTrainingModal(day)}
                  className="btn-add-training"
                  title="Adicionar treinamento"
                >
                  <FaPlus />
                </button>
              </div>

              <div className="kanban-content">
                {loadingTreinamentos ? (
                  <div className="loading-training">Carregando...</div>
                ) : dayTrainings.length === 0 ? (
                  <div className="no-training">Nenhum treinamento</div>
                ) : (
                  dayTrainings.map(training => (
                    <div key={training.id} className="training-card">
                      <div className="training-title">{training.titulo}</div>
                      <div className="training-user">{training.usuario || 'Não atribuído'}</div>
                      <div className="training-cnpj">{formatarDocumento(training.cnpj)}</div>
                      <div className="training-time">
                        {new Date(training.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(training.data_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`training-status ${training.status}`}>{training.status}</div>
                      <div className="training-actions">
                        <button
                          onClick={() => editTraining(training)}
                          className="btn-edit-training"
                          title="Editar treinamento"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => confirmDeleteTraining(training)}
                          className="btn-delete-training"
                          title="Excluir treinamento"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Treinamento */}
      {showTrainingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingTraining ? 'Editar Treinamento' : 'Novo Treinamento'}</h3>
              <button onClick={closeTrainingModal} className="modal-close">×</button>
            </div>
            <form className="modal-body">
              <div className="form-field">
                <label htmlFor="training-titulo">Título *</label>
                <input
                  id="training-titulo"
                  type="text"
                  value={trainingForm.titulo}
                  onChange={(e) => setTrainingForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className={trainingErrors.titulo ? 'error' : ''}
                  placeholder="Digite o título do treinamento"
                />
                {trainingErrors.titulo && <span className="error-message">{trainingErrors.titulo}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="training-cnpj">CPF/CNPJ *</label>
                <input
                  id="training-cnpj"
                  type="text"
                  value={trainingForm.cnpj}
                  onChange={(e) => setTrainingForm(prev => ({ ...prev, cnpj: formatarDocumento(e.target.value) }))}
                  className={trainingErrors.cnpj ? 'error' : ''}
                  placeholder="Digite CPF ou CNPJ"
                  maxLength="18"
                />
                {trainingErrors.cnpj && <span className="error-message">{trainingErrors.cnpj}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="training-data">Data * <span style={{ fontSize: '0.8em', color: '#666' }}>(apenas dias úteis)</span></label>
                <input
                  id="training-data"
                  type="date"
                  value={trainingForm.data}
                  onChange={(e) => setTrainingForm(prev => ({ ...prev, data: e.target.value }))}
                  className={trainingErrors.data ? 'error' : ''}
                />
                {trainingErrors.data && <span className="error-message">{trainingErrors.data}</span>}
              </div>

              <div className="form-field-group">
                <div className="form-field">
                  <label htmlFor="training-inicio">Hora de Início *</label>
                  <input
                    id="training-inicio"
                    type="time"
                    value={trainingForm.horaInicio}
                    onChange={(e) => setTrainingForm(prev => ({ ...prev, horaInicio: e.target.value }))}
                    className={trainingErrors.horaInicio ? 'error' : ''}
                  />
                  {trainingErrors.horaInicio && <span className="error-message">{trainingErrors.horaInicio}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="training-fim">Hora de Fim *</label>
                  <input
                    id="training-fim"
                    type="time"
                    value={trainingForm.horaFim}
                    onChange={(e) => setTrainingForm(prev => ({ ...prev, horaFim: e.target.value }))}
                    className={trainingErrors.horaFim ? 'error' : ''}
                  />
                  {trainingErrors.horaFim && <span className="error-message">{trainingErrors.horaFim}</span>}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="training-status">Status</label>
                <select
                  id="training-status"
                  value={trainingForm.status}
                  onChange={(e) => setTrainingForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="planejado">Planejado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="training-usuario">Usuário</label>
                <select
                  id="training-usuario"
                  value={trainingForm.usuario_id}
                  onChange={(e) => setTrainingForm(prev => ({ ...prev, usuario_id: e.target.value }))}
                >
                  <option value="">Não atribuído</option>
                  {user && (
                    <option value={user.id}>
                      {user.nome} - {user.email} (Você)
                    </option>
                  )}
                  {usuarios
                    .filter(usuario => usuario.id !== user?.id)
                    .map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} - {usuario.email}
                      </option>
                    ))}
                </select>
              </div>
            </form>

            <div className="modal-actions">
              <button type="button" onClick={closeTrainingModal} className="btn-modal-cancel" disabled={submittingForm}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-modal-confirm" 
                disabled={submittingForm}
                onClick={handleTrainingSubmit}
              >
                {submittingForm ? 'Processando...' : (editingTraining ? 'Atualizar' : 'Cadastrar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Comissão */}
      {showCommissionModal && (
        <div className="modal-overlay">
          <div className="modal-content commission-modal">
            <div className="modal-header">
              <h3>Cadastrar Comissão</h3>
            </div>
            <div className="modal-body">
              <p>
                <strong>✅ Treinamento salvo com sucesso!</strong>
              </p>
              <p>
                Nenhuma comissão encontrada para o CPF/CNPJ <strong>{formatarDocumento(currentTrainingData?.cnpj || '')}</strong>.
              </p>
              <p>
                Deseja cadastrar uma comissão para este cliente agora?
              </p>
              <div className="training-data-box">
                <strong>Dados do treinamento:</strong>
                <div>📋 Título: {currentTrainingData?.titulo}</div>
                <div>🏢 CPF/CNPJ: {formatarDocumento(currentTrainingData?.cnpj || '')}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={closeCommissionModal}
                className="btn-modal-cancel"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={handleCommissionRedirect}
                className="btn-modal-confirm"
              >
                Cadastrar Comissão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h3>Confirmar Exclusão</h3>
            </div>
            <div className="modal-body">
              <p>
                <strong>⚠️ Atenção!</strong>
              </p>
              <p>
                Você tem certeza que deseja excluir este treinamento?
              </p>
              {trainingToDelete && (
                <div className="training-data-box">
                  <strong>Dados do treinamento:</strong>
                  <div>📋 Título: {trainingToDelete.titulo}</div>
                  <div>🏢 CPF/CNPJ: {formatarDocumento(trainingToDelete.cnpj)}</div>
                  <div>📅 Data: {new Date(trainingToDelete.data_inicio).toLocaleDateString('pt-BR')}</div>
                  <div>👤 Usuário: {trainingToDelete.usuario || 'Não atribuído'}</div>
                </div>
              )}
              <p className="warning-text">
                ⚠️ Esta ação não pode ser desfeita!
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={cancelDeleteTraining}
                className="btn-modal-cancel"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTraining}
                className="btn-modal-delete"
              >
                Excluir Treinamento
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </>
  );
}

export default Treinamento;