# Food Nutrition Chat

Food Nutrition Chat is a Next.js MVP that lets users upload a food photo, receive an estimated Nutrition Facts style label, and continue a natural back-and-forth conversation to clarify portion size, ingredients, cooking method, sauces, or toppings.

The app is designed as a friendly food coach. It keeps nutrition values framed as estimates, avoids medical claims, and updates the label when the user corrects details conversationally.

## What Was Built

- Upload-first food nutrition chat experience.
- Compact first screen with:
  - App title.
  - Primary photo upload action.
  - Secondary text-based food description option.
  - Estimate/trust note.
  - Small example Nutrition Facts label.
- OpenAI Responses API integration with image input.
- Estimated Nutrition Facts style label including:
  - Serving size.
  - Calories.
  - Total fat.
  - Saturated fat.
  - Carbohydrates.
  - Fiber.
  - Sugars.
  - Protein.
  - Sodium.
- Friendly chat flow for clarifying:
  - Portion size.
  - Ingredients.
  - Cooking method.
  - Sauces or toppings.
- Updated nutrition label after conversational corrections.
- Calm loading states and quick reply actions.
- Clear uncertainty language such as “estimated from photo” and “portions and ingredients may vary.”

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- OpenAI Responses API
- OpenAI image input
- Lucide React icons

## How To Run Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

If `.env.local.example` does not exist, create `.env.local` manually and add the environment variables listed below.

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## Environment Variables

The app reads these variables from `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.5
```

`OPENAI_API_KEY` is required.

`OPENAI_MODEL` is optional. If it is not set, the app defaults to:

```bash
gpt-5.5
```

## What The App Does

1. The user uploads a food photo or describes a food in text.
2. The app acknowledges the request naturally and shows a calm analysis state.
3. The server sends the food image or description to the OpenAI Responses API.
4. The app returns an estimated Nutrition Facts style label.
5. The app shows a short conversational summary with uncertainty and assumptions.
6. The user can correct details through chat or quick edit buttons.
7. The app updates the nutrition label based on those corrections.

All nutrition information is estimated from the visible food or user-provided description. The app does not provide medical advice, diagnosis, treatment guidance, or personalized health claims.
