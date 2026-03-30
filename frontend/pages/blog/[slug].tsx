import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, ArrowLeft, Send } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { getPost, createComment, fixMediaUrl } from '@/lib/api'
import { useSession, signIn } from 'next-auth/react'
import { trackBlogPostView, trackCommentSubmit } from '@/lib/analytics'

interface Comment {
  id: number
  user: string
  content: string
  created_at: string
}

interface PostDetail {
  id: number
  title: string
  slug: string
  author: string
  category: { id: number, name: string, slug: string } | null
  featured_image: string | null
  content: string
  excerpt: string
  created_at: string
  tags: string[]
  comments: Comment[]
  meta_title?: string
  meta_description?: string
}

function stripEditorArtifactsHtml(html: string): string {
  if (!html) return html

  return html
    .replace(
      /<(?:button|span|div)\b[^>]*>\s*<svg\b[^>]*>[\s\S]*?<\/svg>\s*<\/(?:button|span|div)>/gi,
      ''
    )
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function BlogPost({ post: initialPost }: { post: PostDetail }) {
  const { data: session } = useSession()
  const [post, setPost] = useState(initialPost)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    trackBlogPostView(post.slug, post.title)
  }, [post.slug, post.title])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      signIn()
      return
    }
    if (!comment.trim()) return

    setIsSubmitting(true)
    try {
      const token = (session as any).access_token
      await createComment(post.slug, comment, token)
      trackCommentSubmit(post.slug)
      const updatedPost = await getPost(post.slug)
      setPost(updatedPost)
      setComment('')
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tenantguard.net'
  const pageUrl = `${siteUrl}/blog/${post.slug}`
  const ogImage = post.featured_image
    ? fixMediaUrl(post.featured_image) || `${siteUrl}/assets/logo.png`
    : `${siteUrl}/assets/logo.png`
  const pageTitle = post.meta_title || post.title
  const pageDescription = post.meta_description || post.excerpt
  const sanitizedContent = stripEditorArtifactsHtml(post.content || '')

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": ogImage,
    "url": pageUrl,
    "author": { "@type": "Person", "name": post.author },
    "publisher": {
      "@type": "Organization",
      "name": "TenantGuard",
      "logo": { "@type": "ImageObject", "url": `${siteUrl}/assets/logo.png` }
    },
    "datePublished": post.created_at,
    "description": post.excerpt,
    ...(post.category && { "articleSection": post.category.name }),
    ...(post.tags.length > 0 && { "keywords": post.tags.join(', ') })
  })

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="TenantGuard" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="article:published_time" content={post.created_at} />
        {post.category && <meta property="article:section" content={post.category.name} />}
        {post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Head>

      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/blog" className="inline-flex items-center text-primary hover:underline mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to all posts
        </Link>

        <article>
          <header className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              {post.category && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                  {post.category.name}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {post.author[0]}
                </div>
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>
          </header>

          {post.featured_image && (
            <div className="aspect-video relative rounded-2xl overflow-hidden mb-12 shadow-lift">
              <img
                src={fixMediaUrl(post.featured_image)!}
                alt={post.title}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          <div
            className="prose prose-sm md:prose-lg max-w-none prose-primary prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-2">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-gray-500">
                #{tag}
              </Badge>
            ))}
          </div>
        </article>

        <section className="mt-20 pt-12 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Comments ({post.comments.length})
          </h2>

          <div className="space-y-8 mb-12">
            {post.comments.map((c) => (
              <div key={c.id} className="flex gap-4 p-4 rounded-xl bg-gray-50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {c.user[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{c.user}</span>
                    <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-gray-700">{c.content}</p>
                </div>
              </div>
            ))}
            {post.comments.length === 0 && (
              <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-xl">
                No comments yet. Be the first to share your thoughts!
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">Leave a comment</h3>
            {session ? (
              <form onSubmit={handleCommentSubmit} className="space-y-4">
                <textarea
                  className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] text-base"
                  placeholder="Share your thoughts..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:opacity-90"
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Please log in with Google or GitHub to leave a comment.</p>
                <Button onClick={() => signIn()}>Log In</Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-3">© 2026 TenantGuard. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const slug = params?.slug as string
    const post = await getPost(slug)
    return {
      props: { post }
    }
  } catch (error) {
    console.error('Error fetching post:', error)
    return {
      notFound: true
    }
  }
}