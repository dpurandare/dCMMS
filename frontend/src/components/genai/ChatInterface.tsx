"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown"; // You might need to install this: npm i react-markdown
import { GenAIService, ChatResponse } from "@/services/genai.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChatFeedback } from "./ChatFeedback";

interface Message {
    id: string;
    role: "user" | "bot";
    content: string;
    context?: ChatResponse['context'];
    timestamp: Date;
    query?: string; // Store the user query that led to this bot response
}

export function ChatInterface() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "bot",
            content: "Hello! I am your AI assistant. Ask me questions about asset maintenance, manuals, or standard operating procedures.",
            timestamp: new Date(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            // Simple scroll to bottom logic
            const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollArea) {
                scrollArea.scrollTop = scrollArea.scrollHeight;
            }
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await GenAIService.chat(userMessage.content);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "bot",
                content: response.answer,
                context: response.context,
                query: userMessage.content, // Store the original query
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "bot",
                content: "Sorry, I encountered an error providing an answer. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitFeedback = async (
        message: Message,
        rating: "positive" | "negative",
        comment?: string
    ) => {
        if (!message.query || message.id === "welcome") return;

        try {
            const contextIds = (message.context || []).map((ctx) => ctx.id);
            await GenAIService.submitFeedback(
                message.query,
                message.content,
                rating,
                contextIds,
                comment
            );
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            throw error;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Card className="flex flex-col h-[700px] w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    AI Assistant
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                    <div className="space-y-6">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                    }`}
                            >
                                <Avatar className="h-8 w-8">
                                    {msg.role === "user" ? (
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            <User className="h-4 w-4" />
                                        </AvatarFallback>
                                    ) : (
                                        <AvatarFallback className="bg-green-600 text-white">
                                            <Bot className="h-4 w-4" />
                                        </AvatarFallback>
                                    )}
                                </Avatar>

                                <div
                                    className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"
                                        }`}
                                >
                                    <div
                                        className={`p-3 rounded-lg text-sm ${msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                            }`}
                                    >
                                        {/* Use simple whitespace-pre-wrap for now instead of full markdown if not installed */}
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>

                                    {/* Context Citations for Bot */}
                                    {msg.role === "bot" && msg.context && msg.context.length > 0 && (
                                        <div className="mt-2 w-full max-w-md">
                                            <Accordion type="single" collapsible>
                                                <AccordionItem value="sources" className="border-b-0">
                                                    <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
                                                        <div className="flex items-center gap-1">
                                                            <BookOpen className="h-3 w-3" />
                                                            <span>View {msg.context.length} Sources</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="space-y-2 pt-1 border-t">
                                                            {msg.context.map((ctx) => (
                                                                <div key={ctx.id} className="text-xs bg-slate-50 p-2 rounded border">
                                                                    <p className="font-semibold text-slate-700 truncate">
                                                                        {ctx.metadata?.filename || "Unknown Source"}
                                                                    </p>
                                                                    <p className="text-slate-500 line-clamp-2 mt-1">
                                                                        {ctx.content}
                                                                    </p>
                                                                    {ctx.metadata?.page && (
                                                                        <span className="text-[10px] text-slate-400">Page {ctx.metadata.page}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    )}

                                    {/* Feedback for bot messages (excluding welcome message) */}
                                    {msg.role === "bot" && msg.id !== "welcome" && msg.query && (
                                        <div className="mt-2">
                                            <ChatFeedback
                                                query={msg.query}
                                                answer={msg.content}
                                                contextIds={(msg.context || []).map((ctx) => ctx.id)}
                                                onSubmitFeedback={(rating, comment) =>
                                                    handleSubmitFeedback(msg, rating, comment)
                                                }
                                            />
                                        </div>
                                    )}

                                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-green-600 text-white"><Bot className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted p-3 rounded-lg flex gap-1 items-center">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>

            <CardFooter className="p-4 pt-2 border-t">
                <div className="flex w-full gap-2 items-end">
                    <Textarea
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[60px] resize-none"
                        disabled={isLoading}
                    />
                    <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="h-[60px] w-[60px]">
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
