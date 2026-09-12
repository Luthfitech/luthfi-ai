# 🤖 Luthfi AI - Your All-in-One AI Agent & Application Platform

Luthfi AI is a modern, dark-futuristic AI Platform built with HTML5, CSS3, Vanilla JavaScript, and Node.js connected to the **Google Gemini API** (`@google/genai`).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Gemini API Key**: Obtain a free key from [Google AI Studio](https://aistudio.google.com/)

### 2. Installation
Navigate into the project root directory and install dependencies:
```bash
cd luthfi-ai
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` in any text editor and paste your API key:
```env
GEMINI_API_KEY=AIzaSy...YourActualGeminiApiKey
```

### 4. Running the Platform
Start the node backend server:
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## ⚡ Features & API Endpoints

| Feature | Method | Endpoint | Description |
|---|---|---|---|
| **System Health** | `GET` | `/api/health` | Verifies server status & API Key availability |
| **AI Chat** | `POST` | `/api/chat` | Real-time conversational AI powered by Gemini 2.5 Flash |
| **AI Code Generator** | `POST` | `/api/code` | Generates HTML/CSS/JS/Python with live iframe rendering |
| **AI Agent Workspace**| `POST` | `/api/agent` | Autonomous multi-step reasoning logs & planning |
| **AI Image Generator**| `POST` | `/api/image` | Imagen-based text-to-image generator |

---

## 🔒 Security Guarantee
The `GEMINI_API_KEY` is strictly encapsulated on the server side (`server.js`) and loaded via environment variables (`.env`). It is **never** exposed to client browsers or frontend JavaScript files.
