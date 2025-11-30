import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    checkApiHealth();
    loadTopics();
    
    setMessages([{
      type: 'assistant',
      content: '👋 Olá! Sou seu assistente de estudos em Cloud Computing. Como posso ajudá-lo hoje?',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkApiHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      if (response.status === 200) {
        setApiStatus('connected');
      }
    } catch (error) {
      setApiStatus('error');
      console.error('Erro ao verificar API:', error);
    }
  };

  const loadTopics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/topics`);
      setTopics(response.data.topics || []);
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
      setTopics([
        'Docker e Containerização',
        'AWS - Serviços Básicos',
        'CI/CD e GitHub Actions',
        'Kubernetes',
        'Terraform e IaC',
        'Segurança em Cloud',
        'Monitoramento e Logs',
        'Arquitetura de Microserviços'
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    const userMessage = {
      type: 'user',
      content: inputValue,
      topic: selectedTopic,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/ask`, {
        question: userMessage.content,
        topic: selectedTopic
      });

      const assistantMessage = {
        type: 'assistant',
        content: response.data.answer,
        topic: response.data.topic,
        timestamp: new Date(response.data.timestamp)
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro:', error);
      
      const errorMessage = {
        type: 'assistant',
        content: '❌ Desculpe, ocorreu um erro ao processar sua pergunta. Verifique se a API está rodando.',
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const clearChat = () => {
    setMessages([{
      type: 'assistant',
      content: '👋 Chat limpo! Como posso ajudá-lo?',
      timestamp: new Date()
    }]);
    setSelectedTopic('');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exampleQuestions = [
    { question: "O que é Docker?", topic: "Docker e Containerização" },
    { question: "Como funciona o ECS Fargate?", topic: "AWS - Serviços Básicos" },
    { question: "Explique CI/CD", topic: "CI/CD e GitHub Actions" },
    { question: "O que é Kubernetes?", topic: "Kubernetes" }
  ];

  const askExample = (question, topic) => {
    setInputValue(question);
    setSelectedTopic(topic);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-xl shadow-lg">
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Assistente de Estudos</h1>
                <p className="text-purple-200 text-sm">Cloud Computing & DevOps</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-2 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus === 'connected' ? 'bg-green-400' :
                  apiStatus === 'checking' ? 'bg-yellow-400' :
                  'bg-red-400'
                } animate-pulse`}></div>
                <span className="text-sm">
                  {apiStatus === 'connected' ? 'Conectado' :
                   apiStatus === 'checking' ? 'Verificando...' :
                   'Offline'}
                </span>
              </div>
              <button
                onClick={clearChat}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <span className="hidden sm:inline">Limpar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Topics */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
            </svg>
            Tópicos Disponíveis
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTopic('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
                selectedTopic === '' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌐 Geral
            </button>
            {topics.map((topic, index) => (
              <button
                key={index}
                onClick={() => setSelectedTopic(topic)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
                  selectedTopic === topic 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Sidebar com exemplos */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                Perguntas Exemplo
              </h3>
              <div className="space-y-2">
                {exampleQuestions.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => askExample(example.question, example.topic)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-all text-sm border border-gray-200 hover:border-purple-300"
                  >
                    <div className="font-medium text-gray-800">{example.question}</div>
                    <div className="text-xs text-gray-500 mt-1">{example.topic}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg p-4 text-white">
              <h3 className="font-semibold mb-2">💡 Dica</h3>
              <p className="text-sm text-purple-100">
                Selecione um tópico específico para respostas mais direcionadas ao seu estudo!
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg h-full flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-container">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`flex items-start space-x-3 max-w-3xl ${
                      message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-blue-600' 
                          : message.isError 
                          ? 'bg-red-600' 
                          : 'bg-purple-600'
                      } shadow-lg`}>
                        {message.type === 'user' ? '👤' : message.isError ? '⚠️' : '🤖'}
                      </div>
                      
                      <div className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-3 rounded-2xl shadow-md ${
                          message.type === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : message.isError
                            ? 'bg-red-50 text-red-900 border border-red-200'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {message.topic && message.type === 'user' && (
                            <div className="text-xs opacity-75 mb-1 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                              </svg>
                              {message.topic}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
                        🤖
                      </div>
                      <div className="bg-gray-100 px-4 py-3 rounded-2xl shadow-md">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4 bg-gray-50">
                <form onSubmit={handleSubmit} className="flex space-x-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Digite sua pergunta sobre Cloud Computing..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent shadow-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span>Enviar</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                    </svg>
                  </button>
                </form>
                
                {selectedTopic && (
                  <div className="mt-2 flex items-center text-sm text-gray-600 bg-purple-50 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
                    </svg>
                    Tópico: <span className="font-semibold ml-1">{selectedTopic}</span>
                    <button
                      onClick={() => setSelectedTopic('')}
                      className="ml-2 text-purple-600 hover:text-purple-700"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm flex items-center justify-center space-x-2">
            <span>Desenvolvido com Go, React e</span>
            <span className="text-red-500 animate-pulse">❤️</span>
            <span>| Powered by Google Gemini AI</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;