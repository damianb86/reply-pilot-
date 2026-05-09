/* eslint-disable react/prop-types, react/no-unescaped-entities */
import {useEffect, useMemo, useState} from 'react';
import {useFetcher, useLoaderData, useLocation} from 'react-router';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  Icon,
  InlineGrid,
  InlineStack,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardIcon,
  ExternalIcon,
  HideIcon,
  ImportIcon,
  InfoIcon,
  MagicIcon,
  MicrophoneIcon,
  RefreshIcon,
  SendIcon,
  StarIcon,
  StatusActiveIcon,
  ViewIcon,
  XIcon,
} from '@shopify/polaris-icons';
import {useFetcherTimeout} from '../hooks/useFetcherTimeout';

const providers = [
  {
    id: 'judgeme',
    name: 'Judge.me',
    status: 'Available',
    available: true,
    logo: '/provider-logos/judgeme.png',
    tone: 'teal',
    initials: 'J',
  },
  {
    id: 'yotpo',
    name: 'Yotpo',
    status: 'Available',
    available: true,
    logo: '/provider-logos/yotpo.svg',
    tone: 'neutral',
  },
  {
    id: 'loox',
    name: 'Loox',
    status: 'Coming soon',
    available: false,
    logo: '/provider-logos/loox.svg',
    tone: 'black',
    wordmark: true,
  },
  {
    id: 'stamped',
    name: 'Stamped',
    status: 'Coming soon',
    available: false,
    logo: '/provider-logos/stamped.png',
    tone: 'orange',
    wordmark: true,
  },
];

function normalizeProviderId(id) {
  if (id === 'yotpo') return 'yotpo';
  return providers.some((provider) => provider.id === id) ? id : 'judgeme';
}

function providerById(id) {
  const providerId = normalizeProviderId(id);
  return providers.find((provider) => provider.id === providerId) || providers[0];
}

const utcMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateTime(value) {
  if (!value) return 'Not verified yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not verified yet';

  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  if (hours === 0) hours = 12;

  return `${utcMonths[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} at ${hours}:${minutes} ${period} UTC`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (typeof value === 'number') return new Intl.NumberFormat('en').format(value);
  return String(value);
}

function tokenWithViewIcon(tokenMask) {
  return (
    <InlineStack gap="150" blockAlign="center" align="end">
      <Text as="span" variant="bodyMd">{tokenMask || 'Not saved'}</Text>
      <Icon source={ViewIcon} tone="subdued" />
    </InlineStack>
  );
}

function ProviderMark({provider}) {
  const ProviderIcon = provider.icon;

  return (
    <span className={`rp-connect-provider-mark is-${provider.tone} ${provider.wordmark ? 'is-wordmark' : ''}`}>
      {provider.logo ? (
        <img className="rp-connect-provider-logo" src={provider.logo} alt="" aria-hidden="true" />
      ) : provider.initials ? (
        <span>{provider.initials}</span>
      ) : (
        <Icon source={ProviderIcon} tone="base" />
      )}
    </span>
  );
}

function ProviderTile({provider, selected, statusOverride, onSelect}) {
  const status = statusOverride || provider.status;
  const canSelect = provider.available && onSelect;

  return (
    <div
      className={`rp-connect-provider-tile ${selected ? 'is-selected' : ''} ${provider.available ? '' : 'is-disabled'}`}
      role={canSelect ? 'button' : undefined}
      tabIndex={canSelect ? 0 : undefined}
      aria-disabled={provider.available ? undefined : true}
      aria-pressed={selected}
      onClick={canSelect ? () => onSelect(provider.id) : undefined}
      onKeyDown={canSelect ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(provider.id);
        }
      } : undefined}
    >
      <InlineStack gap="450" blockAlign="center" wrap={false}>
        <ProviderMark provider={provider} />
        <BlockStack gap="025">
          <Text as="span" variant="bodyMd" fontWeight="semibold">{provider.name}</Text>
          <Text as="span" variant="bodySm" tone="subdued">{status}</Text>
        </BlockStack>
      </InlineStack>
      {selected ? (
        <span className="rp-connect-provider-check">
          <Icon source={CheckIcon} tone="base" />
        </span>
      ) : null}
    </div>
  );
}

function ReviewBubble() {
  return (
    <div className="rp-connect-review-bubble" aria-hidden="true">
      <InlineStack gap="050">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon key={star} source={StarIcon} tone="warning" />
        ))}
        <Icon source={MagicIcon} tone="magic" />
      </InlineStack>
      <span />
      <span />
    </div>
  );
}

function ResultBanner({result}) {
  if (!result?.message) return null;

  if (result.ok) {
    return (
      <Banner tone="success">
        <Text as="p" variant="bodyMd">{result.message}</Text>
      </Banner>
    );
  }

  const providerName = providerById(result.provider).name;
  const statusText = result.error?.status
    ? `${providerName} returned ${result.error.status}${result.error.statusText ? ` ${result.error.statusText}` : ''}.`
    : null;
  const timeoutMs = result.error?.timeoutMs || result.error?.details?.timeoutMs;
  const timeoutText = timeoutMs
    ? `The request timed out after ${Math.round(timeoutMs / 1000)} seconds.`
    : null;

  return (
    <Banner tone="critical">
      <BlockStack gap="200">
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          We couldn't connect {providerName}.
        </Text>
        <Text as="p" variant="bodyMd">{result.message}</Text>
        {statusText || timeoutText ? (
          <Text as="p" variant="bodySm" tone="subdued">{statusText || timeoutText}</Text>
        ) : null}
        <Text as="p" variant="bodySm" tone="subdued">
          Check the provider credentials, then try again.
        </Text>
      </BlockStack>
    </Banner>
  );
}

function KeyValueRow({label, value, badgeTone}) {
  const isPrimitive = typeof value === 'string' || typeof value === 'number';

  return (
    <div className="rp-connect-kv-row">
      <Text as="span" variant="bodySm" tone="subdued">{label}</Text>
      {badgeTone ? (
        <Badge tone={badgeTone}>{String(value)}</Badge>
      ) : isPrimitive ? (
        <Text as="span" variant="bodyMd" fontWeight="medium">{value}</Text>
      ) : (
        <div className="rp-connect-kv-value">{value}</div>
      )}
    </div>
  );
}

function ConnectForm({fetcher, shop, loaderData, actionPath, connections = [], initialProviderId}) {
  const safeConnections = Array.isArray(connections) ? connections : [];
  const connectedProviderIds = new Set(safeConnections.map((connection) => normalizeProviderId(connection.provider)));
  const requestedProviderId = initialProviderId ? normalizeProviderId(initialProviderId) : '';
  const defaultProvider = requestedProviderId && providerById(requestedProviderId).available
    ? requestedProviderId
    : providers.find((provider) => provider.available && !connectedProviderIds.has(provider.id))?.id || 'judgeme';
  const [selectedProviderId, setSelectedProviderId] = useState(defaultProvider);
  const [apiToken, setApiToken] = useState('');
  const [storeId, setStoreId] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showToken, setShowToken] = useState(false);
  const selectedProvider = providerById(selectedProviderId);
  const selectedIsConnected = connectedProviderIds.has(selectedProviderId);
  const pendingIntent = fetcher.formData?.get('intent');
  const timeout = useFetcherTimeout(fetcher, {
    timeoutMs: 30000,
    message: `${selectedProvider.name} did not respond in time. Please try again later.`,
  });
  const isSubmitting = timeout.pending && pendingIntent === 'connect-token';
  const canSubmit = selectedProviderId === 'yotpo'
    ? storeId.trim() && apiSecret.trim()
    : apiToken.trim();

  useEffect(() => {
    setSelectedProviderId(defaultProvider);
  }, [defaultProvider]);

  function selectProvider(providerId) {
    const normalizedProviderId = normalizeProviderId(providerId);
    if (!providerById(normalizedProviderId).available) return;
    setSelectedProviderId(normalizedProviderId);
  }

  function submitConnection() {
    if (!canSubmit || isSubmitting) return;

    const formData = new FormData();
    formData.set('intent', 'connect-token');
    formData.set('provider', selectedProviderId);
    formData.set('shopDomain', shop);
    formData.set('apiToken', apiToken.trim());
    formData.set('storeId', storeId.trim());
    formData.set('apiSecret', apiSecret.trim());
    fetcher.submit(formData, {method: 'post', action: actionPath});
  }

  return (
    <>
      <BlockStack gap="500">
        <BlockStack gap="350">
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="semibold">1. Choose provider</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Pick a provider to add or update. Connected providers stay active and sync together until you disconnect them.
            </Text>
          </BlockStack>
          <InlineGrid columns={{xs: 1, sm: 2, lg: 4}} gap="300">
            {providers.map((provider) => (
              <ProviderTile
                key={provider.id}
                provider={provider}
                selected={provider.id === selectedProviderId}
                statusOverride={connectedProviderIds.has(provider.id) ? 'Connected' : undefined}
                onSelect={selectProvider}
              />
            ))}
          </InlineGrid>
        </BlockStack>

        {selectedProviderId === 'yotpo' ? (
          <BlockStack gap="300">
            <BlockStack gap="100">
              <Text as="p" variant="bodyMd" fontWeight="semibold">2. Enter your Yotpo credentials</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Yotpo uses the Store ID/App Key and API secret to generate a Core API token for imports. Reply sending uses the App Developer access token configured on the Reply Pilot backend.
              </Text>
            </BlockStack>
            <TextField
              label="Yotpo Store ID / App Key"
              name="storeId"
              value={storeId}
              onChange={setStoreId}
              autoComplete="off"
              placeholder="Paste your Yotpo Store ID / App Key"
              helpText="Find this in Yotpo as the app key. It is used as the store/account ID for review imports and comments."
            />
            <TextField
              label="API secret"
              name="apiSecret"
              type={showToken ? 'text' : 'password'}
              value={apiSecret}
              onChange={setApiSecret}
              autoComplete="off"
              placeholder="Paste your Yotpo API secret"
              connectedRight={(
                <Button
                  icon={showToken ? HideIcon : ViewIcon}
                  accessibilityLabel={showToken ? 'Hide Yotpo credentials' : 'Show Yotpo credentials'}
                  onClick={() => setShowToken((value) => !value)}
                />
              )}
              helpText="Yotpo requires this secret to generate the Core API access token used for most API calls."
            />
            <Banner tone="info">
              The Yotpo App Developer access token is not requested from merchants. Configure `YOTPO_APP_DEVELOPER_ACCESS_TOKEN` in the backend environment to enable public review comments/replies.
            </Banner>
          </BlockStack>
        ) : (
          <BlockStack gap="300">
            <BlockStack gap="100">
              <Text as="p" variant="bodyMd" fontWeight="semibold">2. Enter your Judge.me credentials</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Judge.me uses this authenticated Shopify shop and your Private API token to import reviews and send approved replies.
              </Text>
            </BlockStack>
            <TextField
              label="API token"
              name="apiToken"
              type={showToken ? 'text' : 'password'}
              value={apiToken}
              onChange={setApiToken}
              autoComplete="off"
              placeholder="Paste your Private API token from Judge.me"
              connectedRight={(
                <Button
                  icon={showToken ? HideIcon : ViewIcon}
                  accessibilityLabel={showToken ? 'Hide API token' : 'Show API token'}
                  onClick={() => setShowToken((value) => !value)}
                />
              )}
              helpText="You can find your Private API token in Judge.me: Settings > Integrations > Private API token."
            />
          </BlockStack>
        )}

        <InlineStack align="space-between" blockAlign="center" gap="300">
          <InlineStack gap="300">
            <Button
              variant="plain"
              url={selectedProviderId === 'yotpo' ? loaderData.yotpoApiSettingsUrl : loaderData.judgeMeApiSettingsUrl}
              target="_blank"
              icon={ExternalIcon}
            >
              Where do I find these credentials?
            </Button>
            <Button
              variant="plain"
              url={selectedProviderId === 'yotpo' ? loaderData.yotpoCommentDocsUrl : loaderData.judgeMeApiDocsUrl}
              target="_blank"
              icon={ExternalIcon}
            >
              Read setup guide
            </Button>
          </InlineStack>
          <InlineStack gap="200">
            <Button variant="primary" loading={isSubmitting} disabled={!canSubmit || isSubmitting} onClick={submitConnection}>
              {selectedIsConnected ? `Test and save ${selectedProvider.name}` : `Test and add ${selectedProvider.name}`}
            </Button>
          </InlineStack>
        </InlineStack>
      </BlockStack>
    </>
  );
}

function CurrentConnectionCard({connection, fetcher, actionPath}) {
  const pendingIntent = fetcher.formData?.get('intent');
  const timeout = useFetcherTimeout(fetcher, {
    timeoutMs: 20000,
    message: 'Refreshing the review provider connection took too long. Please try again later.',
  });
  const isRefreshing = timeout.pending && pendingIntent === 'refresh';

  function refresh() {
    const formData = new FormData();
    formData.set('intent', 'refresh');
    fetcher.submit(formData, {method: 'post', action: actionPath});
  }

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={StatusActiveIcon} tone="success" />
            <Text as="h2" variant="headingMd">{connection ? 'Current connection' : 'Review provider connection'}</Text>
          </InlineStack>
          <Badge tone={connection ? 'success' : 'attention'}>{connection ? 'Connected' : 'Not connected'}</Badge>
        </InlineStack>
        <Divider />

        {connection ? (
          <BlockStack gap="0">
            <KeyValueRow label="Provider" value={<InlineStack gap="250" align="end" blockAlign="center"><ProviderMark provider={providers[0]} /><Text as="span" variant="bodyMd">Judge.me</Text></InlineStack>} />
            <KeyValueRow label="Connected shop" value={connection.shopDomain} />
            <KeyValueRow label="Auth method" value="Private API token" />
            <KeyValueRow label="Token" value={tokenWithViewIcon(connection.tokenMask)} />
            <KeyValueRow label="Last verified" value={formatDateTime(connection.lastVerifiedAt)} />
            <KeyValueRow label="Imported reviews" value={`${formatNumber(connection.reviewCount)} available`} />
          </BlockStack>
        ) : (
          <Text as="p" variant="bodyMd" tone="subdued">
            Add a review provider to verify the source before importing reviews.
          </Text>
        )}

        {connection ? (
          <InlineStack align="end">
            <Button icon={RefreshIcon} loading={isRefreshing} disabled={isRefreshing} onClick={refresh}>
              Refresh connection
            </Button>
          </InlineStack>
        ) : null}
      </BlockStack>
    </Card>
  );
}

function shopifyAdminAppPath(appHandle, appPath) {
  const safeHandle = String(appHandle || 'igu').replace(/^\/+|\/+$/g, '');
  const safePath = String(appPath || '').replace(/^\/+/, '');
  return `shopify://admin/apps/${safeHandle}/${safePath}`;
}

function AfterConnectionCard({connected, appHandle}) {
  const steps = connected
    ? [
        {icon: ImportIcon, tone: 'green', title: 'Import reviews', text: "We'll keep your reviews synced and ready to process."},
        {icon: MicrophoneIcon, tone: 'purple', title: 'Train brand voice', text: 'Paste 5-10 past replies so Reply Pilot learns your tone.'},
        {icon: SendIcon, tone: 'blue', title: 'Review AI replies', text: 'Drafts will appear in the approval queue before anything is sent.'},
      ]
    : [
        {icon: CheckCircleIcon, tone: 'green', title: 'Verified source', text: 'We verify your credentials and connection.'},
        {icon: ImportIcon, tone: 'blue', title: 'Ready to import', text: 'We fetch and sync your reviews securely.'},
        {icon: MicrophoneIcon, tone: 'purple', title: 'Human approval first', text: 'You review and approve AI replies before sending.'},
      ];

  return (
    <Card>
      <BlockStack gap="500">
        <Text as="h2" variant="headingLg">{connected ? 'What happens next' : 'What happens after connection'}</Text>
        <BlockStack gap="400">
          {steps.map((step) => (
            <InlineStack key={step.title} gap="300" blockAlign="start" wrap={false}>
                <span className={`rp-connect-mini-icon is-${step.tone}`}>
                  <Icon source={step.icon} tone="base" />
                </span>
                <BlockStack gap="075">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">{step.title}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">{step.text}</Text>
                </BlockStack>
            </InlineStack>
          ))}
        </BlockStack>
        {connected ? (
          <>
            <Divider />
            <BlockStack gap="200">
              <Button
                url={shopifyAdminAppPath(appHandle, 'app/settings?section=personality-builder')}
                target="_top"
                icon={ExternalIcon}
              >
                Open brand voice setup
              </Button>
              <Button
                url={shopifyAdminAppPath(appHandle, 'app/reviews')}
                target="_top"
                variant="plain"
                icon={ExternalIcon}
              >
                View imported reviews
              </Button>
            </BlockStack>
          </>
        ) : null}
      </BlockStack>
    </Card>
  );
}

function ConnectedManager({connections = [], fetcher, actionPath, onChangeProvider}) {
  const pendingIntent = fetcher.formData?.get('intent');
  const pendingProvider = fetcher.formData?.get('provider');
  const timeout = useFetcherTimeout(fetcher, {
    timeoutMs: 20000,
    message: 'The connection action took too long. Please try again later.',
  });
  const hasConnections = connections.length > 0;
  const connectedProviderIds = new Set(connections.map((connection) => normalizeProviderId(connection.provider)));
  const nextProviderId = providers.find((provider) => provider.available && !connectedProviderIds.has(provider.id))?.id
    || normalizeProviderId(connections[0]?.provider);

  function submitIntent(intent, provider) {
    const formData = new FormData();
    formData.set('intent', intent);
    formData.set('provider', provider);
    fetcher.submit(formData, {method: 'post', action: actionPath});
  }

  function openProvider(providerId) {
    const provider = providerById(providerId);
    if (!provider.available) return;
    onChangeProvider?.(provider.id);
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          <Text as="h2" variant="headingLg">{hasConnections ? 'Connected sources' : 'No connected sources'}</Text>
          <Badge tone={hasConnections ? 'success' : 'attention'}>{hasConnections ? `${connections.length} active` : 'Setup needed'}</Badge>
        </InlineStack>

        {hasConnections ? (
          <Banner tone="success">
            Review sources connected successfully
          </Banner>
        ) : null}

        <BlockStack gap="300">
          {connections.map((connection) => {
            const provider = providerById(connection.provider);
            const isRefreshing = timeout.pending && pendingIntent === 'refresh' && pendingProvider === connection.provider;
            const isDisconnecting = timeout.pending && pendingIntent === 'disconnect' && pendingProvider === connection.provider;
            const rows = [
              ['Provider', <InlineStack key="provider" gap="250" blockAlign="center"><ProviderMark provider={provider} /><Text as="span" variant="bodyMd">{provider.name}</Text></InlineStack>],
              ['Connected account', connection.providerAccountId || connection.shopDomain || 'Not available'],
              ['Auth method', connection.provider === 'yotpo' ? 'Store ID, API secret, access token' : 'Private API token'],
              ['Token', tokenWithViewIcon(connection.tokenMask)],
              ['Connected at', formatDateTime(connection.createdAt)],
              ['Last verified', formatDateTime(connection.lastVerifiedAt)],
              ['Imported reviews', `${formatNumber(connection.reviewCount)} available`],
              ['Sync health', <Badge key="health" tone={connection.status === 'connected' ? 'success' : 'critical'}>{connection.status === 'connected' ? 'Healthy' : 'Needs attention'}</Badge>],
            ];

            return (
              <div key={connection.provider} className="rp-connect-source-card">
                <BlockStack gap="250">
                  <BlockStack gap="0">
                    {rows.map(([label, value]) => (
                      <div key={label} className="rp-connect-summary-row">
                        <Text as="span" variant="bodyMd" tone="subdued">{label}</Text>
                        {typeof value === 'string' || typeof value === 'number' ? (
                          <Text as="span" variant="bodyMd" fontWeight="medium">{value}</Text>
                        ) : (
                          <div className="rp-connect-kv-value">{value}</div>
                        )}
                      </div>
                    ))}
                  </BlockStack>
                  <InlineStack gap="200">
                    <Button icon={RefreshIcon} loading={isRefreshing} disabled={isRefreshing} onClick={() => submitIntent('refresh', connection.provider)}>
                      Refresh
                    </Button>
                    <Button tone="critical" icon={XIcon} loading={isDisconnecting} disabled={isDisconnecting} onClick={() => submitIntent('disconnect', connection.provider)}>
                      Disconnect
                    </Button>
                  </InlineStack>
                </BlockStack>
              </div>
            );
          })}
        </BlockStack>

        <InlineStack gap="200">
          <Button icon={ArrowRightIcon} onClick={() => openProvider(nextProviderId)}>
            {connectedProviderIds.size >= providers.filter((provider) => provider.available).length ? 'Update provider credentials' : 'Add another provider'}
          </Button>
        </InlineStack>

        <Divider />

        <BlockStack gap="350">
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">Available providers</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Click a provider to add it or update its credentials. Multiple active providers sync into the same Reviews queue.
            </Text>
          </BlockStack>
          <InlineGrid columns={{xs: 1, sm: 2, lg: 4}} gap="300">
            {providers.map((provider) => (
              <ProviderTile
                key={provider.id}
                provider={provider}
                selected={connectedProviderIds.has(provider.id)}
                statusOverride={connectedProviderIds.has(provider.id) ? 'Connected' : provider.available ? 'Add provider' : undefined}
                onSelect={openProvider}
              />
            ))}
          </InlineGrid>
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

export function ConnectPanel({
  connections = [],
  fetcher,
  loaderData,
  actionPath,
  showProviderSetup,
  selectedProviderId,
  onChangeProvider,
  onCloseProviderSetup,
}) {
  const safeConnections = Array.isArray(connections) ? connections : [];
  const connected = safeConnections.length > 0;

  if (connected && !showProviderSetup) {
    return (
      <ConnectedManager
        connections={safeConnections}
        fetcher={fetcher}
        actionPath={actionPath}
        onChangeProvider={onChangeProvider}
      />
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="050">
            <Text as="h2" variant="headingLg">{connected ? 'Add or update review sources' : 'Connect your review source'}</Text>
            {connected ? (
              <Text as="p" variant="bodySm" tone="subdued">
                Saving a new provider does not replace existing providers. Each connected source can be refreshed or disconnected separately.
              </Text>
            ) : null}
          </BlockStack>
          <InlineStack gap="200" blockAlign="center">
            {connected ? <Badge tone="info">{safeConnections.length} active</Badge> : null}
            {connected && onCloseProviderSetup ? (
              <Button variant="plain" onClick={onCloseProviderSetup}>
                View connected sources
              </Button>
            ) : null}
          </InlineStack>
        </InlineStack>
        {connected ? (
          <Banner tone="info">
            Connected providers stay active. Adding another provider makes Reviews sync both sources at the same time.
          </Banner>
        ) : null}
        <ConnectForm
          fetcher={fetcher}
          shop={loaderData.shop}
          loaderData={loaderData}
          actionPath={actionPath}
          connections={safeConnections}
          initialProviderId={selectedProviderId}
        />
      </BlockStack>
    </Card>
  );
}

function buildDebugInfo({connection, loaderData, result}) {
  const connected = Boolean(connection);
  const reviewCount = connection?.reviewCount ?? 0;
  const connectionStatus = connection?.status || 'not_connected';
  const account = connection?.account && typeof connection.account === 'object' && !Array.isArray(connection.account)
    ? connection.account
    : null;
  const settings = connection?.settings && typeof connection.settings === 'object' && !Array.isArray(connection.settings)
    ? connection.settings
    : null;
  const sampleReviews = Array.isArray(connection?.sampleReviews) ? connection.sampleReviews : [];
  const logs = [
    result?.message ? ['Action response', result.message] : null,
    connection?.lastVerifiedAt ? ['Provider verified', formatDateTime(connection.lastVerifiedAt)] : null,
    connection?.updatedAt ? ['Database updated', formatDateTime(connection.updatedAt)] : null,
    connection?.createdAt ? ['Record created', formatDateTime(connection.createdAt)] : null,
    connection?.lastError ? ['Last provider error', connection.lastError] : null,
    !connected ? ['Connection state', 'No saved review provider connection for this shop.'] : null,
  ].filter(Boolean);

  return {
    details: [
      ['Environment', loaderData.appEnv || 'development', 'warning'],
      ['Session shop', loaderData.shop],
      ['Connection ID', connection?.id || 'Not saved'],
      ['Provider', connected ? (connection.provider || 'judgeme') : 'None'],
      ['Connection status', connectionStatus, connected ? 'success' : 'attention'],
      ['Auth method', connection?.authMethod || 'Not saved'],
      ['Token (masked)', connection?.tokenMask || 'Not saved'],
      ['Connected account', connection?.providerAccountId || connection?.shopDomain || 'Not connected'],
      ['Scope', connection?.scope || 'Not returned by provider'],
    ],
    health: [
      ['Imported review count', formatNumber(reviewCount)],
      ['Sample reviews stored', String(sampleReviews.length)],
      ['Account payload fields', String(account ? Object.keys(account).length : 0)],
      ['Settings payload fields', String(settings ? Object.keys(settings).length : 0)],
      ['Last verified', connected ? formatDateTime(connection.lastVerifiedAt) : 'Never'],
      ['Last database update', connected ? formatDateTime(connection.updatedAt) : 'Never'],
    ],
    logs,
    latestApiResponse: {
      connection: connection
        ? {
            id: connection.id,
            status: connection.status,
            providerAccountId: connection.providerAccountId,
            shopDomain: connection.shopDomain,
            authMethod: connection.authMethod,
            tokenMask: connection.tokenMask,
            reviewCount: connection.reviewCount,
            lastVerifiedAt: connection.lastVerifiedAt,
            updatedAt: connection.updatedAt,
            lastError: connection.lastError,
          }
        : null,
      loadedPayloads: {
        account,
        settings,
        sampleReviews: sampleReviews.slice(0, 3),
      },
      lastActionResult: result
        ? {
            intent: result.intent || null,
            ok: Boolean(result.ok),
            message: result.message || null,
            error: result.error || null,
          }
        : null,
      route: {
        shop: loaderData.shop,
        appEnv: loaderData.appEnv,
      },
    },
    lastError: connection?.lastError || result?.error?.message || 'None',
  };
}

function DebugPanel({connection, loaderData, result}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const debugInfo = useMemo(
    () => buildDebugInfo({connection, loaderData, result}),
    [connection, loaderData, result],
  );

  async function copyDebugInfo() {
    const text = JSON.stringify(debugInfo, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card padding="0">
      <Box padding="300" background="bg-surface-warning">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={InfoIcon} tone="warning" />
            <Text as="h2" variant="headingMd">Development debug panel</Text>
            <Badge tone="attention">Development only</Badge>
          </InlineStack>
          <InlineStack gap="200">
            <Button icon={ClipboardIcon} onClick={copyDebugInfo}>{copied ? 'Copied' : 'Copy debug info'}</Button>
            <Button icon={open ? ChevronUpIcon : ChevronDownIcon} accessibilityLabel={open ? 'Collapse debug panel' : 'Expand debug panel'} onClick={() => setOpen((value) => !value)} />
          </InlineStack>
        </InlineStack>
      </Box>

      {open ? (
        <InlineGrid columns={{xs: 1, md: 4}} gap="0">
          <Box padding="300" borderBlockStartWidth="025" borderInlineEndWidth="025" borderColor="border">
            <BlockStack gap="250">
              <Text as="h3" variant="headingSm">Connection details</Text>
              <BlockStack gap="150">
                {debugInfo.details.map(([label, value, tone]) => (
                  <KeyValueRow key={label} label={label} value={value} badgeTone={tone} />
                ))}
              </BlockStack>
            </BlockStack>
          </Box>

          <Box padding="300" borderBlockStartWidth="025" borderInlineEndWidth="025" borderColor="border">
            <BlockStack gap="250">
              <Text as="h3" variant="headingSm">Stored provider data</Text>
              <BlockStack gap="150">
                {debugInfo.health.map(([label, value, tone]) => (
                  <KeyValueRow key={label} label={label} value={value} badgeTone={tone} />
                ))}
              </BlockStack>
            </BlockStack>
          </Box>

          <Box padding="300" borderBlockStartWidth="025" borderInlineEndWidth="025" borderColor="border">
            <BlockStack gap="250">
              <InlineStack align="space-between">
                <Text as="h3" variant="headingSm">Recent local events</Text>
                <Badge tone="info">Current load</Badge>
              </InlineStack>
              <BlockStack gap="150">
                {debugInfo.logs.map(([label, message]) => (
                  <InlineStack key={`${label}-${message}`} gap="200" blockAlign="center" wrap={false}>
                    <span className="rp-connect-log-dot" />
                    <Text as="span" variant="bodySm" tone="subdued">{label}</Text>
                    <Text as="span" variant="bodySm">{message}</Text>
                  </InlineStack>
                ))}
              </BlockStack>
              <Divider />
              <BlockStack gap="050">
                <Text as="h3" variant="headingSm">Last error</Text>
                <Text as="p" variant="bodySm" tone="subdued">{debugInfo.lastError}</Text>
              </BlockStack>
            </BlockStack>
          </Box>

          <Box padding="300" borderBlockStartWidth="025" borderColor="border">
            <BlockStack gap="250">
              <Text as="h3" variant="headingSm">Loaded debug payload</Text>
              <pre className="rp-json-preview">{JSON.stringify(debugInfo.latestApiResponse, null, 2)}</pre>
            </BlockStack>
          </Box>
        </InlineGrid>
      ) : null}
    </Card>
  );
}

export default function DashboardPage() {
  const loaderData = useLoaderData();
  const location = useLocation();
  const fetcher = useFetcher();
  const timeout = useFetcherTimeout(fetcher, {
    timeoutMs: 30000,
    message: 'The Connect action is taking longer than expected. Please try again later.',
  });
  const [showProviderSetup, setShowProviderSetup] = useState(false);
  const [providerSetupId, setProviderSetupId] = useState(null);
  const fetcherConnections = fetcher.data && 'connections' in fetcher.data ? fetcher.data.connections : undefined;
  const loaderConnections = Array.isArray(loaderData.connections) ? loaderData.connections : [];
  const connections = Array.isArray(fetcherConnections) ? fetcherConnections : loaderConnections;
  const connection = connections[0] || null;
  const result = timeout.result || fetcher.data;
  const connected = connections.some((item) => item.status === 'connected');
  const actionPath = `${location.pathname}${location.search || ''}`;

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data?.intent === 'connect-token') {
      setShowProviderSetup(false);
      setProviderSetupId(null);
    }
  }, [fetcher.data]);

  function openProviderSetup(providerId) {
    setProviderSetupId(normalizeProviderId(providerId));
    setShowProviderSetup(true);
  }

  const pageTitle = connected
    ? connections.length > 1 ? 'Your review sources are connected' : 'Your review source is connected'
    : 'Connect your review source and start saving time';
  const pageSubtitle = connected
    ? 'Reply Pilot is now syncing connected review sources and is ready for brand voice training and reply approval workflows.'
    : 'Reply Pilot pulls your reviews, learns your brand voice, and helps you reply faster, always with human approval.';

  return (
    <BlockStack gap="400">
      <ResultBanner result={result} />

      <InlineStack align="space-between" blockAlign="start" gap="400">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">{pageTitle}</Text>
          <Text as="p" variant="bodyMd" tone="subdued">{pageSubtitle}</Text>
        </BlockStack>
        <ReviewBubble />
      </InlineStack>

      <InlineGrid columns={{xs: 1, lg: 'minmax(0, 1.2fr) minmax(360px, 0.8fr)'}} gap="400">
        <ConnectPanel
          connections={connections}
          fetcher={fetcher}
          loaderData={loaderData}
          actionPath={actionPath}
          showProviderSetup={showProviderSetup}
          selectedProviderId={providerSetupId}
          onChangeProvider={openProviderSetup}
          onCloseProviderSetup={() => {
            setShowProviderSetup(false);
            setProviderSetupId(null);
          }}
        />

        <BlockStack gap="300">
          {!connected ? <CurrentConnectionCard connection={connection} fetcher={fetcher} actionPath={actionPath} /> : null}
          <AfterConnectionCard connected={connected} appHandle={loaderData.appHandle} />
        </BlockStack>
      </InlineGrid>

      {loaderData.isDevelopment ? (
        <DebugPanel connection={connection} loaderData={loaderData} result={result} />
      ) : null}
    </BlockStack>
  );
}
