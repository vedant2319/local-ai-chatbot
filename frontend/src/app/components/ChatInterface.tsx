'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Send, Square, MessageCircle, Menu, X, Sparkles, Edit3, Trash2, Check, XIcon } from 'lucide-react';
import axios from 'axios';

interface Chat {
    id: string;
    title: string;
    created_at: string;
}

interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

const API_BASE = 'http://localhost:5000/api';

export default function ChatInterface() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChat, setCurrentChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const mountedRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage, scrollToBottom]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [inputMessage]);

    // Focus edit input when editing starts
    useEffect(() => {
        if (editingChatId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingChatId]);

    useEffect(() => {
        mountedRef.current = true;
        fetchChats();
        
        // Cleanup on unmount
        return () => {
            mountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const fetchChats = useCallback(async () => {
        try {
            setError(null);
            console.log('Fetching chats from:', `${API_BASE}/chats`);
            
            const response = await axios.get(`${API_BASE}/chats`, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!mountedRef.current) return;
            
            setChats(response.data);
            console.log('Fetched chats:', response.data.length);
            
            // Auto-select first chat if none selected and chats exist
            if (response.data.length > 0 && !currentChat) {
                setCurrentChat(response.data[0].id);
                fetchMessages(response.data[0].id);
            }
            
            // If current chat was deleted, select another one or clear
            if (currentChat && !response.data.find((chat: Chat) => chat.id === currentChat)) {
                if (response.data.length > 0) {
                    setCurrentChat(response.data[0].id);
                    fetchMessages(response.data[0].id);
                } else {
                    setCurrentChat(null);
                    setMessages([]);
                }
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
            if (!mountedRef.current) return;
            
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    setError('Cannot connect to server. Make sure backend is running on port 5000.');
                } else {
                    setError(`Error fetching chats: ${error.message}`);
                }
            } else {
                setError('Failed to fetch chats');
            }
        }
    }, [currentChat]);

    const fetchMessages = useCallback(async (chatId: string) => {
        try {
            setError(null);
            const response = await axios.get(`${API_BASE}/chat/${chatId}`, {
                timeout: 10000
            });
            
            if (!mountedRef.current) return;
            setMessages(response.data.messages || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
            if (!mountedRef.current) return;
            setError('Failed to fetch messages');
        }
    }, []);

    const createNewChat = useCallback(async () => {
        try {
            setError(null);
            setIsLoading(true);
            
            const response = await axios.post(`${API_BASE}/chat`, { 
                title: 'New Chat' 
            }, {
                timeout: 10000
            });
            
            if (!mountedRef.current) return;
            
            const newChat = response.data;
            setChats(prev => [newChat, ...prev]);
            setCurrentChat(newChat.id);
            setMessages([]);
            setStreamingMessage('');
            setIsStreaming(false);
            setIsSidebarOpen(false); // Close sidebar on mobile
            
        } catch (error) {
            console.error('Error creating new chat:', error);
            if (!mountedRef.current) return;
            setError('Failed to create new chat');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const startEditingChat = (chatId: string, currentTitle: string) => {
        setEditingChatId(chatId);
        setEditingTitle(currentTitle);
    };

    const cancelEditing = () => {
        setEditingChatId(null);
        setEditingTitle('');
    };

    const saveEditedTitle = async (chatId: string) => {
        if (!editingTitle.trim()) {
            cancelEditing();
            return;
        }

        try {
            setError(null);
            await axios.put(`${API_BASE}/chat/${chatId}`, {
                title: editingTitle.trim()
            }, {
                timeout: 10000
            });
            
            // Update local state
            setChats(prev => prev.map(chat => 
                chat.id === chatId 
                    ? { ...chat, title: editingTitle.trim() }
                    : chat
            ));
            
            cancelEditing();
        } catch (error) {
            console.error('Error updating chat title:', error);
            setError('Failed to update chat title');
            cancelEditing();
        }
    };

    const handleEditKeyPress = (e: React.KeyboardEvent, chatId: string) => {
        if (e.key === 'Enter') {
            saveEditedTitle(chatId);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    const confirmDeleteChat = (chatId: string) => {
        setShowDeleteConfirm(chatId);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(null);
    };

    const deleteChat = async (chatId: string) => {
        try {
            setError(null);
            await axios.delete(`${API_BASE}/chat/${chatId}`, {
                timeout: 10000
            });
            
            // If deleting current chat, clear it
            if (currentChat === chatId) {
                setCurrentChat(null);
                setMessages([]);
                setStreamingMessage('');
                setIsStreaming(false);
            }
            
            // Remove from local state
            setChats(prev => prev.filter(chat => chat.id !== chatId));
            setShowDeleteConfirm(null);
            
            // Auto-select another chat if available
            setTimeout(() => {
                fetchChats();
            }, 100);
            
        } catch (error) {
            console.error('Error deleting chat:', error);
            setError('Failed to delete chat');
            setShowDeleteConfirm(null);
        }
    };

    const sendMessage = useCallback(async () => {
        if (!inputMessage.trim() || isStreaming || !currentChat || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setIsLoading(true);
        setIsStreaming(true);
        setStreamingMessage('');
        setError(null);

        // Add user message to UI immediately
        const tempUserMessage: Message = {
            id: Date.now().toString(),
            chat_id: currentChat,
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, tempUserMessage]);

        try {
            // Abort any existing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController();

            // Send the message via POST and handle streaming response
            const response = await fetch(`${API_BASE}/chat/${currentChat}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle the streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const jsonStr = line.replace('data: ', '').trim();
                            if (jsonStr === '') continue; // Skip empty data lines
                            
                            const data = JSON.parse(jsonStr);
                            
                            if (data.streamId) {
                                setCurrentStreamId(data.streamId);
                            }
                            
                            if (data.token) {
                                setStreamingMessage(prev => prev + data.token);
                            }
                            
                            if (data.done) {
                                setIsStreaming(false);
                                setIsLoading(false);
                                setStreamingMessage('');
                                setCurrentStreamId(null);
                                await fetchMessages(currentChat);
                                await fetchChats(); // Refresh to get updated chat title
                                return;
                            }
                            
                            if (data.error) {
                                console.error('Stream error:', data.error);
                                setError(`AI Error: ${data.error}`);
                                setIsStreaming(false);
                                setIsLoading(false);
                                setStreamingMessage('');
                                return;
                            }
                        } catch (parseError) {
                            console.error('Error parsing stream data:', parseError);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            if (!mountedRef.current) return;
            
            setIsLoading(false);
            setIsStreaming(false);
            setStreamingMessage('');
            
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.log('Request was aborted');
                    return;
                }
                if (error.message.includes('Failed to fetch')) {
                    setError('Connection failed. Make sure backend and Ollama are running.');
                } else {
                    setError(`Error: ${error.message}`);
                }
            } else {
                setError('Failed to send message');
            }
        }
    }, [inputMessage, isStreaming, currentChat, isLoading, fetchMessages, fetchChats]);

    const stopGeneration = useCallback(async () => {
        if (currentStreamId && currentChat) {
            try {
                await axios.post(`${API_BASE}/chat/${currentChat}/stop`, {
                    streamId: currentStreamId
                });
            } catch (error) {
                console.error('Error stopping generation:', error);
            }
        }

        // Abort the fetch request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        setIsStreaming(false);
        setIsLoading(false);
        setStreamingMessage('');
        setCurrentStreamId(null);
    }, [currentStreamId, currentChat]);

    const selectChat = useCallback((chatId: string) => {
        if (chatId === currentChat) return;
        
        // Abort any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        setCurrentChat(chatId);
        fetchMessages(chatId);
        setStreamingMessage('');
        setIsStreaming(false);
        setError(null);
        setIsSidebarOpen(false); // Close sidebar on mobile
        
        // Cancel any editing or delete confirmations
        setEditingChatId(null);
        setShowDeleteConfirm(null);
    }, [currentChat, fetchMessages]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const formatMessageTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed lg:relative lg:translate-x-0 z-50 lg:z-auto
                w-64 h-full bg-gray-900 dark:bg-gray-800 text-white flex flex-col
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Sidebar Header */}
                <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-3 lg:hidden">
                        <h2 className="text-white font-semibold">Local AI Chat</h2>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="text-gray-400 hover:text-white p-1"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <button
                        onClick={createNewChat}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-transparent border border-gray-600 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2.5 rounded-lg transition-colors duration-200 font-medium text-sm"
                    >
                        <Plus size={16} />
                        New chat
                    </button>
                </div>
                
                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {chats.length === 0 ? (
                        <div className="p-3 text-gray-400 text-sm text-center">
                            No conversations yet
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chats.map((chat) => (
                                <div key={chat.id} className="group relative">
                                    {editingChatId === chat.id ? (
                                        // Editing mode
                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                                            <MessageCircle size={16} className="flex-shrink-0 opacity-70" />
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onKeyDown={(e) => handleEditKeyPress(e, chat.id)}
                                                className="flex-1 bg-transparent text-white text-sm border-none outline-none"
                                                maxLength={100}
                                            />
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => saveEditedTitle(chat.id)}
                                                    className="text-green-400 hover:text-green-300 p-1"
                                                    title="Save"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                    title="Cancel"
                                                >
                                                    <XIcon size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : showDeleteConfirm === chat.id ? (
                                        // Delete confirmation mode
                                        <div className="px-3 py-2 bg-red-800 rounded-lg">
                                            <p className="text-sm text-white mb-2">Delete this chat?</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => deleteChat(chat.id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={cancelDelete}
                                                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Normal mode
                                        <div className={`relative rounded-lg transition-all duration-200 ${
                                            currentChat === chat.id 
                                                ? 'bg-gray-800 text-white' 
                                                : 'text-gray-300 hover:bg-gray-800 group'
                                        }`}>
                                            <button
                                                onClick={() => selectChat(chat.id)}
                                                className="w-full text-left px-3 py-3 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <MessageCircle size={16} className="flex-shrink-0 opacity-70" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{chat.title}</p>
                                                        <p className="text-xs opacity-60 mt-0.5">
                                                            {new Date(chat.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                            
                                            {/* Action buttons */}
                                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditingChat(chat.id, chat.title);
                                                    }}
                                                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                                                    title="Rename chat"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDeleteChat(chat.id);
                                                    }}
                                                    className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700"
                                                    title="Delete chat"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between p-3 lg:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Sparkles size={14} className="text-white" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white hidden sm:block">
                                Local AI Chat
                            </span>
                        </div>
                    </div>
                    
                    {currentChat && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">
                            {chats.find(c => c.id === currentChat)?.title || 'New Chat'}
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm">{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-medium text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>
                )}

                {currentChat ? (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
                            {messages.length === 0 && !isStreaming ? (
                                <div className="flex items-center justify-center h-full p-4">
                                    <div className="text-center max-w-md mx-auto">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Sparkles size={28} className="text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                            How can I help you today?
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                                            Start a conversation by typing a message below.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-3xl mx-auto w-full px-4 py-6">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className="mb-6 group"
                                        >
                                            <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {message.role === 'assistant' && (
                                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                        <Sparkles size={16} className="text-white" />
                                                    </div>
                                                )}
                                                
                                                <div className={`max-w-[85%] sm:max-w-2xl ${message.role === 'user' ? 'order-first' : ''}`}>
                                                    <div
                                                        className={`rounded-2xl px-4 py-3 ${
                                                            message.role === 'user'
                                                                ? 'bg-blue-500 text-white ml-8 sm:ml-12'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                                        }`}
                                                    >
                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.content}</p>
                                                    </div>
                                                    <div className={`mt-2 text-xs text-gray-500 dark:text-gray-400 ${
                                                        message.role === 'user' ? 'text-right mr-8 sm:mr-12' : 'ml-1'
                                                    }`}>
                                                        {formatMessageTime(message.timestamp)}
                                                    </div>
                                                </div>
                                                
                                                {message.role === 'user' && (
                                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                        <span className="text-white text-sm font-medium">U</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Streaming Message */}
                                    {isStreaming && streamingMessage && (
                                        <div className="mb-6 group">
                                            <div className="flex gap-4 justify-start">
                                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                    <Sparkles size={16} className="text-white" />
                                                </div>
                                                
                                                <div className="max-w-[85%] sm:max-w-2xl">
                                                    <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                                                            {streamingMessage}
                                                            <span className="inline-block w-2 h-5 bg-gray-400 animate-pulse ml-1"></span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <div className="max-w-3xl mx-auto w-full p-4">
                                <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus-within:border-green-500 focus-within:shadow-md transition-all duration-200">
                                    <textarea
                                        ref={textareaRef}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type your message..."
                                        disabled={isLoading}
                                        className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm leading-relaxed min-h-[50px] max-h-[200px]"
                                        rows={1}
                                    />
                                    
                                    <div className="absolute right-2 bottom-2">
                                        {isStreaming ? (
                                            <button
                                                onClick={stopGeneration}
                                                className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
                                                title="Stop generating"
                                            >
                                                <Square size={14} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={sendMessage}
                                                disabled={isLoading || !inputMessage.trim()}
                                                className="w-8 h-8 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
                                                title="Send message"
                                            >
                                                <Send size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                                    AI can make mistakes. Consider checking important information.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 p-4">
                        <div className="text-center max-w-md mx-auto">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Sparkles size={36} className="text-gray-400" />
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                Welcome to Local AI Chat
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm sm:text-base">
                                {chats.length === 0 
                                    ? "Start your first conversation by creating a new chat" 
                                    : "Select a chat from the sidebar to continue your conversation"
                                }
                            </p>
                            {chats.length === 0 && (
                                <button
                                    onClick={createNewChat}
                                    disabled={isLoading}
                                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
                                >
                                    {isLoading ? 'Creating...' : 'Start chatting'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
