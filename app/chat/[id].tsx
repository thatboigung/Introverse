import ChatDetail from '@/components/ChatDetail';
import { getUserProfile } from '@/utils/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

export default function ChatRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = params.id ?? 'you';
  const [contactName, setContactName] = useState('Loading...');

  useEffect(() => {
    const loadContactName = async () => {
      if (conversationId === 'you') {
        const profile = await getUserProfile();
        setContactName(profile?.name || 'You');
      } else if (conversationId === 'you2') {
        setContactName('You');
      } else if (conversationId === 'notes') {
        setContactName('Notes');
      } else if (conversationId === 'reminders') {
        setContactName('Reminders');
      } else {
        setContactName('Contact');
      }
    };
    loadContactName();
  }, [conversationId]);

  if (contactName === 'Loading...') {
    return null;
  }

  return (
    <ChatDetail
      conversationId={conversationId}
      contactName={contactName}
      onBack={() => router.back()}
    />
  );
}

