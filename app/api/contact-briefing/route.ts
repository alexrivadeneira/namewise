import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const { contactName, dictations } = await req.json();
    if (!contactName || !dictations?.length) {
      return NextResponse.json({ error: "Missing contactName or dictations" }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    const dictationText = dictations
      .map((d: { text: string; created_at: string }, i: number) =>
        `[${i + 1}] ${new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: ${d.text}`
      )
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a personal relationship assistant. Given voice memo snippets about a person, return a JSON object with one key:
"bullets": an array of 3-5 short, specific bullet point strings summarizing the most useful things to remember about this person.
Each bullet should be a single sentence, grounded in the notes. No invented details.
Output only valid JSON, no commentary.`,
        },
        {
          role: "user",
          content: `Contact: ${contactName}\n\nVoice memo snippets:\n${dictationText}`,
        },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json({ bullets: parsed.bullets ?? [] });
  } catch (error: any) {
    console.error("Contact briefing error:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
