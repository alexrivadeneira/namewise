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
          content: `You are a precise relationship data assistant. Analyze the voice transcript and return a JSON object with exactly five keys:

1. "transcript": The clean, punctuated text of what was spoken.
2. "detected_names": An array of strings identifying each unique person mentioned. Preserve the exact form used — full name ("Marcus Schmidt"), first name only ("Marcus"), title + last name ("Dr. Chan"), nickname ("Big Mike"), etc. Return only real people — not companies, products, or locations. If no people are named, return [].
3. "intent": One of three values:
   - "contact_query" if the user is asking to be reminded about a specific individual person (e.g. "remind me about Bob", "what do I know about Sarah")
   - "group_query" if the user is asking about multiple people or a group — this includes phrases like "tell me about everyone at X", "who do I know from X", "people related to X", "everyone in X's orbit", "X's people", "remind me about my X friends". Note: the group name may look like a person's name (e.g. "Matt Wilcox" could be a group name meaning "Matt Wilcox's circle of people")
   - "dictation" for everything else
4. "query_name": If intent is "contact_query", the single name being asked about. Otherwise null.
5. "query_group": If intent is "group_query", the group name being asked about as a short string, exactly as the user referred to it (e.g. "conference", "work", "Matt Wilcox"). Otherwise null.

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
      query_group: structuredData.query_group || null,
    });
  } catch (error: any) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { error: "Internal processing failed.", details: error.message },
      { status: 500 }
    );
  }
}
