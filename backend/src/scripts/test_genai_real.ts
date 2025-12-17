import "dotenv/config";
import { GenAIService } from "../services/genai.service";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

async function createSamplePdf(): Promise<Buffer> {
    return new Promise((resolve) => {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        doc.fontSize(12).text('dCMMS Solar Inverter Maintenance Manual\n\nError Code E001: Grid Voltage High. Check grid connection and transformer tap settings.\nError Code E002: Inverter Overheating. Clean air filters and check cooling fans.\n\nRoutine Maintenance:\n1. Inspect cables for wear every 6 months.\n2. Torque terminals to 15Nm annually.');

        doc.end();
    });
}

async function main() {
    try {
        console.log("🚀 Starting GenAI Integration Test (Gemini)...");

        // 1. Create a dummy Text buffer
        console.log("📄 Creating sample text...");
        const textContent = 'dCMMS Solar Inverter Maintenance Manual\n\nError Code E001: Grid Voltage High. Check grid connection and transformer tap settings.\nError Code E002: Inverter Overheating. Clean air filters and check cooling fans.\n\nRoutine Maintenance:\n1. Inspect cables for wear every 6 months.\n2. Torque terminals to 15Nm annually.';
        const buffer = Buffer.from(textContent, "utf-8");

        // 2. Ingest
        console.log("📥 Ingesting document...");
        const ingestResult = await GenAIService.ingestDocument(
            buffer,
            "sample-inverter-manual.txt",
            { type: "manual", asset: "solar-inv-x1", mimetype: "text/plain" }
        );
        console.log("✅ Ingestion Result:", ingestResult);

        // 3. Query
        const query = "How do I fix error E002?";
        console.log(`\n🔍 Querying: "${query}"`);
        const queryResult = await GenAIService.query(query);

        console.log("\n🤖 Answer:", queryResult.answer);
        console.log("\n📚 Context Citations:");
        queryResult.context.forEach((c: any) => {
            console.log(`   - [Dist: ${c.distance.toFixed(4)}] ${c.content.substring(0, 100).replace(/\n/g, " ")}...`);
        });

    } catch (e) {
        console.error("❌ Test Failed:", e);
    }
}

main();
