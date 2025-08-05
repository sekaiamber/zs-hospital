import crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

import { DBClient } from '../db'

interface ArticleSource {
  // 发文时间
  time: Date
  // 标题
  title: string
  // 发文位置
  position: number
  // 阅读量
  readCount: number
  // 在看数
  onlineCount: number
  // 点赞数
  likeCount: number
  // 转发数
  forwardCount: number
  // 留言数
  commentCount: number
  // 链接
  link: string
  // 封面
  cover: string
  // 类别
  category: string
  // 图片/视频引用（次）
  mediaCount?: number
  // 字数
  wordCount?: number
  // 数据引用（次）
  refCount?: number
  // 描述疾病原理（是/否）
  diseasePrinciple?: boolean
  // 本地相关性
  localRelevance?: boolean
  // 主要医护职称
  mainDoctorTitle?: string
  // 故事/案例引用（个）
  storyCount?: number
}

export async function importArticles(overwrite: boolean = false) {
  const csvPath = path.join(__dirname, '../../data/articles.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => line.trim())
  const headers = lines[0].split(',')

  const articles: ArticleSource[] = lines.slice(1).map((line) => {
    const values = line.split(',')
    return {
      time: new Date(values[0]),
      title: values[1],
      position: parseInt(values[2]),
      readCount: parseInt(values[3]),
      onlineCount: parseInt(values[4]),
      likeCount: parseInt(values[5]),
      forwardCount: parseInt(values[6]),
      commentCount: parseInt(values[7]),
      link: values[8],
      cover: values[9],
      category: values[10],
    }
  })

  for (const article of articles) {
    // md5(article.link)
    const hash = crypto.createHash('md5').update(article.link).digest('hex')

    const existingArticle = await DBClient.instance.article.findUnique({
      where: {
        hash,
      },
    })
    if (existingArticle) {
      if (overwrite) {
        await DBClient.instance.article.update({
          where: {
            hash,
          },
          data: {
            title: article.title,
            time: article.time,
            position: article.position,
            readCount: article.readCount || 0,
            onlineCount: article.onlineCount || 0,
            likeCount: article.likeCount || 0,
            forwardCount: article.forwardCount || 0,
            commentCount: article.commentCount || 0,
            link: article.link,
            cover: article.cover,
            category: article.category,
            mediaCount: article.mediaCount,
            wordCount: article.wordCount,
            refCount: article.refCount,
            diseasePrinciple: article.diseasePrinciple,
            localRelevance: article.localRelevance,
            mainDoctorTitle: article.mainDoctorTitle,
            storyCount: article.storyCount,
            html: '',
          },
        })
      }
    } else {
      await DBClient.instance.article.create({
        data: {
          hash,
          title: article.title,
          time: article.time,
          position: article.position,
          readCount: article.readCount || 0,
          onlineCount: article.onlineCount || 0,
          likeCount: article.likeCount || 0,
          forwardCount: article.forwardCount || 0,
          commentCount: article.commentCount || 0,
          link: article.link,
          cover: article.cover,
          category: article.category,
          mediaCount: article.mediaCount,
          wordCount: article.wordCount,
          refCount: article.refCount,
          diseasePrinciple: article.diseasePrinciple,
          localRelevance: article.localRelevance,
          mainDoctorTitle: article.mainDoctorTitle,
          storyCount: article.storyCount,
          html: '',
        },
      })
    }
    console.log(`${article.title} imported`)
  }
}
