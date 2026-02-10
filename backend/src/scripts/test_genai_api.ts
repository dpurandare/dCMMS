import "dotenv/config";
import fetch from "node-fetch";
import FormData from "form-data";

const API_URL = process.env.API_URL || "http://localhost:4000";
let authToken = "";
let csrfToken = "";
let csrfCookie = "";

async function login() {
    console.log("🔐 Logging in...");
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "admin@example.com",
            password: "Password123!",
        }),
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }

    const data: any = await response.json();
    authToken = data.accessToken;
    console.log("✅ Logged in successfully");
    return authToken;
}

async function getCsrfToken() {
    console.log("🔑 Getting CSRF token...");

    const response = await fetch(`${API_URL}/api/v1/auth/csrf`, {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
    });

    // Extract CSRF cookie
    const cookies = response.headers.raw()["set-cookie"];
    if (cookies && cookies.length > 0) {
        csrfCookie = cookies[0].split(";")[0];
    }

    const data: any = await response.json();
    csrfToken = data.csrfToken;
    console.log("✅ Got CSRF token");
    return csrfToken;
}

async function testUploadDocument() {
    console.log("\n📤 Test 1: Upload Document");

    const sampleText = `dCMMS Solar Inverter Maintenance Manual

Error Code E001: Grid Voltage High
- Solution: Check grid connection and transformer tap settings

Error Code E002: Inverter Overheating  
- Solution: Clean air filters and check cooling fans

Routine Maintenance:
1. Inspect cables every 6 months
2. Torque terminals to 15Nm annually`;

    const form = new FormData();
    form.append("file", Buffer.from(sampleText), {
        filename: "inverter-manual.txt",
        contentType: "text/plain",
    });

    const response = await fetch(`${API_URL}/api/v1/genai/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${authToken}`,
            "X-CSRF-Token": csrfToken,
            Cookie: csrfCookie,
            ...form.getHeaders(),
        },
        body: form,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${response.statusText} - ${error}`);
    }

    const result: any = await response.json();
    console.log("✅ Upload successful");
    console.log(`   Job ID: ${result.jobId}`);

    return result.jobId;
}

async function testJobStatus(jobId: string) {
    console.log(`\n⏳ Test 2: Check Job Status (Job ${jobId})`);

    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
        const response = await fetch(`${API_URL}/api/v1/genai/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        const status: any = await response.json();
        console.log(`   Attempt ${attempts + 1}: State=${status.state}, Progress=${status.progress || 0}%`);

        if (status.state === "completed") {
            console.log("✅ Job completed successfully");
            return status;
        } else if (status.state === "failed") {
            console.error("❌ Job failed:", status.result);
            throw new Error("Job processing failed");
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.warn("⚠️  Job still processing");
    return null;
}

async function testChatQuery(query: string) {
    console.log(`\n💬 Test 3: Chat Query: "${query}"`);

    const response = await fetch(`${API_URL}/api/v1/genai/chat`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
            Cookie: csrfCookie,
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Chat failed: ${response.statusText} - ${error}`);
    }

    const result: any = await response.json();
    console.log("✅ Chat query successful");
    console.log(`\n📝 Answer:\n${result.answer}`);
    console.log(`\n📚 Citations: ${result.context.length} sources`);

    return result;
}

async function testListDocuments() {
    console.log("\n📋 Test 4: List Documents");

    const response = await fetch(`${API_URL}/api/v1/genai/documents`, {
        headers: { Authorization: `Bearer ${authToken}` },
    });

    const docs: any = await response.json();
    console.log(`✅ Found ${docs.length} document(s)`);
    docs.forEach((doc: any) => {
        console.log(`   - ${doc.filename} (${doc.chunkCount} chunks)`);
    });

    return docs;
}

async function main() {
    console.log("🚀 GenAI API Integration Test Suite\n");
    console.log(`API URL: ${API_URL}\n`);

    try {
        await login();
        await getCsrfToken();

        const jobId = await testUploadDocument();
        await testJobStatus(jobId);
        await testChatQuery("How do I fix error E002?");
        await testListDocuments();

        console.log("\n✅ All tests passed!");
        process.exit(0);

    } catch (error: any) {
        console.error("\n❌ Test failed:", error.message);
        process.exit(1);
    }
}

main();
