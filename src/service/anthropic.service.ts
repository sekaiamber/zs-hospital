import Anthropic from '@anthropic-ai/sdk'
import { MessageParam } from '@anthropic-ai/sdk/resources/messages'

import { DBClient } from '../db'

async function getAnthropicClient() {
  const key = await DBClient.instance.constant.findUnique({
    where: {
      name: 'anthropic_api_key',
    },
  })

  if (!key) {
    throw new Error('Anthropic API key not found')
  }

  return new Anthropic({
    apiKey: key.value,
  })
}

interface PostQueryOptions {
  model?: string
  system?: string
  maxTokens?: number
}

async function postQuery(query: string, prevMessages: MessageParam[] = [], options: PostQueryOptions = {}) {
  const messages: MessageParam[] = [
    ...prevMessages,
    {
      role: 'user',
      content: query,
    },
  ]

  const client = await getAnthropicClient()

  const response = await client.messages.create({
    model: options.model || 'claude-3-7-sonnet-20250219',
    max_tokens: options.maxTokens || 5000,
    messages,
    system: options.system || '',
    // tools: this.tools,
  })

  return response
}

const anthropicService = {
  postQuery,
}

export default anthropicService
