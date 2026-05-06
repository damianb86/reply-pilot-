import { LoginErrorType } from "@shopify/shopify-app-react-router/server";
import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "../../app/routes/auth.login/error.server";

describe("loginErrorMessage", () => {
  it("returns helpful copy for missing and invalid shop context", () => {
    expect(loginErrorMessage({ shop: LoginErrorType.MissingShop })).toMatchObject({
      shop: expect.stringContaining("Shopify Admin"),
    });
    expect(loginErrorMessage({ shop: LoginErrorType.InvalidShop })).toMatchObject({
      shop: expect.stringContaining("invalid"),
    });
  });

  it("returns no field errors when Shopify login has no errors", () => {
    expect(loginErrorMessage({})).toEqual({});
  });
});
