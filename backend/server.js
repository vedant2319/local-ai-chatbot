require('dotenv').config();

// ADD DEBUG CODE HERE (temporarily)
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('Password length:', process.env.DB_PASSWORD?.length);
console.log('==================================');

// NOW import other modules
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const pool = require('./database/connection'); // This will now see the env vars
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Store active streams for interruption
const activeStreams = new Map();

// Generate chat title from first message
function generateChatTitle(message) {
    const words = message.split(' ').slice(0, 4);
    return words.length > 3 ? words.join(' ') + '...' : words.join(' ') || 'New Chat';
}

// Create new chat
app.post('/api/chat', async (req, res) => {
    try {
        const { title } = req.body;
        const chatTitle = title || 'New Chat';
        
        const result = await pool.query(
            'INSERT INTO chats (title) VALUES ($1) RETURNING *',
            [chatTitle]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// Get all chats
app.get('/api/chats', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM chats ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get chat by ID with messages
app.get('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        
        const chatResult = await pool.query(
            'SELECT * FROM chats WHERE id = $1',
            [chatId]
        );
        
        if (chatResult.rows.length === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        const messagesResult = await pool.query(
            'SELECT * FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC',
            [chatId]
        );
        
        res.json({
            chat: chatResult.rows[0],
            messages: messagesResult.rows
        });
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
});

// **NEW: Update chat title (Rename functionality)**
app.put('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { title } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const result = await pool.query(
            'UPDATE chats SET title = $1 WHERE id = $2 RETURNING *',
            [title.trim(), chatId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ error: 'Failed to update chat' });
    }
});

// **NEW: Delete chat and all its messages**
app.delete('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        
        // First check if chat exists
        const chatResult = await pool.query(
            'SELECT id FROM chats WHERE id = $1',
            [chatId]
        );
        
        if (chatResult.rows.length === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        // Delete the chat (messages will be deleted automatically due to CASCADE)
        await pool.query(
            'DELETE FROM chats WHERE id = $1',
            [chatId]
        );
        
        res.json({ success: true, message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ error: 'Failed to delete chat' });
    }
});

// Send message and stream response
app.post('/api/chat/:chatId/message', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        
        // Save user message
        await pool.query(
            'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)',
            [chatId, 'user', message]
        );
        
        // Update chat title if it's the first message
        const chatResult = await pool.query(
            'SELECT title FROM chats WHERE id = $1',
            [chatId]
        );
        
        if (chatResult.rows[0].title === 'New Chat') {
            const newTitle = generateChatTitle(message);
            await pool.query(
                'UPDATE chats SET title = $1 WHERE id = $2',
                [newTitle, chatId]
            );
        }
        
        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });
        
        let assistantMessage = '';
        const streamId = uuidv4();
        
        // Create AbortController for better cancellation
        const abortController = new AbortController();
        
        try {
            const response = await axios.post(`${process.env.OLLAMA_URL}/api/generate`, {
                model: 'gemma3:1b',
                prompt: message,
                stream: true
            }, {
                responseType: 'stream',
                timeout: 60000, // Increased timeout
                signal: abortController.signal
            });
            
            // Store the abort controller instead of the response
            activeStreams.set(streamId, abortController);
            
            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            assistantMessage += data.response;
                            res.write(`data: ${JSON.stringify({ token: data.response, streamId })}\n\n`);
                        }
                        
                        if (data.done) {
                            // Save complete assistant message
                            pool.query(
                                'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)',
                                [chatId, 'assistant', assistantMessage]
                            );
                            
                            res.write(`data: ${JSON.stringify({ done: true, streamId })}\n\n`);
                            res.end();
                            activeStreams.delete(streamId);
                        }
                    } catch (parseError) {
                        console.error('Error parsing chunk:', parseError);
                    }
                }
            });
            
            response.data.on('error', (error) => {
                console.error('Stream error:', error);
                res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
                res.end();
                activeStreams.delete(streamId);
            });
            
        } catch (error) {
            console.error('Ollama request error:', error);
            res.write(`data: ${JSON.stringify({ error: 'Failed to get AI response' })}\n\n`);
            res.end();
            activeStreams.delete(streamId);
        }
        
        res.on('close', () => {
            activeStreams.delete(streamId);
            abortController.abort(); // Abort the request when client disconnects
        });
        
    } catch (error) {
        console.error('Error in message endpoint:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// **UPDATED: Stop streaming response with AbortController**
app.post('/api/chat/:chatId/stop', (req, res) => {
    const { streamId } = req.body;
    
    if (activeStreams.has(streamId)) {
        const abortController = activeStreams.get(streamId);
        
        try {
            // Abort the ongoing request
            abortController.abort();
        } catch (error) {
            console.error('Error aborting request:', error);
        }
        
        // Remove from active streams
        activeStreams.delete(streamId);
    }
    
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
