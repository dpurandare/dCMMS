import { db } from "../db";
import { documentEmbeddings } from "../db/schema";
import { sql } from "drizzle-orm";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export class GenAIService {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    private static embeddingModel = GenAIService.genAI.getGenerativeModel({
        model: "text-embedding-004"
    });
    private static chatModel = GenAIService.genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    static async ingestDocument(
        buffer: Buffer,
        filename: string,
        metadata: Record<string, any> = {}
    ) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        let text = "";

        // 1. Extract Text
        try {
            if (metadata.mimetype === "text/plain") {
                text = buffer.toString("utf-8");
            } else {
                const data = await pdfParse(buffer);
                text = data.text;
            }
        } catch (e: any) {
            console.error(`Error parsing file ${filename}:`, e);
            throw new Error(`Failed to parse document: ${e.message}`);
        }

        if (!text || text.trim().length === 0) {
            throw new Error("No text found in document");
        }

        // Clean text: remove excessive newlines and normalize whitespace
        const cleanedText = text.replace(/\s+/g, " ").trim();
        console.log(`Extracted ${cleanedText.length} characters from ${filename}`);

        // 2. Chunk Text
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", ". ", " ", ""], // Priority splitting
        });
        const chunks = await splitter.createDocuments([cleanedText], [metadata]);

        console.log(`Split document "${filename}" into ${chunks.length} chunks.`);

        const insertedDocs = [];

        // 3. Generate Embeddings & Store
        // Use Promise.all with concurrency limit if needed, but sequential is safer for rate limits
        for (const chunk of chunks) {
            try {
                // Sleep slightly to avoid strict rate limits if processing many chunks
                await new Promise(r => setTimeout(r, 200));

                const result = await GenAIService.embeddingModel.embedContent({
                    content: { role: 'user', parts: [{ text: chunk.pageContent }] },
                    taskType: TaskType.RETRIEVAL_DOCUMENT,
                });

                const embedding = result.embedding.values;
                const formattedVector = `[${embedding.join(',')}]`;

                const [doc] = await db
                    .insert(documentEmbeddings)
                    .values({
                        content: chunk.pageContent,
                        metadata: {
                            ...metadata,
                            filename,
                            source: filename,
                            chunkLoc: chunk.metadata.loc,
                            ingestedAt: new Date().toISOString()
                        },
                        embedding: formattedVector as any,
                    })
                    .returning();

                insertedDocs.push(doc);
            } catch (e: any) {
                console.error(`Error embedding chunk for ${filename}:`, e);
                // Continue with other chunks or throw? 
                // For now, log and continue, but mark as partial success
            }
        }

        return {
            id: filename, // Use filename as loose ID for now
            filename,
            chunksTotal: chunks.length,
            chunksIngested: insertedDocs.length,
            status: insertedDocs.length === chunks.length ? "success" : "partial_success"
        };
    }

    static async query(query: string) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        // 1. Generate Query Embedding
        const result = await GenAIService.embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text: query }] },
            taskType: TaskType.RETRIEVAL_QUERY,
        });

        const queryEmbedding = result.embedding.values;
        const formattedVector = `[${queryEmbedding.join(',')}]`;

        // 2. Search (Vector Similarity)
        // Select top 5 most relevant chunks
        const results = await db.select({
            id: documentEmbeddings.id,
            content: documentEmbeddings.content,
            metadata: documentEmbeddings.metadata,
            distance: sql<number>`${documentEmbeddings.embedding} <=> ${formattedVector}::vector`
        })
            .from(documentEmbeddings)
            .orderBy(sql`${documentEmbeddings.embedding} <=> ${formattedVector}::vector`)
            .limit(5);

        // 3. Synthesize Answer with LLM
        if (results.length === 0) {
            return {
                answer: "I couldn't find any relevant information in the uploaded documents.",
                context: []
            };
        }

        const contextText = results.map(r => r.content).join("\n\n---\n\n");
        const prompt = `
You are an intelligent maintenance assistant for the dCMMS system. 
Answer the user's question strictly based on the provided context below. 
If the answer is not in the context, say "I don't have enough information to answer that based on the provided documents."

Context:
${contextText}

Result:
`;

        const chatResult = await GenAIService.chatModel.generateContent(prompt + "\nQuestion: " + query);
        const answer = chatResult.response.text();

        return {
            answer,
            context: results.map(r => ({
                id: r.id,
                content: r.content.substring(0, 200) + "...",
                metadata: r.metadata,
                distance: r.distance
            }))
        };
    }
}
