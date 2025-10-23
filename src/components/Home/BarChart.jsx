import React, { useState, useEffect, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import api from '../../services/api'; 

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const getChartOptions = (isMobile) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  layout: {
    padding: {
      left: 10,
      right: 10,
      bottom: isMobile ? 15 : 40,
      top: 10
    }
  },
  plugins: {
    legend: { 
      display: false 
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#4f46e5',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: false,
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        size: 13
      },
      callbacks: {
        title: function(context) {
          return `${context[0].label}`;
        },
        label: function(context) {
          const value = new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(context.parsed.y);
          return `💰 Comissão: ${value}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
      ticks: {
        display: true,
        color: '#6b7280',
        font: {
          size: isMobile ? 10 : 12,
          weight: '500'
        },
        maxRotation: isMobile ? 45 : 0,
        minRotation: isMobile ? 45 : 0,
        autoSkip: isMobile,
        autoSkipPadding: 5,
        maxTicksLimit: isMobile ? 10 : 31,
        includeBounds: true,
        padding: isMobile ? 5 : 10
      }
    },
    y: {
      beginAtZero: true,
      border: {
        display: false,
      },
      grid: {
        color: 'rgba(107, 114, 128, 0.1)',
        lineWidth: 1,
      },
      ticks: {
        color: '#6b7280',
        font: {
          size: 12
        },
        callback: function(value) {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0
          }).format(value);
        }
      }
    }
  },
  animation: {
    duration: 1500,
    easing: 'easeOutQuart',
  },
  elements: {
    bar: {
      borderRadius: 8,
      borderSkipped: false,
    }
  }
});

const BarChart = () => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  const chartRef = useRef(null);

  // Detecta mudança no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup do gráfico
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        const response = await api.get(`/schedule?view=chart&ano=${anoAtual}&mes=${mesAtual}`); 
        const registrosDoMes = response.data;

        if (Array.isArray(registrosDoMes)) {
          // Criar gradientes azuis para as barras
          const createGradient = (ctx, chartArea) => {
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)'); // Azul claro
            gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.7)'); // Azul médio
            gradient.addColorStop(1, 'rgba(59, 130, 246, 1)'); // Azul forte
            return gradient;
          };

          const hoverGradient = (ctx, chartArea) => {
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)'); // Azul escuro claro
            gradient.addColorStop(0.5, 'rgba(37, 99, 235, 0.8)'); // Azul escuro médio
            gradient.addColorStop(1, 'rgba(37, 99, 235, 1)'); // Azul escuro forte
            return gradient;
          };

          setChartData({
            labels: registrosDoMes.map(reg => {
              const date = new Date(reg.data);
              return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            }),
            datasets: [{
              label: 'Comissão',
              data: registrosDoMes.map(reg => reg.valorPorcentagem),
              backgroundColor: function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) return null;
                return createGradient(ctx, chartArea);
              },
              hoverBackgroundColor: function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) return null;
                return hoverGradient(ctx, chartArea);
              },
              borderColor: 'rgba(59, 130, 246, 0.8)',
              borderWidth: 0,
              borderRadius: 8,
              borderSkipped: false,
              maxBarThickness: 25,
              minBarLength: 2,
              categoryPercentage: 0.8,
              barPercentage: 0.9
            }]
          });
        } else {
          throw new Error("O formato dos dados recebidos não é um array.");
        }
      } catch (err) {
        setError("Falha ao carregar os dados. Verifique a API e tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="chart-loading-container">
        <div className="chart-loading-spinner"></div>
        <p>Carregando dados do gráfico...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="chart-error-container">
        <div className="chart-error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!chartData.labels || chartData.labels.length === 0) {
    return (
      <div className="chart-empty-container">
        <div className="chart-empty-icon">📊</div>
        <h3>Nenhum dado disponível</h3>
        <p>Nenhuma comissão encontrada para o mês atual.</p>
      </div>
    );
  }

  const hoje = new Date();
  const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalComissoes = chartData.datasets[0].data.reduce((sum, value) => sum + value, 0);

  return (
    <div className="modern-chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <h2>📊 Comissões - {mesAtual}</h2>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Dias contabilizados</span>
              <span className="stat-value">{chartData.labels.length}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="chart-wrapper">
        <Bar ref={chartRef} data={chartData} options={getChartOptions(isMobile)} />
      </div>
    </div>
  );
};

export default BarChart;