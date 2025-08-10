
"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SystemSettings } from '@/lib/types';

interface SystemSettingsContextType {
    settings: SystemSettings;
    loading: boolean;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<SystemSettings>({
        commentsEnabled: true,
        messagesEnabled: true,
        updatedAt: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'systemSettings', 'global'),
            (doc) => {
                if (doc.exists()) {
                    setSettings(doc.data() as SystemSettings);
                } else {
                    // Varsayılan ayarlar
                    setSettings({
                        commentsEnabled: true,
                        messagesEnabled: true,
                        updatedAt: new Date()
                    });
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching system settings:", error);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, []);

    return (
        <SystemSettingsContext.Provider value={{ settings, loading }}>
            {children}
        </SystemSettingsContext.Provider>
    );
};

export const useSystemSettings = (): SystemSettingsContextType => {
    const context = useContext(SystemSettingsContext);
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
};
