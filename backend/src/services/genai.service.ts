import { db } from "../db";
import { documentEmbeddings } from "../db/schema";
import { sql } from "drizzle-orm";
import { ingestionQueue } from "./queue.service";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

export class GenAIService {
  private static genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || "",
  );
  private static embeddingModel = GenAIService.genAI.getGenerativeModel({
    model: "text-embedding-004",
  });
  private static chatModel = GenAIService.genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  static async ingestDocument(
    buffer: Buffer,
    filename: string,
    metadata: Record<string, any> = {},
  ) {
    // Add to Queue
    // Limitation: Buffer is passed directly. 
    // In prod, saving to disk/cloud and passing URL is preferred.
    const job = await ingestionQueue.add("ingest_document", {
      buffer, // BullMQ serializes this
      filename,
      metadata
    });

    return {
      jobId: job.id,
      message: "Document ingestion queued",
      status: "queued"
    };
  }

  static async getJobStatus(jobId: string) {
    const job = await ingestionQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    // Check if finished
    const state = await job.getState();
    const result = job.returnvalue;
    const progress = job.progress;

    return {
      id: job.id || jobId,
      state,
      progress: progress as number,
      result
    };
  }

  static async query(query: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    // 1. Generate Query Embedding
    const result = await GenAIService.embeddingModel.embedContent({
      content: { role: "user", parts: [{ text: query }] },
      taskType: TaskType.RETRIEVAL_QUERY,
    });

    const queryEmbedding = result.embedding.values;
    const formattedVector = `[${queryEmbedding.join(",")}]`;

    // 2. Search (Vector Similarity)
    // Select top 5 most relevant chunks
    const results = await db
      .select({
        id: documentEmbeddings.id,
        content: documentEmbeddings.content,
        metadata: documentEmbeddings.metadata,
        distance: sql<number>`${documentEmbeddings.embedding} <=> ${formattedVector}::vector`,
      })
      .from(documentEmbeddings)
      .orderBy(
        sql`${documentEmbeddings.embedding} <=> ${formattedVector}::vector`,
      )
      .limit(5);

    // 3. Synthesize Answer with LLM
    if (results.length === 0) {
      return {
        answer:
          "I couldn't find any relevant information in the uploaded documents.",
        context: [],
      };
    }

    const contextText = results.map((r) => r.content).join("\n\n---\n\n");
    const prompt = `
You are an intelligent maintenance assistant for the dCMMS system. 
Answer the user's question strictly based on the provided context below. 
If the answer is not in the context, say "I don't have enough information to answer that based on the provided documents."

Context:
${contextText}

Result:
`;

    const chatResult = await GenAIService.chatModel.generateContent(
      prompt + "\nQuestion: " + query,
    );
    const answer = chatResult.response.text();

    return {
      answer,
      context: results.map((r) => ({
        id: r.id,
        content: r.content.substring(0, 200) + "...",
        metadata: r.metadata,
        distance: r.distance,
      })),
    };
  }

  static async listDocuments() {
    // Query distinct source files from metadata
    // Note: Drizzle doesn't support 'distinct on' or raw complex jsonb queries easily via query builder, using sql``
    const result = await db.execute(sql`
            SELECT DISTINCT metadata->>'source' as filename, 
                   MIN(created_at) as uploaded_at,
                   COUNT(*) as chunk_count
            FROM document_embeddings
            GROUP BY metadata->>'source'
            ORDER BY uploaded_at DESC
        `);

    return result.rows.map((row: any) => ({
      filename: row.filename || "Unknown",
      uploadedAt: row.uploaded_at,
      chunkCount: Number(row.chunk_count),
    }));
  }

  static async deleteDocument(filename: string) {
    // Delete all chunks where metadata->>'source' == filename
    await db.execute(sql`
            DELETE FROM document_embeddings
            WHERE metadata->>'source' = ${filename}
        `);

    return { message: "Document deleted", filename };
  }
}
