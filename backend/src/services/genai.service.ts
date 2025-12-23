import { db } from "../db";
import { documentEmbeddings, genAiFeedback } from "../db/schema";
import { sql, eq, and } from "drizzle-orm";
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
    tenantId: string,
    siteId: string | null = null,
    metadata: Record<string, any> = {},
  ) {
    // Add to Queue
    // Limitation: Buffer is passed directly. 
    // In prod, saving to disk/cloud and passing URL is preferred.
    const job = await ingestionQueue.add("ingest_document", {
      buffer, // BullMQ serializes this
      filename,
      tenantId,
      siteId,
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

  static async query(
    query: string,
    tenantId: string,
    userSiteIds?: string[],
  ) {
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

    // 2. Search (Vector Similarity) with tenant/site filtering
    // Build WHERE clause for RBAC
    const whereConditions = [eq(documentEmbeddings.tenantId, tenantId)];

    // If user has specific site access, filter by those sites
    // Otherwise, show all sites for the tenant
    if (userSiteIds && userSiteIds.length > 0) {
      whereConditions.push(
        sql`(${documentEmbeddings.siteId} IS NULL OR ${documentEmbeddings.siteId} IN (${sql.join(userSiteIds.map(id => sql`${id}`), sql`, `)}))`
      );
    }

    // Select top 5 most relevant chunks
    const results = await db
      .select({
        id: documentEmbeddings.id,
        content: documentEmbeddings.content,
        metadata: documentEmbeddings.metadata as any,
        distance: sql<number>`${documentEmbeddings.embedding} <=> ${formattedVector}::vector`,
      })
      .from(documentEmbeddings)
      .where(and(...whereConditions))
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

    // Build context with numbered citations
    const contextWithCitations = results
      .map(
        (r, idx) =>
          `[${idx + 1}] Source: ${r.metadata?.filename || "Unknown"}\n${r.content}`,
      )
      .join("\n\n---\n\n");

    const prompt = `You are an expert maintenance assistant for the dCMMS (Distributed Computerized Maintenance Management System), specializing in non-conventional energy assets including Solar, Wind, BESS (Battery Energy Storage Systems), and Microgrids.

Your role is to help maintenance technicians and engineers by providing accurate, safety-conscious, and actionable guidance based on equipment manuals, SOPs, and technical documentation.

## Instructions:
1. Answer ONLY based on the provided context below
2. If the answer is not in the context, say "I don't have enough information in the available documents to answer that question."
3. Structure your response clearly with sections (if applicable): Answer, Steps, Warnings/Cautions
4. Reference sources using citation numbers [1], [2], etc.
5. Always prioritize safety - highlight any warnings, cautions, or safety procedures
6. Be specific with technical details (voltages, torque specs, part numbers) when available
7. If procedures involve multiple steps, use numbered lists

## Context Documents:
${contextWithCitations}

## User Question:
${query}

## Your Response:`;

    const chatResult = await GenAIService.chatModel.generateContent(prompt);
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

  static async listDocuments(tenantId: string) {
    // Query distinct source files from metadata with tenant filtering
    const result = await db.execute(sql`
            SELECT DISTINCT metadata->>'source' as filename,
                   site_id,
                   MIN(created_at) as uploaded_at,
                   COUNT(*) as chunk_count
            FROM document_embeddings
            WHERE tenant_id = ${tenantId}
            GROUP BY metadata->>'source', site_id
            ORDER BY uploaded_at DESC
        `);

    return result.rows.map((row: any) => ({
      filename: row.filename || "Unknown",
      siteId: row.site_id,
      uploadedAt: row.uploaded_at,
      chunkCount: Number(row.chunk_count),
    }));
  }

  static async deleteDocument(filename: string, tenantId: string) {
    // Delete all chunks where metadata->>'source' == filename AND tenant matches
    await db.execute(sql`
            DELETE FROM document_embeddings
            WHERE metadata->>'source' = ${filename}
              AND tenant_id = ${tenantId}
        `);

    return { message: "Document deleted", filename };
  }

  static async submitFeedback(
    userId: string,
    tenantId: string,
    query: string,
    answer: string,
    rating: "positive" | "negative",
    contextIds: string[],
    comment?: string,
  ) {
    const feedback = await db
      .insert(genAiFeedback)
      .values({
        userId,
        tenantId,
        query,
        answer,
        rating,
        contextIds: JSON.stringify(contextIds),
        comment: comment || null,
      })
      .returning();

    return feedback[0];
  }

  static async getFeedbackStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const whereConditions = [eq(genAiFeedback.tenantId, tenantId)];

    if (startDate) {
      whereConditions.push(sql`${genAiFeedback.createdAt} >= ${startDate}`);
    }
    if (endDate) {
      whereConditions.push(sql`${genAiFeedback.createdAt} <= ${endDate}`);
    }

    const stats = await db.execute(sql`
      SELECT 
        rating,
        COUNT(*) as count,
        COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as comments_count
      FROM genai_feedback
      WHERE ${sql.join(whereConditions, sql` AND `)}
      GROUP BY rating
    `);

    return {
      stats: stats.rows,
      total: stats.rows.reduce((sum: number, row: any) => sum + Number(row.count), 0),
    };
  }
}
