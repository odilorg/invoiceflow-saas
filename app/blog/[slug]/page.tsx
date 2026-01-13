import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

interface BlogPostData {
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
}

async function getBlogPost(slug: string): Promise<{ data: BlogPostData; content: string } | null> {
  const blogDir = path.join(process.cwd(), 'content', 'blog');
  const filePath = path.join(blogDir, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    data: data as BlogPostData,
    content,
  };
}

async function getAllBlogSlugs(): Promise<string[]> {
  const blogDir = path.join(process.cwd(), 'content', 'blog');

  if (!fs.existsSync(blogDir)) {
    return [];
  }

  const files = fs.readdirSync(blogDir);
  return files.filter((file) => file.endsWith('.md')).map((file) => file.replace('.md', ''));
}

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found - Billza Blog',
    };
  }

  return {
    title: `${post.data.title} - Billza Blog`,
    description: post.data.description,
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: BlogPostProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      <article className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/blog"
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium mb-8"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Blog
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {post.data.title}
          </h1>

          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 mb-6">
            <time dateTime={post.data.date}>{formatDate(post.data.date)}</time>
            <span>•</span>
            <span>{post.data.author}</span>
          </div>

          {post.data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.data.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-sm px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <div className="prose prose-lg prose-indigo dark:prose-invert max-w-none
          prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
          prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
          prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900 dark:prose-strong:text-white
          prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-900/30
          prose-ul:text-gray-700 dark:prose-ul:text-gray-300
          prose-ol:text-gray-700 dark:prose-ol:text-gray-300
          prose-li:text-gray-700 dark:prose-li:text-gray-300
          bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 md:p-12"
        >
          <MDXRemote source={post.content} />
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <Link
              href="/blog"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              View all posts
            </Link>

            <Link
              href="/"
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
            >
              Back to Home
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
}
