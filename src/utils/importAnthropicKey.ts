import { DBClient } from '../db'

export default async function importAnthropicKey() {
  const key = process.env.ANTHROPIC_API_KEY

  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  await DBClient.instance.constant.upsert({
    where: {
      name: 'anthropic_api_key',
    },
    update: {
      value: key,
    },
    create: {
      name: 'anthropic_api_key',
      value: key,
    },
  })
}
