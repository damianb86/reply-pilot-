import { describe, expect, it } from "vitest";
import {
  findProductByTitle,
  loadShopifyProductById,
  loadShopifyProducts,
} from "../../app/shopify-products.server";
import { graphql } from "../fixtures/reply-pilot";

function adminWithJson(json: unknown) {
  return {
    graphql: async () => new Response(JSON.stringify(json)),
  };
}

describe("shopify-products.server", () => {
  it("loads product summaries from Admin GraphQL", async () => {
    const products = await loadShopifyProducts(adminWithJson(graphql.productsSuccess));

    expect(products).toEqual([
      {
        id: "gid://shopify/Product/1",
        title: "Linen napkins",
        productType: "Home",
        tags: ["table", "linen"],
      },
    ]);
  });

  it("throws on top-level GraphQL errors", async () => {
    await expect(loadShopifyProducts(adminWithJson(graphql.topLevelErrors))).rejects.toThrow(
      "Shopify products query failed",
    );
  });

  it("loads one product by id and can fuzzy match titles", async () => {
    const admin = adminWithJson({
      data: {
        product: {
          id: "gid://shopify/Product/1",
          title: "Linen napkins",
          productType: "Home",
          tags: ["table"],
        },
      },
    });

    const product = await loadShopifyProductById(admin, "gid://shopify/Product/1");

    expect(product?.title).toBe("Linen napkins");
    expect(findProductByTitle([product!], "napkins")).toBe(product);
  });
});
