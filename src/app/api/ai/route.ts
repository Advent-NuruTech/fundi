import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured" },
        { status: 503 }
      );
    }
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const body = await req.json();
    const message = body.message;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-5.5",
      input: message,
    });

    return NextResponse.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}