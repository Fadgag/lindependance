export const campaignReviewChoiceValues = {
  clarity: ['VERY_CLEAR', 'MOSTLY_CLEAR', 'SOMEWHAT_UNCLEAR', 'NOT_CLEAR'],
  duration: ['TOO_SHORT', 'ABOUT_RIGHT', 'TOO_LONG'],
  links: ['VERY_USEFUL', 'SOMEWHAT_USEFUL', 'NOT_USEFUL', 'NOT_USED'],
  satisfaction: ['VERY_SATISFIED', 'SATISFIED', 'SOMEWHAT_DISSATISFIED', 'NOT_SATISFIED'],
} as const

export const campaignReviewChoiceLabels = {
  clarity: {
    VERY_CLEAR: 'Très compréhensibles',
    MOSTLY_CLEAR: 'Plutôt compréhensibles',
    SOMEWHAT_UNCLEAR: 'Plutôt difficiles à comprendre',
    NOT_CLEAR: 'Incompréhensibles',
  },
  duration: {
    TOO_SHORT: 'Trop courte',
    ABOUT_RIGHT: 'Adaptée',
    TOO_LONG: 'Trop longue',
  },
  links: {
    VERY_USEFUL: 'Oui, très utiles',
    SOMEWHAT_USEFUL: 'Un peu',
    NOT_USEFUL: 'Pas vraiment',
    NOT_USED: 'Je ne les ai pas utilisés',
  },
  satisfaction: {
    VERY_SATISFIED: 'Très satisfaisante',
    SATISFIED: 'Plutôt satisfaisante',
    SOMEWHAT_DISSATISFIED: 'Peu satisfaisante',
    NOT_SATISFIED: 'Pas du tout satisfaisante',
  },
} as const

export type CampaignReviewChoiceValues = typeof campaignReviewChoiceValues
export type CampaignReviewChoice = {
  [Question in keyof CampaignReviewChoiceValues]: CampaignReviewChoiceValues[Question][number]
}
