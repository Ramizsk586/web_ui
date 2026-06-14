import { useState, useMemo, useEffect } from 'react';
import { SLASH_COMMANDS } from '../constants';

export function useInputState() {
  const [input, setInput] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const showsSlashCommands = input.startsWith('/') && !input.substring(1).includes(' ');
  const slashQuery = showsSlashCommands ? input.substring(1).toLowerCase() : '';
  
  const filteredCommands = useMemo(() => {
    if (!showsSlashCommands) return [];
    return SLASH_COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(slashQuery));
  }, [showsSlashCommands, slashQuery]);

  useEffect(() => {
    if (filteredCommands.length > 0 && selectedCommandIndex >= filteredCommands.length) {
      setSelectedCommandIndex(0);
    }
  }, [filteredCommands.length, selectedCommandIndex]);

  const [isTyping, setIsTyping] = useState(false);
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  return {
    input, setInput,
    selectedCommandIndex, setSelectedCommandIndex,
    showsSlashCommands,
    slashQuery,
    filteredCommands,
    isTyping, setIsTyping,
    activeSkills, setActiveSkills,
    typingMessageId, setTypingMessageId
  };
}
