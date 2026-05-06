/* eslint-disable react/prop-types */
import {BlockStack, Card, InlineStack, Spinner, Text} from '@shopify/polaris';

export default function PageLoadingState({
  title = 'Loading',
  description = 'Preparing your workspace...',
}) {
  return (
    <BlockStack gap="400">
      <Card>
        <div className="rp-page-loading-card" role="status" aria-live="polite">
          <BlockStack gap="400" align="center">
            <BlockStack gap="100" align="center">
              <InlineStack gap="400" align="center" blockAlign="center" wrap={false}>
                <span className="rp-page-loading-mark">
                  <Spinner accessibilityLabel={title} size="small" />
                </span>
                <Text as="h1" variant="headingLg" alignment="center">{title}</Text>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                {description}
              </Text>
            </BlockStack>
            <div className="rp-page-loading-skeleton" aria-hidden="true">
              <span className="rp-page-loading-line" />
              <span className="rp-page-loading-line" />
              <span className="rp-page-loading-line" />
            </div>
          </BlockStack>
        </div>
      </Card>
    </BlockStack>
  );
}
