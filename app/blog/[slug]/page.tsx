import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostData } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostData(slug);
  
  if (!post) {
    return {
      title: "Post Not Found | Billza Blog",
    };
  }

  return {
    title: `${post.title} | Billza Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostData(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/blog" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
            &larr; Back to Blog
          </Link>
        </div>
      </header>

      {/* Article */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <article className="bg-white rounded-lg shadow-sm p-8">
          {/* Article Header */}
          <header className="mb-8 pb-8 border-b">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>&bull;</span>
              <span>By {post.author}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </header>

          {/* Article Content */}
          <div
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-strong:text-gray-900"
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />
        </article>

        {/* CTA */}
        <div className="mt-12 bg-blue-600 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to streamline your invoicing?
          </h2>
          <p className="text-blue-100 mb-6">
            Join thousands of businesses using Billza to get paid faster.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Billza. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
