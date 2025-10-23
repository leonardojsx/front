import { useRef, useState } from 'react';
import { FaEnvelope, FaEyeSlash } from "react-icons/fa";
import './Index.css';
import logo from '../../images/logo.png';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ToastContainer, toast, Zoom } from 'react-toastify';
import { ImSpinner9 } from "react-icons/im";

const initialState = {
  email: { error: false, message: "" },
  senha: { error: false, message: "" },
};

const displayError = (message = 'Email ou senha inválidos!') => { toast.error(message, { position: "top-center" }); };

function Login() {
  const inputEmail = useRef();
  const inputPassword = useRef();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isValid, setIsValid] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);

  async function acess() {
    const email = (inputEmail.current?.value || '').trim();
    const password = inputPassword.current?.value || '';

    let novoEstado = { ...initialState };
    let hasError = false;

    if (!email) {
      novoEstado.email = { error: true, message: 'Preencha seu email!' };
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      novoEstado.email = { error: true, message: 'Digite um e-mail válido!' };
      hasError = true;
    }

    // Validação básica da senha
    if (!password) {
      novoEstado.senha = { error: true, message: 'Preencha sua senha!' };
      hasError = true;
    }
    
    setIsValid(novoEstado);
    if (hasError) return;

    setIsLoading(true);
    try {
      const loginSuccess = await login(email, password);
      if (loginSuccess) {
        toast.success('Login realizado com sucesso!', { position: "top-center" });
        navigate('/home');
      } else {
        displayError('Credenciais inválidas. Verifique seu email e senha.');
      }
    } catch (error) {
      displayError('Erro ao conectar com o servidor. Tente novamente.');
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
            <h1 id='title'>Comissões BMS</h1>
            <p className="subtitle">Faça login para acessar o sistema</p>
          </div>
          
          <div className="form-section">
            <div className="content-box">
              <label htmlFor="email">E-mail</label>
              <div className={`input-box ${isValid.email.error ? 'erro' : ''}`}>
                <div className="icon"> <FaEnvelope /> </div>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  className="input" 
                  placeholder='exemplo@gmail.com' 
                  ref={inputEmail} 
                />
              </div>
              {isValid.email.error && <div className="comErro">{isValid.email.message}</div>}
            </div>
            
            <div className="content-box">
              <label htmlFor="password">Senha</label>
              <div className={`input-box ${isValid.senha.error ? 'erro' : ''}`}>
                <div className="icon"> <FaEyeSlash /> </div>
                <input 
                  type="password" 
                  name="password" 
                  id="password" 
                  className='input' 
                  placeholder='Digite aqui sua senha' 
                  ref={inputPassword} 
                />
              </div>
              {isValid.senha.error && <div className="comErro">{isValid.senha.message}</div>}
            </div>
            
            <button 
              className='btn' 
              type='button' 
              onClick={acess} 
              disabled={isLoading}
              style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
            >
              {isLoading ? <ImSpinner9 className='spin' size={18} /> : 'Entrar'}
            </button>
            
            <div id="cad">
              <p>Não tem conta? <Link to="/register">Cadastre-se</Link></p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export default Login;