"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Home, Compass, Bell, User, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useCreatePost } from "@/hooks/use-create-post";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { onOpen } = useCreatePost();
  const { user } = useAuth();
  const { toast } = useToast();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Okunmamış bildirim sayısını takip et
  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNavClick = (href: string, isCreatePost?: boolean, label?: string) => {
    if (href === "/" || !href.startsWith("/")) {
      if (isCreatePost) {
        onOpen(); // Assuming onOpen is for creating a post
        return;
      }
      router.push(href);
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Giriş Yapın",
        description: `${label} sayfasına erişmek için giriş yapmanız gerekiyor.`,
      });
      return;
    }

    router.push(href);
  };

  const navItems = [
    { href: "/", label: t.home, icon: Home },
    { href: "/explore", label: t.explore, icon: Compass },
    { href: "#", label: t.createPost, icon: PenSquare, isCreatePost: true }, // Changed href to "#" and added isCreatePost
    { href: "/notifications", label: t.notifications, icon: Bell },
    { href: "/profile", label: t.profile, icon: User }, // Updated href to /profile
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-t">
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavClick(item.href, item.isCreatePost, item.label)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md transition-colors relative",
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <item.icon className="w-6 h-6" />
              {item.href === "/notifications" && unreadNotifications > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </div>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}