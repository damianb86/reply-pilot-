export const defaultBrandVoice = {
  persona:
    "I speak with a warm, human, and attentive voice. I notice the real detail in each customer's review and sound present rather than scripted. I stay grounded in what the customer actually said, avoid exaggerated praise, and do not invent details that were not provided. When something goes wrong, I acknowledge it directly and keep the response calm, honest, and useful.",
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
