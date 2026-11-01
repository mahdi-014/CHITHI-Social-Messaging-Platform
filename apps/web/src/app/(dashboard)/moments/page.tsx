'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
import {
  Compass,
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Send,
  Loader2,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MomentsPage() {
  const { user } = useAuthStore();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>('/feed?limit=30');
      setFeed(data.posts || []);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    setPosting(true);
    try {
      const newPost = await apiFetch<any>('/posts', {
        method: 'POST',
        body: {
          postType: 'text',
          contentText: postText.trim(),
        },
      });

      setFeed([newPost, ...feed]);
      setPostText('');
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleToggleReaction = async (postId: string) => {
    try {
      const res = await apiFetch<any>(`/posts/${postId}/reactions`, {
        method: 'POST',
        body: { reactionType: 'heart' },
      });

      setFeed(
        feed.map((p) => {
          if (p.id === postId) {
            const isLiked = res.action !== 'removed';
            const countDiff = res.action === 'added' ? 1 : res.action === 'removed' ? -1 : 0;
            return {
              ...p,
              userReaction: isLiked ? 'heart' : null,
              reactions: isLiked
                ? [...(p.reactions || []), { userId: user?.id, reactionType: 'heart' }]
                : (p.reactions || []).filter((r: any) => r.userId !== user?.id),
            };
          }
          return p;
        }),
      );
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const toggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }

    setActiveCommentsPostId(postId);
    if (!commentsMap[postId]) {
      try {
        const comments = await apiFetch<any[]>(`/posts/${postId}/comments`);
        setCommentsMap((prev) => ({ ...prev, [postId]: comments }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const text = commentInput.trim();
    setCommentInput('');

    try {
      const newComment = await apiFetch<any>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { body: text },
      });

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));

      setFeed(
        feed.map((p) =>
          p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moments</h1>
          <p className="text-xs text-muted">Chronological feed of your accepted friends&apos; posts</p>
        </div>
      </div>

      {/* Post Composer */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-8 shadow-sm">
        <form onSubmit={handleCreatePost}>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Share a moment with your friends..."
            rows={3}
            className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
            <span className="text-xs text-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              Friends Only
            </span>

            <button
              type="submit"
              disabled={posting || !postText.trim()}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Moment'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted">Loading moments feed...</div>
        ) : feed.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center bg-surface border border-border rounded-2xl gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center text-muted">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base">No moments yet</h3>
            <p className="text-xs text-muted max-w-sm">
              Connect with friends in the Friends tab to see their posts and share moments together.
            </p>
          </div>
        ) : (
          feed.map((post) => {
            const hasLiked = !!post.userReaction;
            const comments = commentsMap[post.id] || [];
            const isCommentsOpen = activeCommentsPostId === post.id;

            return (
              <article key={post.id} className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                    {post.author?.profile?.displayName
                      ? post.author.profile.displayName[0].toUpperCase()
                      : 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">
                      {post.author?.profile?.displayName || post.author?.username}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>@{post.author?.username}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {post.contentText && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed mb-4">
                    {post.contentText}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 pt-3 border-t border-border/60 text-muted text-xs">
                  <button
                    onClick={() => handleToggleReaction(post.id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      hasLiked ? 'text-destructive font-semibold' : 'hover:text-foreground'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-destructive' : ''}`} />
                    <span>{post.reactions?.length || 0}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentCount || 0}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {isCommentsOpen && (
                  <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                    <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="submit"
                        disabled={!commentInput.trim()}
                        className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>

                    <div className="space-y-2 pt-2">
                      {comments.length === 0 ? (
                        <p className="text-xs text-muted italic">No comments yet</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="text-xs bg-background p-2.5 rounded-xl border border-border/50">
                            <span className="font-semibold mr-1.5">
                              {c.author?.profile?.displayName || c.author?.username}:
                            </span>
                            <span>{c.body}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
