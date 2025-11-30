package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

type QuestionRequest struct {
	Question string `json:"question" binding:"required"`
	Topic    string `json:"topic"`
}

type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

type Content struct {
	Parts []Part `json:"parts"`
}

type Part struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

type AnswerResponse struct {
	Answer    string    `json:"answer"`
	Topic     string    `json:"topic"`
	Timestamp time.Time `json:"timestamp"`
}

var geminiAPIKey string

func main() {
	// Carregar configurações
	geminiAPIKey = os.Getenv("GEMINI_API_KEY")
	if geminiAPIKey == "" {
		log.Fatal("GEMINI_API_KEY não configurada")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Configurar Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Middleware CORS
	r.Use(corsMiddleware())

	// Servir arquivos estáticos do frontend
	r.Static("/assets", "./frontend/dist/assets")
	r.StaticFile("/", "./frontend/dist/index.html")
	r.StaticFile("/index.html", "./frontend/dist/index.html")

	// Rotas da API
	api := r.Group("/api")
	{
		api.GET("/health", healthCheck)
		api.POST("/ask", askQuestion)
		api.GET("/topics", getTopics)
	}

	// Health check na raiz também (para ECS)
	r.GET("/health", healthCheck)

	// Iniciar servidor
	log.Printf("🚀 Servidor rodando na porta %s", port)
	log.Printf("📱 Interface: http://localhost:%s", port)
	log.Printf("🔌 API: http://localhost:%s/api", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "assistente-estudos-cloud",
		"version": "1.0.0",
		"time":    time.Now(),
	})
}

func getTopics(c *gin.Context) {
	topics := []string{
		"Docker e Containerização",
		"AWS - Serviços Básicos",
		"CI/CD e GitHub Actions",
		"Kubernetes",
		"Terraform e IaC",
		"Segurança em Cloud",
		"Monitoramento e Logs",
		"Arquitetura de Microserviços",
	}

	c.JSON(http.StatusOK, gin.H{
		"topics": topics,
	})
}

func askQuestion(c *gin.Context) {
	var req QuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pergunta inválida"})
		return
	}

	// Criar prompt para o Gemini
	prompt := createPrompt(req.Question, req.Topic)

	// Chamar API do Gemini
	answer, err := callGemini(prompt)
	if err != nil {
		log.Printf("Erro ao chamar Gemini: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao processar pergunta"})
		return
	}

	response := AnswerResponse{
		Answer:    answer,
		Topic:     req.Topic,
		Timestamp: time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

func createPrompt(question, topic string) string {
	basePrompt := `Você é um assistente educacional especializado em Cloud Computing, DevOps e AWS.
Responda de forma clara, didática e prática.`

	if topic != "" {
		basePrompt += fmt.Sprintf("\n\nTópico: %s", topic)
	}

	basePrompt += fmt.Sprintf("\n\nPergunta do estudante: %s", question)
	basePrompt += "\n\nResposta:"

	return basePrompt
}

func callGemini(prompt string) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=%s", geminiAPIKey)

	requestBody := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("erro na API: %s - %s", resp.Status, string(body))
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("resposta vazia do Gemini")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}
