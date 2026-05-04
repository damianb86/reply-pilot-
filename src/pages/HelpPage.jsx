import {useEffect, useState} from 'react';
import {useFetcher} from 'react-router';
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineGrid,
  InlineStack,
  Modal,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  BookOpenIcon,
  ChatIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardChecklistIcon,
  CodeIcon,
  EmailIcon,
  LightbulbIcon,
  PageIcon,
  PlayCircleIcon,
  QuestionCircleIcon,
  StarIcon,
} from '@shopify/polaris-icons';
import {
  helpFeatureBullets,
  helpHeroBenefits,
  helpQuickLinks,
  helpResources,
} from '../helpData';

const quickLinkIconMap = {
  book: BookOpenIcon,
  lightbulb: LightbulbIcon,
  faq: QuestionCircleIcon,
  support: EmailIcon,
};

const resourceIconMap = {
  video: PlayCircleIcon,
  'book-open': BookOpenIcon,
  changelog: PageIcon,
  code: CodeIcon,
};

function HelpHeroVisual() {
  return (
    <div className="help-hero-visual" aria-hidden="true">
      <span className="help-spark spark-one" />
      <span className="help-spark spark-two" />
      <span className="help-spark spark-three" />
      <span className="help-spark spark-four" />

      <div className="help-hero-code-chip">
        <Icon source={CodeIcon} tone="subdued" />
      </div>

      <div className="help-browser-window">
        <div className="help-browser-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="help-browser-toolbar" />
        <div className="help-browser-card">
          <div className="help-browser-avatar" />
          <div className="help-browser-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="help-puzzle-block help-puzzle-back">
        <div className="help-puzzle-badge">S</div>
      </div>
      <div className="help-puzzle-block help-puzzle-front" />
      <div className="help-gear-badge">⚙</div>
    </div>
  );
}

function HelpQuickCard({item}) {
  return (
    <Card>
      <BlockStack gap="300">
        <div className={`help-quick-icon is-${item.tone}`}>
          <Icon source={quickLinkIconMap[item.icon]} tone="base" />
        </div>
        <BlockStack gap="100">
          <Text as="h2" variant="headingLg">{item.title}</Text>
          <Text as="p" variant="bodyLg" tone="subdued">{item.description}</Text>
        </BlockStack>
        <Button>{item.actionLabel}</Button>
      </BlockStack>
    </Card>
  );
}

function HelpResourceRow({item}) {
  return (
    <button type="button" className="help-resource-row">
      <span className="help-resource-icon">
        <Icon source={resourceIconMap[item.icon]} tone="base" />
      </span>
      <span className="help-resource-copy">
        <Text as="span" variant="bodyMd" fontWeight="semibold">{item.title}</Text>
        <Text as="span" variant="bodyMd" tone="subdued">{item.description}</Text>
      </span>
      <span className="help-resource-arrow">
        <Icon source={ChevronRightIcon} tone="subdued" />
      </span>
    </button>
  );
}

export default function HelpPage() {
  const fetcher = useFetcher();
  const [openModal, setOpenModal] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [dismissedResult, setDismissedResult] = useState(false);

  const isSubmitting = fetcher.state !== 'idle';
  const result = !dismissedResult && fetcher.data?.intent === 'contact' ? fetcher.data : null;
  const activeModal = openModal
    ? {
        support: {
          title: 'Contact support',
          type: 'support',
          messageLabel: 'How can we help?',
          primary: 'Send message',
        },
        customization: {
          title: 'Request customization',
          type: 'customization',
          messageLabel: 'What should we build or adapt?',
          primary: 'Send request',
        },
        suggestion: {
          title: 'Suggest an improvement',
          type: 'suggestion',
          messageLabel: 'What should we add or improve?',
          primary: 'Send suggestion',
        },
      }[openModal]
    : null;

  function closeModal() {
    setOpenModal(null);
    setSubject('');
    setMessage('');
    setEmail('');
  }

  useEffect(() => {
    if (fetcher.state === 'idle' && result?.ok) {
      closeModal();
    }
  }, [fetcher.state, result?.ok]);

  function submitContact() {
    if (!activeModal || !message.trim()) return;

    const formData = new FormData();
    formData.set('type', activeModal.type);
    formData.set('subject', subject || activeModal.title);
    formData.set('message', message);
    formData.set('email', email);
    setDismissedResult(false);
    fetcher.submit(formData, {method: 'post'});
  }

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">Help</Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            Find guides, FAQs, support, and expert help.
          </Text>
        </BlockStack>
        <Button icon={ChatIcon} onClick={() => setOpenModal('support')}>Contact support</Button>
      </InlineStack>

      {result ? (
        <Banner tone={result.ok ? 'success' : 'critical'} onDismiss={() => setDismissedResult(true)}>
          {result.message}
        </Banner>
      ) : null}

      <Card>
        <InlineStack align="space-between" blockAlign="start" gap="400" wrap={false}>
          <BlockStack gap="400">
            <Box
              background="bg-fill-info-secondary"
              borderRadius="full"
              borderWidth="025"
              borderColor="border-info"
              paddingBlock="100"
              paddingInline="300"
            >
              <InlineStack gap="100" blockAlign="center">
                <Icon source={CodeIcon} tone="base" />
                <Text as="span" variant="bodySm" fontWeight="semibold">CUSTOM DEVELOPMENT</Text>
              </InlineStack>
            </Box>

            <BlockStack gap="100">
              <Text as="h2" variant="heading2xl">Need something custom?</Text>
              <Text as="p" variant="bodyLg" tone="subdued">
                We can tailor Igu to your workflow, build custom Shopify apps, and develop
                specific features for your store with help from Shopify experts.
              </Text>
            </BlockStack>

            <BlockStack gap="300">
              {helpHeroBenefits.map((benefit) => (
                <InlineStack key={benefit.title} gap="200" blockAlign="start">
                  <Box paddingBlockStart="050">
                    <Icon source={CheckCircleIcon} tone="success" />
                  </Box>
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">{benefit.title}</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">{benefit.description}</Text>
                  </BlockStack>
                </InlineStack>
              ))}
            </BlockStack>

            <InlineStack gap="200">
              <Button variant="primary" onClick={() => setOpenModal('customization')}>Book a consultation</Button>
              <Button onClick={() => setOpenModal('customization')}>Request custom work</Button>
            </InlineStack>
          </BlockStack>

          <HelpHeroVisual />
        </InlineStack>
      </Card>

      <InlineGrid columns={{xs: 1, sm: 2, md: 4}} gap="300">
        {helpQuickLinks.map((item) => (
          <HelpQuickCard key={item.title} item={item} />
        ))}
      </InlineGrid>

      <InlineGrid columns={{xs: 1, md: 2}} gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="300" blockAlign="center">
              <div className="help-panel-icon is-purple-soft">
                <Icon source={ClipboardChecklistIcon} tone="base" />
              </div>
              <BlockStack gap="050">
                <Text as="h2" variant="headingLg">Resources</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Explore documentation, tutorials, and updates to help you succeed.
                </Text>
              </BlockStack>
            </InlineStack>
            <BlockStack gap="0">
              {helpResources.map((item) => (
                <HelpResourceRow key={item.title} item={item} />
              ))}
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <InlineStack gap="300" blockAlign="center">
              <div className="help-panel-icon is-red-soft">
                <Icon source={StarIcon} tone="base" />
              </div>
              <BlockStack gap="050">
                <Text as="h2" variant="headingLg">Request a feature</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Have an idea to make Igu even better? We'd love to hear it.
                </Text>
              </BlockStack>
            </InlineStack>
            <BlockStack gap="200">
              {helpFeatureBullets.map((item) => (
                <InlineStack key={item} gap="200" blockAlign="center">
                  <Icon source={CheckCircleIcon} tone="success" />
                  <Text as="p" variant="bodyLg" tone="subdued">{item}</Text>
                </InlineStack>
              ))}
            </BlockStack>
            <Button onClick={() => setOpenModal('suggestion')}>Submit a request</Button>
          </BlockStack>
        </Card>
      </InlineGrid>

      <Modal
        open={Boolean(activeModal)}
        onClose={closeModal}
        title={activeModal?.title ?? 'Contact'}
        primaryAction={{
          content: activeModal?.primary ?? 'Send',
          onAction: submitContact,
          loading: isSubmitting,
          disabled: isSubmitting || !message.trim(),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: closeModal,
            disabled: isSubmitting,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <TextField
              label="Subject"
              value={subject}
              onChange={setSubject}
              autoComplete="off"
            />
            <TextField
              label={activeModal?.messageLabel ?? 'Message'}
              value={message}
              onChange={setMessage}
              multiline={5}
              autoComplete="off"
            />
            <TextField
              label="Reply email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            {result && !result.ok ? <Banner tone="critical">{result.message}</Banner> : null}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}
