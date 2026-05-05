export const defaultBrandVoice = {
  persona:
    "I keep replies warm, concise, and specific. I thank customers without sounding scripted, mention the exact detail they shared, and keep the tone human rather than corporate. When something goes wrong I acknowledge it directly, apologize without overexplaining, and point to the next practical step. I avoid exaggerated praise, generic customer-service phrases, and details that were not already provided.",
  greeting: 'Hi {name} -',
  signOff: '- The team',
};

export const defaultToneKeywords = [
  'warm',
  'a little playful',
  'not corporate',
];

export const defaultAvoidPhrases = [
  'reach out',
  'valued customer',
  'multiple emojis',
  'exclamation chains',
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
