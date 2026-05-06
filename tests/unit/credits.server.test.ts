import { describe, expect, it } from "vitest";
import {
  CreditError,
  creditCostForOperation,
  creditCostsForModel,
  creditMultiplierForModel,
  serializeCreditError,
} from "../../app/credits.server";

describe("credits.server", () => {
  it("maps model tiers to credit multipliers", () => {
    expect(creditMultiplierForModel("basic")).toBe(1);
    expect(creditMultiplierForModel("pro")).toBe(4);
    expect(creditMultiplierForModel("premium")).toBe(12);
    expect(creditMultiplierForModel("openai-gpt-5-4-mini")).toBe(4);
    expect(creditMultiplierForModel("gemini-3-flash-preview")).toBe(0);
  });

  it("calculates operation costs by model", () => {
    expect(creditCostForOperation("basic", "reply")).toBe(1);
    expect(creditCostForOperation("pro", "personality")).toBe(8);
    expect(creditCostsForModel("premium")).toMatchObject({
      multiplier: 12,
      reply: 12,
      preview: 12,
      personality: 24,
    });
  });

  it("serializes credit errors without losing shortfall details", () => {
    const error = new CreditError("Not enough credits.", { required: 12, balance: 5 });

    expect(serializeCreditError(error)).toMatchObject({
      message: "Not enough credits.",
      required: 12,
      balance: 5,
      shortfall: 7,
    });
  });
});
