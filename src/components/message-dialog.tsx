
"use client";

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Send } from 'lucide-react';
import type { User } from '@/lib/types';

interface MessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: User;
  currentUser: User;
}

export default function MessageDialog({ isOpen, onClose, recipient, currentUser }: MessageDialogProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSendMessage = async () => {
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Mesaj gönder
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        senderName: currentUser.name,
        senderUsername: currentUser.username,
        senderAvatarUrl: currentUser.avatarUrl,
        receiverId: recipient.uid,
        content: message.trim(),
        createdAt: serverTimestamp(),
        read: false
      });

      // Bildirim gönder
      await addDoc(collection(db, 'notifications'), {
        userId: recipient.uid,
        type: 'message',
        message: `${currentUser.name} size bir mesaj gönderdi`,
        createdAt: serverTimestamp(),
        read: false,
        relatedUserId: currentUser.uid
      });

      toast({ title: "Mesaj Gönderildi", description: `${recipient.name} kişisine mesajınız gönderildi.` });
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ variant: 'destructive', title: t.error, description: "Mesaj gönderilemedi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{recipient.name} kişisine mesaj gönder</DialogTitle>
          <DialogDescription>
            @{recipient.username} kullanıcısına özel mesaj gönderin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Mesajınızı yazın..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-h-[100px] resize-none"
            maxLength={1000}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {message.length}/1000
            </span>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                İptal
              </Button>
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
