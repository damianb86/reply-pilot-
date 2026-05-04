import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineGrid,
  InlineStack,
  Text,
} from '@shopify/polaris';
import {
  ChatIcon,
  RefreshIcon,
  SettingsIcon,
  StarIcon,
  ViewIcon,
} from '@shopify/polaris-icons';

const summaryCards = [
  {label: 'Pending reviews', value: '0', detail: 'Connect a review source to import reviews.', icon: ViewIcon},
  {label: 'Drafts ready', value: '0', detail: 'Generated replies will appear after setup.', icon: ChatIcon},
  {label: 'Replies sent', value: '0', detail: 'No replies have been sent from Igu yet.', icon: StarIcon},
  {label: 'Integrations', value: '0', detail: 'Configure integrations in Settings.', icon: SettingsIcon},
];

function MetricCard({card}) {
  return (
    <Card>
      <InlineStack align="space-between" blockAlign="start" gap="300" wrap={false}>
        <BlockStack gap="100">
          <Text as="p" variant="bodyMd" tone="subdued">{card.label}</Text>
          <Text as="p" variant="heading2xl">{card.value}</Text>
          <Text as="p" variant="bodyMd" tone="subdued">{card.detail}</Text>
        </BlockStack>
        <Box background="bg-fill-info-secondary" borderRadius="200" padding="300">
          <Icon source={card.icon} tone="base" />
        </Box>
      </InlineStack>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h1" variant="heading2xl">Dashboard</Text>
            <Badge tone="info">Setup required</Badge>
          </InlineStack>
          <Text as="p" variant="bodyLg" tone="subdued">
            Igu will show review activity after a merchant connects a review source and starts creating replies.
          </Text>
        </BlockStack>
        <Button icon={RefreshIcon}>Refresh</Button>
      </InlineStack>

      <InlineGrid columns={{xs: 1, sm: 2, md: 4}} gap="400">
        {summaryCards.map(card => <MetricCard key={card.label} card={card} />)}
      </InlineGrid>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingLg">Next steps</Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Configure your review source, set brand voice guidance, and verify support email before sending replies.
          </Text>
          <InlineStack gap="200">
            <Button url="/app/settings" variant="primary">Open settings</Button>
            <Button url="/app/help">Contact support</Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
