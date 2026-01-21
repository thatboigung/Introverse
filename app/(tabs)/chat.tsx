import MessagesList from '@/components/MessagesList';
import { useRouter } from 'expo-router';
import React from 'react';

export default function MessagesScreen() {
  const router = useRouter();

  return (
    <MessagesList
      onSelectConversation={(conversationId) => {
        router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
      }}
    />
  );
}
