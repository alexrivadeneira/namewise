import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }
    const groq = new Groq({ apiKey });

    const formData = await req.formData();
    const audioFileBlob = formData.get("file");

    if (!(audioFileBlob instanceof Blob)) {
      return NextResponse.json({ error: "Missing or invalid audio payload" }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFileBlob.arrayBuffer());
    const fileForGroq = new File([buffer], "memo.webm", { type: "audio/webm" });

    const transcriptionResponse = await groq.audio.transcriptions.create({
      file: fileForGroq,
      model: "whisper-large-v3",
    });

    const transcript = transcriptionResponse.text;

    if (!transcript || transcript.trim() === "") {
      return NextResponse.json({ error: "No voice data parsed from recording." }, { status: 422 });
    }

    const completionResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a precise relationship data assistant. Analyze the voice transcript and return a JSON object with exactly four keys:

1. "transcript": The clean, punctuated text of what was spoken.
2. "detected_names": An array of strings containing the unique first names (or nicknames) of human individuals mentioned. Return only names of real people — not companies, products, or locations. If no people are named, return [].
3. "intent": Either "query" if the user is asking to be reminded about or briefed on a person (e.g. "remind me about Bob", "what do I know about Sarah", "tell me about Mike"), or "dictation" for everything else.
4. "query_name": If intent is "query", the single name being asked about as a string. Otherwise null.

Output only valid JSON, no commentary.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.1,
    });

    const aiOutputString = completionResponse.choices[0]?.message?.content || "{}";
    const structuredData = JSON.parse(aiOutputString);

    return NextResponse.json({
      transcript: structuredData.transcript || transcript,
      detected_names: structuredData.detected_names || [],
      intent: structuredData.intent || "dictation",
      query_name: structuredData.query_name || null,
    });
  } catch (error: any) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { error: "Internal processing failed.", details: error.message },
      { status: 500 }
    );
  }
}
