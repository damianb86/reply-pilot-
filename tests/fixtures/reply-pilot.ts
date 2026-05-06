import { DEFAULT_APP_SETTINGS } from "../../app/settings.server";

export const shops = {
  installed: {
    shop: "qorve-dev.myshopify.com",
    scope: "read_products",
  },
  missingScope: {
    shop: "qorve-dev.myshopify.com",
    scope: "",
  },
  expiredSession: {
    shop: "qorve-dev.myshopify.com",
    expires: new Date("2020-01-01T00:00:00Z"),
  },
};

export const settings = {
  defaults: DEFAULT_APP_SETTINGS,
  strictReview: {
    ...DEFAULT_APP_SETTINGS,
    humanReviewThreshold: 85,
    routeSensitiveReviews: true,
    routeLowStarReviews: true,
  },
};

export const reviews = {
  positive: {
    id: "review-1",
    rating: 5,
    body: "The napkins look beautiful and arrived quickly.",
    customerName: "Ana",
    productTitle: "Linen napkins",
  },
  sensitive: {
    id: "review-2",
    rating: 1,
    body: "The item arrived broken and I need a refund.",
    customerName: "Leo",
    productTitle: "Ceramic cup",
  },
};

export const graphql = {
  productsSuccess: {
    data: {
      products: {
        edges: [
          {
            node: {
              id: "gid://shopify/Product/1",
              title: "Linen napkins",
              productType: "Home",
              tags: ["table", "linen"],
            },
          },
        ],
      },
    },
  },
  topLevelErrors: {
    errors: [{ message: "Throttled" }],
  },
};
