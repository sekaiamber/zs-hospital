import path from 'path'

import { DBClient } from './db'
import anthropicService from './service/anthropic.service'
import {
  analyzeDataWithAI,
  bulkUpdateArticleHTML,
  checkCleanedHTMLHasContent,
  cleanupArticleHTML,
  getArticleContent,
  outputArtiles,
  updateArticleHTMLStatic,
} from './service/article.service'
import { headlessBrowserService } from './service/headless.service'
import importAnthropicKey from './utils/importAnthropicKey'
import { importArticles } from './utils/importSource'

async function scrapePages() {
  const url =
    'http://mp.weixin.qq.com/s?__biz=MzA4OTExMjQ5OQ==&mid=2649578145&idx=1&sn=035f0c36e58e43d8f1d00f8a74d812c0&chksm=893f18d02dcec2778165e9396c285fc3747bb916725032ae28c1f8df4d53472c50e315a3ac33&scene=126&sessionid=0#rd'
  const html = await headlessBrowserService.scrapePage(url, {
    timeout: 30000,
    waitUntil: 'networkidle2',
    waitForTime: 2000,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    waitForSelector: '.rich_media_content',
  })
  // console.log(html)
}

async function updateArticlesHTML() {
  const article = await DBClient.instance.article.findMany({
    where: {
      html: '',
      locked: false,
      category: '健康科普类',
      id: { lt: 130 },
    },
    take: 4,
  })
  if (!article) {
    console.log('No article to update')
    return
  }
  const startedAt = Date.now()
  await bulkUpdateArticleHTML(article.map((a) => a.id))
  console.log(`Updated articles ${article.map((a) => a.id)}, cost ${((Date.now() - startedAt) / 1000).toFixed(2)}s`)

  return await updateArticlesHTML()
}

async function cleanHTML() {
  for (let i = 1; i < 130; i++) {
    const cleanedHTML = await cleanupArticleHTML(i)
    console.log(`${i} done`)
  }
}

async function checkContent() {
  for (let i = 1; i < 130; i++) {
    await checkCleanedHTMLHasContent(i)
  }
}

async function testClaude(id: number) {
  return await analyzeDataWithAI(id)
}

async function analyze() {
  const article = await DBClient.instance.article.findFirst({
    where: {
      aiResponse: null,
      locked: false,
      category: '健康科普类',
      id: { lt: 130 },
    },
  })

  const id = article?.id
  if (!id) {
    console.log('No article to analyze')
    process.exit(0)
    return
  }
  try {
    const json = await analyzeDataWithAI(id)
    console.log(`${id} done:`)
    console.log(json)
  } catch (error) {
    console.log(`${id} error:`)
    console.log(error)
  }

  return await analyze()
}

async function updateHTMLStatic() {
  // await updateArticleHTMLStatic(1)
  for (let i = 1; i < 130; i++) {
    await updateArticleHTMLStatic(i)
    console.log(`${i} done`)
  }
}

async function output() {
  const article = await DBClient.instance.article.findMany({
    where: {
      id: { lt: 130 },
    },
  })
  await outputArtiles(article, path.join(__dirname, '../output/articles.csv'))
}

async function main() {
  // await importArticles()
  // await importAnthropicKey()
  // await updateArticlesHTML()
  // await cleanHTML()
  // await checkContent()
  // await testClaude(1)
  // await analyze()
  // await updateHTMLStatic()
  await output()
}

main().catch(console.error)
