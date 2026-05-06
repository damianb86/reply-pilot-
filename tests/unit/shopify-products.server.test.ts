import { describe, expect, it } from "vitest";
import {
  findProductByTitle,
  loadShopifyProductByHandle,
  loadShopifyProductById,
  loadShopifyProductByTitle,
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
        handle: "",
        productType: "Home",
        tags: ["table", "linen"],
        description: undefined,
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
          handle: "linen-napkins",
          description:
            '<p>Soft&nbsp;<strong>linen</strong> for the table.</p><script>window.bad = true;</script>',
          productType: "Home",
          tags: ["table"],
        },
      },
    });

    const product = await loadShopifyProductById(admin, "gid://shopify/Product/1");

    expect(product?.title).toBe("Linen napkins");
    expect(product?.description).toBe("Soft linen for the table.");
    expect(findProductByTitle([product!], "napkins")).toBe(product);
  });

  it("loads one product by handle with description", async () => {
    const admin = adminWithJson({
      data: {
        products: {
          edges: [
            {
              node: {
                id: "gid://shopify/Product/1",
                title: "Linen napkins",
                handle: "linen-napkins",
                description:
                  "<style>.x{display:none}</style><ul><li>Durable linen napkins</li><li>Daily meals &amp; hosting</li></ul>",
                productType: "Home",
                tags: ["table"],
              },
            },
          ],
        },
      },
    });

    const product = await loadShopifyProductByHandle(admin, "linen-napkins");

    expect(product).toMatchObject({
      handle: "linen-napkins",
      description: "Durable linen napkins Daily meals & hosting",
    });
  });

  it("loads one product by title when summaries do not include it", async () => {
    const admin = adminWithJson({
      data: {
        products: {
          edges: [
            {
              node: {
                id: "gid://shopify/Product/2",
                title: "The Multi-managed Snowboard",
                handle: "multi-managed-snowboard",
                description: "<p>Directional park board with a durable topsheet.</p>",
                productType: "Snowboard",
                tags: ["park", "freestyle"],
              },
            },
          ],
        },
      },
    });

    const product = await loadShopifyProductByTitle(admin, "The Multi-managed Snowboard");

    expect(product).toMatchObject({
      title: "The Multi-managed Snowboard",
      productType: "Snowboard",
      tags: ["park", "freestyle"],
      description: "Directional park board with a durable topsheet.",
    });
  });
});
