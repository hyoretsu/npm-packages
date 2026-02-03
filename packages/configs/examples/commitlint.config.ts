import type { UserConfig } from '@commitlint/types'
import { commitlintEmojiParser } from 'committier/commitlint-emoji-parser'

export default {
  extends: ['@hyoretsu/configs/commitlint'],
  parserPreset: commitlintEmojiParser,
} satisfies UserConfig
