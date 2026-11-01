'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiFetch, uploadMediaFile, getMediaUrl } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
import UserAvatar from '../../../components/ui/UserAvatar';
import {
  Compass,
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Video,
  Send,
  Loader2,
  Trash2,
  X,
  Maximize2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function MomentsPage() {
  const { user } = useAuthStore();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState('');

  // Media Attachment State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleSelectMedia = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds the 100 MB platform limit.');
      return;
    }

    if (type === 'image' && !file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP, GIF).');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, WebM).');
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedFile(file);
    setFilePreview(preview);
    setFileType(type);
    e.target.value = '';
  };

  const handleClearAttachment = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    setUploadProgress(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !selectedFile) return;

    setPosting(true);
    let mediaAssetIds: string[] = [];
    let postType: 'text' | 'photo' | 'video' = 'text';

    if (selectedFile && fileType) {
      setUploadProgress('Uploading media...');
      try {
        const category = fileType === 'image' ? 'post_image' : 'post_video';
        const media = await uploadMediaFile(selectedFile, category);
        mediaAssetIds = [media.id];
        postType = fileType === 'image' ? 'photo' : 'video';
      } catch (err: any) {
        alert(`Failed to upload media: ${err?.message || 'Upload error'}`);
        setPosting(false);
        setUploadProgress(null);
        return;
      } finally {
        handleClearAttachment();
      }
    }

    try {
      const newPost = await apiFetch<any>('/posts', {
        method: 'POST',
        body: {
          postType,
          contentText: postText.trim() || (postType === 'photo' ? 'Shared a photo' : postType === 'video' ? 'Shared a video' : ''),
          mediaAssetIds,
        },
      });

      setFeed([newPost, ...feed]);
      setPostText('');
    } catch (err: any) {
      console.error('Failed to create post:', err);
      alert(`Failed to create post: ${err?.message || 'Error'}`);
    } finally {
      setPosting(false);
      setUploadProgress(null);
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
        setCommentsMap((prev) => ({ ...prev, [postId]: comments || [] }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const body = commentInput.trim();
    setCommentInput('');

    try {
      const newComment = await apiFetch<any>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { body },
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
            disabled={posting}
            className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-50"
          />

          {/* Selected Media Preview in Composer */}
          {selectedFile && (
            <div className="mt-3 p-3 bg-background border border-border rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface flex-shrink-0 relative border border-border">
                  {fileType === 'image' && filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
                      <Video className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-foreground">{selectedFile.name}</p>
                  <p className="text-[11px] text-muted">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {fileType === 'image' ? 'Image' : 'Video'}
                  </p>
                  {uploadProgress && (
                    <p className="text-[11px] text-primary flex items-center gap-1 font-medium mt-0.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {uploadProgress}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearAttachment}
                disabled={posting}
                className="p-1.5 rounded-full hover:bg-surface-muted text-muted hover:text-foreground transition-colors disabled:opacity-40"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleSelectMedia(e, 'image')}
            accept="image/jpeg,image/png,image/webp,image/gif"
            data-testid="moment-image-input"
            className="hidden"
          />
          <input
            type="file"
            ref={videoInputRef}
            onChange={(e) => handleSelectMedia(e, 'video')}
            accept="video/mp4,video/webm"
            data-testid="moment-video-input"
            className="hidden"
          />

          {/* Composer Controls */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={posting}
                title="Add Image"
                className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-40"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Photo</span>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={posting}
                title="Add Video"
                className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-40"
              >
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Video</span>
              </button>

              <span className="text-xs text-muted flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Friends Only
              </span>
            </div>

            <button
              type="submit"
              disabled={posting || (!postText.trim() && !selectedFile)}
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
            const postMediaItems = post.media || [];

            return (
              <article key={post.id} className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar
                    displayName={post.author?.profile?.displayName}
                    username={post.author?.username}
                    avatarMediaId={post.author?.profile?.avatarMediaId}
                    size="md"
                  />
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

                {/* Text Content */}
                {post.contentText && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed mb-4">
                    {post.contentText}
                  </p>
                )}

                {/* Media Attachment Rendering */}
                {postMediaItems.length > 0 && (
                  <div className="mb-4 rounded-2xl overflow-hidden bg-black/10">
                    {postMediaItems.map((pm: any) => {
                      const mediaId = pm.mediaAssetId || pm.mediaAsset?.id;
                      const mime = pm.mediaAsset?.mimeType || '';
                      const isVid = mime.startsWith('video/') || post.postType === 'video';
                      const mediaUrl = getMediaUrl(mediaId);

                      if (isVid) {
                        return (
                          <div key={pm.id || mediaId} className="w-full bg-black rounded-2xl overflow-hidden">
                            <video
                              src={mediaUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-[480px] object-contain rounded-2xl"
                            />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={pm.id || mediaId}
                          className="w-full overflow-hidden cursor-pointer relative group rounded-2xl"
                          onClick={() => setLightboxMedia({ url: mediaUrl, type: 'image' })}
                        >
                          <img
                            src={mediaUrl}
                            alt="Moment media"
                            crossOrigin="anonymous"
                            className="w-full max-h-[480px] object-cover rounded-2xl transition-transform hover:scale-101"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl pointer-events-none">
                            <span className="p-2.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                              <Maximize2 className="w-5 h-5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

      {/* Lightbox / Media Viewer Modal */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            onClick={() => setLightboxMedia(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors z-50"
            title="Close viewer"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.url}
                alt="Enlarged media"
                crossOrigin="anonymous"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
