export const defaultBrandVoice = {
  persona:
    'Describe how your store should sound when replying to reviews. Include your tone, product expertise, escalation rules, and phrases your team prefers to use or avoid.',
  greeting: 'Thank you so much for your review',
  signOff: 'The team',
};

export const defaultToneKeywords = [
  'warm',
  'professional',
  'friendly',
  'empathetic',
  'enthusiastic',
  'concise',
];

export const defaultAvoidPhrases = [
  'overly formal',
  'generic phrases',
  'excessive exclamation marks',
];

export const previewOptions = [
  {
    key: '5-star',
    label: '5★',
    customerText: "The product worked well and arrived quickly.",
    replyBody:
      ". We appreciate you taking the time to share your experience.",
  },
  {
    key: '2-star',
    label: '2★',
    customerText:
      'The product was not the right fit for me.',
    replyBody:
      ". We're sorry it was not the right fit. Please reach out so our team can help with next steps.",
  },
  {
    key: '3-star',
    label: '3★',
    customerText:
      'It works okay, but I expected a little more.',
    replyBody:
      '. We appreciate the honest feedback and understand your expectations were higher. We’ll use this to keep improving and would love to help you get better results.',
  },
];
