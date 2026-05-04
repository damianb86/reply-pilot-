import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  Icon,
  InlineGrid,
  InlineStack,
  Select,
  Tabs,
  Text,
  TextField,
} from '@shopify/polaris';
import {HideIcon, ViewIcon} from '@shopify/polaris-icons';

const tabs = [
  {id: 'general', content: 'General'},
  {id: 'notifications', content: 'Notifications'},
  {id: 'auto-approve', content: 'Auto-approve'},
  {id: 'api', content: 'API'},
];

const languageOptions = [{label: 'English', value: 'english'}];
const repliesPerPageOptions = [{label: '20', value: '20'}];
const retentionOptions = [{label: '12 months', value: '12-months'}];
const timezoneOptions = [{label: '(GMT-05:00) Eastern Time (US & Canada)', value: 'est'}];
const dateFormatOptions = [{label: 'MMM D, YYYY', value: 'mmm-d-yyyy'}];

function SettingsSwitch({checked, label, onChange}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={`settings-switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch-thumb" />
    </button>
  );
}

function SettingsPanel({title, description, children, id, footer}) {
  return (
    <div id={id}>
      <Card padding="0">
        <Box padding="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingLg">{title}</Text>
            <Text as="p" variant="bodyMd" tone="subdued">{description}</Text>
          </BlockStack>
        </Box>
        <Divider />
        <BlockStack gap="0">{children}</BlockStack>
        {footer && (
          <>
            <Divider />
            <Box padding="400">
              <InlineStack align="end" gap="200">{footer}</InlineStack>
            </Box>
          </>
        )}
      </Card>
    </div>
  );
}

function FieldRow({label, description, children}) {
  return (
    <>
      <Box paddingInline="400" paddingBlock="300">
        <InlineStack align="space-between" blockAlign="center" gap="400" wrap={false}>
          <BlockStack gap="050">
            <Text as="span" variant="bodyMd" fontWeight="semibold">{label}</Text>
            {description && (
              <Text as="span" variant="bodyMd" tone="subdued">{description}</Text>
            )}
          </BlockStack>
          <Box>{children}</Box>
        </InlineStack>
      </Box>
      <Divider />
    </>
  );
}

function DangerRow({title, description, actionLabel}) {
  return (
    <>
      <Box paddingInline="400" paddingBlock="300">
        <InlineStack align="space-between" blockAlign="center" gap="400" wrap={false}>
          <BlockStack gap="050">
            <Text as="span" variant="bodyMd" fontWeight="semibold" tone="critical">{title}</Text>
            <Text as="span" variant="bodyMd" tone="subdued">{description}</Text>
          </BlockStack>
          <Button tone="critical" variant="secondary">{actionLabel}</Button>
        </InlineStack>
      </Box>
      <Divider />
    </>
  );
}

function DetailRow({label, children}) {
  return (
    <>
      <Box paddingInline="400" paddingBlock="300">
        <InlineStack align="space-between" blockAlign="center" gap="400">
          <Text as="span" variant="bodyMd" fontWeight="semibold">{label}</Text>
          {children}
        </InlineStack>
      </Box>
      <Divider />
    </>
  );
}

function JudgeMeIntegrationPanel() {
  const fetcher = useFetcher();
  const [showForm, setShowForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [resultVisible, setResultVisible] = useState(false);

  const isSubmitting = fetcher.state === 'submitting';
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (fetcher.state === 'submitting') wasSubmitting.current = true;
    if (wasSubmitting.current && fetcher.state === 'idle' && fetcher.data !== undefined) {
      wasSubmitting.current = false;
      setResultVisible(true);
    }
  }, [fetcher.state, fetcher.data]);

  const result = resultVisible ? fetcher.data : undefined;

  function handleReconnect() {
    setShowForm(true);
    setResultVisible(false);
    setApiToken('');
  }

  function handleCancel() {
    setShowForm(false);
    setResultVisible(false);
  }

  return (
    <SettingsPanel
      id="judgeme-integration"
      title="Judge.me integration"
      description="Manage your Judge.me connection."
      footer={
        !showForm ? (
          <Button onClick={handleReconnect}>Reconnect</Button>
        ) : (
          <>
            <Button disabled={isSubmitting} onClick={handleCancel}>Cancel</Button>
            <Button
              variant="primary"
              submit
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Verify & save
            </Button>
          </>
        )
      }
    >
      {!showForm ? (
        <>
          <DetailRow label="Status">
            <Badge tone="info">Not connected</Badge>
          </DetailRow>
          <DetailRow label="Store">
            <Text as="span" variant="bodyMd" tone="subdued">Connect your store review source</Text>
          </DetailRow>
          <DetailRow label="API key">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodyMd" tone="subdued">
                {showApiKey ? 'jm_live_82b7e3d1f9046c5a' : '••••••••••••••••••••••••'}
              </Text>
              <Button
                icon={showApiKey ? HideIcon : ViewIcon}
                variant="plain"
                accessibilityLabel={showApiKey ? 'Hide API key' : 'Show API key'}
                onClick={() => setShowApiKey(v => !v)}
              />
            </InlineStack>
          </DetailRow>
        </>
      ) : (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="verify-judgeme" />
          <Box paddingInline="400" paddingBlock="300">
            <BlockStack gap="400">
              <TextField
                label="API token"
                helpText="Find it in your Judge.me dashboard under Settings → General."
                type={showToken ? 'text' : 'password'}
                name="apiToken"
                value={apiToken}
                onChange={setApiToken}
                autoComplete="off"
                placeholder="jm_live_..."
                connectedRight={
                  <Button
                    icon={showToken ? HideIcon : ViewIcon}
                    accessibilityLabel={showToken ? 'Hide token' : 'Show token'}
                    onClick={() => setShowToken(v => !v)}
                  />
                }
              />
              {result && !result.success && (
                <Banner tone="critical">{result.error}</Banner>
              )}
              {result?.success && (
                <Banner tone="success">Connection verified successfully.</Banner>
              )}
            </BlockStack>
          </Box>
        </fetcher.Form>
      )}
    </SettingsPanel>
  );
}

function PlaceholderTab({index}) {
  const tab = tabs[index];
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">{tab?.content ?? 'Settings'}</Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          This section is ready for the next round of configuration work.
        </Text>
      </BlockStack>
    </Card>
  );
}

export default function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const [values, setValues] = useState({
    language: 'english',
    repliesPerPage: '20',
    showConfidence: true,
    showProductImages: true,
    helpCenterLink: false,
    useAiEmojis: true,
    retention: '12-months',
    timezone: 'est',
    dateFormat: 'mmm-d-yyyy',
  });

  function set(key, value) {
    setValues(prev => ({...prev, [key]: value}));
  }

  return (
    <BlockStack gap="400">
      <BlockStack gap="100">
        <Text as="h1" variant="heading2xl">Settings</Text>
        <Text as="p" variant="bodyLg" tone="subdued">Manage your preferences and integrations.</Text>
      </BlockStack>

      <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />

      {selectedTab === 0 ? (
        <BlockStack gap="400">
          <InlineGrid columns={{xs: 1, md: 2}} gap="400" alignItems="start">
            <BlockStack gap="400">
              <SettingsPanel
                title="General settings"
                description="Configure the basics of Igu."
              >
                <FieldRow label="Default reply language" description="The language used to generate AI replies.">
                  <Box minWidth="160px">
                    <Select label="Default reply language" labelHidden options={languageOptions} value={values.language} onChange={v => set('language', v)} />
                  </Box>
                </FieldRow>
                <FieldRow label="Replies per page" description="Number of reviews to display per page.">
                  <Box minWidth="160px">
                    <Select label="Replies per page" labelHidden options={repliesPerPageOptions} value={values.repliesPerPage} onChange={v => set('repliesPerPage', v)} />
                  </Box>
                </FieldRow>
                <FieldRow label="Show confidence score" description="Show confidence score for each AI reply.">
                  <SettingsSwitch label="Show confidence score" checked={values.showConfidence} onChange={v => set('showConfidence', v)} />
                </FieldRow>
                <FieldRow label="Show product images" description="Show product images in reviews.">
                  <SettingsSwitch label="Show product images" checked={values.showProductImages} onChange={v => set('showProductImages', v)} />
                </FieldRow>
                <FieldRow label="Link to help center" description="Add a help center link in your replies.">
                  <SettingsSwitch label="Link to help center" checked={values.helpCenterLink} onChange={v => set('helpCenterLink', v)} />
                </FieldRow>
                <FieldRow label="Use AI emojis" description="Allow AI to use emojis in replies when appropriate.">
                  <SettingsSwitch label="Use AI emojis" checked={values.useAiEmojis} onChange={v => set('useAiEmojis', v)} />
                </FieldRow>
              </SettingsPanel>

              <SettingsPanel title="Data & privacy" description="Control your data and how it's used.">
                <FieldRow label="Data retention" description="Choose how long we keep your data.">
                  <Box minWidth="160px">
                    <Select label="Data retention" labelHidden options={retentionOptions} value={values.retention} onChange={v => set('retention', v)} />
                  </Box>
                </FieldRow>
                <FieldRow label="Delete data" description="Permanently delete all data and history.">
                  <Button tone="critical" variant="secondary">Delete data</Button>
                </FieldRow>
              </SettingsPanel>
            </BlockStack>

            <BlockStack gap="400">
              <JudgeMeIntegrationPanel />

              <SettingsPanel title="Danger zone" description="Irreversible and advanced actions.">
                <DangerRow
                  title="Disconnect integration"
                  description="This will stop Igu from accessing your review data."
                  actionLabel="Disconnect"
                />
                <DangerRow
                  title="Delete all generated replies"
                  description="This will permanently delete all AI generated replies."
                  actionLabel="Delete all"
                />
              </SettingsPanel>

              <SettingsPanel title="Other settings" description="Additional preferences.">
                <FieldRow label="Timezone" description="Set the timezone for activity logs and reports.">
                  <Box minWidth="260px">
                    <Select label="Timezone" labelHidden options={timezoneOptions} value={values.timezone} onChange={v => set('timezone', v)} />
                  </Box>
                </FieldRow>
                <FieldRow label="Date format" description="Choose your preferred date format.">
                  <Box minWidth="260px">
                    <Select label="Date format" labelHidden options={dateFormatOptions} value={values.dateFormat} onChange={v => set('dateFormat', v)} />
                  </Box>
                </FieldRow>
              </SettingsPanel>
            </BlockStack>
          </InlineGrid>

          <InlineStack align="end">
            <Button variant="primary">Save changes</Button>
          </InlineStack>
        </BlockStack>
      ) : (
        <PlaceholderTab index={selectedTab} />
      )}
    </BlockStack>
  );
}
