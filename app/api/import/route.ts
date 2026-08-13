import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

// This function reads the files written by the Python script
// and constructs the JSON payload the frontend expects.
async function readOutput(novelId: string) {
  try {
    const novelDir = path.join(process.cwd(), 'novels', novelId);
    const metadataPath = path.join(novelDir, 'metadata.json');
    const chaptersDir = path.join(novelDir, 'chapters');

    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    const chapterFiles = await fs.readdir(chaptersDir);

    const chapters = [];
    for (const file of chapterFiles) {
      if (file.endsWith('.json')) {
        const chapterData = JSON.parse(await fs.readFile(path.join(chaptersDir, file), 'utf-8'));
        // Correctly assign content, which is already an array of strings
        chapters.push({
          id: chapterData.id,
          title: chapterData.title,
          content: chapterData.content,
          order: chapterData.index + 1, // Add this line
        });
      }
    }
    // Ensure chapters are sorted correctly by the numeric part of their ID
    chapters.sort((a, b) => {
      const numA = parseInt(a.id.split('-').pop() || '0');
      const numB = parseInt(b.id.split('-').pop() || '0');
      return numA - numB;
    });

    return {
      ...metadata,
      image: metadata.image_url, // Map image_url to image
      id: novelId,
      chapters: chapters,
      totalChapters: chapters.length,
      importedFrom: 0, // Since we are doing a fresh import
    };
  } catch (error) {
    console.error("[API] Error reading retriever output:", error);
    throw new Error("Failed to read novel data after download.");
  }
}

function runPythonRetriever(url: string, existingNovel: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const pythonExecutable = path.join(
      process.cwd(),
      "venv",
      isWindows ? "Scripts" : "bin",
      isWindows ? "python.exe" : "python"
    );

    const scriptPath = path.join(process.cwd(), "run_retriever.py");

    // Pass existingNovel data as JSON string to Python script
    const pythonArgs = [scriptPath, url];
    if (existingNovel) {
      pythonArgs.push('--existing-novel', JSON.stringify(existingNovel));
    }

    const command = `${pythonExecutable} ${pythonArgs.join(' ')}`;
    console.log(`[API] Spawning Python command: ${command}`);

    const retrieverProcess = spawn(pythonExecutable, pythonArgs);
    let stdout = "";
    let stderr = "";

    retrieverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[RETRIEVER STDOUT] ${output.trim()}`);
    });

    retrieverProcess.stderr.on("data", (data) => {
      const errorOutput = data.toString();
      stderr += errorOutput;
      console.error(`[RETRIEVER STDERR] ${errorOutput.trim()}`);
    });

    retrieverProcess.on('close', (code) => {
      console.log(`[API] Python process exited with code: ${code}`);
      if (code !== 0) {
        return reject(new Error(`Retriever process exited with code ${code}: ${stderr}`));
      }
      try {
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        console.log(`[API] Attempting to parse JSON from last line of stdout: ${lastLine}`);
        resolve(JSON.parse(lastLine));
      } catch (e) {
        console.error(`[API] JSON parsing failed. Error: ${(e as Error).message}`);
        reject(new Error(`Failed to parse retriever output: ${(e as Error).message}. Full output: ${stdout}`));
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, existingNovel } = body; // Extract existingNovel

    console.log(`[API] Received import request for URL: ${url}`);
    console.log(`[API] Existing novel data received: ${JSON.stringify(existingNovel)}`);

    if (!url) {
      console.error("[API] Validation failed: URL is required.");
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await runPythonRetriever(url, existingNovel); // Pass existingNovel

    // This part will likely not be reached if the retriever fails, but logging is added for completeness.
    console.log("[API] Retriever process successful. Reading output...");
    const responsePayload = await readOutput(result.novel_id);
    console.log(`[API] Sending successful HTTP 200 response for novel: ${responsePayload.title}`);
    return NextResponse.json(responsePayload);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`[API] Error in import route: ${errorMessage}`);
    console.log(`[API] Sending error HTTP 500 response.`);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
