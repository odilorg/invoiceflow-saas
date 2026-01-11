import { Metadata } from "next";
import Link from "next/link";
import { getSortedPostsData } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Billza - Invoice Management Tips & Insights",
  description: "Discover invoicing tips, payment strategies, and business insights to help you get paid faster and grow your business.",
  openGraph: {
    title: "Blog | Billza - Invoice Management Tips & Insights",
    description: "Discover invoicing tips, payment strategies, and business insights to help you get paid faster and grow your business.",
    type: "website",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const posts = getSortedPostsData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
            &larr; Back to Billza
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Billza Blog</h1>
          <p className="text-gray-600 mt-2">
            Tips, insights, and best practices for invoice management
          </p>
        </div>
      </header>

      {/* Blog Posts List */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <p className="text-gray-500 text-center">No blog posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span>&bull;</span>
                  <span>{post.author}</span>
                </div>
                <p className="mt-3 text-gray-600 line-clamp-3">{post.excerpt}</p>
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
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Read more &rarr;
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Billza. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
