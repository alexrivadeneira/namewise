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
      messages: [
        {
          role: "system",
          content: `You are a personal relationship assistant helping the user understand their connections.
Given a set of voice memo snippets mentioning a person, write a concise 2-3 sentence summary of the user's relationship with that person and why they are connected.
Be specific and grounded in the notes — don't invent details. Write in second person ("You know X through...").`,
        },
        {
          role: "user",
          content: `Contact: ${contactName}\n\nVoice memo snippets:\n${dictationText}`,
        },
      ],
      temperature: 0.4,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Contact summary error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
