import type { GetServerSideProps } from 'next'
import axios from 'axios'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tenantguard.net').replace(/\/$/, '')
const API_BASE_URL = (() => {
  const raw = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/'
  return raw.endsWith('/') ? raw : `${raw}/`
})()

type SitemapEntry = {
  loc: string
  lastmod?: string
  changefreq: string
  priority: string
}

type BlogPost = {
  slug: string
  updated_at?: string
  created_at?: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function latestBlogTimestamp(posts: BlogPost[]): string | undefined {
  return posts
    .map((post) => post.updated_at || post.created_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
}

function buildSitemap(posts: BlogPost[]): string {
  const latestBlogUpdate = latestBlogTimestamp(posts)

  const staticPages: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, lastmod: latestBlogUpdate, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/blog`, lastmod: latestBlogUpdate, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/privacy`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/terms`, changefreq: 'yearly', priority: '0.3' },
  ]

  const postPages: SitemapEntry[] = posts.map((post) => ({
    loc: `${SITE_URL}/blog/${post.slug}`,
    lastmod: post.updated_at || post.created_at,
    changefreq: 'monthly',
    priority: '0.8',
  }))

  const urls = [...staticPages, ...postPages]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
      .map(
        (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
${url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n` : ''}    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
      )
      .join('\n')}
</urlset>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let posts: BlogPost[] = []

  try {
    const response = await axios.get<BlogPost[]>(`${API_BASE_URL}blog/posts/`, {
      timeout: 10000,
    })
    posts = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(buildSitemap(posts))
  res.end()

  return { props: {} }
}

export default function SitemapXml() {
  return null
}