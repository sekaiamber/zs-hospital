import { Article } from '@prisma/client'
import * as cheerio from 'cheerio'
import fs from 'fs'

import { DBClient } from '../db'
import { cleanupHTML } from '../utils/htmlCleaner'
import anthropicService from './anthropic.service'
import { headlessBrowserService } from './headless.service'

export async function updateArticleHTML(id: number) {
  const article = await DBClient.instance.article.findUnique({
    where: { id },
  })
  if (!article) {
    throw new Error('Article not found')
  }
  if (article.locked) {
    console.log(`Article ${id} is locked`)
    return
  }
  if (article.html) {
    console.log(`Article ${id} already has html`)
    return
  }

  await DBClient.instance.article.update({
    where: { id: article.id },
    data: { locked: true },
  })
  try {
    const link = article.link
    const html = await headlessBrowserService.scrapePage(link, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
      waitForTime: 2000,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      waitForSelector: '.rich_media_content',
    })
    await DBClient.instance.article.update({
      where: { id: article.id },
      data: { html, locked: false },
    })
  } catch (error) {
    console.log(`Failed to update article ${id} html: ${error instanceof Error ? error.message : 'Unknown error'}`)
    await DBClient.instance.article.update({
      where: { id: article.id },
      data: { locked: false },
    })
  }
}

export async function bulkUpdateArticleHTML(ids: number[]) {
  const articles = await DBClient.instance.article.findMany({
    where: { id: { in: ids }, locked: false, html: '' },
  })
  if (!articles || articles.length === 0) {
    console.log('No article to update')
    return
  }

  const idsNeedUpdate = articles.map((article) => article.id)

  await DBClient.instance.article.updateMany({
    where: { id: { in: idsNeedUpdate } },
    data: { locked: true },
  })

  try {
    const htmls = await headlessBrowserService.scrapePages(
      articles.map((article) => article.link),
      {
        timeout: 60000,
        waitUntil: 'domcontentloaded',
        waitForTime: 1000,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        waitForSelector: '.rich_media_content',
      },
    )
    for (const [index, html] of htmls.entries()) {
      await DBClient.instance.article.update({
        where: { id: idsNeedUpdate[index] },
        data: { html, locked: false },
      })
    }
  } catch (error) {
    console.log(`Failed to update articles html: ${error instanceof Error ? error.message : 'Unknown error'}`)
    await DBClient.instance.article.updateMany({
      where: { id: { in: idsNeedUpdate } },
      data: { locked: false },
    })
  }
}

export async function cleanupArticleHTML(id: number) {
  const article = await DBClient.instance.article.findUnique({
    where: { id },
  })
  if (!article) {
    console.log(`Article ${id} not found`)
    return
  }
  if (article.locked) {
    console.log(`Article ${id} is locked`)
    return
  }
  if (!article.html) {
    console.log(`Article ${id} has no html`)
    return
  }

  const html = article.html
  const cleanedHTML = cleanupHTML(html)

  const $ = cheerio.load(cleanedHTML)
  const $title = $('.rich_media_title')
  const $meta = $('#meta_content')
  const $content = $('.rich_media_content')

  const $body = $('body')
  $body.empty()

  $title.appendTo($body)
  $title.attr('data-title', '')
  $meta.appendTo($body)
  $meta.attr('data-meta', '')
  $content.appendTo($body)
  $content.attr('data-content', '')

  const adCleanedHTML = $('html')
    .html()
    ?.replace(/leaf=""/gi, '')
    .replace(/nodeleaf=""/gi, '')
    .replace(/class=""/gi, '')
    .replace(/\s+class\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+id\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+role\s*=\s*["'][^"']*["']/gi, '')

  await DBClient.instance.article.update({
    where: { id },
    data: { cleanedHtml: `<html>${adCleanedHTML}</html>` },
  })
  return cleanedHTML
}

export interface ArticleContent {
  title: string
  content: string
}

export async function getArticleContent(id: number): Promise<ArticleContent> {
  const article = await DBClient.instance.article.findUnique({
    where: { id },
  })
  if (!article) {
    throw new Error(`Article ${id} not found`)
  }
  if (article.locked) {
    throw new Error(`Article ${id} is locked`)
  }
  if (!article.html) {
    throw new Error(`Article ${id} has no html`)
  }

  const cleanedHTML = article.cleanedHtml
  if (!cleanedHTML) {
    throw new Error(`Article ${id} has no cleaned html`)
  }

  const $ = cheerio.load(cleanedHTML)

  const title = $('[data-title]').text().trim()

  const content = $('[data-content]').text().trim()

  return {
    title,
    content: content,
  }
}

export async function checkCleanedHTMLHasContent(id: number) {
  const content = await getArticleContent(id)
  if (!content.title || content.title.length < 5) {
    throw new Error(`Article ${id} has no title`)
  }
  if (!content.content || content.content.length < 20) {
    throw new Error(`Article ${id} has no content`)
  }
  return true
}

const systemPrompt = `
# 你的人设

你是一个专业的网页内容分析师，擅长分析网页内容，并给出分析结果。虽然你工作很努力，但是你的房贷压力很大，而任务要求尽可能真是才能通过验收并获得收入，所以你在分析过程中不能胡编乱造。

# 任务描述

你现在的任务是分析已经经过清洗的网页HTML代码和内容实质，然后输出指定的指标。你只需要分析网页内容，不需要分析网页结构。

# 网页内容

这些网页是清洗过的微信公众号文章，他的来源是一个中国地级市的医院科普类文章，你的分析结果将帮助公众号运营更好发现阅读量和内容之间的联系，从而提升未来文章的质量。本文章的来源医院是舟山医院，它隶属于中国浙江省舟山市，是一个海岛城市，所以你在分析的时候需要代入这些信息。

# 输出指标

- refCount: int，数据引用次数，这个指标代表了文章内引征了多少通用的科学数据，例如临床数据、科学数据、本地数据等。
      - 它们大多以数字的形式出现，并且它们是一些常识类的有价值的具备普适性和统计意义的数据，而不是跟特定的某个人或者物体绑定的数据
      - 比方说“患者今年32岁”这个32就不是，所以这句话的引用次数是0
      - 比方说“患者今年32岁，他患病的概率大约为60%”这个60%就是，所以这句话的引用次数是1
      - 比方说“患者的肿瘤大小从10厘米缩小了50%”这里面的10里面和50%都不是，因为这不是一个具备普适性的数据，所以这句话的引用次数是0
      - 强调一下，跟个体绑定的数据，例如“患者今年32岁”,“39岁的老王得了这个病”，“患者的肿瘤大小为10厘米”，“患者的肿瘤大小从10厘米缩小了50%”，这些数据都不是具备普适性的数据，所以不能算作数据引用次数，这些话的引用次数都是0；
- diseasePrinciple: boolean，如果这篇文章围绕一个疾病为主题，这个指标代表了这篇文章是否描述了相关疾病的原理；
- localRelevance: boolean，这个指标代表了这篇文章是否描述了舟山本地的相关内容，即联系了本地的实际展开一定的科普；
- mainDoctorTitle: string，这个指标代表了，假如这篇文章内出现了嘉宾或者主要科普人员，这个人物的职称或者职务是什么，如果没有则为空；
- storyCount: int，这个指标代表了这篇文章内出现了多少个故事，故事的定义是，一个故事包含一个主题，通常围绕这篇文章展开，这个故事通常是有个主要人物，并发生了一些跟医学或者疾病相关的故事。

# 输出指标概述

在所有输出指标中，你必须针对每个输出指标提出一个简短的概述。

# 输出格式

输出格式为JSON字符串，格式如下，并且不要带任何其他字符，例如Markdown样式等等：
{
  "index": {
    "refCount": 0,
    "diseasePrinciple": false,
    "localRelevance": false,
    "mainDoctorTitle": "",
    "storyCount": 0,
  },
  "summary": {
    "refCount": "简短的概述",
    "diseasePrinciple": "简短的概述",
    "localRelevance": "简短的概述",
    "mainDoctorTitle": "简短的概述",
    "storyCount": "简短的概述",
  }
}

# 输入格式

用户将直接输入网页的HTML代码，不会有其他任何额外内容和提示。
`

type AIResponse = {
  index: {
    refCount: number
    diseasePrinciple: boolean
    localRelevance: boolean
    mainDoctorTitle: string
    storyCount: number
  }
  summary: {
    refCount: string
    diseasePrinciple: string
    localRelevance: string
    mainDoctorTitle: string
    storyCount: string
  }
}

export async function analyzeDataWithAI(id: number): Promise<AIResponse> {
  const article = await DBClient.instance.article.findUnique({
    where: { id },
  })
  if (!article) {
    throw new Error(`Article ${id} not found`)
  }
  if (article.locked) {
    throw new Error(`Article ${id} is locked`)
  }
  if (!article.cleanedHtml) {
    throw new Error(`Article ${id} has no cleaned html`)
  }

  const response = await anthropicService.postQuery(article.cleanedHtml, [], {
    system: systemPrompt,
    maxTokens: 20000,
    model: 'claude-sonnet-4-20250514',
  })

  if (!response.content) {
    throw new Error('Anthropic response has no content')
  }

  const content = (response.content[0] as any).text
  if (!content) {
    throw new Error('Anthropic response has no content')
  }

  let json: AIResponse
  try {
    json = JSON.parse(content)
    if (!json) {
      throw new Error('Anthropic response is not a valid JSON')
    }
  } catch (error) {
    throw new Error('Anthropic response is not a valid JSON')
  }

  await DBClient.instance.article.update({
    where: { id },
    data: {
      aiResponse: JSON.stringify(json),
      refCountSummary: json.summary.refCount || '',
      diseasePrincipleSummary: json.summary.diseasePrinciple || '',
      localRelevanceSummary: json.summary.localRelevance || '',
      mainDoctorTitleSummary: json.summary.mainDoctorTitle || '',
      storyCountSummary: json.summary.storyCount || '',
      refCount: json.index.refCount || 0,
      diseasePrinciple: json.index.diseasePrinciple || false,
      localRelevance: json.index.localRelevance || false,
      mainDoctorTitle: json.index.mainDoctorTitle || '',
      storyCount: json.index.storyCount || 0,
    },
  })

  return json
}

export async function updateArticleHTMLStatic(id: number) {
  const article = await DBClient.instance.article.findUnique({
    where: { id },
  })
  if (!article) {
    throw new Error(`Article ${id} not found`)
  }
  if (article.locked) {
    throw new Error(`Article ${id} is locked`)
  }
  if (!article.html) {
    throw new Error(`Article ${id} has no html`)
  }
  if (!article.cleanedHtml) {
    throw new Error(`Article ${id} has no cleaned html`)
  }

  const cleanedHTML = article.cleanedHtml
  const $ = cheerio.load(cleanedHTML)

  const $content = $('[data-content]')

  const $imgs = $content.find('img')
  const $videos = $content.find('video')

  const imgCount = $imgs.length
  const videoCount = $videos.length
  const mediaCount = imgCount + videoCount

  const text = $content.text().trim()
  const wordCount = text.length

  await DBClient.instance.article.update({
    where: { id },
    data: {
      mediaCount: mediaCount,
      wordCount: wordCount,
    },
  })
}

export async function outputArtiles(articles: Article[], path: string) {
  const headers = [
    '标题',
    '图片/视频引用（次）',
    '字数',
    '数据引用（次）',
    '描述疾病原理（是/否）',
    '本地相关性',
    '主要医护职称',
    '故事/案例引用（个）',
    'AI分析数据引用（次）',
    'AI分析描述疾病原理（是/否）',
    'AI分析本地相关性',
    'AI分析主要医护职称',
    'AI分析故事/案例引用（个）',
  ]

  const rows = []
  for (const article of articles) {
    const row = [
      article.title,
      article.mediaCount,
      article.wordCount,
      article.refCount,
      article.diseasePrinciple ? '是' : '否',
      article.localRelevance ? '是' : '否',
      article.mainDoctorTitle,
      article.storyCount,
      article.refCountSummary,
      article.diseasePrincipleSummary,
      article.localRelevanceSummary,
      article.mainDoctorTitleSummary,
      article.storyCountSummary,
    ]
    rows.push(row)
  }

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  fs.writeFileSync(path, csvContent)
}
