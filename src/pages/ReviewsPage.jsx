import {
  Badge,
  BlockStack,
  Button,
  Card,
  Icon,
  InlineStack,
  Text,
} from '@shopify/polaris';
import {ChatIcon, RefreshIcon, SettingsIcon} from '@shopify/polaris-icons';

export default function ReviewsPage() {
  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h1" variant="heading2xl">Review Queue</Text>
            <Badge tone="info">Empty</Badge>
          </InlineStack>
          <Text as="p" variant="bodyLg" tone="subdued">
            Reviews will appear here after the merchant connects a supported review source.
          </Text>
        </BlockStack>
        <Button icon={RefreshIcon}>Refresh</Button>
      </InlineStack>

      <Card>
        <BlockStack gap="300" align="center">
          <Icon source={ChatIcon} tone="subdued" />
          <Text as="h2" variant="headingLg" alignment="center">No imported reviews yet</Text>
          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
            Igu does not display sample reviews in production. Connect a real review source in Settings to begin.
          </Text>
          <Button icon={SettingsIcon} url="/app/settings" variant="primary">Open settings</Button>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
