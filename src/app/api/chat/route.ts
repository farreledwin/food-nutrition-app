import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const ClientMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  imageDataUrl: z.string().startsWith("data:image/").optional(),
  history: z.array(ClientMessageSchema).max(12).default([]),
  previousFoodContext: z.string().max(2500).optional(),
});

const NutritionSchema = z.object({
  servingSize: z.string(),
  calories: z.number(),
  totalFatG: z.number(),
  saturatedFatG: z.number(),
  cholesterolMg: z.number(),
  sodiumMg: z.number(),
  totalCarbohydrateG: z.number(),
  dietaryFiberG: z.number(),
  totalSugarsG: z.number(),
  addedSugarsG: z.number(),
  proteinG: z.number(),
});

const FoodCoachResponseSchema = z.object({
  foodGuess: z.string(),
  portionEstimate: z.string(),
  nutrition: NutritionSchema,
  practicalInsight: z.string(),
  uncertaintyDisclaimer: z.string(),
  assistantMessage: z.string(),
  followUpQuestion: z.string(),
  suggestedReplies: z.array(z.string()),
});

const DEFAULT_SUGGESTIONS = [
  "Make it healthier",
  "Change portion size",
  "More protein?",
  "Lower calories?",
];
const DEFAULT_MODEL = "gpt-5.5";

const SYSTEM_INSTRUCTIONS = `
You are a warm, practical food coach inside a food photo chat app.

Your job:
- When an image is provided, identify the most likely food and visible portion.
- Estimate a Nutrition Facts style label from the image. These numbers are rough visual estimates, not lab-grade data.
- Mention uncertainty when portion size, sauce, oil, cooking method, or hidden ingredients are unclear.
- Keep the conversation natural, friendly, and concise.
- Do not make medical claims, diagnose conditions, or prescribe diets.
- If asked about a medical condition, allergies, pregnancy, medications, or disease management, give general food literacy only and suggest checking with a qualified clinician.
- Prefer practical, everyday advice over robotic calculations.
- The UI renders the full Nutrition Facts label separately, so keep assistantMessage conversational instead of listing every nutrient again.

Return only structured data matching the schema. The assistantMessage should feel like a natural chat reply and should not use bullet points. Do not repeat the followUpQuestion inside assistantMessage. The followUpQuestion must be one short, natural question. Include exactly four suggestedReplies, using these when they fit: ${DEFAULT_SUGGESTIONS.join(
  " | ",
)}.
`;

function buildTranscript(history: z.infer<typeof ClientMessageSchema>[]) {
  return history
    .slice(-10)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
}

function fallbackFromText(text: string) {
  const parsed = JSON.parse(text);
  return FoodCoachResponseSchema.parse(parsed);
}

export async function POST(request: Request) {
  const body = RequestSchema.safeParse(await request.json());

  if (!body.success) {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const { message, imageDataUrl, history, previousFoodContext } = body.data;

  if (!imageDataUrl && !previousFoodContext) {
    return Response.json({ error: "Please upload a food photo before asking nutrition questions." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY. Add it to your local environment and restart the dev server." },
      { status: 500 },
    );
  }

  const client = new OpenAI();
  const transcript = buildTranscript(history);
  const userText = `
Conversation so far:
${transcript || "No prior conversation yet."}

Current known food context:
${previousFoodContext || "No prior food context yet. Use the image as the source of truth."}

Current user message:
${message}

Respond as the friendly food coach. If there is an image, use it to estimate the food, portion, and cooking method. If details are not visible, say what is uncertain instead of pretending the estimate is exact.
`;

  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      reasoning: { effort: "high" },
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: userText },
            ...(imageDataUrl
              ? [
                  {
                    type: "input_image" as const,
                    image_url: imageDataUrl,
                    detail: "auto" as const,
                  },
                ]
              : []),
          ],
        },
      ],
      max_output_tokens: 4096,
      text: {
        format: zodTextFormat(FoodCoachResponseSchema, "food_coach_response"),
      },
    });

    const parsed = response.output_parsed ?? fallbackFromText(response.output_text);
    const suggestedReplies =
      parsed.suggestedReplies.length === 4 ? parsed.suggestedReplies : DEFAULT_SUGGESTIONS;

    return Response.json({ ...parsed, suggestedReplies });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          "I could not analyze that just now. Please try another photo or ask again in a moment.",
      },
      { status: 500 },
    );
  }
}
