
import { Queue, Worker, Job } from "bullmq";
import { db } from "../db";
import { documentEmbeddings } from "../db/schema";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");

const connection = {
    url: process.env.REDIS_URL || "redis://localhost:6379",
};

export const ingestionQueue = new Queue("ingestion-queue", { connection });

// Initialize GenAI models for the worker
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
});

const worker = new Worker(
    "ingestion-queue",
    async (job: Job) => {
        console.log(`Processing job ${job.id}: ${job.name}`);

        // Limitation Note: We are passing buffer via job data for MVP.
        // In production, job data should contain a URL/Path to fileStorage, not the file itself.
        const { buffer: bufferData, filename, metadata } = job.data;

        // Reconstruct Buffer from JSON-serialized data
        const buffer = Buffer.from(bufferData.data);

        let text = "";

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

        const cleanedText = text.replace(/\s+/g, " ").trim();
        await job.updateProgress(10); // 10% - Extracted

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", ". ", " ", ""],
        });
        const chunks = await splitter.createDocuments([cleanedText], [metadata]);

        await job.updateProgress(30); // 30% - Chunked

        const insertedDocs = [];
        const totalChunks = chunks.length;

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i];
            try {
                // Rate limit safety
                await new Promise((r) => setTimeout(r, 200));

                const result = await embeddingModel.embedContent({
                    content: { role: "user", parts: [{ text: chunk.pageContent }] },
                    taskType: TaskType.RETRIEVAL_DOCUMENT,
                });

                const embedding = result.embedding.values;
                const formattedVector = `[${embedding.join(",")}]`;

                const [doc] = await db
                    .insert(documentEmbeddings)
                    .values({
                        content: chunk.pageContent,
                        metadata: {
                            ...metadata,
                            filename,
                            source: filename,
                            chunkLoc: chunk.metadata.loc,
                            ingestedAt: new Date().toISOString(),
                            jobId: job.id
                        },
                        embedding: formattedVector as any,
                    })
                    .returning();

                insertedDocs.push(doc);

                // Log progress periodically
                const progress = 30 + Math.ceil(((i + 1) / totalChunks) * 70);
                await job.updateProgress(progress);

            } catch (e: any) {
                console.error(`Error embedding chunk ${i} for ${filename}:`, e);
            }
        }

        return {
            filename,
            chunksTotal: totalChunks,
            chunksIngested: insertedDocs.length,
            status: insertedDocs.length === totalChunks ? "success" : "partial_success"
        };
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
});
