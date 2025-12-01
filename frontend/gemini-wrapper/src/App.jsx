import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

// Base da API: via Nginx -> backend
const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [topics, setTopics] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    checkApiStatus()
    loadTopics()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkApiStatus = async () => {
    try {
      // ✅ Health bate em /health (sem /api)
      const response = await axios.get('/health')
      setApiStatus(response.data.status === 'healthy' ? 'connected' : 'error')
    } catch (error) {
      setApiStatus('error')
    }
  }

  const loadTopics = async () => {
    try {
      // ✅ Agora chama /api/topics (via Nginx -> backend)
      const response = await axios.get(`${API_URL}/topics`)
      // Backend retorna uma lista simples, não { topics: [...] }
      setTopics(response.data || [])
    } catch (error) {
      // Fallback estático se backend falhar
      setTopics([
        { id: 'docker', name: 'Docker', description: 'Containers' },
        { id: 'aws', name: 'AWS', description: 'Cloud' },
        { id: 'kubernetes', name: 'Kubernetes', description: 'Orquestração' },
        { id: 'cicd', name: 'CI/CD', description: 'Pipeline' }
      ])
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // ✅ POST em /api/ask
      const response = await axios.post(`${API_URL}/ask`, {
        question: input,
        topic: selectedTopic
      })

      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Erro ao processar pergunta. Verifique se o backend está rodando.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setSelectedTopic('')
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-purple-900/30 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              Chat Educacional - Cloud Computing
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus === 'connected' ? 'bg-purple-500 animate-pulse shadow-lg shadow-purple-500/50' : 
                  apiStatus === 'error' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-300">
                  {apiStatus === 'connected' ? 'Conectado' : 
                   apiStatus === 'error' ? 'Offline' : 
                   'Verificando...'}
                </span>
              </div>
              <button
                onClick={clearChat}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium shadow-lg shadow-purple-600/30"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Topics */}
      {topics.length > 0 && (
        <div className="bg-black border-b border-purple-900/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTopic('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTopic === '' 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                Todos
              </button>
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTopic === topic.name 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {topic.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-black rounded-2xl shadow-2xl border border-purple-900/30 overflow-hidden">
          {/* Messages */}
          <div className="h-[600px] overflow-y-auto p-6 space-y-6 bg-black">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-40">
                <p className="text-xl font-medium text-white mb-2">Olá! Como posso ajudar você hoje?</p>
                <p className="text-sm">Faça perguntas sobre Cloud Computing, DevOps, AWS, Docker, Kubernetes...</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`flex items-start gap-3 max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      msg.role === 'user' 
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                        : 'bg-gray-800 text-purple-400 border border-purple-600/30'
                    }`}>
                      {msg.role === 'user' ? 'Você' : 'AI'}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        className={`rounded-2xl px-5 py-3 shadow-lg ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white shadow-purple-600/20'
                            : 'bg-gray-800 text-white border border-gray-700'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-xs text-gray-500 px-2">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 text-purple-400 border border-purple-600/30 flex items-center justify-center text-sm font-bold">
                    AI
                  </div>
                  <div className="bg-gray-800 px-5 py-3 rounded-2xl shadow-lg border border-gray-700">
                    <div className="flex gap-2">
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

          {/* Input */}
          <div className="border-t border-purple-900/30 bg-black p-4">
            <form onSubmit={sendMessage} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta sobre Cloud Computing..."
                className="flex-1 px-5 py-3 bg-gray-800 text-white border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent placeholder-gray-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-purple-600/30"
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
            
            {selectedTopic && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                <span>Tópico:</span>
                <span className="font-semibold text-purple-400">{selectedTopic}</span>
                <button
                  onClick={() => setSelectedTopic('')}
                  className="ml-auto text-purple-400 hover:text-purple-300 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-purple-900/30 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-400">
            Desenvolvido com <span className="text-purple-500">FastAPI</span>, <span className="text-purple-500">React</span> e <span className="text-purple-500">Google Gemini AI</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
