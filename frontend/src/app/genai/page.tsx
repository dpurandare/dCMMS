import React from "react";
import { ChatInterface } from "@/components/genai/ChatInterface";
import { FileUploader } from "@/components/genai/FileUploader";
import { DocumentList } from "@/components/genai/DocumentList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GenAIPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">AI Knowledge Assistant</h1>

            <div className="flex flex-col md:flex-row gap-6 h-full items-start">
                {/* Main Content Area */}
                <div className="w-full md:w-2/3 lg:w-3/4">
                    <Tabs defaultValue="chat" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
                            <TabsTrigger value="documents">Manage Documents</TabsTrigger>
                        </TabsList>

                        <TabsContent value="chat" className="mt-0">
                            <ChatInterface />
                        </TabsContent>

                        <TabsContent value="documents" className="mt-0">
                            <DocumentList />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar / Upload Area */}
                <div className="w-full md:w-1/3 lg:w-1/4 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Add Knowledge</h3>
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
