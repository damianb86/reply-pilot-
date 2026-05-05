/* eslint-disable react/prop-types */
import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Icon,
  InlineGrid,
  InlineStack,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ConnectIcon,
  HideIcon,
  RefreshIcon,
  ViewIcon,
} from '@shopify/polaris-icons';

const settingsNav = ['Connections', 'Auto-reply rules', 'Notifications', 'Data & privacy', 'Plan & billing'];

const confidenceOptions = [
  {label: '85% and above', value: '85'},
  {label: '90% and above', value: '90'},
  {label: '95% and above', value: '95'},
];

const retentionOptions = [
  {label: '12 months', value: '12-months'},
  {label: '24 months', value: '24-months'},
  {label: 'Forever', value: 'forever'},
];

const timezoneOptions = [
  {label: '(GMT-03:00) Buenos Aires', value: 'america-argentina-cordoba'},
  {label: '(GMT-05:00) Eastern Time', value: 'eastern'},
  {label: '(GMT+00:00) UTC', value: 'utc'},
];

function SettingsSwitch({checked, label, onChange}) {
  return (
    <Checkbox label={label} labelHidden checked={checked} onChange={onChange} />
  );
}

function FieldRow({label, description, children}) {
  return (
    <div className="rp-field-row">
      <InlineStack align="space-between" blockAlign="center" gap="400" wrap={false}>
        <BlockStack gap="050">
          <Text as="p" variant="bodyMd" fontWeight="semibold">{label}</Text>
          {description ? <Text as="p" variant="bodyMd" tone="subdued">{description}</Text> : null}
        </BlockStack>
        <Box>{children}</Box>
      </InlineStack>
    </div>
  );
}

function SectionCard({title, description, children, action}) {
  return (
    <Card padding="0">
      <Box padding="400">
        <InlineStack align="space-between" blockAlign="start" gap="300">
          <BlockStack gap="100">
            <Text as="h2" variant="headingLg">{title}</Text>
            <Text as="p" variant="bodyMd" tone="subdued">{description}</Text>
          </BlockStack>
          {action}
        </InlineStack>
      </Box>
      <BlockStack gap="0">{children}</BlockStack>
    </Card>
  );
}

function JudgeMeIntegrationPanel() {
  const fetcher = useFetcher();
  const [showForm, setShowForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [resultVisible, setResultVisible] = useState(false);
  const wasSubmitting = useRef(false);

  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.state === 'submitting') wasSubmitting.current = true;
    if (wasSubmitting.current && fetcher.state === 'idle' && fetcher.data !== undefined) {
      wasSubmitting.current = false;
      setResultVisible(true);
      if (fetcher.data?.success) setShowForm(false);
    }
  }, [fetcher.state, fetcher.data]);

  const result = resultVisible ? fetcher.data : undefined;

  if (showForm) {
    return (
      <SectionCard
        title="Judge.me connection"
        description="Verify a Judge.me API token before importing reviews."
      >
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="verify-judgeme" />
          <Box padding="400">
            <BlockStack gap="400">
              <TextField
                label="API token"
                helpText="Find it in Judge.me under Settings > General."
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
                    onClick={() => setShowToken((value) => !value)}
                  />
                }
              />
              {result && !result.success ? <Banner tone="critical">{result.error}</Banner> : null}
              {result?.success ? <Banner tone="success">Connection verified successfully.</Banner> : null}
              <InlineStack align="end" gap="200">
                <Button disabled={isSubmitting} onClick={() => setShowForm(false)}>Cancel</Button>
                <Button variant="primary" submit loading={isSubmitting} disabled={isSubmitting}>
                  Verify & save
                </Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </fetcher.Form>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Judge.me connection"
      description="Judge.me is the first supported source. Other integrations are queued by vote."
      action={<Button icon={ConnectIcon} onClick={() => setShowForm(true)}>Connect</Button>}
    >
      <FieldRow label="Status" description="No production source is connected yet.">
        <Badge tone="attention">Not connected</Badge>
      </FieldRow>
      <FieldRow label="Store" description="Connect your Shopify store review source.">
        <Text as="span" variant="bodyMd" tone="subdued">Waiting for token</Text>
      </FieldRow>
      <FieldRow label="API key" description="Stored encrypted after verification.">
        <InlineStack gap="200" blockAlign="center">
          <Text as="span" variant="bodyMd" tone="subdued">
            {showApiKey ? 'jm_live_82b7e3d1f9046c5a' : '••••••••••••••••••••••••'}
          </Text>
          <Button
            icon={showApiKey ? HideIcon : ViewIcon}
            variant="plain"
            accessibilityLabel={showApiKey ? 'Hide API key' : 'Show API key'}
            onClick={() => setShowApiKey((value) => !value)}
          />
        </InlineStack>
      </FieldRow>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState(settingsNav[0]);
  const [values, setValues] = useState({
    autoApprove: false,
    humanLowConfidence: true,
    notifyCritical: true,
    notifyDailyDigest: true,
    confidenceThreshold: '90',
    retention: '12-months',
    timezone: 'america-argentina-cordoba',
  });

  function set(key, value) {
    setValues((current) => ({...current, [key]: value}));
  }

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">Settings</Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            Configure sources, approval behavior, notifications, and account controls.
          </Text>
        </BlockStack>
        <Button icon={RefreshIcon}>Sync settings</Button>
      </InlineStack>

      <div className="rp-settings-layout">
        <aside className="rp-settings-nav" aria-label="Settings sections">
          <BlockStack gap="150">
            <Text as="p" variant="bodySm" tone="subdued" fontWeight="semibold">SETTINGS</Text>
            {settingsNav.map((item) => (
              <button
                key={item}
                type="button"
                className={`rp-settings-nav-item ${activeSection === item ? 'is-active' : ''}`}
                onClick={() => setActiveSection(item)}
              >
                {item}
              </button>
            ))}
          </BlockStack>
        </aside>

        <BlockStack gap="400">
          {activeSection === 'Connections' ? (
            <>
              <JudgeMeIntegrationPanel />
              <InlineGrid columns={{xs: 1, md: 2}} gap="400">
                <Card>
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={CheckCircleIcon} tone="success" />
                      <Text as="h2" variant="headingLg">Source permissions</Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Reply Pilot needs read access to import reviews and write access only when a merchant approves a reply.
                    </Text>
                    <InlineStack gap="200">
                      <Badge>Read reviews</Badge>
                      <Badge>Write approved replies</Badge>
                    </InlineStack>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={AlertTriangleIcon} tone="critical" />
                      <Text as="h2" variant="headingLg">Disconnect</Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Disconnecting stops imports and disables sending until a source is connected again.
                    </Text>
                    <Button tone="critical">Disconnect integration</Button>
                  </BlockStack>
                </Card>
              </InlineGrid>
            </>
          ) : null}

          {activeSection === 'Auto-reply rules' ? (
            <SectionCard
              title="Auto-reply rules"
              description="Keep approval human-led by default, with explicit thresholds for future automation."
            >
              <FieldRow label="Auto-approve high-confidence replies" description="Send automatically only when confidence clears the selected threshold.">
                <SettingsSwitch label="Auto-approve high-confidence replies" checked={values.autoApprove} onChange={(value) => set('autoApprove', value)} />
              </FieldRow>
              <FieldRow label="High-confidence threshold" description="Drafts below this value stay in the manual approval queue.">
                <Box minWidth="180px">
                  <Select label="High-confidence threshold" labelHidden options={confidenceOptions} value={values.confidenceThreshold} onChange={(value) => set('confidenceThreshold', value)} />
                </Box>
              </FieldRow>
              <FieldRow label="Route low-confidence reviews to human" description="Flag angry, refund, delivery, and low-confidence reviews before sending.">
                <SettingsSwitch label="Route low-confidence reviews to human" checked={values.humanLowConfidence} onChange={(value) => set('humanLowConfidence', value)} />
              </FieldRow>
            </SectionCard>
          ) : null}

          {activeSection === 'Notifications' ? (
            <SectionCard
              title="Notifications"
              description="Control when the merchant gets pulled back into the queue."
            >
              <FieldRow label="Critical review alerts" description="Notify when a review needs human handling.">
                <SettingsSwitch label="Critical review alerts" checked={values.notifyCritical} onChange={(value) => set('notifyCritical', value)} />
              </FieldRow>
              <FieldRow label="Daily digest" description="Send a summary of pending, sent, and edited replies.">
                <SettingsSwitch label="Daily digest" checked={values.notifyDailyDigest} onChange={(value) => set('notifyDailyDigest', value)} />
              </FieldRow>
            </SectionCard>
          ) : null}

          {activeSection === 'Data & privacy' ? (
            <SectionCard
              title="Data & privacy"
              description="Set retention and timezone for review activity and audit logs."
            >
              <FieldRow label="Data retention" description="Choose how long Reply Pilot keeps generated reply history.">
                <Box minWidth="180px">
                  <Select label="Data retention" labelHidden options={retentionOptions} value={values.retention} onChange={(value) => set('retention', value)} />
                </Box>
              </FieldRow>
              <FieldRow label="Timezone" description="Used for sync times, sent states, and logs.">
                <Box minWidth="260px">
                  <Select label="Timezone" labelHidden options={timezoneOptions} value={values.timezone} onChange={(value) => set('timezone', value)} />
                </Box>
              </FieldRow>
              <FieldRow label="Delete generated replies" description="Permanently delete generated replies and audit history.">
                <Button tone="critical">Delete data</Button>
              </FieldRow>
            </SectionCard>
          ) : null}

          {activeSection === 'Plan & billing' ? (
            <SectionCard
              title="Plan & billing"
              description="Usage is based on generated drafts and approved sends."
            >
              <FieldRow label="Current plan" description="Production mode, human approval required.">
                <Badge tone="info">Pilot</Badge>
              </FieldRow>
              <FieldRow label="Quota" description="Reply Pilot quota is used unless a custom model key is configured.">
                <Text as="span" variant="bodyMd">0 / 1,000 drafts</Text>
              </FieldRow>
              <FieldRow label="Billing">
                <Button>Manage plan</Button>
              </FieldRow>
            </SectionCard>
          ) : null}
        </BlockStack>
      </div>
    </BlockStack>
  );
}
