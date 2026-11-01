'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
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
  Edit2,
  MoreHorizontal,
  X,
  Maximize2,
  Check,
  Volume2,
  VolumeX,
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

  // Media Attachment State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  // Post Management State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

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

  // Edit Caption Handler
  const handleStartEdit = (post: any) => {
    setEditingPostId(post.id);
    setEditCaptionText(post.contentText || '');
    setOpenMenuPostId(null);
  };

  const handleSaveEdit = async (postId: string) => {
    setSavingEdit(true);
    try {
      const updated = await apiFetch<any>(`/posts/${postId}`, {
        method: 'PATCH',
        body: { contentText: editCaptionText.trim() },
      });

      setFeed(feed.map((p) => (p.id === postId ? { ...p, contentText: updated.contentText } : p)));
      setEditingPostId(null);
    } catch (err: any) {
      alert(`Failed to update caption: ${err.message || 'Error'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Post Handler
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this moment? This action cannot be undone.')) return;
    setDeletingPostId(postId);
    setOpenMenuPostId(null);

    try {
      await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
      setFeed(feed.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(`Failed to delete moment: ${err.message || 'Error'}`);
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 max-w-xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-primary p-0.5 shadow-md shadow-primary/20">
            <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center text-primary">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Moments</h1>
            <p className="text-[11px] text-muted">Friends-only permanent social feed</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Friends Only
        </span>
      </div>

      {/* Instagram-Inspired Post Composer */}
      <div className="bg-surface border border-border/80 rounded-3xl p-4 sm:p-5 mb-8 shadow-sm">
        <form onSubmit={handleCreatePost}>
          <div className="flex items-start gap-3">
            <UserAvatar
              displayName={user?.displayName}
              username={user?.username}
              avatarMediaId={user?.avatarMediaId}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Share a moment with your friends..."
                rows={2}
                disabled={posting}
                className="w-full bg-transparent border-none p-1 text-sm focus:outline-none focus:ring-0 placeholder:text-muted resize-none disabled:opacity-50 text-foreground"
              />
            </div>
          </div>

          {/* Selected Media Preview in Composer */}
          {selectedFile && (
            <div className="mt-3 p-3 bg-surface-muted/60 border border-border rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={posting}
                title="Add Image"
                className="px-3 py-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Photo</span>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={posting}
                title="Add Video"
                className="px-3 py-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <Video className="w-4 h-4 text-purple-500" />
                <span className="hidden sm:inline">Video</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={posting || (!postText.trim() && !selectedFile)}
              className="px-5 py-2 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Moment'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <span>Loading moments feed...</span>
          </div>
        ) : feed.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center bg-surface border border-border rounded-3xl gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-muted">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">No moments yet</h3>
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
            const isOwner = user?.id === post.authorId;
            const isEditing = editingPostId === post.id;
            const isDeleting = deletingPostId === post.id;

            return (
              <article
                key={post.id}
                className="bg-surface border border-border/80 rounded-3xl overflow-hidden shadow-xs hover:border-border transition-all"
              >
                {/* Instagram-Style Post Header */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-border/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-primary">
                      <div className="p-0.5 rounded-full bg-surface">
                        <UserAvatar
                          displayName={post.author?.profile?.displayName}
                          username={post.author?.username}
                          avatarMediaId={post.author?.profile?.avatarMediaId}
                          size="md"
                        />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                        {post.author?.profile?.displayName || post.author?.username}
                      </h3>
                      <p className="text-[11px] text-muted truncate">
                        @{post.author?.username} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })}
                      </p>
                    </div>
                  </div>

                  {/* Contextual Options Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                      className="p-1.5 rounded-full hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
                      title="Post options"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {openMenuPostId === post.id && (
                      <div className="absolute right-0 top-8 w-44 bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1 z-30 animate-in fade-in duration-150">
                        {isOwner ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(post)}
                              className="w-full px-3 py-2 text-left text-xs font-semibold rounded-xl hover:bg-surface-muted flex items-center gap-2 text-foreground transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-primary" />
                              <span>Edit Caption</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              disabled={isDeleting}
                              className="w-full px-3 py-2 text-left text-xs font-semibold rounded-xl hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Moment</span>
                            </button>
                          </>
                        ) : (
                          <div className="px-3 py-2 text-xs text-muted">Friends Only Post</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Media Presentation Canvas */}
                {postMediaItems.length > 0 && (
                  <div className="relative w-full bg-black/95 flex items-center justify-center overflow-hidden">
                    {postMediaItems.map((pm: any) => {
                      const mediaId = pm.mediaAssetId || pm.mediaAsset?.id;
                      const mime = pm.mediaAsset?.mimeType || '';
                      const isVid = mime.startsWith('video/') || post.postType === 'video';
                      const mediaUrl = getMediaUrl(mediaId);

                      if (isVid) {
                        return (
                          <div key={pm.id || mediaId} className="w-full max-h-[520px] bg-black flex items-center justify-center">
                            <video
                              src={mediaUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-[520px] object-contain"
                            />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={pm.id || mediaId}
                          className="w-full max-h-[520px] overflow-hidden cursor-pointer relative group flex items-center justify-center"
                          onClick={() => setLightboxMedia({ url: mediaUrl, type: 'image' })}
                        >
                          <img
                            src={mediaUrl}
                            alt="Moment media"
                            crossOrigin="anonymous"
                            className="w-full max-h-[520px] object-cover transition-transform hover:scale-101"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                            <span className="p-2.5 rounded-full bg-black/60 text-white backdrop-blur-md">
                              <Maximize2 className="w-5 h-5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Instagram-Style Action Bar */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(post.id)}
                        className={`transition-transform active:scale-125 ${
                          hasLiked ? 'text-destructive' : 'text-foreground hover:opacity-80'
                        }`}
                        title={hasLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart className={`w-6 h-6 ${hasLiked ? 'fill-destructive' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleComments(post.id)}
                        className="text-foreground hover:opacity-80 transition-opacity"
                        title="Comment"
                      >
                        <MessageCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Likes Count */}
                  {(post.reactions?.length || 0) > 0 && (
                    <p className="text-xs font-bold text-foreground">
                      {post.reactions.length} {post.reactions.length === 1 ? 'like' : 'likes'}
                    </p>
                  )}

                  {/* Caption Presentation */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      <textarea
                        value={editCaptionText}
                        onChange={(e) => setEditCaptionText(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1 rounded-xl bg-surface-muted hover:bg-border text-xs font-medium text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={savingEdit}
                          className="px-3.5 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : post.contentText ? (
                    <div className="text-xs text-foreground/90 leading-relaxed">
                      <span className="font-bold text-foreground mr-2">
                        @{post.author?.username}
                      </span>
                      <span className="whitespace-pre-wrap">{post.contentText}</span>
                    </div>
                  ) : null}

                  {/* Comments Toggle */}
                  {(post.commentCount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="text-xs text-muted hover:text-foreground transition-colors block text-left"
                    >
                      {isCommentsOpen ? 'Hide comments' : `View all ${post.commentCount} comments`}
                    </button>
                  )}

                  {/* Expanded Comments List */}
                  {isCommentsOpen && (
                    <div className="space-y-2.5 pt-2 border-t border-border/40 animate-in fade-in">
                      {comments.length === 0 ? (
                        <p className="text-xs text-muted italic">No comments yet. Be the first to comment!</p>
                      ) : (
                        comments.map((c: any) => (
                          <div key={c.id} className="text-xs leading-relaxed flex items-start gap-2">
                            <span className="font-bold text-foreground flex-shrink-0">
                              @{c.author?.username || 'user'}
                            </span>
                            <span className="text-foreground/90">{c.body}</span>
                          </div>
                        ))
                      )}

                      {/* Add Comment Input */}
                      <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          className="flex-1 bg-surface-muted/60 border border-border/60 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted"
                        />
                        <button
                          type="submit"
                          disabled={!commentInput.trim()}
                          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover disabled:opacity-40 transition-all flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Post</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Timestamp in subtle uppercase */}
                  <p className="text-[10px] text-muted tracking-wider uppercase font-semibold">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxMedia(null)}
              title="Close viewer"
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxMedia.url}
              alt="Moment media enlarged"
              crossOrigin="anonymous"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
