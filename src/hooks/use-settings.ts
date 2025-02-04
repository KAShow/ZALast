import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Settings = {
  restaurant: {
    name: string;
    tables: number;
    openTime: string;
    closeTime: string;
  };
  booking: {
    enabled: boolean;
    maxWaitTime: number;
    maxBookingsPerHour: number;
  };
  notifications: {
    sms: boolean;
    sound: boolean;
    reminderTime: number;
  };
};

const defaultSettings: Settings = {
  restaurant: {
    name: 'زاد السلطان',
    tables: 20,
    openTime: '12:00',
    closeTime: '00:00',
  },
  booking: {
    enabled: true,
    maxWaitTime: 30,
    maxBookingsPerHour: 10,
  },
  notifications: {
    sms: true,
    sound: true,
    reminderTime: 15,
  },
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          const settingsMap = data.reduce((acc, { key, value }) => {
            acc[key as keyof Settings] = value;
            return acc;
          }, {} as Settings);

          setSettings(settingsMap);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function updateSettings(newSettings: Partial<Settings>) {
    try {
      // Update local state immediately for better UX
      setSettings(prev => ({ ...prev, ...newSettings }));

      // Update each changed section in the database
      for (const [key, value] of Object.entries(newSettings)) {
        const { error } = await supabase
          .from('settings')
          .update({ value })
          .eq('key', key);

        if (error) throw error;
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error updating settings:', err);
      throw err;
    }
  }

  return { settings, loading, error, updateSettings };
}