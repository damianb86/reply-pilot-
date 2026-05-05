/* eslint-disable react/prop-types, react/no-unescaped-entities */
import {useMemo, useState} from 'react';
import {useFetcher, useLoaderData} from 'react-router';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineGrid,
  InlineStack,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  AlertTriangleIcon,
  AppsIcon,
  ChatIcon,
  CheckCircleIcon,
  ConnectIcon,
  ExternalIcon,
  GlobeIcon,
  ImageIcon,
  KeyIcon,
  MagicIcon,
  MegaphoneIcon,
  ProductIcon,
  RefreshIcon,
  SendIcon,
  SettingsIcon,
  StarIcon,
  StatusActiveIcon,
  StoreIcon,
} from '@shopify/polaris-icons';
import {onboardingSteps, reviewSources} from '../replyPilotData';

const stepIconMap = {
  connect: ConnectIcon,
  voice: MagicIcon,
  approve: SendIcon,
};

const sourceMeta = {
  judgeme: {icon: StarIcon, tone: 'green'},
  loox: {icon: ImageIcon, tone: 'blue'},
  yotpo: {icon: MegaphoneIcon, tone: 'purple'},
  stamped: {icon: ProductIcon, tone: 'orange'},
  google: {icon: GlobeIcon, tone: 'green'},
  trustpilot: {icon: CheckCircleIcon, tone: 'blue'},
  shopify: {icon: StoreIcon, tone: 'green'},
};

function StepCard({step}) {
  const StepIcon = stepIconMap[step.id] ?? AppsIcon;

  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <span className={`rp-icon-tile ${step.id === 'connect' ? 'is-yellow' : 'is-neutral'}`}>
            <Icon source={StepIcon} tone="base" />
          </span>
          <Text as="h3" variant="headingMd">{step.title}</Text>
        </InlineStack>
        <InlineStack gap="200" blockAlign="center">
          <Badge tone={step.id === 'connect' ? 'attention' : undefined}>Step {step.step}</Badge>
          <Text as="p" variant="bodyMd" tone="subdued">{step.description}</Text>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

function SourceLogo({source, children}) {
  const meta = sourceMeta[source.id] ?? {icon: AppsIcon, tone: 'neutral'};

  return (
    <span className={`rp-source-logo is-${meta.tone}`} aria-hidden="true">
      <Icon source={meta.icon} tone="base" />
      <span className="rp-source-initials">{children}</span>
    </span>
  );
}

function UpcomingSource({source}) {
  return (
    <Card>
      <InlineStack align="space-between" blockAlign="center" gap="300" wrap={false}>
        <InlineStack gap="300" blockAlign="center" wrap={false}>
          <SourceLogo source={source}>{source.initials}</SourceLogo>
          <BlockStack gap="050">
            <Text as="p" variant="bodyMd" fontWeight="semibold">{source.name}</Text>
            <Text as="p" variant="bodySm" tone="subdued">{source.detail}</Text>
          </BlockStack>
        </InlineStack>
        <Button size="slim">Vote {source.votes}</Button>
      </InlineStack>
    </Card>
  );
}

function KeyValue({label, value}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="rp-kv-row">
      <Text as="span" variant="bodySm" tone="subdued">{label}</Text>
      <Text as="span" variant="bodyMd" fontWeight="semibold">{String(value)}</Text>
    </div>
  );
}

function DebugJson({title, value}) {
  if (!value) return null;

  return (
    <BlockStack gap="150">
      <Text as="h3" variant="headingSm">{title}</Text>
      <pre className="rp-json-preview">{JSON.stringify(value, null, 2)}</pre>
    </BlockStack>
  );
}

function formatIsoDateTime(value) {
  if (!value || typeof value !== 'string') return 'Not verified yet';
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
}

function ResultBanner({result}) {
  if (result?.message) {
    return (
      <Banner tone={result.ok ? 'success' : 'critical'}>
        <BlockStack gap="150">
          <Text as="p" variant="bodyMd">{result.message}</Text>
          {!result.ok && result.error ? (
            <pre className="rp-json-preview is-error">{JSON.stringify(result.error, null, 2)}</pre>
          ) : null}
        </BlockStack>
      </Banner>
    );
  }

  return null;
}

function ManualTokenForm({fetcher, shop, apiSettingsUrl, apiDocsUrl}) {
  const [apiToken, setApiToken] = useState('');
  const [shopDomain, setShopDomain] = useState(shop);
  const pendingIntent = fetcher.formData?.get('intent');
  const isSubmitting = fetcher.state !== 'idle' && pendingIntent === 'connect-token';

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="connect-token" />
      <BlockStack gap="300">
        <InlineStack gap="200" blockAlign="center">
          <span className="rp-icon-tile is-blue">
            <Icon source={KeyIcon} tone="base" />
          </span>
          <BlockStack gap="050">
            <Text as="h3" variant="headingMd">Connect with a Judge.me private token</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Judge.me connects merchant-by-merchant with shop_domain and api_token. Open Judge.me, copy the Private API Token, and paste it here so Reply Pilot can verify it server-side.
            </Text>
          </BlockStack>
        </InlineStack>

        <InlineGrid columns={{xs: 1, md: 3}} gap="200">
          {[
            {title: '1. Open Judge.me', detail: 'Go to Settings > Integrations.'},
            {title: '2. View API tokens', detail: 'Copy Shop domain and Private API Token.'},
            {title: '3. Verify here', detail: 'Reply Pilot saves the token encrypted.'},
          ].map((item) => (
            <div className="rp-connect-stat" key={item.title}>
              <Text as="span" variant="bodyMd" fontWeight="semibold">{item.title}</Text>
              <Text as="span" variant="bodySm" tone="subdued">{item.detail}</Text>
            </div>
          ))}
        </InlineGrid>

        <InlineGrid columns={{xs: 1, md: 2}} gap="300">
          <TextField
            label="Shop domain"
            name="shopDomain"
            value={shopDomain}
            onChange={setShopDomain}
            autoComplete="off"
            helpText="Use the myshopify.com domain shown in Judge.me."
          />
          <TextField
            label="Private API token"
            name="apiToken"
            type="password"
            value={apiToken}
            onChange={setApiToken}
            autoComplete="off"
            placeholder="Paste Judge.me private token"
          />
        </InlineGrid>

        <InlineStack align="space-between" blockAlign="center" gap="300">
          <InlineStack gap="200">
            <Button url={apiSettingsUrl} target="_blank" icon={ExternalIcon}>
              Open Judge.me API tokens
            </Button>
            <Button url={apiDocsUrl} target="_blank" icon={ExternalIcon}>
              API guide
            </Button>
          </InlineStack>
          <Button variant="primary" submit loading={isSubmitting} disabled={!apiToken || isSubmitting}>
            Verify & save
          </Button>
        </InlineStack>
      </BlockStack>
    </fetcher.Form>
  );
}

function ConnectionActions({connection, fetcher, apiSettingsUrl}) {
  const pendingIntent = fetcher.formData?.get('intent');
  const isRefreshing = fetcher.state !== 'idle' && pendingIntent === 'refresh';
  const isDisconnecting = fetcher.state !== 'idle' && pendingIntent === 'disconnect';

  function submitIntent(intent) {
    const formData = new FormData();
    formData.set('intent', intent);
    fetcher.submit(formData, {method: 'post'});
  }

  if (connection) {
    return (
      <InlineStack gap="200" align="end">
        <Button icon={RefreshIcon} loading={isRefreshing} disabled={isRefreshing} onClick={() => submitIntent('refresh')}>
          Refresh
        </Button>
        <Button tone="critical" loading={isDisconnecting} disabled={isDisconnecting} onClick={() => submitIntent('disconnect')}>
          Disconnect
        </Button>
      </InlineStack>
    );
  }

  return (
    <Button variant="primary" icon={ExternalIcon} url={apiSettingsUrl} target="_blank">
      Open Judge.me
    </Button>
  );
}

function JudgeMeConnectionCard({judgeMe, connection, loaderData, fetcher}) {
  const isConnected = Boolean(connection);

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="start" gap="400">
          <InlineStack gap="300" blockAlign="center" wrap={false}>
            <SourceLogo source={judgeMe}>{judgeMe.initials}</SourceLogo>
            <BlockStack gap="100">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h3" variant="headingLg">{judgeMe.name}</Text>
                <Badge tone={isConnected ? 'success' : 'attention'}>
                  {isConnected ? 'Connected' : judgeMe.status}
                </Badge>
                <Text as="span" variant="bodySm" tone="subdued">{judgeMe.merchants}</Text>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">{judgeMe.detail}</Text>
            </BlockStack>
          </InlineStack>

          <ConnectionActions
            connection={connection}
            fetcher={fetcher}
            apiSettingsUrl={loaderData.judgeMeApiSettingsUrl}
          />
        </InlineStack>

        {isConnected ? (
          <InlineGrid columns={{xs: 1, md: 4}} gap="300">
            <div className="rp-connect-stat">
              <Text as="span" variant="bodySm" tone="subdued">Status</Text>
              <InlineStack gap="150" blockAlign="center">
                <Icon source={StatusActiveIcon} tone={connection.status === 'connected' ? 'success' : 'critical'} />
                <Text as="span" variant="bodyMd" fontWeight="semibold">{connection.status}</Text>
              </InlineStack>
            </div>
            <div className="rp-connect-stat">
              <Text as="span" variant="bodySm" tone="subdued">Shop</Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">{connection.shopDomain}</Text>
            </div>
            <div className="rp-connect-stat">
              <Text as="span" variant="bodySm" tone="subdued">Method</Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">Private API token</Text>
            </div>
            <div className="rp-connect-stat">
              <Text as="span" variant="bodySm" tone="subdued">Token</Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">{connection.tokenMask}</Text>
            </div>
          </InlineGrid>
        ) : (
          <ManualTokenForm
            fetcher={fetcher}
            shop={loaderData.shop}
            apiSettingsUrl={loaderData.judgeMeApiSettingsUrl}
            apiDocsUrl={loaderData.judgeMeApiDocsUrl}
          />
        )}
      </BlockStack>
    </Card>
  );
}

function JudgeMeAccountPanel({connection}) {
  const sampleReviews = Array.isArray(connection?.sampleReviews) ? connection.sampleReviews : [];

  if (!connection) return null;

  return (
    <InlineGrid columns={{xs: 1, md: 2}} gap="400">
      <Card>
        <BlockStack gap="350">
          <InlineStack gap="200" blockAlign="center">
            <span className="rp-icon-tile is-green">
              <Icon source={StoreIcon} tone="base" />
            </span>
            <BlockStack gap="050">
              <Text as="h2" variant="headingLg">Judge.me account</Text>
              <Text as="p" variant="bodySm" tone="subdued">Live data saved from the verified connection.</Text>
            </BlockStack>
          </InlineStack>

          <InlineGrid columns={{xs: 1, sm: 2}} gap="200">
            <KeyValue label="Store name" value={connection.shopName} />
            <KeyValue label="Owner" value={connection.ownerName} />
            <KeyValue label="Email" value={connection.shopEmail} />
            <KeyValue label="Plan" value={connection.plan} />
            <KeyValue label="Platform" value={connection.platform} />
            <KeyValue label="Country" value={connection.country} />
            <KeyValue label="Timezone" value={connection.timezone} />
            <KeyValue label="Widget" value={connection.widgetVersion} />
            <KeyValue label="Reviews" value={connection.reviewCount ?? 'Connected'} />
            <KeyValue label="Awesome" value={connection.awesome === null ? null : connection.awesome ? 'Yes' : 'No'} />
          </InlineGrid>

          <Text as="p" variant="bodySm" tone="subdued">
            Last verified: {formatIsoDateTime(connection.lastVerifiedAt)}
          </Text>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="350">
          <InlineStack gap="200" blockAlign="center">
            <span className="rp-icon-tile is-blue">
              <Icon source={SettingsIcon} tone="base" />
            </span>
            <BlockStack gap="050">
              <Text as="h2" variant="headingLg">Debug snapshot</Text>
              <Text as="p" variant="bodySm" tone="subdued">Enough detail to confirm Judge.me is returning account data.</Text>
            </BlockStack>
          </InlineStack>

          <DebugJson title="Settings" value={connection.settings} />

          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">Latest reviews sample</Text>
            {sampleReviews.length ? sampleReviews.map((review, index) => (
              <Box key={review.id ?? index} paddingBlock="200" borderBlockStartWidth={index === 0 ? '0' : '025'} borderColor="border">
                <BlockStack gap="100">
                  <InlineStack align="space-between" gap="200">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {review.reviewer?.name || review.reviewer_name || review.name || `Review ${index + 1}`}
                    </Text>
                    <Badge>{review.rating ? `${review.rating} stars` : 'Review'}</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {review.body || review.title || JSON.stringify(review).slice(0, 180)}
                  </Text>
                </BlockStack>
              </Box>
            )) : (
              <Text as="p" variant="bodyMd" tone="subdued">No reviews returned in the sample response.</Text>
            )}
          </BlockStack>
        </BlockStack>
      </Card>
    </InlineGrid>
  );
}

export default function DashboardPage() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const judgeMe = reviewSources.find((source) => source.id === 'judgeme');
  const comingSoon = reviewSources.filter((source) => !source.available);
  const fetcherConnection = fetcher.data && 'connection' in fetcher.data ? fetcher.data.connection : undefined;
  const connection = fetcherConnection !== undefined ? fetcherConnection : loaderData.connection;
  const result = fetcher.data;
  const heroBadgeTone = connection?.status === 'connected' ? 'success' : 'attention';
  const heroBadgeText = connection?.status === 'connected' ? 'Judge.me connected' : 'Judge.me ready';

  const nextSteps = useMemo(() => {
    if (connection) {
      return [
        {label: 'Verified source', tone: 'success'},
        {label: `${connection.reviewCount ?? 'Live'} reviews`, tone: undefined},
        {label: 'Ready to import', tone: 'info'},
      ];
    }

    return [
      {label: 'Merchant-owned token', tone: 'info'},
      {label: 'Judge.me API verified', tone: undefined},
      {label: 'Server-side storage', tone: 'success'},
    ];
  }, [connection]);

  return (
    <BlockStack gap="500">
      <ResultBanner result={result} />

      <div className="rp-hero-panel">
        <BlockStack gap="500">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <InlineStack gap="300" blockAlign="center" wrap={false}>
                <span className="rp-app-icon">
                  <Icon source={ChatIcon} tone="base" />
                </span>
                <BlockStack gap="050">
                  <Text as="span" variant="headingMd">Reply Pilot</Text>
                  <Text as="span" variant="bodySm" tone="subdued">AI review replies for Shopify</Text>
                </BlockStack>
              </InlineStack>
              <Badge tone={heroBadgeTone}>{heroBadgeText}</Badge>
            </InlineStack>

            <div className="rp-page-title">
              <BlockStack gap="200">
                <Text as="h1" variant="heading3xl">
                  Stop typing the same "thank you" 200 times.
                </Text>
                <Text as="p" variant="bodyLg" tone="subdued">
                  Connect Judge.me, verify the account data, then import reviews into a human-approved reply queue.
                </Text>
              </BlockStack>
            </div>
          </BlockStack>

          <div className="rp-step-grid">
            {onboardingSteps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>

          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingLg">Available now</Text>
              <Badge tone="success">Recommended</Badge>
            </InlineStack>

            <JudgeMeConnectionCard
              judgeMe={judgeMe}
              connection={connection}
              loaderData={loaderData}
              fetcher={fetcher}
            />
          </BlockStack>
        </BlockStack>
      </div>

      <InlineGrid columns={{xs: 1, md: 2}} gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <span className="rp-icon-tile is-green">
                <Icon source={CheckCircleIcon} tone="base" />
              </span>
              <Text as="h2" variant="headingLg">What happens after connection</Text>
            </InlineStack>
            <Text as="p" variant="bodyMd" tone="subdued">
              Reply Pilot stores the credential server-side, checks Judge.me account data, and keeps the queue human-approved before anything is sent.
            </Text>
            <InlineStack gap="200">
              {nextSteps.map((item) => (
                <Badge key={item.label} tone={item.tone}>{item.label}</Badge>
              ))}
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <span className="rp-icon-tile is-orange">
                <Icon source={AlertTriangleIcon} tone="base" />
              </span>
              <Text as="h2" variant="headingLg">Connection model</Text>
            </InlineStack>
            <Text as="p" variant="bodyMd" tone="subdued">
              Installing Judge.me in Shopify is required, but Shopify does not share Judge.me credentials with other apps. Judge.me documents the merchant-facing API setup as shop_domain plus a Private API Token from Settings &gt; Integrations.
            </Text>
            <Button url={loaderData.judgeMeApiDocsUrl} target="_blank" icon={ExternalIcon}>
              Judge.me API documentation
            </Button>
          </BlockStack>
        </Card>
      </InlineGrid>

      <JudgeMeAccountPanel connection={connection} />

      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <span className="rp-icon-tile is-orange">
              <Icon source={AppsIcon} tone="base" />
            </span>
            <Text as="h2" variant="headingLg">Coming soon</Text>
          </InlineStack>
          <Badge tone="attention">Vote what's next</Badge>
        </InlineStack>
        <div className="rp-source-grid">
          {comingSoon.map((source) => (
            <UpcomingSource key={source.id} source={source} />
          ))}
        </div>
      </BlockStack>
    </BlockStack>
  );
}
