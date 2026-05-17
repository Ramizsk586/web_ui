# ✨ Lumina

> Modern intelligence, refined interface.

A polished, dark-native AI chat UI built with React — featuring multi-provider support, MCP tool integration, artifact rendering, web search, and a fully customizable experience.

<img width="1916" height="1011" alt="image" src="https://github.com/user-attachments/assets/fa718e9b-03a1-479a-8509-50731604e1cc" />

---

## Features

- **Multi-provider AI** — Connect to OpenAI, Anthropic, Google Gemini, Groq, or OpenRouter with your own API keys
- **MCP Tool Integration** — Connect local or remote MCP servers and toggle individual tools (Brave Search, Filesystem, GitHub, Fetch URL, and more)
- **Artifact Canvas** — AI-generated code, Markdown, and HTML render in a dedicated side panel with syntax highlighting and one-click copy
- **Web Search** — Real-time search via Tavily or SerpAPI, with animated search indicators and source citations
- **Tool Call Visualization** — Live animated tree of active tool calls and sub-tool steps
- **Writing Styles** — Switch between Default, Poem, Story, Letter, Essay, and Script modes
- **Inbuilt Tools** — Toggle Wikipedia, Image Search, Weather, News, Dictionary, and Code Runner
- **Persona Customization** — Set your assistant's name, role, and avatar
- **Dark / Light Mode** — Dark-native with full light mode support
- **Collapsible Sidebar** — Chat history with per-chat delete, compact mode option
- **User Profile** — Name, avatar, date of birth, and location stored locally
- **Toast Notifications** — Lightweight in-app feedback for all actions
- **Bubble / Linear Message Layout** — Toggle between chat bubble and document-style layouts

---

## Tech Stack

| Layer | Library |
|---|---|
| UI Framework | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |
| Markdown | react-markdown |
| Syntax Highlighting | react-syntax-highlighter (Prism + One Dark) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A running LLM backend (OpenAI-compatible API, or any of the supported providers)

### Installation

```bash
git clone https://github.com/Ramizsk586/web_ui.git
cd web_ui
npm install
```

### Dependencies

Install required peer dependencies:

```bash
npm install react-syntax-highlighter @types/react-syntax-highlighter
npm install react-markdown motion lucide-react
```

### Running

```bash
npm run dev
```

The app defaults to `/api` as the server URL and `llama` as the API key. You can change these in **Settings → AI**.

---

## Configuration

All settings are persisted to `localStorage` and configurable from the in-app Settings panel.

| Setting | Key | Default |
|---|---|---|
| AI Server URL | `lumina_server_url` | `/api` |
| API Key | `lumina_api_key` | `llama` |
| MCP Server URL | `lumina_mcp_url` | `/api` |
| MCP API Key | `lumina_mcp_key` | `llama` |
| Tavily API Key | `lumina_tavily_key` | _(empty)_ |
| SerpAPI Key | `lumina_serp_key` | _(empty)_ |

### Connecting an AI Provider

1. Open **Settings → AI**
2. Enter your server URL and API key
3. Click **Verify** to test the connection, then **Save**

### Connecting MCP Tools

1. Open the **+** menu in the chat input
2. Select **MCP Tools**
3. Choose **Local** (via MCP server URL) or **Remote** (via HTTPS endpoint)
4. Connect and toggle individual tools on or off

---

## Project Structure

```
src/
├── App.tsx          # Main application — all components and logic
└── ...
```

> Currently a single-file architecture. Component extraction into separate files is planned.

---

## Roadmap

- [ ] Persistent chat history (IndexedDB / backend)
- [ ] Streaming token output
- [ ] Image generation support
- [ ] Voice input / output
- [ ] Plugin marketplace
- [ ] Multi-window artifact canvas
- [ ] Component refactor into separate files

---

## License

MIT © [Sk Abdul Ramiz](https://github.com/Ramizsk586)
