import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import { authenticate } from "../shopify.server";
import IguShell from "../components/IguShell";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const embeddedParams = new URLSearchParams();

  for (const key of ["embedded", "host", "shop"]) {
    const value = params.get(key);
    if (value) {
      embeddedParams.set(key, value);
    }
  }

  const embeddedSearch = embeddedParams.toString();
  const withEmbeddedSearch = (path: string) =>
    embeddedSearch ? `${path}?${embeddedSearch}` : path;

  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations}>
        <s-app-nav>
          <s-link href={withEmbeddedSearch("/app/dashboard")}>Dashboard</s-link>
          <s-link href={withEmbeddedSearch("/app/reviews")}>Reviews</s-link>
          <s-link href={withEmbeddedSearch("/app/brand-voice")}>Brand voice</s-link>
          <s-link href={withEmbeddedSearch("/app/logs")}>Logs</s-link>
          <s-link href={withEmbeddedSearch("/app/settings")}>Settings</s-link>
          <s-link href={withEmbeddedSearch("/app/help")}>Help</s-link>
        </s-app-nav>
        <IguShell>
          <Outlet />
        </IguShell>
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
