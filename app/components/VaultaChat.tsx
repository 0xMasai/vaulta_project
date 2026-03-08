"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

interface VaultaChatProps {
  address?: `0x${string}`;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export default function VaultaChat({ address }: VaultaChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm Vaulta AI. I can help you with deposits, withdrawals, and answer questions about your vault. How can I assist you today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
  // 1️⃣ Prevent empty input or missing address
  if (!input.trim() || !address) return;

  // 2️⃣ Capture input before clearing
  const messageToSend = input;
  setInput(""); // clear input immediately for UX
  setIsTyping(true);

  // 3️⃣ Add user message to chat immediately
  const userMessage: Message = {
    id: Date.now().toString(),
    text: messageToSend,
    sender: "user",
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, userMessage]);

  try {
    // 4️⃣ Call backend API
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: messageToSend, address }),
    });

    // 5️⃣ Handle HTTP errors
    if (!res.ok) {
      const text = await res.text(); // read raw response for logging
      console.error("Vaulta backend HTTP error:", res.status, text);
      throw new Error(`HTTP ${res.status}`);
    }

    // 6️⃣ Parse JSON safely
    const data = await res.json();
    console.log("Vaulta backend response:", data);

    // 7️⃣ Add AI response to chat
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: data.reply || "Sorry, I couldn't process that.",
      sender: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);
  } catch (err) {
    // 8️⃣ Catch network errors, 500s, JSON parsing issues
    console.error("Vaulta frontend error:", err);
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        text: "Something went wrong. Please try again.",
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  } finally {
    setIsTyping(false);
  }
};

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-6 border mt-6">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96 pr-2">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              message.sender === "user" ? "bg-blue-600" : "bg-linear-to-br from-purple-500 to-blue-600"
            }`}>
              {message.sender === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`flex-1 ${message.sender === "user" ? "text-right" : ""}`}>
              <div className={`inline-block px-4 py-3 rounded-2xl max-w-[85%] ${
                message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
              }`}>
                <p className="text-sm whitespace-pre-line">{message.text}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1 px-1">
                {message.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Vaulta AI..."
          className="flex-1 px-4 py-3 text-black bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !address}
          className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}