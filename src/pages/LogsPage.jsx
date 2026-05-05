/* eslint-disable react/prop-types, react/no-unescaped-entities */
import {useEffect, useState} from 'react';
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Icon,
  InlineGrid,
  InlineStack,
  Text,
} from '@shopify/polaris';
import {
  ArrowLeftIcon,
  ConfettiIcon,
  ExportIcon,
  RefreshIcon,
} from '@shopify/polaris-icons';
import {sentReplies, weekBars} from '../replyPilotData';

function Stars({rating}) {
  return (
    <span className="rp-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({length: 5}, (_, index) => (
        <span key={index} className={index >= rating ? 'is-empty' : undefined}>★</span>
      ))}
    </span>
  );
}

function SentRow({reply}) {
  const isAsIs = reply.status === 'as-is';

  return (
    <div className="rp-sent-row">
      <span className="rp-avatar">{reply.initials}</span>
      <div className="rp-sent-copy">
        <InlineStack gap="150" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="semibold">{reply.customer}</Text>
          <Stars rating={reply.rating} />
          <Text as="span" variant="bodySm" tone="subdued">· {reply.product}</Text>
        </InlineStack>
        <Text as="p" variant="bodyMd" tone="subdued">
          <span className="rp-line-clamp">↳ {reply.reply}</span>
        </Text>
      </div>
      <Badge tone={isAsIs ? 'success' : undefined}>{reply.status}</Badge>
      <Text as="span" variant="bodySm" tone="subdued">{reply.age}</Text>
    </div>
  );
}

function LogsContent() {
  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h1" variant="heading2xl">Sent</Text>
            <Badge tone="success">Last 7 days · 184 replies</Badge>
          </InlineStack>
          <Text as="p" variant="bodyLg" tone="subdued">
            Audit what Reply Pilot sent, whether the draft shipped as-is, and which replies were edited.
          </Text>
        </BlockStack>
        <Button icon={ExportIcon}>Export</Button>
      </InlineStack>

      <div className="rp-sent-card">
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingLg">Last 7 days</Text>
            <Button icon={RefreshIcon}>Sync now</Button>
          </InlineStack>

          <div className="rp-week-chart" aria-label="Replies sent by day">
            {weekBars.map((bar) => (
              <div className="rp-bar-wrap" key={bar.day}>
                <div className="rp-bar" style={{height: `${bar.value}px`}} />
                <Text as="span" variant="bodySm" tone="subdued">{bar.day}</Text>
              </div>
            ))}
          </div>

          <div className="rp-sent-list">
            {sentReplies.map((reply) => (
              <SentRow key={reply.id} reply={reply} />
            ))}
          </div>
        </BlockStack>
      </div>

      <InlineGrid columns={{xs: 1, md: 2}} gap="400">
        <div className="rp-empty-state-card">
          <BlockStack gap="400" align="center">
            <span className="rp-empty-mark">
              <Icon source={ConfettiIcon} tone="base" />
            </span>
            <BlockStack gap="200" align="center">
              <Text as="h2" variant="heading2xl" alignment="center">Inbox zero</Text>
              <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
                38 replies sent today. Average response time: 4 minutes.
              </Text>
            </BlockStack>

            <div className="rp-stat-grid">
              <div className="rp-stat">
                <Text as="p" variant="headingXl" alignment="center">38</Text>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">sent today</Text>
              </div>
              <div className="rp-stat">
                <Text as="p" variant="headingXl" alignment="center">4m</Text>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">avg response</Text>
              </div>
              <div className="rp-stat">
                <Text as="p" variant="headingXl" alignment="center">2.5h</Text>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">saved</Text>
              </div>
            </div>

            <Button icon={ArrowLeftIcon}>Back to dashboard</Button>
            <Text as="p" variant="bodyMd" tone="critical" alignment="center">Next sync in 14 min</Text>
          </BlockStack>
        </div>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">Operational notes</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              The sent view keeps the wireframe's compact audit surface, but uses Polaris badges and typography so status, time, and edit history remain scannable in Shopify Admin.
            </Text>
            <InlineStack gap="200">
              <Badge tone="success">As-is</Badge>
              <Badge>Edited</Badge>
              <Badge tone="attention">Needs review</Badge>
            </InlineStack>
          </BlockStack>
        </Card>
      </InlineGrid>
    </BlockStack>
  );
}

export default function LogsPage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h1" variant="heading2xl">Sent</Text>
              <Badge tone="success">Last 7 days</Badge>
            </InlineStack>
            <Text as="p" variant="bodyLg" tone="subdued">
              Loading sent replies...
            </Text>
          </BlockStack>
        </InlineStack>
      </BlockStack>
    );
  }

  return <LogsContent />;
}
