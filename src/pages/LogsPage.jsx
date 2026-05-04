import {
  Badge,
  BlockStack,
  Button,
  Card,
  Icon,
  InlineStack,
  Text,
} from '@shopify/polaris';
import {ExportIcon, PageIcon} from '@shopify/polaris-icons';

export default function LogsPage() {
  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h1" variant="heading2xl">Logs</Text>
            <Badge tone="info">No activity</Badge>
          </InlineStack>
          <Text as="p" variant="bodyLg" tone="subdued">
            Reply activity and operational events will appear here after setup.
          </Text>
        </BlockStack>
        <Button icon={ExportIcon} disabled>Export</Button>
      </InlineStack>

      <Card>
        <BlockStack gap="300" align="center">
          <Icon source={PageIcon} tone="subdued" />
          <Text as="h2" variant="headingLg" alignment="center">No logs yet</Text>
          <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
            Igu only records real merchant actions and webhook events. There are no production logs to show yet.
          </Text>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
