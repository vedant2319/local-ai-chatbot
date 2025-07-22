# 🤖 Local AI Chatbot

A privacy-first, ChatGPT-style interface that runs entirely on your local machine using Ollama for AI inference. Features real-time streaming responses, persistent chat history, and complete conversation management - all without sending data to external APIs.

![Local AI Chatbot Interface](https://via.placeholder.com/800x400/1f2937/ffffff?text=Local+AI+Chatbot+Interface)

## ✨ Features

### 🚀 Core Functionality
- **Real-time AI Streaming** - Responses appear character-by-character like ChatGPT
- **Local AI Processing** - Uses Ollama with Gemma 3 1B model for complete privacy
- **Stop Generation** - Interrupt AI responses mid-stream with one click
- **Smart Chat Titles** - Automatically generates meaningful chat titles from first message

### 💾 Chat Management
- **Create New Chats** - Start fresh conversations instantly
- **Rename Chats** - Edit chat titles with inline editing
- **Delete Chats** - Remove conversations with confirmation dialog
- **Persistent History** - All chats saved to local PostgreSQL database
- **Session Switching** - Seamlessly switch between multiple conversations

### 📱 User Experience
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dark Theme** - Easy on the eyes with professional dark interface
- **Mobile Sidebar** - Collapsible navigation for mobile devices
- **Typing Indicators** - Visual feedback during AI response generation
- **Error Handling** - Graceful error messages and connection status

### 🔒 Privacy & Security
- **100% Local** - No data ever leaves your machine
- **No API Keys** - No external AI service dependencies
- **Local Database** - Complete control over your conversation data
- **Open Source** - Full transparency in code and functionality

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router and TypeScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Lucide React](https://lucide.dev/)** - Beautiful icon library
- **[Axios](https://axios-http.com/)** - Promise-based HTTP client

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScript runtime environment
- **[Express.js](https://expressjs.com/)** - Fast, unopinionated web framework
- **[PostgreSQL](https://www.postgresql.org/)** - Robust relational database
- **[Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)** - Real-time streaming communication

### AI & Infrastructure
- **[Ollama](https://ollama.com/)** - Run large language models locally
- **[Gemma 3 1B](https://ai.google.dev/gemma)** - Google's efficient language model
- **[UUID](https://github.com/uuidjs/uuid)** - Unique identifier generation

## 📋 Prerequisites

Before setting up the Local AI Chatbot, ensure you have:

- **Node.js** v18.0.0 or later ([Download](https://nodejs.org/))
- **PostgreSQL** v12.0 or later ([Download](https://www.postgresql.org/download/))
- **Ollama** ([Download](https://ollama.com/download))
- **Git** for version control ([Download](https://git-scm.com/))

### System Requirements
- **RAM**: Minimum 4GB (8GB+ recommended for better AI performance)
- **Storage**: 2GB free space for model and dependencies
- **OS**: Windows 10+, macOS 10.14+, or Linux

## 🚀 Quick Start
### 1. Clone the Repository
git clone https://github.com/yourusername/local-ai-chatbot.git
cd local-ai-chatbot

### 2. Install and Setup Ollama
#### Windows
Download and install Ollama from https://ollama.com/download
After installation, open a new terminal and run:
ollama serve

In a new terminal window:
ollama pull gemma3:1b

Verify installation:
ollama list


### 3. Setup PostgreSQL Database
#### Start PostgreSQL Service
**Windows:**
Via Services Manager (services.msc) or:
net start postgresql-x64-15

#### Create Database and Tables
psql -U postgres -h localhost

text

In the PostgreSQL shell, run:
-- Create database
CREATE DATABASE chatbot_db;

-- Connect to the database
\c chatbot_db;

-- Create chats table
CREATE TABLE chats (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title VARCHAR(255) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table with foreign key constraint
CREATE TABLE messages (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
content TEXT NOT NULL,
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verify tables were created
\dt

-- Exit PostgreSQL shell
\q



### 4. Backend Setup
cd backend

Install dependencies
npm install

Create environment file
cp .env.example .env

Edit .env file with your database credentials
Required variables:
DB_PASSWORD=your_postgresql_password

**Edit `backend/.env` file:**
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=chatbot_db
DB_PASSWORD=your_actual_password_here
DB_PORT=5432
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:1b

Start the backend server
npm run dev

**Verify backend is running:**
- You should see: `Server running on port 5000`
- No database connection errors should appear

### 5. Frontend Setup

Open a new terminal
cd frontend

Install dependencies
npm install

Start the development server
npm run dev


### 6. Access the Application

Open your browser and navigate to:
http://localhost:3000

## 🔧 Detailed Configuration
### Environment Variables
#### Backend (`backend/.env`)
Server Configuration
PORT=5000

Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=chatbot_db
DB_PASSWORD=your_password_here
DB_PORT=5432

Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:1b

Optional: Debug mode
DEBUG=false


### Database Schema
#### Chats Table
CREATE TABLE chats (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title VARCHAR(255) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

#### Messages Table
CREATE TABLE messages (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
content TEXT NOT NULL,
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


### Port Configuration
| Service | Default Port | Configurable |
|---------|-------------|--------------|
| Frontend | 3000 | Yes (Next.js) |
| Backend | 5000 | Yes (.env) |
| Ollama | 11434 | Yes (Ollama config) |
| PostgreSQL | 5432 | Yes (.env) |

## 💻 Usage Guide
### Creating Your First Chat

1. **Start the Application** - All services should be running
2. **Open Browser** - Navigate to `http://localhost:3000`
3. **Click "New Chat"** - Creates a fresh conversation
4. **Send a Message** - Type your message and press Enter or click Send
5. **Watch AI Response** - Responses stream in real-time

### Chat Management
#### Creating New Conversations
- Click the "New chat" button in the sidebar
- Each chat gets a unique title based on your first message

#### Renaming Chats
1. Hover over any chat in the sidebar
2. Click the edit icon (pencil) that appears
3. Type your new title and press Enter
4. Press Escape to cancel editing

#### Deleting Chats
1. Hover over any chat in the sidebar
2. Click the delete icon (trash) that appears
3. Confirm deletion in the dialog
4. Chat and all messages are permanently removed

#### Switching Conversations
- Click any chat title in the sidebar
- Previous conversation context is preserved
- Messages load instantly from the database

### Advanced Features

#### Stopping AI Generation
- Click the red "Stop" button while AI is responding
- Response generation halts immediately
- Partial response is saved to conversation

#### Mobile Usage
- Tap the menu icon to open/close sidebar
- All desktop features work on mobile
- Responsive design adapts to screen size

## 🔧 API Reference

### Base URL
http://localhost:5000/api


### Endpoints

#### Chat Management
| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|-------------|
| GET | `/chats` | Get all chats | None |
| POST | `/chat` | Create new chat | `{"title": "string"}` |
| GET | `/chat/:id` | Get chat with messages | None |
| PUT | `/chat/:id` | Update chat title | `{"title": "string"}` |
| DELETE | `/chat/:id` | Delete chat | None |

#### Messaging
| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|-------------|
| POST | `/chat/:id/message` | Send message (SSE) | `{"message": "string"}` |
| POST | `/chat/:id/stop` | Stop AI generation | `{"streamId": "string"}` |

### Example API Calls

#### Create a New Chat
POST /api/chat
Content-Type: application/json

{
"title": "My New Conversation"
}


#### Send a Message (Server-Sent Events)
POST /api/chat/123e4567-e89b-12d3-a456-426614174000/message
Content-Type: application/json

{
"message": "Hello, how are you?"
}


Response is streamed as Server-Sent Events:
data: {"token": "Hello", "streamId": "abc123"}
data: {"token": "!", "streamId": "abc123"}
data: {"done": true, "streamId": "abc123"}


## 🔍 Troubleshooting
### Common Issues and Solutions
#### "Cannot connect to server" Error
**Symptoms:** Frontend shows connection error
**Solutions:**
Check if backend is running
curl http://localhost:5000/api/chats

Restart backend server
cd backend && npm run dev
