/* eslint-disable react/prop-types */
import {useEffect} from 'react';
import {useFetcher, useLoaderData} from 'react-router';
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Text,
} from '@shopify/polaris';

function LedgerAmount({amount}) {
  const positive = amount > 0;
  return (
    <Badge tone={positive ? 'success' : 'attention'}>
      {positive ? '+' : ''}{amount} credits
    </Badge>
  );
}

function PackageCard({pkg, fetcher}) {
  const isLoading = fetcher.state !== 'idle' && fetcher.formData?.get('packageId') === pkg.id;

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="start" gap="300">
          <BlockStack gap="050">
            <InlineStack gap="150" blockAlign="center">
              <Text as="h2" variant="headingLg">{pkg.name}</Text>
              {pkg.recommended ? <Badge tone="success">Recommended</Badge> : null}
            </InlineStack>
            <Text as="p" variant="bodyMd" tone="subdued">{pkg.description}</Text>
          </BlockStack>
          <Text as="span" variant="headingLg">{pkg.priceLabel}</Text>
        </InlineStack>
        <InlineStack align="space-between" blockAlign="center">
          <Badge tone="info">{pkg.credits} credits</Badge>
          <fetcher.Form method="post">
            <input type="hidden" name="packageId" value={pkg.id} />
            <Button submit loading={isLoading} disabled={fetcher.state !== 'idle'} variant={pkg.recommended ? 'primary' : undefined}>
              Buy {pkg.credits}
            </Button>
          </fetcher.Form>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

export default function CreditsPage() {
  const loaderData = useLoaderData();
  const purchaseFetcher = useFetcher();
  const credits = loaderData.credits;
  const actionData = purchaseFetcher.data;
  const message = actionData?.message ?? loaderData.message;
  const ok = actionData?.ok ?? loaderData.ok;

  useEffect(() => {
    if (!actionData?.confirmationUrl) return;
    try {
      window.top.location.href = actionData.confirmationUrl;
    } catch {
      window.location.href = actionData.confirmationUrl;
    }
  }, [actionData?.confirmationUrl]);

  return (
    <BlockStack gap="400">
      {message ? (
        <Banner tone={ok ? 'success' : 'critical'}>
          <Text as="p" variant="bodyMd">{message}</Text>
        </Banner>
      ) : null}

      <InlineStack align="space-between" blockAlign="end" gap="300">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">Credits</Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            Credits are assigned to this shop and are spent only when Reply Pilot generates AI content.
          </Text>
        </BlockStack>
        <Badge tone={credits.balance <= 25 ? 'critical' : 'info'}>{credits.balance} credits left</Badge>
      </InlineStack>

      <InlineGrid columns={{xs: 1, md: 3}} gap="300">
        <Card>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Available</Text>
            <Text as="p" variant="headingXl">{credits.balance}</Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Spent</Text>
            <Text as="p" variant="headingXl">{credits.spent}</Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">Purchased</Text>
            <Text as="p" variant="headingXl">{credits.purchased}</Text>
          </BlockStack>
        </Card>
      </InlineGrid>

      <section className="rp-field-card">
        <BlockStack gap="300">
          <BlockStack gap="050">
            <Text as="h2" variant="headingLg">Buy credits</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Purchases use Shopify billing. After approval, credits are added to this shop automatically.
            </Text>
          </BlockStack>
          <InlineGrid columns={{xs: 1, sm: 2, lg: 4}} gap="300">
            {credits.packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} fetcher={purchaseFetcher} />
            ))}
          </InlineGrid>
        </BlockStack>
      </section>

      <section className="rp-field-card">
        <BlockStack gap="300">
          <Text as="h2" variant="headingLg">How credits are spent</Text>
          <InlineGrid columns={{xs: 1, md: 3}} gap="300">
            <Card>
              <BlockStack gap="100">
                <Text as="p" variant="headingMd">Basic</Text>
                <Text as="p" variant="bodyMd">1 credit per reply or preview</Text>
                <Text as="p" variant="bodySm" tone="subdued">2 credits to generate Personality from past replies.</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text as="p" variant="headingMd">Pro</Text>
                <Text as="p" variant="bodyMd">4 credits per reply or preview</Text>
                <Text as="p" variant="bodySm" tone="subdued">8 credits to generate Personality from past replies.</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text as="p" variant="headingMd">Premium</Text>
                <Text as="p" variant="bodyMd">12 credits per reply or preview</Text>
                <Text as="p" variant="bodySm" tone="subdued">24 credits to generate Personality from past replies.</Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </BlockStack>
      </section>

      <section className="rp-field-card">
        <BlockStack gap="300">
          <Text as="h2" variant="headingLg">Recent activity</Text>
          {loaderData.recentLedger.length ? (
            <BlockStack gap="0">
              {loaderData.recentLedger.map((entry) => (
                <div key={entry.id} className="rp-field-row">
                  <InlineStack align="space-between" blockAlign="center" gap="300">
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">{entry.description}</Text>
                      <Text as="p" variant="bodySm" tone="subdued">Balance after: {entry.balanceAfter}</Text>
                    </BlockStack>
                    <LedgerAmount amount={entry.amount} />
                  </InlineStack>
                </div>
              ))}
            </BlockStack>
          ) : (
            <Text as="p" variant="bodyMd" tone="subdued">No credit activity yet.</Text>
          )}
        </BlockStack>
      </section>
    </BlockStack>
  );
}
