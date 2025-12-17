import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  try {
    // Unfortunately the SDK doesn't expose listModels directly easily on the instance?
    // Actually it does not. We have to use a model manager or fetch via fetch.
    // Wait, the SDK relies on specific endpoints.

    // Let's try to just run a simple prompt with a very basic model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Testing gemini-1.5-flash...");
    const result = await model.generateContent("Hello");
    console.log("Result:", result.response.text());
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
