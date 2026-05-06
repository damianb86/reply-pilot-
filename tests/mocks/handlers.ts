import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://judge.me/api/v1/reviews", () =>
    HttpResponse.json({
      reviews: [],
    }),
  ),
  http.post("https://api.openai.com/v1/responses", () =>
    HttpResponse.json({
      output_text: "Thanks for your review.",
    }),
  ),
  http.post("https://generativelanguage.googleapis.com/*", () =>
    HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [{ text: "Thanks for your review." }],
          },
        },
      ],
    }),
  ),
];
