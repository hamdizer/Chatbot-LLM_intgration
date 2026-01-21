"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  Plus,
  MessageSquare,
  Menu,
  X,
  Edit2,
  Check,
} from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatbotUI() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentThread = threads.find((t) => t.id === currentThreadId);
  const messages = currentThread?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const createNewThread = () => {
    const newThread: Thread = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setCurrentThreadId(newThread.id);
    inputRef.current?.focus();
  };

  const deleteThread = (threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }
  };

  const updateThreadTitle = (threadId: string, title: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title } : t)),
    );
    setEditingThreadId(null);
  };

  const getBotResponse = async (userMessage: string) => {
    setIsTyping(true);

    const botMessageId = Date.now().toString();
    const tempBotMessage: Message = {
      id: botMessageId,
      text: "",
      sender: "bot",
      timestamp: new Date(),
    };

    if (currentThreadId) {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === currentThreadId) {
            const title =
              t.messages.length === 1
                ? userMessage.slice(0, 30) +
                  (userMessage.length > 30 ? "..." : "")
                : t.title;
            return {
              ...t,
              messages: [...t.messages, tempBotMessage],
              title,
              updatedAt: new Date(),
            };
          }
          return t;
        }),
      );
    }

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));

      conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setIsTyping(false);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const jsonPart = trimmed.substring(5).trim();
          if (jsonPart === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonPart);
            const delta = data.choices?.[0]?.delta?.content;

            if (delta) {
              fullText += delta;
              if (currentThreadId) {
                setThreads((prev) =>
                  prev.map((thread) => {
                    if (thread.id === currentThreadId) {
                      return {
                        ...thread,
                        messages: thread.messages.map((msg) =>
                          msg.id === botMessageId
                            ? { ...msg, text: fullText }
                            : msg,
                        ),
                        updatedAt: new Date(),
                      };
                    }
                    return thread;
                  }),
                );
              }
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("API error:", error);
      setIsTyping(false);

      if (currentThreadId) {
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id === currentThreadId) {
              return {
                ...t,
                messages: t.messages.map((msg) =>
                  msg.id === botMessageId
                    ? { ...msg, text: `Error: ${error.message}` }
                    : msg,
                ),
                updatedAt: new Date(),
              };
            }
            return t;
          }),
        );
      }
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    if (!currentThreadId) {
      createNewThread();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    const threadId = currentThreadId || threads[0]?.id;

    if (threadId) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: [...t.messages, userMessage],
                updatedAt: new Date(),
              }
            : t,
        ),
      );
    }

    const messageText = input;
    setInput("");
    getBotResponse(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex fixed inset-0 w-full h-full bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={createNewThread}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {threads.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No chats yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Start a new conversation
              </p>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                  currentThreadId === thread.id
                    ? "bg-gray-700 border border-gray-600"
                    : "hover:bg-gray-750 border border-transparent"
                }`}
                onClick={() => setCurrentThreadId(thread.id)}
              >
                {editingThreadId === thread.id ? (
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          updateThreadTitle(thread.id, editingTitle);
                        }
                      }}
                      className="flex-1 px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      autoFocus
                    />
                    <button
                      onClick={() => updateThreadTitle(thread.id, editingTitle)}
                      className="p-1 hover:bg-gray-600 rounded"
                    >
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                          {thread.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {thread.messages.length} messages
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingThreadId(thread.id);
                            setEditingTitle(thread.title);
                          }}
                          className="p-1.5 hover:bg-gray-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(thread.id);
                          }}
                          className="p-1.5 hover:bg-gray-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {thread.updatedAt.toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-gray-400" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {currentThread?.title || "AI Assistant"}
                </h1>
                <p className="text-xs text-gray-400">Online • GPT-4 Powered</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => {
                  if (currentThreadId) {
                    setThreads((prev) =>
                      prev.map((t) =>
                        t.id === currentThreadId ? { ...t, messages: [] } : t,
                      ),
                    );
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">
                  Welcome to AI Chat
                </h2>
                <p className="text-gray-400 max-w-md mb-8">
                  Start a conversation with your AI assistant. Ask anything, and
                  get intelligent responses powered by GPT-4.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    "Explain quantum computing",
                    "Write a creative story",
                    "Help me debug code",
                    "Plan a trip itinerary",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors text-left border border-gray-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        message.sender === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                          : "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
                      } shadow-lg`}
                    >
                      {message.sender === "user" ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div
                      className={`flex flex-col max-w-3xl ${message.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-5 py-3 rounded-2xl ${
                          message.sender === "user"
                            ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
                            : "bg-gray-800 text-gray-100 border border-gray-700"
                        }`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                          {message.text}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 mt-2 px-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-gray-800 border border-gray-700 px-5 py-4 rounded-2xl">
                      <div className="flex gap-1.5">
                        <div
                          className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-gray-800 border-t border-gray-700">
          <div className="max-w-5xl mx-auto px-6 py-5">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isTyping}
                  className="w-full px-5 py-4 bg-gray-700 border border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
