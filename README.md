# 🧠 Polymind

**Multi-Model AI Debate & Voting Platform**

Polymind is an open-source web application that connects to the OpenRouter API, allowing users to select multiple AI models and run them in two collaborative modes:

- **Debate Mode**: Selected models generate responses, critique each other's work, and refine their answers through multiple rounds to produce a consolidated final answer.
- **Voting Mode**: Each model generates an independent answer, and Grok (from xAI) evaluates them anonymously to select the best one.

## Features

- 🔑 **Bring Your Own API Key** - No accounts required, use your own OpenRouter API key
- 🤖 **30+ AI Models** - Choose from GPT-4, Claude, Gemini, Llama, Mistral, Grok, and more
- 💬 **Debate Mode** - Collaborative multi-round refinement
- 🗳️ **Voting Mode** - Anonymous evaluation by Grok
- 📊 **Real-time Progress** - See live progress as models respond
- 🎯 **Open Source** - Fully open source, self-hostable

## Tech Stack

### Backend
- **Node.js** with **Express.js** and **TypeScript**
- **OpenRouter API** for multi-model access
- **Server-Sent Events (SSE)** for streaming responses

### Frontend
- **Next.js 16.1.6** with **React 18**
- **Tailwind CSS** and **shadcn/ui** components
- **Zustand** for state management

## Getting Started

### Prerequisites

- Node.js 20.9+ (required for Next.js 16 frontend; works for backend too)
- npm or yarn
- OpenRouter API key (get one at [openrouter.ai/keys](https://openrouter.ai/keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/polymind.git
   cd polymind
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the backend server**
   ```bash
   cd ../backend
   npm run dev
   ```
   The backend will run on http://localhost:3001

5. **Start the frontend development server**
   ```bash
   cd ../frontend
   npm run dev
   ```
   The frontend will run on http://localhost:3000

   Optional quality checks:
   ```bash
   npm run lint
   npm run build
   ```

6. **Open your browser**
   Navigate to http://localhost:3000

## Usage

1. **Connect your API Key** - Enter your OpenRouter API key on the home page
2. **Select Models** - Choose 2-30 AI models to participate
3. **Choose a Mode**:
   - **Debate Mode**: Models collaborate through multiple rounds
   - **Voting Mode**: Models compete and Grok picks the winner
4. **Enter Your Prompt** - Type your question or problem
5. **Start** - Watch as the models work together or compete

## Project Structure

```
polymind/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server entry point
│   │   ├── types/            # TypeScript type definitions
│   │   ├── routes/           # API route handlers
│   │   │   ├── models.ts     # Model listing endpoint
│   │   │   ├── debate.ts     # Debate mode endpoints
│   │   │   └── voting.ts     # Voting mode endpoints
│   │   └── services/
│   │       ├── openrouter.ts # OpenRouter API client
│   │       ├── debate.ts     # Debate orchestrator
│   │       └── voting.ts     # Voting orchestrator
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # React components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── api-key-input.tsx
│   │   │   ├── model-selector.tsx
│   │   │   ├── mode-selector.tsx
│   │   │   ├── prompt-input.tsx
│   │   │   ├── progress-indicator.tsx
│   │   │   └── results-display.tsx
│   │   └── lib/
│   │       ├── store.ts      # Zustand state store
│   │       └── utils.ts      # Utility functions
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## API Endpoints

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/models` | GET | List available models |
| `/api/models/all` | GET | List all models (unfiltered) |
| `/api/debate` | POST | Start a debate session |
| `/api/debate/:sessionId` | GET | Get debate session status |
| `/api/voting` | POST | Start a voting session |
| `/api/voting/:sessionId` | GET | Get voting session status |

### Request Examples

**Start a Debate:**
```json
POST /api/debate
Headers: { "X-OpenRouter-Key": "sk-or-..." }
Body: {
  "prompt": "What is the best approach to learn programming?",
  "models": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-pro-1.5"],
  "rounds": 3
}
```

**Start a Voting Session:**
```json
POST /api/voting
Headers: { "X-OpenRouter-Key": "sk-or-..." }
Body: {
  "prompt": "Explain quantum computing in simple terms",
  "models": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"]
}
```

## Supported Models

Polymind supports 25 curated models through OpenRouter:

**Premium Models:**
- **MiniMax**: minimax-m2.5
- **Moonshot AI**: kimi-k2.5, kimi-k2-thinking
- **Z.ai**: glm-5, glm-4.7
- **DeepSeek**: deepseek-v3.2, deepseek-r1
- **Anthropic**: claude-sonnet-4.5, claude-opus-4.6, claude-opus-4.5
- **Qwen**: qwen3.5-397b-a17b, qwen3-235b-a22b
- **OpenAI**: gpt-5.2-chat, gpt-5.1-chat, gpt-5, gpt-5-mini, o3-pro
- **Meta Llama**: llama-4-maverick, llama-4-scout
- **Perplexity**: sonar-pro
- **Mistral**: devstral-2512, mistral-large-2512

**Free Models:**
- **Nvidia**: nemotron-3-nano-30b-a3b:free
- **OpenAI**: gpt-oss-120b:free, gpt-oss-20b:free
- **Meta**: llama-3.3-70b-instruct:free

**Voting Evaluator:**
- **xAI**: grok-4.1-fast (used as the judge in Voting Mode)

## Context Management

When using many models (10+), context window limits can be a challenge. Polymind implements a context management strategy:

1. **Pre-flight Validation**: Warns users if selected models may exceed context limits
2. **Token Budgeting**: Calculates per-model token budgets based on smallest context window
3. **Response Summarization**: Summarizes responses when needed to fit context
4. **Hybrid Approach**: Includes summaries + top 3 full responses for synthesis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) for providing unified access to multiple AI models
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- All the AI model providers for their amazing models

---

**Note**: This project is not affiliated with OpenRouter or any AI model provider. It's an independent open-source project that uses the OpenRouter API."# Polymind" 
