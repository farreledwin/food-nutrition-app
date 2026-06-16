"use client";

import {
  Camera,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";

type NutritionFacts = {
  servingSize: string;
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
  cholesterolMg: number;
  sodiumMg: number;
  totalCarbohydrateG: number;
  dietaryFiberG: number;
  totalSugarsG: number;
  addedSugarsG: number;
  proteinG: number;
};

type FoodCoachResponse = {
  foodGuess: string;
  portionEstimate: string;
  nutrition: NutritionFacts;
  practicalInsight: string;
  uncertaintyDisclaimer: string;
  assistantMessage: string;
  followUpQuestion: string;
  suggestedReplies: string[];
};

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  loading?: boolean;
};

const QUICK_REPLIES = [
  "Make it healthier",
  "Change portion size",
  "More protein?",
  "Lower calories?",
];

const FIRST_MESSAGE =
  "Upload a food photo and I will estimate the nutrition, call out what is uncertain, and help you think through simple next steps.";

const LOADING_STEPS = [
  "Identifying food...",
  "Estimating portion...",
  "Building nutrition label...",
];

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function grams(value: number) {
  return `${formatNumber(value)}g`;
}

function milligrams(value: number) {
  return `${Math.round(value)}mg`;
}

function percentDailyValue(value: number, dailyValue: number) {
  return `${Math.round((value / dailyValue) * 100)}%`;
}

function assistantReplyText(analysis: FoodCoachResponse) {
  return `${analysis.assistantMessage}\n\n${analysis.followUpQuestion}`;
}

function buildFoodContext(analysis: FoodCoachResponse | null) {
  if (!analysis) {
    return "";
  }

  return [
    `Food guess: ${analysis.foodGuess}`,
    `Portion estimate: ${analysis.portionEstimate}`,
    `Estimated calories: ${Math.round(analysis.nutrition.calories)}`,
    `Protein: ${formatNumber(analysis.nutrition.proteinG)}g`,
    `Carbs: ${formatNumber(analysis.nutrition.totalCarbohydrateG)}g`,
    `Fat: ${formatNumber(analysis.nutrition.totalFatG)}g`,
    `Uncertainty: ${analysis.uncertaintyDisclaimer}`,
  ].join("\n");
}

function NutritionLabel({ analysis }: { analysis: FoodCoachResponse }) {
  const { nutrition } = analysis;

  const rows = [
    {
      label: "Total Fat",
      value: grams(nutrition.totalFatG),
      dailyValue: percentDailyValue(nutrition.totalFatG, 78),
    },
    {
      label: "Saturated Fat",
      value: grams(nutrition.saturatedFatG),
      dailyValue: percentDailyValue(nutrition.saturatedFatG, 20),
      indented: true,
    },
    {
      label: "Cholesterol",
      value: milligrams(nutrition.cholesterolMg),
      dailyValue: percentDailyValue(nutrition.cholesterolMg, 300),
    },
    {
      label: "Sodium",
      value: milligrams(nutrition.sodiumMg),
      dailyValue: percentDailyValue(nutrition.sodiumMg, 2300),
    },
    {
      label: "Total Carbohydrate",
      value: grams(nutrition.totalCarbohydrateG),
      dailyValue: percentDailyValue(nutrition.totalCarbohydrateG, 275),
    },
    {
      label: "Dietary Fiber",
      value: grams(nutrition.dietaryFiberG),
      dailyValue: percentDailyValue(nutrition.dietaryFiberG, 28),
      indented: true,
    },
    {
      label: "Total Sugars",
      value: grams(nutrition.totalSugarsG),
      dailyValue: "-",
      indented: true,
    },
    {
      label: "Added Sugars",
      value: grams(nutrition.addedSugarsG),
      dailyValue: percentDailyValue(nutrition.addedSugarsG, 50),
      indented: true,
    },
    {
      label: "Protein",
      value: grams(nutrition.proteinG),
      dailyValue: percentDailyValue(nutrition.proteinG, 50),
    },
  ];

  return (
    <section className="w-full border-2 border-zinc-950 bg-white p-4 text-zinc-950 shadow-[6px_6px_0_#111827]">
      <div className="border-b-8 border-zinc-950 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Estimated from image
        </p>
        <h2 className="text-4xl font-black leading-none">Nutrition Facts</h2>
      </div>

      <div className="border-b border-zinc-950 py-2 text-sm">
        <p className="mb-2 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">
          Assuming {nutrition.servingSize}
        </p>
        <div className="flex items-start justify-between gap-4 font-semibold">
          <span>Serving size</span>
          <span className="text-right">{nutrition.servingSize}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-600">{analysis.portionEstimate}</p>
      </div>

      <div className="border-b-4 border-zinc-950 py-2">
        <p className="text-xs font-bold">Amount per serving</p>
        <div className="flex items-end justify-between gap-3">
          <span className="text-2xl font-black">Calories</span>
          <span className="text-4xl font-black">{Math.round(nutrition.calories)}</span>
        </div>
      </div>

      <div className="border-b border-zinc-950 py-1 text-right text-xs font-black">
        % Daily Value*
      </div>

      <div className="divide-y divide-zinc-300 text-sm">
        {rows.map((row) => (
          <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 py-2" key={row.label}>
            <span className={row.indented ? "pl-4 font-medium" : "font-semibold"}>
              {row.label}
            </span>
            <span>{row.value}</span>
            <span className="min-w-10 text-right font-bold">{row.dailyValue}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t-4 border-zinc-950 pt-3 text-xs leading-5 text-zinc-600">
        *% Daily Values are estimated using general FDA Daily Values for a 2,000
        calorie diet. Photo-based estimate only. Hidden oil, sauce, sugar, and portion
        size can move the numbers.
      </div>
    </section>
  );
}

function MessageBubble({
  loadingText,
  message,
}: {
  loadingText: string;
  message: ChatMessage;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? "rounded-br-md bg-emerald-700 text-white"
            : "rounded-bl-md border border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        <div className="flex items-start gap-2">
          {message.loading ? (
            <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-emerald-700" />
          ) : null}
          <p className="whitespace-pre-line text-sm leading-6">
            {message.loading ? loadingText : message.content}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: FIRST_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<FoodCoachResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedReplies = useMemo(() => {
    const modelReplies = latestAnalysis?.suggestedReplies?.filter(Boolean).slice(0, 4);
    return modelReplies?.length ? modelReplies : QUICK_REPLIES;
  }, [latestAnalysis]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((current) => (current + 1) % LOADING_STEPS.length);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  async function sendChat(text: string, visibleText = text, imageOverride?: string) {
    const activeImage = imageOverride ?? imageDataUrl;
    const trimmedText = text.trim();

    if (!trimmedText || isLoading) {
      return;
    }

    if (!activeImage && !latestAnalysis) {
      setInput("");
      setError(null);
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "user",
          content: visibleText,
        },
        {
          id: makeId(),
          role: "assistant",
          content:
            "Upload a food photo first and I will estimate the label from what I can see.",
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: visibleText,
    };
    const loadingMessage: ChatMessage = {
      id: makeId(),
      role: "assistant",
      loading: true,
      content: activeImage ? LOADING_STEPS[0] : "Thinking through the previous food estimate...",
    };
    const history = messages
      .filter((message) => !message.loading)
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.content }));

    setInput("");
    setError(null);
    setLoadingStep(0);
    setIsLoading(true);
    setMessages((current) => [...current, userMessage, loadingMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedText,
          imageDataUrl: activeImage ?? undefined,
          history,
          previousFoodContext: buildFoodContext(latestAnalysis) || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const analysis = data as FoodCoachResponse;
      setLatestAnalysis(analysis);
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessage.id
            ? {
                id: message.id,
                role: "assistant",
                content: assistantReplyText(analysis),
              }
            : message,
        ),
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "I could not analyze that right now.";
      setError(message);
      setMessages((current) =>
        current.map((item) =>
          item.id === loadingMessage.id
            ? {
                id: item.id,
                role: "assistant",
                content: message,
              }
            : item,
        ),
      );
    } finally {
      setLoadingStep(0);
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendChat(input);
  }

  function handleQuickReply(reply: string) {
    void sendChat(reply);
  }

  function handleImageSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Please choose an image under 8 MB for a smoother demo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
      setLatestAnalysis(null);
      void sendChat("Analyze this food photo.", "Uploaded a food photo.", dataUrl);
    };
    reader.onerror = () => setError("I could not read that image. Please try another one.");
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageDataUrl(null);
    setImageName(null);
    setLatestAnalysis(null);
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-zinc-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
              <Sparkles className="h-4 w-4" />
              Friendly food coach
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-zinc-950 sm:text-4xl">
              Food Nutrition Chat
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
              Upload a meal photo, get a practical estimated label, then ask
              follow-ups in plain English.
            </p>
          </div>
        </header>

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <aside className="space-y-5 lg:order-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Camera className="h-4 w-4 text-emerald-700" />
                  Food photo
                </div>
                {imageDataUrl ? (
                  <button
                    className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                    onClick={clearImage}
                    title="Clear image"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {imageDataUrl ? (
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                    <Image
                      alt="Uploaded food preview"
                      className="object-cover"
                      fill
                      sizes="(min-width: 1024px) 380px, 100vw"
                      src={imageDataUrl}
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 truncate text-sm text-zinc-500">{imageName}</p>
                </div>
              ) : (
                <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-5 text-center transition hover:border-emerald-500 hover:bg-emerald-100">
                  <Upload className="mb-3 h-9 w-9 text-emerald-700" />
                  <span className="text-lg font-semibold text-emerald-950">
                    Start with a food photo
                  </span>
                  <span className="mt-1 text-sm leading-5 text-zinc-500">
                    A clear top-down or angled plate photo works best.
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      handleImageSelected(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </section>

            {latestAnalysis ? (
              <NutritionLabel analysis={latestAnalysis} />
            ) : isLoading && imageDataUrl ? (
              <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <LoaderCircle className="h-4 w-4 animate-spin text-emerald-700" />
                  Preparing nutrition label
                </div>
                <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-950">
                  {LOADING_STEPS[loadingStep]}
                </div>
                <div className="mt-5 space-y-3">
                  {[96, 72, 88, 64, 80].map((width) => (
                    <div
                      className="h-3 animate-pulse rounded-full bg-zinc-100"
                      key={width}
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <Utensils className="h-4 w-4 text-emerald-700" />
                  Nutrition label
                </div>
                <div className="mt-5 space-y-3">
                  {[96, 72, 88, 64, 80].map((width) => (
                    <div className="h-3 rounded-full bg-zinc-100" key={width} style={{ width: `${width}%` }} />
                  ))}
                </div>
                <p className="mt-5 text-sm leading-6 text-zinc-500">
                  Your estimated Nutrition Facts label will appear here after the photo
                  analysis.
                </p>
              </section>
            )}
          </aside>

          <section className="flex min-h-[68vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:order-1">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">Meal chat</p>
                  <p className="text-xs text-zinc-500">Estimates, not medical advice</p>
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-emerald-300 hover:bg-emerald-50">
                <ImagePlus className="h-4 w-4" />
                Add photo
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    handleImageSelected(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50 px-4 py-5">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  loadingText={LOADING_STEPS[loadingStep]}
                  message={message}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-zinc-200 bg-white p-4">
              {latestAnalysis ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {suggestedReplies.map((reply) => (
                    <button
                      className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                      key={reply}
                      onClick={() => handleQuickReply(reply)}
                      type="button"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              ) : null}

              <form className="flex gap-2" onSubmit={handleSubmit}>
                <input
                  className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  disabled={isLoading}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    imageDataUrl
                      ? "Ask about protein, swaps, portions..."
                      : "Upload a food photo to begin"
                  }
                  value={input}
                />
                <button
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  disabled={isLoading || !input.trim()}
                  type="submit"
                  title="Send message"
                >
                  {isLoading ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
