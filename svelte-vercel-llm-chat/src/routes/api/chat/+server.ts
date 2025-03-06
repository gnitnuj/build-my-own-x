import { google } from "@ai-sdk/google";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToCoreMessages, streamText } from "ai";
import type { RequestHandler } from "./$types";

import { env } from "$env/dynamic/private";

const gemini = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY,
});

export const POST = (async ({ request }) => {
  const { messages } = await request.json();

  const result = streamText({
    model: gemini("gemini-1.5-pro-latest"),
    messages,
  });

  return result.toDataStreamResponse({});
}) satisfies RequestHandler;
