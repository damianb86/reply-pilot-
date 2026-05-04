import {Link, useLocation} from "react-router";
import {Badge, Box, InlineStack, Page, Text} from "@shopify/polaris";

export default function IguShell({children}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const embeddedParams = new URLSearchParams();

  for (const key of ["embedded", "host", "shop"]) {
    const value = params.get(key);
    if (value) embeddedParams.set(key, value);
  }

  const embeddedSearch = embeddedParams.toString();
  const settingsHref = embeddedSearch ? `/app/settings?${embeddedSearch}` : "/app/settings";

  return (
    <div className="embedded-shell">
      <Box
        background="bg-surface"
        borderBlockEndWidth="025"
        borderColor="border"
        paddingInline="400"
        paddingBlock="200"
      >
        <InlineStack gap="400" blockAlign="center" wrap={false}>
          <InlineStack gap="300" blockAlign="center">
            <Badge tone="info">Setup required</Badge>
            <Text as="span" variant="bodySm" fontWeight="semibold">Igu</Text>
            <Text as="span" variant="bodySm" tone="subdued">Connect a review source</Text>
            <Link to={settingsHref} className="topbar-link">Open settings</Link>
          </InlineStack>

          <Box borderInlineStartWidth="025" borderColor="border" paddingInlineStart="400">
            <InlineStack gap="400" blockAlign="center" wrap={false}>
              <InlineStack gap="150" blockAlign="center">
                <Text as="span" variant="bodySm" fontWeight="semibold">Production mode</Text>
                <Text as="span" variant="bodySm" tone="subdued">Real activity only</Text>
              </InlineStack>
            </InlineStack>
          </Box>
        </InlineStack>
      </Box>

      <main className="main-content">
        <Page fullWidth>{children}</Page>
      </main>
    </div>
  );
}
