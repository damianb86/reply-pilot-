import {useMemo, useState} from 'react';
import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Icon,
  InlineGrid,
  InlineStack,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  DeleteIcon,
  MagicIcon,
  PlusIcon,
  SaveIcon,
} from '@shopify/polaris-icons';
import {
  defaultAvoidPhrases,
  defaultBrandVoice,
  defaultToneKeywords,
  previewOptions,
} from '../brandVoiceData';

function BrandChip({label, tone, onRemove}) {
  return (
    <div className={`brand-chip is-${tone}`}>
      <span>{label}</span>
      <button
        type="button"
        className="brand-chip-delete"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <Icon source={DeleteIcon} tone="base" />
      </button>
    </div>
  );
}

function buildPreviewReply(option, greeting, signOff) {
  const safeGreeting = greeting.trim() || 'Thank you so much for your review';
  const safeSignOff = signOff.trim() || 'The team';
  return `${safeGreeting}${option.replyBody} — ${safeSignOff}`;
}

export default function BrandVoicePage() {
  const [persona, setPersona] = useState(defaultBrandVoice.persona);
  const [greeting, setGreeting] = useState(defaultBrandVoice.greeting);
  const [signOff, setSignOff] = useState(defaultBrandVoice.signOff);
  const [toneKeywords, setToneKeywords] = useState(defaultToneKeywords);
  const [avoidPhrases, setAvoidPhrases] = useState(defaultAvoidPhrases);
  const [toneInput, setToneInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');
  const [activePreviewKey, setActivePreviewKey] = useState(previewOptions[0].key);
  const [customerPreview, setCustomerPreview] = useState(previewOptions[0].customerText);

  const activePreview = useMemo(
    () => previewOptions.find((option) => option.key === activePreviewKey) ?? previewOptions[0],
    [activePreviewKey],
  );

  const previewReply = useMemo(
    () => buildPreviewReply(activePreview, greeting, signOff),
    [activePreview, greeting, signOff],
  );

  function addToneKeyword() {
    const nextValue = toneInput.trim();
    if (!nextValue || toneKeywords.includes(nextValue)) return;
    setToneKeywords((current) => [...current, nextValue]);
    setToneInput('');
  }

  function addAvoidPhrase() {
    const nextValue = avoidInput.trim();
    if (!nextValue || avoidPhrases.includes(nextValue)) return;
    setAvoidPhrases((current) => [...current, nextValue]);
    setAvoidInput('');
  }

  function selectPreview(option) {
    setActivePreviewKey(option.key);
    setCustomerPreview(option.customerText);
  }

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text as="h1" variant="heading2xl">Brand Voice</Text>
          <Text as="p" variant="bodyLg" tone="subdued">
            Train the AI to write replies that sound like you.
          </Text>
        </BlockStack>
        <Button icon={SaveIcon} tone="success" variant="primary" size="large">
          Save changes
        </Button>
      </InlineStack>

      <InlineGrid columns={{xs: 1, md: 2}} gap="400">
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingLg">Brand Persona</Text>
                <Text as="p" variant="bodyLg" tone="subdued">
                  Describe your brand personality in plain language.
                </Text>
              </BlockStack>
              <TextField
                label="Brand persona"
                labelHidden
                value={persona}
                onChange={setPersona}
                autoComplete="off"
                multiline={9}
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Greeting &amp; Sign-off</Text>
              <BlockStack gap="300">
                <TextField
                  label="Default greeting"
                  value={greeting}
                  onChange={setGreeting}
                  autoComplete="off"
                />
                <TextField
                  label="Sign-off"
                  value={signOff}
                  onChange={setSignOff}
                  autoComplete="off"
                />
              </BlockStack>
            </BlockStack>
          </Card>
        </BlockStack>

        <BlockStack gap="400">
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingLg">Tone Keywords</Text>
                <Text as="p" variant="bodyLg" tone="subdued">
                  Words that describe how your brand communicates.
                </Text>
              </BlockStack>
              <InlineStack gap="200" wrap>
                {toneKeywords.map((keyword) => (
                  <BrandChip
                    key={keyword}
                    label={keyword}
                    tone="tone"
                    onRemove={() => setToneKeywords((current) => current.filter((item) => item !== keyword))}
                  />
                ))}
              </InlineStack>
              <InlineStack gap="200" blockAlign="end">
                <div style={{flex: 1}}>
                  <TextField
                    label="Add tone keyword"
                    labelHidden
                    value={toneInput}
                    onChange={setToneInput}
                    autoComplete="off"
                    placeholder="Add tone..."
                  />
                </div>
                <Button icon={PlusIcon} accessibilityLabel="Add tone keyword" onClick={addToneKeyword} />
              </InlineStack>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingLg">Avoid</Text>
                <Text as="p" variant="bodyLg" tone="subdued">
                  Phrases or styles to exclude from replies.
                </Text>
              </BlockStack>
              <InlineStack gap="200" wrap>
                {avoidPhrases.map((phrase) => (
                  <BrandChip
                    key={phrase}
                    label={phrase}
                    tone="avoid"
                    onRemove={() => setAvoidPhrases((current) => current.filter((item) => item !== phrase))}
                  />
                ))}
              </InlineStack>
              <InlineStack gap="200" blockAlign="end">
                <div style={{flex: 1}}>
                  <TextField
                    label="Add avoid phrase"
                    labelHidden
                    value={avoidInput}
                    onChange={setAvoidInput}
                    autoComplete="off"
                    placeholder="Add phrase to avoid..."
                  />
                </div>
                <Button icon={PlusIcon} accessibilityLabel="Add avoid phrase" onClick={addAvoidPhrase} />
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </InlineGrid>

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Box background="bg-fill-magic-secondary" borderRadius="200" padding="200">
                <Icon source={MagicIcon} tone="base" />
              </Box>
              <Text as="h2" variant="headingLg">Preview</Text>
            </InlineStack>

            <ButtonGroup variant="segmented">
              {previewOptions.map((option) => (
                <Button
                  key={option.key}
                  pressed={option.key === activePreviewKey}
                  onClick={() => selectPreview(option)}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          </InlineStack>

          <InlineGrid columns={{xs: 1, md: 2}} gap="400">
            <BlockStack gap="100">
              <Text as="p" variant="bodyLg" tone="subdued">Customer wrote:</Text>
              <TextField
                label="Customer review preview"
                labelHidden
                value={customerPreview}
                onChange={setCustomerPreview}
                autoComplete="off"
                multiline={3}
              />
            </BlockStack>

            <BlockStack gap="100">
              <Text as="p" variant="bodyLg" tone="subdued">AI would reply:</Text>
              <Box background="bg-surface-secondary" borderRadius="200" padding="300">
                <Text as="p" variant="bodyMd">{previewReply}</Text>
              </Box>
            </BlockStack>
          </InlineGrid>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
