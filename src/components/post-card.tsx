"use client";

import { useState, useEffect, useRef } from 'react';
import type { Post, User, Comment as CommentType, Report } from "@/lib/types";
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2, LinkIcon, PlayCircle, ShieldAlert, Loader2, X } from "lucide-react";
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from './ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { useSystemSettings } from '@/hooks/use-system-settings';

function FacebookVideoEmbed({ url }: { url: string }) {
    // Facebook videoları için basit bir clickable link göster
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block aspect-video rounded-lg overflow-hidden border bg-black hover:bg-gray-900 transition-colors"
        >
            <div className="w-full h-full flex flex-col items-center justify-center text-white p-6">
                <PlayCircle className="w-16 h-16 mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2 text-center">Facebook Video</h3>
                <p className="text-sm text-gray-300 text-center">Videoya ulaşmak için tıklayın</p>
                <div className="mt-3 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Video İzle
                </div>
            </div>
        </a>
    );
}


async function getDownloadUrl(key: string): Promise<string | null> {
    if (!key) return null;
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key }),
        });
        if (!response.ok) {
            console.error("Failed to get download URL:", await response.text());
            return null;
        }
        const data = await response.json();
        return data.signedUrl;
    } catch (error) {
        console.error("Error getting download URL", error);
        return null;
    }
}



function DisplayMedia({ mediaKey, mediaType, ...props }: { mediaKey?: string, mediaType?: Post['type']} & any) {
    const [url, setUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null); // Ref for the video element
    const userPausedRef = useRef<boolean>(false); // Track if user manually paused
    const hasPlayedRef = useRef<boolean>(false); // Track if video has been played once

    useEffect(() => {
        let isCancelled = false;
        if (mediaKey && (mediaType === 'image' || mediaType === 'video')) {
            setIsLoading(true);
            getDownloadUrl(mediaKey).then(downloadUrl => {
                if (!isCancelled) {
                    setUrl(downloadUrl);
                    setIsLoading(false);
                }
            });
        } else {
            setIsLoading(false);
        }
        return () => { isCancelled = true };
    }, [mediaKey, mediaType]);

    // Video otomatik oynatma özelliği devre dışı bırakıldı


    if (isLoading) {
        return <div className="mt-3 aspect-video w-full bg-muted animate-pulse rounded-lg"></div>;
    }

    if (mediaType === 'image' && url) {
      return (
        <div className="mt-3 aspect-video w-full rounded-lg overflow-hidden border relative bg-black max-h-[600px]">
          <Image
            src={url}
            alt="Post content"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={props['data-ai-hint'] || 'post image'}
          />
        </div>
      );
    }

    if (mediaType === 'video' && url) {
        return (
            <div className="mt-3 aspect-video rounded-lg overflow-hidden border bg-black max-h-[600px] relative">
                <video 
                    ref={videoRef} 
                    src={url} 
                    controls 
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ position: 'absolute', top: 0, left: 0 }}
                    preload="metadata"
                ></video>
            </div>
        );
    }

    return null;
}

function DisplayAvatar({ imageKey, fallback, ...props }: { imageKey?: string, fallback: React.ReactNode } & Omit<React.ComponentProps<typeof AvatarImage>, 'src'>) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;
        if (imageKey && imageKey.trim() !== '') {
            getDownloadUrl(imageKey).then(downloadUrl => {
                if (!isCancelled) setUrl(downloadUrl);
            });
        }
        return () => { isCancelled = true };
    }, [imageKey]);

    return url ? <AvatarImage src={url} {...props} /> : fallback;
}

interface PostCardProps {
  post: Post;
  user: User;
  onDelete?: () => void;
  showActions?: boolean;
}

function ReportDialog({ post, currentUser, children }: { post: Post, currentUser: (User & import('firebase/auth').User) | null, children: React.ReactNode }) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [reason, setReason] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const handleReportSubmit = async () => {
        if (!reason.trim() || !currentUser) return;

        const report: Report = {
            userId: currentUser.uid,
            reason: reason,
            createdAt: new Date(),
        };

        try {
            const postRef = doc(db, 'posts', post.id);
            await updateDoc(postRef, {
                reports: arrayUnion(report)
            });
            toast({ title: t.postReported, description: t.reportThanks });
            setReason("");
            setIsOpen(false);
        } catch (error) {
            console.error("Error reporting post: ", error);
            toast({ variant: 'destructive', title: t.error, description: t.couldNotSubmitReport });
        }
    };

    const hasReported = post.reports?.some(r => r.userId === currentUser?.uid);

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t.reportPost}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t.reportDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                    placeholder={t.reportPlaceholder}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={hasReported}
                />
                {hasReported && <p className="text-sm text-yellow-600">You have already reported this post.</p>}
                <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReportSubmit} disabled={!reason.trim() || hasReported}>
                        {t.submitReport}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}


function CommentSection({ postId, currentUser }: { postId: string, currentUser: (User & import('firebase/auth').User) | null }) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [comments, setComments] = useState<CommentType[]>([]);
    const [newComment, setNewComment] = useState("");

    useEffect(() => {
        const postRef = doc(db, 'posts', postId);
        const unsubscribe = onSnapshot(postRef, (doc) => {
            setComments(doc.data()?.comments || []);
        });
        return unsubscribe;
    }, [postId]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newComment.trim() || !currentUser) {
            if(!currentUser) toast({ variant: 'destructive', title: t.authError, description: t.mustBeLoggedInToComment });
            return;
        };

        const newCommentObj: CommentType = {
            id: `comment-${Date.now()}-${Math.random()}`,
            userId: currentUser.uid,
            username: currentUser.username,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
            content: newComment,
            createdAt: new Date().toISOString()
        }

        try {
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                comments: arrayUnion(newCommentObj)
            });
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment: ", error);
            toast({ variant: 'destructive', title: t.error, description: t.couldNotAddComment})
        }
    }

    if (!currentUser) return null;

    return (
        <div className="space-y-4 pt-4 mt-4 border-t w-full">
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-3 pt-2">
                <Avatar className="w-8 h-8">
                     <DisplayAvatar imageKey={currentUser.avatarUrl} fallback={<AvatarFallback>{currentUser.name?.charAt(0) || 'U'}</AvatarFallback>} />
                </Avatar>
                <Input placeholder={t.writeAComment} className="h-9" value={newComment} onChange={e => setNewComment(e.target.value)} />
                <Button size="sm" type="submit" disabled={!newComment.trim()}>{t.send}</Button>
            </form>
            {comments.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(comment => (
                <div key={comment.id} className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                        <DisplayAvatar imageKey={comment.avatarUrl} fallback={<AvatarFallback>{comment.name?.charAt(0)}</AvatarFallback>} />
                    </Avatar>
                    <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                             <Link href={`/profile/${comment.username}`} className="font-bold text-sm hover:underline">{comment.name}</Link>
                            <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function Lightbox({ mediaKey, mediaType, children }: { mediaKey?: string, mediaType?: Post['type'], children: React.ReactNode }) {
    const [url, setUrl] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        let isCancelled = false;
        if (mediaKey) {
            getDownloadUrl(mediaKey).then(downloadUrl => {
                if (!isCancelled) setUrl(downloadUrl);
            });
        }
        return () => { isCancelled = true };
    }, [mediaKey]);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    if (!mediaKey || !url) {
        return <>{children}</>;
    }

    return (
        <Dialog onOpenChange={(open) => { if (!open) resetZoom(); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none overflow-hidden">
                <DialogTitle className="sr-only">Resim görüntüleyici</DialogTitle>
                <DialogDescription className="sr-only">Resmi büyütüp küçültebilir ve hareket ettirebilirsiniz</DialogDescription>
                <div className="relative w-full h-[95vh] flex items-center justify-center">
                    {/* Close and Zoom Controls */}
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))}
                            className="bg-black/50 hover:bg-black/70 text-white"
                        >
                            -
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={resetZoom}
                            className="bg-black/50 hover:bg-black/70 text-white"
                        >
                            {Math.round(scale * 100)}%
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setScale(prev => Math.min(3, prev + 0.2))}
                            className="bg-black/50 hover:bg-black/70 text-white"
                        >
                            +
                        </Button>
                    </div>

                    {mediaType === 'image' && (
                        <div
                            className="cursor-grab active:cursor-grabbing"
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{
                                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                            }}
                        >
                            <Image
                                src={url}
                                alt="Post content enlarged"
                                width={1920}
                                height={1080}
                                className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                                draggable={false}
                            />
                        </div>
                    )}
                    {mediaType === 'video' && (
                        <video
                            src={url}
                            controls
                            autoPlay
                            className="max-w-[90vw] max-h-[90vh] object-contain"
                            style={{
                                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                display: 'block'
                            }}
                            preload="metadata"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function PostCard({ post: initialPost, user: postUser, onDelete, showActions = true }: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { settings } = useSystemSettings();
  const [post, setPost] = useState<Post>(initialPost);
  const [isCommentSectionOpen, setIsCommentSectionOpen] = useState(false);

  useEffect(() => {
      if (!initialPost.id) return;
      const postRef = doc(db, 'posts', initialPost.id);
      const unsubscribe = onSnapshot(postRef, (doc) => {
          if (doc.exists()) {
              const postData = { id: doc.id, ...doc.data() } as Post;
              setPost(postData);
          }
      });
      return () => unsubscribe();
  }, [initialPost.id]);

  const isLiked = user ? (post.likes || []).includes(user.uid) : false;
  const isSaved = user ? (user.savedPosts || []).includes(post.id) : false;

  const handleLike = async () => {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Giriş Yapın",
          description: "Beğeni yapmak için giriş yapmanız gerekiyor.",
        });
        return;
      }

      try {
        const postRef = doc(db, "posts", post.id);

        if (isLiked) {
          await updateDoc(postRef, {
            likes: arrayRemove(user.uid)
          });
          setPost(prev => ({ ...prev, likes: prev.likes?.filter(id => id !== user.uid) || [] }));
        } else {
          await updateDoc(postRef, {
            likes: arrayUnion(user.uid)
          });
           setPost(prev => ({ ...prev, likes: [...(prev.likes || []), user.uid] }));
        }
      } catch (error) {
        console.error("Error updating like:", error);
        toast({ variant: "destructive", title: t.error, description: t.couldNotUpdateLike})
      }
  }

  const handleSave = async () => {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Giriş Yapın",
          description: "Gönderi kaydetmek için giriş yapmanız gerekiyor.",
        });
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);

        if (isSaved) {
          await updateDoc(userRef, {
            savedPosts: arrayRemove(post.id)
          });
          // Assuming postUser is the currently logged-in user's data
          setPostUser(prev => ({ ...prev, savedPosts: prev.savedPosts?.filter(pid => pid !== post.id) || [] }));
          toast({
            title: t.postUnsaved,
            description: t.postUnsavedDesc,
          });
        } else {
          await updateDoc(userRef, {
            savedPosts: arrayUnion(post.id)
          });
          // Assuming postUser is the currently logged-in user's data
          setPostUser(prev => ({ ...prev, savedPosts: [...(prev.savedPosts || []), post.id] }));
          toast({
            title: t.postSaved,
            description: t.postSavedDesc,
          });
        }
      } catch (error) {
        console.error("Error saving post:", error);
        toast({
          variant: "destructive",
          title: t.couldNotSavePost,
        });
      }
  };

  const handleDelete = async () => {
    if (!user || (user.uid !== post.userId && user.role !== 'admin')) {
        toast({variant: 'destructive', title: t.unauthorized, description: t.unauthorizedDelete});
        return;
    }
    if (window.confirm('Are you sure you want to delete this post?')) {
        try {
            await deleteDoc(doc(db, 'posts', post.id));
            toast({title: t.success, description: t.postDeletedDesc});
            if (onDelete) onDelete();
        } catch (error) {
            console.error("Error deleting post:", error);
            toast({variant: 'destructive', title: t.error, description: t.couldNotDeletePost});
        }
    }
  }

  const postDate = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now';



  const renderMedia = () => {
    if (!post.mediaUrl || !post.type) {
      return null;
    }

    // Prevent facebook.com/share/v/ links from being processed at all
    if (post.type === 'link' && post.mediaUrl.includes('facebook.com/share/v/')) {
        return (
            <div className="mt-3 block aspect-video rounded-lg overflow-hidden border bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                <div className="w-full h-full flex flex-col items-center justify-center text-red-800 dark:text-red-200 p-6">
                    <PlayCircle className="w-12 h-12 mb-3 text-red-600 dark:text-red-400" />
                    <h3 className="text-lg font-semibold mb-2 text-center">{t.unsupportedFacebookLink}</h3>
                    <p className="text-sm text-center mb-3 leading-relaxed">
                        {t.unsupportedFacebookLinkDesc}
                    </p>
                    <div className="text-xs text-red-700 dark:text-red-300 text-center mb-4 space-y-1">
                        <p><strong>{t.correctLinkFormats}</strong></p>
                        <p>• facebook.com/watch?v=123456</p>
                        <p>• facebook.com/kullanici-adi/videos/123456</p>
                        <p>• fb.watch/abc123</p>
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 text-center">
                        {t.videoPageInstructions}
                    </div>
                </div>
            </div>
        );
    }

    if (post.type === 'image' || post.type === 'video') {
      return (
        <Lightbox mediaKey={post.mediaUrl} mediaType={post.type}>
          <div className="cursor-pointer">
            <DisplayMedia mediaKey={post.mediaUrl} mediaType={post.type} data-ai-hint={post['data-ai-hint']} />
          </div>
        </Lightbox>
      );
    }

    if(post.type === 'link') {
        const url = post.mediaUrl;
        const isImageLink = /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(url);
        if (isImageLink) {
            return (
                <div className="mt-3 rounded-lg overflow-hidden border">
                    <Image
                        src={url}
                        alt="Post content"
                        width={600}
                        height={400}
                        className="w-full h-auto object-cover"
                    />
                </div>
            );
        }

        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
        if (isYoutube) {
            const videoIdMatch = url.match(/(?:v=|\/|embed\/|watch\?v=|\&v=)([a-zA-Z0-9_-]{11})(?:\?|&|$)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;
            if (videoId) {
                return (
                    <div className="mt-3 aspect-video rounded-lg overflow-hidden border bg-black">
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                );
            }
        }

        const isFacebook = url.includes('facebook.com') || url.includes('fb.watch');
        if (isFacebook) {
            let videoId = null;
            const patterns = [
                /facebook\.com\/watch\?v=([0-9]+)/,
                /facebook\.com\/.*\/videos\/([0-9]+)/,
                /facebook\.com\/video\.php\?v=([0-9]+)/,
                /fb\.watch\/([a-zA-Z0-9_-]+)/,
                /facebook\.com\/.*\/posts\/([0-9]+)/,
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    videoId = match[1];
                    break;
                }
            }

            if (videoId) {
                return (
                    <div 
                        className="mt-3 aspect-video rounded-lg overflow-hidden border bg-black relative"
                        onMouseDown={(e) => {
                            // Facebook iframe'inde video oynatma sırasında sayfa kaymasını önle
                            e.preventDefault();
                            const currentScrollY = window.scrollY;

                            // Kısa bir süre sonra scroll pozisyonunu restore et
                            setTimeout(() => {
                                if (Math.abs(window.scrollY - currentScrollY) > 50) {
                                    window.scrollTo({
                                        top: currentScrollY,
                                        behavior: 'auto'
                                    });
                                }
                            }, 100);
                        }}
                        onClick={(e) => {
                            // Facebook iframe'inde video oynatma sırasında sayfa kaymasını önle
                            const currentScrollY = window.scrollY;

                            // Kısa bir süre sonra scroll pozisyonunu restore et
                            setTimeout(() => {
                                if (Math.abs(window.scrollY - currentScrollY) > 50) {
                                    window.scrollTo({
                                        top: currentScrollY,
                                        behavior: 'auto'
                                    });
                                }
                            }, 150);
                        }}
                    >
                        <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/video.php?v=${videoId}&show_text=false&width=560&height=315&autoplay=false`}
                            title="Facebook Video Player"
                            scrolling="no"
                            frameBorder="0"
                            allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                            allowFullScreen={true}
                            style={{ position: 'absolute', top: 0, left: 0 }}
                        ></iframe>
                    </div>
                );
            } else {
                return (
                    <div className="mt-3 block aspect-video rounded-lg overflow-hidden border bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                        <div className="w-full h-full flex flex-col items-center justify-center text-yellow-800 dark:text-yellow-200 p-6">
                            <PlayCircle className="w-12 h-12 mb-3 text-yellow-600 dark:text-yellow-400" />
                            <h3 className="text-lg font-semibold mb-2 text-center">Facebook Video Paylaşımı</h3>
                            <p className="text-sm text-center mb-3 leading-relaxed">
                                Bu Facebook video bağlantısı gömülü video olarak gösterilemiyor.
                                Video ID'si içeren doğrudan video bağlantısını paylaşmanız gerekiyor.
                            </p>
                            <div className="text-xs text-yellow-700 dark:text-yellow-300 text-center mb-4 space-y-1">
                                <p>Örnek doğru formatlar:</p>
                                <p>• facebook.com/watch?v=123456</p>
                                <p>• facebook.com/username/videos/123456</p>
                                <p>• fb.watch/abc123</p>
                            </div>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Videoyu Facebook'ta Aç
                            </a>
                        </div>
                    </div>
                );
            }
        }

        const isDirectVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
        if (isDirectVideo) {
            return (
                <div className="mt-3 aspect-video rounded-lg overflow-hidden border bg-black">
                    <video src={url} controls className="w-full h-full"></video>
                </div>
            );
        }

        let hostname = 'link';
        try {
            hostname = new URL(url).hostname.replace('www.', '');
        } catch (e) { /* ignore invalid urls */ }

        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-lg overflow-hidden border hover:bg-muted/50 transition-colors">
                <div className="p-4 bg-muted/20">
                <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{hostname}</p>
                        <p className="text-sm text-muted-foreground truncate">{url}</p>
                    </div>
                </div>
                </div>
            </a>
        );
    }

    return null;
  };


  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Link href={`/profile/${postUser.username}`}>
          <Avatar>
            <DisplayAvatar imageKey={postUser.avatarUrl} fallback={<AvatarFallback><img src="/images/default-avatar.svg" alt="Default Avatar" className="w-full h-full object-cover" /></AvatarFallback>} />
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${postUser.username}`} className="font-bold hover:underline">{postUser.name}</Link>
          <p className="text-sm text-muted-foreground">
            @{postUser.username} · {postDate}
          </p>
        </div>
        {user && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {(user.uid === post.userId || user.role === 'admin') && (
                      <>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>{t.deletePost}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <ReportDialog post={post} currentUser={user}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            <span>{t.reportPost}</span>
                        </DropdownMenuItem>
                    </ReportDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-2">
        {post.content && <p className="whitespace-pre-wrap">{post.content}</p>}
        {renderMedia()}
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4">
        <div className="w-full flex justify-around">
           <Button variant="ghost" className={cn("flex items-center gap-2 text-muted-foreground transition-colors", isLiked ? 'text-destructive' : 'hover:text-destructive')} onClick={handleLike} disabled={!user}>
            <Heart className={cn("w-5 h-5", isLiked && 'fill-current')} />
            <span>{(post.likes || []).length}</span>
          </Button>
          {settings.commentsEnabled && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => user ? setIsCommentSectionOpen(!isCommentSectionOpen) : toast({ variant: "destructive", title: "Giriş Yapın", description: "Yorumları görmek için giriş yapmanız gerekiyor." })} 
              className="text-muted-foreground"
              disabled={!user}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              <span>{post.comments?.length || 0}</span>
            </Button>
          )}
          <Button variant="ghost" className={cn("flex items-center gap-2 text-muted-foreground transition-colors", isSaved ? 'text-primary' : 'hover:text-primary')} onClick={handleSave} disabled={!user}>
            <Bookmark className={cn("w-5 h-5", isSaved && 'fill-current')} />
            <span>{isSaved ? t.saved : t.save}</span>
          </Button>
        </div>
        {isCommentSectionOpen && <CommentSection postId={post.id} currentUser={user} />}
      </CardFooter>
    </Card>
  );
}

// Helper to update user state directly in PostCard for savedPosts
function setPostUser(user: any) {
  // This is a placeholder, actual state update should be handled by context or a more robust state management
  // For this example, we'll assume `user` object passed to PostCard is mutable or we can re-fetch it.
  // A more proper way would be to use `setUser` from a context or state hook if available.
  console.warn("setPostUser is a placeholder. Proper state management needed.");
}