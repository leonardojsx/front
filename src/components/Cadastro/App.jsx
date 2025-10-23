import { useRef, useState } from 'react';
import { FaEnvelope, FaEyeSlash } from "react-icons/fa";
import { BsFillPersonFill } from "react-icons/bs";
import './Index.css';
import logo from '../../images/logo.png';
import api from '../../services/api.js';
import { ToastContainer, toast, Zoom } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';

const initialState = {
  email: { error: false, message: "" },
  senha: { error: false, message: "" },
  nome:  { error: false, message: "" },
};

const displaySuccess = () => { toast.success('Usuário criado com sucesso! Faça login', { position: "top-center", autoClose: 2000 }); };
const displayError = (msg = 'Usuário não criado!') => { toast.error(msg, { position: "top-center" }); };

function Cadastro() {
  const inputEmail = useRef();
  const inputPassword = useRef();
  const inputNome = useRef();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);

  async function createUser() {
    const register = {
      nome: (inputNome.current?.value || '').trim(),
      email: (inputEmail.current?.value || '').trim(),
      password: inputPassword.current?.value || ''
    };
    
    let novoEstado = { ...initialState };
    let hasError = false;

    // ✅ LÓGICA DE VALIDAÇÃO CORRIGIDA PARA O NOME
    if (!register.nome) {
      novoEstado.nome = { error: true, message: 'Preencha seu nome!' };
      hasError = true;
    } else if (register.nome.length < 4) {
      novoEstado.nome = { error: true, message: 'Nome deve conter no mínimo 4 caracteres!' };
      hasError = true;
    }

    // ✅ LÓGICA DE VALIDAÇÃO CORRIGIDA PARA O EMAIL
    if (!register.email) {
      novoEstado.email = { error: true, message: 'Preencha seu e-mail!' };
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(register.email)) {
      novoEstado.email = { error: true, message: 'Digite um e-mail válido!' };
      hasError = true;
    }
    
    // ✅ LÓGICA DE VALIDAÇÃO CORRIGIDA PARA A SENHA
    if (!register.password) {
      novoEstado.senha = { error: true, message: 'Preencha sua senha!' };
      hasError = true;
    } else if (register.password.length < 8) {
      novoEstado.senha = { error: true, message: 'Senha deve conter no mínimo 8 dígitos!' };
      hasError = true;
    }
    
    setIsValid(novoEstado);
    if (hasError) return;

    setIsLoading(true);
    try {
      await api.post('/users', {
        nome: register.nome,
        email: register.email,
        senha: register.password
      });
      displaySuccess();
      setTimeout(() => { navigate('/login'); }, 2000);
    } catch (error) {
      const backendMsg = error?.response?.data?.message;
      displayError(backendMsg || 'Falha ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <ToastContainer />
      <div id="container-form">
        <form action="" id='form'>
          <div className="header-section">
            <div id="image">
              <img src={logo} id='img' alt="Logo Comissões BMS" />
            </div>
            <h1 id='title'>Cadastro BMS</h1>
            <p className="subtitle">Crie sua conta para acessar o sistema</p>
          </div>
          
          <div className="form-section">
            <div className="content-box">
              <label htmlFor="nome">Nome completo</label>
              <div className={`input-box ${isValid.nome.error ? 'erro' : ''}`}>
                <div className="icon"><BsFillPersonFill /></div>
                <input 
                  type="text" 
                  name="nome" 
                  id="nome" 
                  className='input' 
                  placeholder='Digite seu nome completo' 
                  ref={inputNome} 
                />
              </div>
              {isValid.nome.error && <div className="comErro">{isValid.nome.message}</div>}
            </div>
            
            <div className="content-box">
              <label htmlFor="email">E-mail</label>
              <div className={`input-box ${isValid.email.error ? 'erro' : ''}`}>
                <div className="icon"><FaEnvelope /></div>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  className='input' 
                  placeholder='exemplo@gmail.com' 
                  ref={inputEmail} 
                />
              </div>
              {isValid.email.error && <div className="comErro">{isValid.email.message}</div>}
            </div>
            
            <div className="content-box">
              <label htmlFor="password">Senha</label>
              <div className={`input-box ${isValid.senha.error ? 'erro' : ''}`}>
                <div className="icon"><FaEyeSlash /></div>
                <input 
                  type="password" 
                  name="password" 
                  id="password" 
                  className='input' 
                  placeholder='Digite uma senha segura' 
                  ref={inputPassword} 
                />
              </div>
              {isValid.senha.error && <div className="comErro">{isValid.senha.message}</div>}
            </div>
            
            <button 
              className='btn' 
              type='button' 
              onClick={createUser} 
              disabled={isLoading} 
              style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
            >
              {isLoading ? 'Criando conta...' : 'Cadastrar'}
            </button>
            
            <div id="cad">
              <p>Já tem conta? <Link to="/login">Faça login</Link></p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export default Cadastro;