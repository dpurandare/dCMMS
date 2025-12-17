
import { ingestionQueue } from "../services/queue.service";
import { GenAIService } from "../services/genai.service";

async function main() {
    console.log("Testing Queue Integration...");

    // 1. Enqueue Job
    console.log("Enqueuing job...");
    const job = await ingestionQueue.add("ingest_document", {
        buffer: { data: Buffer.from("Test content").toJSON().data },
        filename: "test_queue_doc.txt",
        metadata: { mimetype: "text/plain" }
    });
    console.log(`Job enqueued: ${job.id}`);

    // 2. Check Status
    console.log("Checking status immediately...");
    let status = await GenAIService.getJobStatus(job.id!);
    console.log(`Status: ${status?.state}`);

    // 3. Wait for completion (Worker process needs to be running in this context)
    // Note: Since 'ts-node' runs this script, the worker inside queue.service.ts should be active.

    console.log("Waiting for worker...");
    await new Promise(r => setTimeout(r, 2000));

    status = await GenAIService.getJobStatus(job.id!);
    console.log(`Status after wait: ${status?.state}, Result:`, status?.result);

    process.exit(0);
}

main().catch(console.error);
