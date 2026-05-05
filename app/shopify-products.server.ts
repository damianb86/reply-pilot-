type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export type ShopifyProductSummary = {
  id: string;
  title: string;
  productType: string;
  tags: string[];
};

const PRODUCTS_QUERY = `#graphql
  query ReplyPilotProducts($first: Int!) {
    products(first: $first, sortKey: TITLE) {
      edges {
        node {
          id
          title
          productType
          tags
        }
      }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `#graphql
  query ReplyPilotProduct($id: ID!) {
    product(id: $id) {
      id
      title
      productType
      tags
    }
  }
`;

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readTags(value: unknown) {
  return Array.isArray(value)
    ? value.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)
    : [];
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

export async function loadShopifyProducts(
  admin?: AdminGraphql | null,
  first = 100,
): Promise<ShopifyProductSummary[]> {
  if (!admin) return [];

  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: { first: Math.max(1, Math.min(first, 100)) },
  });
  const body = (await response.json()) as unknown;
  const errors = readObject(body).errors;
  if (Array.isArray(errors) && errors.length) {
    throw new Error(`Shopify products query failed: ${JSON.stringify(errors).slice(0, 1200)}`);
  }

  const products = readObject(readObject(body).data).products;
  const edges = readObject(products).edges;
  if (!Array.isArray(edges)) return [];

  return edges
    .map((edge) => {
      const node = readObject(readObject(edge).node);
      const title = readString(node.title);
      if (!title) return null;

      return {
        id: readString(node.id),
        title,
        productType: readString(node.productType),
        tags: readTags(node.tags),
      };
    })
    .filter((product): product is ShopifyProductSummary => Boolean(product));
}

export async function loadShopifyProductById(
  admin: AdminGraphql,
  id: string,
): Promise<ShopifyProductSummary | null> {
  if (!id.trim()) return null;

  const response = await admin.graphql(PRODUCT_BY_ID_QUERY, {
    variables: { id },
  });
  const body = (await response.json()) as unknown;
  const errors = readObject(body).errors;
  if (Array.isArray(errors) && errors.length) {
    throw new Error(`Shopify product query failed: ${JSON.stringify(errors).slice(0, 1200)}`);
  }

  const product = readObject(readObject(readObject(body).data).product);
  const title = readString(product.title);
  if (!title) return null;

  return {
    id: readString(product.id),
    title,
    productType: readString(product.productType),
    tags: readTags(product.tags),
  };
}

export function findProductByTitle(
  products: ShopifyProductSummary[],
  productTitle?: string | null,
) {
  const title = normalizeTitle(productTitle || "");
  if (!title) return null;

  return (
    products.find((product) => normalizeTitle(product.title) === title) ||
    products.find((product) => {
      const candidate = normalizeTitle(product.title);
      return candidate.includes(title) || title.includes(candidate);
    }) ||
    null
  );
}
