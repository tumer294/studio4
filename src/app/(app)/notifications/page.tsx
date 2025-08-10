"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquare, Heart, MessageCircle, UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { useSystemSettings } from '@/hooks/use-system-settings';
import MessageDialog from '@/components/message-dialog';
import { formatDistanceToNow } from 'date-fns';
import { db } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDocs } from 'firebase/firestore';
import type { User, Message, Notification } from '@/lib/types';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { settings } = useSystemSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;

    // Bildirimleri dinle
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      setNotifications(notificationsData);
    });

    // Mesajları dinle
    const messagesQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setMessages(messagesData);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeMessages();
    };
  }, [user]);

  const markAsRead = async (notification: Notification) => {
    if (!notification.read) {
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, { read: true });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'global':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleReplyToMessage = async (message: Message) => {
    // Gönderen kullanıcının bilgilerini al
    const senderUser: User = {
      id: message.senderId,
      uid: message.senderId,
      name: message.senderName,
      username: message.senderUsername,
      email: '',
      avatarUrl: message.senderAvatarUrl,
      followers: [],
      following: [],
      role: 'user',
      createdAt: null
    };

    setSelectedUser(senderUser);
    setIsMessageDialogOpen(true);

    // Mesajı okundu olarak işaretle
    if (!message.read) {
      const messageRef = doc(db, 'messages', message.id);
      await updateDoc(messageRef, { read: true });
    }
  };


  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-0">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t.notifications}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Mesajlar Bölümü */}
            {settings.messagesEnabled && messages.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Mesajlar
                </h2>
                <div className="space-y-3">
                  {messages.slice(0, 5).map((message, index) => (
                    <Card key={`message-${message.id}-${index}`} className={`cursor-pointer transition-colors ${message.read ? 'bg-background' : 'bg-muted/50'}`}>
                      <CardContent className="p-4" onClick={() => handleReplyToMessage(message)}>
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <MessageSquare className="h-4 w-4 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{message.senderName}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {message.createdAt?.toDate ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : 'Az önce'}
                            </p>
                          </div>
                          {!message.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Bildirimler Bölümü */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Bildirimler
              </h2>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">{t.noNewNotifications}</h3>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <Card key={`notification-${notification.id}-${index}`} className={`cursor-pointer transition-colors ${notification.read ? 'bg-background' : 'bg-muted/50'}`}>
                      <CardContent className="p-4" onClick={() => markAsRead(notification)}>
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Az önce'}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Message Reply Dialog */}
          {selectedUser && settings.messagesEnabled && user && (
            <MessageDialog 
              isOpen={isMessageDialogOpen}
              onClose={() => {
                setIsMessageDialogOpen(false);
                setSelectedUser(null);
              }}
              recipient={selectedUser}
              currentUser={user}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}