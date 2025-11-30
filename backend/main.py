"""
Chat Educacional com Gemini AI
Backend API desenvolvido com FastAPI
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import google.generativeai as genai
import os
from datetime import datetime
import logging
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import Response
import time

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Métricas Prometheus
REQUEST_COUNT = Counter('http_requests_total', 'Total de requisições HTTP', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Latência das requisições HTTP', ['endpoint'])
CHAT_MESSAGES = Counter('chat_messages_total', 'Total de mensagens do chat', ['topic'])
GEMINI_ERRORS = Counter('gemini_errors_total', 'Total de erros da API Gemini')

# Configurar FastAPI
app = FastAPI(
    title="Chat Educacional Gemini API",
    description="API de chat educacional em Cloud Computing usando Google Gemini",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY não configurada!")
    raise ValueError("GEMINI_API_KEY não encontrada nas variáveis de ambiente")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# Models
class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000, description="Pergunta do estudante")
    topic: Optional[str] = Field(None, description="Tópico da pergunta")
    conversation_id: Optional[str] = Field(None, description="ID da conversa para contexto")
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "O que é Docker e para que serve?",
                "topic": "Docker e Containerização"
            }
        }

class AnswerResponse(BaseModel):
    answer: str
    topic: Optional[str]
    timestamp: datetime
    conversation_id: str
    
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime
    gemini_configured: bool

class Topic(BaseModel):
    id: str
    name: str
    description: str
    icon: str

class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: datetime

# Tópicos disponíveis
TOPICS = [
    Topic(
        id="docker",
        name="Docker e Containerização",
        description="Conceitos de containers, imagens, volumes e redes",
        icon="🐳"
    ),
    Topic(
        id="aws",
        name="AWS - Serviços Básicos",
        description="EC2, S3, RDS, Lambda e outros serviços fundamentais",
        icon="☁️"
    ),
    Topic(
        id="cicd",
        name="CI/CD e GitHub Actions",
        description="Integração e entrega contínuas, pipelines automatizados",
        icon="🔄"
    ),
    Topic(
        id="kubernetes",
        name="Kubernetes",
        description="Orquestração de containers, pods, services e deployments",
        icon="⚓"
    ),
    Topic(
        id="terraform",
        name="Terraform e IaC",
        description="Infrastructure as Code, provisionamento automatizado",
        icon="🏗️"
    ),
    Topic(
        id="security",
        name="Segurança em Cloud",
        description="IAM, VPC, Security Groups, SSL/TLS",
        icon="🔒"
    ),
    Topic(
        id="monitoring",
        name="Monitoramento e Logs",
        description="CloudWatch, Prometheus, Grafana, ELK Stack",
        icon="📊"
    ),
    Topic(
        id="microservices",
        name="Arquitetura de Microserviços",
        description="Design patterns, comunicação entre serviços, API Gateway",
        icon="🏛️"
    ),
]

# Middleware para métricas
@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(duration)
    
    return response

# Health Check
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check do serviço"
)
async def health_check():
    """
    Verifica o status do serviço e suas dependências
    """
    return HealthResponse(
        status="healthy",
        service="chat-educacional-gemini",
        version="1.0.0",
        timestamp=datetime.now(),
        gemini_configured=bool(GEMINI_API_KEY)
    )

# Métricas Prometheus
@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Endpoint de métricas para Prometheus"""
    return Response(content=generate_latest(), media_type="text/plain")

# Listar tópicos
@app.get(
    "/api/topics",
    response_model=List[Topic],
    tags=["Topics"],
    summary="Listar tópicos disponíveis"
)
async def get_topics():
    """
    Retorna lista de tópicos educacionais disponíveis
    """
    logger.info("Listando tópicos disponíveis")
    return TOPICS

# Fazer pergunta
@app.post(
    "/api/ask",
    response_model=AnswerResponse,
    tags=["Chat"],
    summary="Fazer uma pergunta ao assistente",
    responses={
        200: {"description": "Resposta gerada com sucesso"},
        400: {"model": ErrorResponse, "description": "Requisição inválida"},
        500: {"model": ErrorResponse, "description": "Erro no servidor"}
    }
)
async def ask_question(request: QuestionRequest):
    """
    Processa uma pergunta do estudante e retorna resposta do Gemini AI
    
    - **question**: Pergunta do estudante (obrigatório)
    - **topic**: Tópico relacionado (opcional)
    - **conversation_id**: ID para manter contexto da conversa (opcional)
    """
    try:
        # Log da pergunta
        logger.info(f"Nova pergunta recebida - Tópico: {request.topic}, Tamanho: {len(request.question)}")
        
        # Incrementar métrica
        topic_label = request.topic or "geral"
        CHAT_MESSAGES.labels(topic=topic_label).inc()
        
        # Criar prompt contextualizado
        prompt = create_educational_prompt(request.question, request.topic)
        
        # Chamar Gemini
        logger.info("Chamando API Gemini...")
        response = model.generate_content(prompt)
        
        if not response.text:
            logger.error("Gemini retornou resposta vazia")
            GEMINI_ERRORS.inc()
            raise HTTPException(
                status_code=500,
                detail="Gemini retornou resposta vazia"
            )
        
        answer = response.text
        logger.info(f"Resposta gerada com sucesso - Tamanho: {len(answer)}")
        
        # Gerar conversation_id se não fornecido
        conversation_id = request.conversation_id or f"conv_{int(time.time())}"
        
        return AnswerResponse(
            answer=answer,
            topic=request.topic,
            timestamp=datetime.now(),
            conversation_id=conversation_id
        )
        
    except Exception as e:
        logger.error(f"Erro ao processar pergunta: {str(e)}")
        GEMINI_ERRORS.inc()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar pergunta: {str(e)}"
        )

def create_educational_prompt(question: str, topic: Optional[str] = None) -> str:
    """
    Cria prompt educacional otimizado para Gemini
    """
    base_prompt = """Você é um assistente educacional especializado em Cloud Computing, DevOps e AWS.

DIRETRIZES:
1. Responda de forma didática e clara
2. Use exemplos práticos quando possível
3. Explique conceitos técnicos de forma acessível
4. Se a pergunta for muito ampla, foque nos pontos principais
5. Inclua boas práticas quando relevante
6. Use formatação markdown para melhor legibilidade

"""
    
    if topic:
        base_prompt += f"\nTÓPICO ESPECÍFICO: {topic}\n"
    
    base_prompt += f"\nPERGUNTA DO ESTUDANTE: {question}\n\nRESPOSTA:"
    
    return base_prompt

# Endpoint raiz
@app.get("/", include_in_schema=False)
async def root():
    """Redirect para documentação"""
    return {
        "message": "Chat Educacional Gemini API",
        "docs": "/api/docs",
        "health": "/health",
        "version": "1.0.0"
    }

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Erro não tratado: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Erro interno do servidor",
            "detail": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
