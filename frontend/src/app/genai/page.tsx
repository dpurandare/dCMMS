import React from "react";
import { ChatInterface } from "@/components/genai/ChatInterface";
import { FileUploader } from "@/components/genai/FileUploader";

export default function GenAIPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row gap-6 h-full items-start">
                {/* Main Chat Area */}
                <div className="w-full md:w-2/3 lg:w-3/4">
                    <ChatInterface />
                </div>

                {/* Sidebar / Upload Area */}
                <div className="w-full md:w-1/3 lg:w-1/4 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Knowledge Base</h3>
                        <FileUploader />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                        <h4 className="font-semibold mb-1">Tips</h4>
                        <p>Upload PDF manuals or guidelines to enhance the AI's knowledge. Try asking specific questions like:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 opacity-80">
                            <li>"How do I reset the inverter?"</li>
                            <li>"What is the maintenance schedule for Site A?"</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
