/* eslint-disable react/prop-types */
import {useEffect, useState} from 'react';
import {useFetcher} from 'react-router';
import {
  Banner,
  BlockStack,
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
  AutomationIcon,
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
  ThemeEditIcon,
  WandIcon,
  WorkIcon,
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

const benefitIconMap = {
  Customize: ThemeEditIcon,
  Build: WorkIcon,
  Create: WandIcon,
  Experts: AutomationIcon,
};

const quickLinkToneMap = {
  book: 'blue',
  lightbulb: 'yellow',
  faq: 'purple',
  support: 'green',
};

function HelpIcon({source, tone = 'blue', size = 'md'}) {
  return (
    <span className={`rp-help-icon is-${tone} is-${size}`}>
      <Icon source={source} tone="base" />
    </span>
  );
}

function HelpQuickCard({item, onAction}) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack gap="300" blockAlign="start" wrap={false}>
          <HelpIcon source={quickLinkIconMap[item.icon]} tone={quickLinkToneMap[item.icon]} />
          <BlockStack gap="100">
            <Text as="h2" variant="headingLg">{item.title}</Text>
            <Text as="p" variant="bodyMd" tone="subdued">{item.description}</Text>
          </BlockStack>
        </InlineStack>
        <Button onClick={onAction}>{item.actionLabel}</Button>
      </BlockStack>
    </Card>
  );
}

function HelpResourceRow({item}) {
  return (
    <button type="button" className="rp-help-resource">
      <HelpIcon source={resourceIconMap[item.icon]} tone="blue" />
      <span>
        <Text as="span" variant="bodyMd" fontWeight="semibold">{item.title}</Text>
        <Text as="p" variant="bodyMd" tone="subdued">{item.description}</Text>
      </span>
      <Icon source={ChevronRightIcon} tone="subdued" />
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
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">Help</Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            Setup guidance, support, and custom workflow requests for Reply Pilot.
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
        <InlineGrid columns={{xs: 1, md: 2}} gap="500" alignItems="center">
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <HelpIcon source={CodeIcon} tone="red" />
              <Text as="span" variant="bodySm" fontWeight="semibold" tone="critical">CUSTOM DEVELOPMENT</Text>
            </InlineStack>

            <BlockStack gap="100">
              <Text as="h2" variant="heading2xl">Need something custom?</Text>
              <Text as="p" variant="bodyLg" tone="subdued">
                We can tailor Reply Pilot to your queue, build custom Shopify app flows, and connect review operations to the rest of your merchant workflow.
              </Text>
            </BlockStack>

            <BlockStack gap="250">
              {helpHeroBenefits.map((benefit) => (
                <div key={benefit.title} className="rp-help-benefit">
                  <HelpIcon source={benefitIconMap[benefit.title] ?? CheckCircleIcon} tone="green" size="sm" />
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">{benefit.title}</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">{benefit.description}</Text>
                  </BlockStack>
                </div>
              ))}
            </BlockStack>

            <InlineStack gap="200">
              <Button variant="primary" onClick={() => setOpenModal('customization')}>Book a consultation</Button>
              <Button onClick={() => setOpenModal('customization')}>Request custom work</Button>
            </InlineStack>
          </BlockStack>

          <div className="rp-empty-state-card is-compact">
            <BlockStack gap="300" align="center">
              <span className="rp-empty-mark is-blue">
                <Icon source={ClipboardChecklistIcon} tone="base" />
              </span>
              <Text as="h3" variant="headingLg" alignment="center">Implementation checklist</Text>
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                Connect Judge.me, train brand voice, approve the first batch, then tune rules from Settings.
              </Text>
            </BlockStack>
          </div>
        </InlineGrid>
      </Card>

      <InlineGrid columns={{xs: 1, sm: 2, md: 4}} gap="300">
        {helpQuickLinks.map((item) => (
          <HelpQuickCard
            key={item.title}
            item={item}
            onAction={() => item.icon === 'support' ? setOpenModal('support') : undefined}
          />
        ))}
      </InlineGrid>

      <InlineGrid columns={{xs: 1, md: 2}} gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack gap="300" blockAlign="center">
              <HelpIcon source={BookOpenIcon} tone="blue" />
              <BlockStack gap="050">
                <Text as="h2" variant="headingLg">Resources</Text>
                <Text as="p" variant="bodyMd" tone="subdued">Documentation, tutorials, and updates.</Text>
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
          <BlockStack gap="300">
            <InlineStack gap="300" blockAlign="center">
              <HelpIcon source={StarIcon} tone="purple" />
              <BlockStack gap="050">
                <Text as="h2" variant="headingLg">Request a feature</Text>
                <Text as="p" variant="bodyMd" tone="subdued">Help shape the review workflow roadmap.</Text>
              </BlockStack>
            </InlineStack>
            <BlockStack gap="200">
              {helpFeatureBullets.map((item) => (
                <div key={item} className="rp-help-benefit">
                  <HelpIcon source={CheckCircleIcon} tone="green" size="sm" />
                  <Text as="p" variant="bodyMd" tone="subdued">{item}</Text>
                </div>
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
