/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/ChatSidebar.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, PenSquare, Plus, Trash2, LogOut } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { generateChatId } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { usePrivy } from "@privy-io/react-auth";
import { SyncLoader, FadeLoader } from "react-spinners";

interface Chat {
  id: string;
  title: string;
  updatedAt: Date;
}

interface ChatSidebarProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  showToggleButton?: boolean;
}

export function ChatSidebar({ isOpen: externalIsOpen, setIsOpen: externalSetIsOpen, showToggleButton = true }: ChatSidebarProps) {
  // For internal state management if not controlled externally
  const [internalIsOpen, setInternalIsOpen] = useState(true);

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [prevChats, setPrevChats] = useState<Chat[]>([]);
  const router = useRouter();
  const { user } = usePrivy();
  const params = useParams();

  // Extract fetchChats to component level so it can be called from multiple places
  const fetchChats = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/chats?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch chats');

      const data = await response.json();

      // If we have an active chat ID but it's not in the returned chats,
      // this might be a newly created chat that hasn't been saved yet
      if (params?.chatId && data.findIndex((c: { id: string | string[]; }) => c.id === params.chatId) === -1) {
        // Add a temporary entry for the current chat
        const currentChat = {
          id: params.chatId,
          title: 'New Chat',
          updatedAt: new Date()
        };
        data.unshift(currentChat);
      }

      setChats(data);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [user?.id, params?.chatId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleNewChat = async () => {
    const chatId = generateChatId();

    // Add new chat to the list immediately
    const newChat: Chat = {
      id: chatId,
      title: "New Chat",
      updatedAt: new Date()
    };

    setChats(prev => [newChat, ...prev]);

    // Navigate first (before API call)
    router.push(`/chat/${chatId}`);

    try {
      // Create chat in database after navigation
      await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId,
          userId: user?.id,
          title: "New Chat"
        })
      });
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create new chat');
    }
  };

  const handleEditTitle = async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSavingTitle(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });

      if (!response.ok) throw new Error("Failed to update title");

      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      ));
      setEditingChatId(null);
      toast.success("Chat title updated");
    } catch (error) {
      toast.error("Failed to update chat title");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    e.preventDefault();

    setDeletingChatId(chatId);

    // Check if this is the last chat before removing it
    const isLastChat = chats.length === 1;
    const isActiveChatBeingDeleted = params?.chatId === chatId;
    let newChatId;

    try {
      // Update UI first for responsiveness
      if (!isActiveChatBeingDeleted) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
      }

      // If we're deleting the active chat, prepare navigation
      if (isActiveChatBeingDeleted) {
        if (isLastChat) {
          // Create a new chat if this is the last one
          newChatId = generateChatId();
          const newChat = {
            id: newChatId,
            title: 'New Chat',
            updatedAt: new Date()
          };

          setChats([newChat]);

          // Navigate immediately
          router.push(`/chat/${newChatId}`);
        } else {
          // Find another chat to navigate to
          const nextChat = chats.find(chat => chat.id !== chatId);
          if (nextChat) {
            router.push(`/chat/${nextChat.id}`);
          }
        }
      }

      // Delete from database
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete chat');

      // If deleting active last chat, create a new one
      if (isLastChat && isActiveChatBeingDeleted && newChatId) {
        await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chatId: newChatId,
            userId: user?.id,
            title: 'New Chat'
          })
        });
      }

      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');

      // Now fetchChats is properly in scope
      fetchChats();
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <>
      {/* Toggle button - only show if showToggleButton is true AND screen is at least medium size */}
      {showToggleButton && (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          initial={false}
          animate={{
            x: isOpen ? 0 : 12,
            right: isOpen ? 280 : 0
          }}
          transition={{ duration: 0.2 }}
          className="fixed top-24 z-30 p-2 bg-monad-black border border-monad-purple/40 !rounded-l hover:bg-monad-berry transition-all duration-200 hidden md:block"
        >
          {isOpen ?
            <ChevronRight className="h-4 w-4 text-monad-offwhite hover:text-white transition-colors duration-200" /> :
            <ChevronLeft className="h-4 w-4 text-monad-offwhite hover:text-white transition-colors duration-200" />
          }
        </motion.button>
      )}

      {/* Sidebar - keep the same animations */}
      <motion.div
        initial={{ width: 280, x: 0 }}
        animate={{
          width: isOpen ? 280 : 0,
          x: isOpen ? 0 : 280
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="h-full border-l border-zinc-800 bg-monad-offwhite overflow-hidden rounded-md"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-none">
                <h2 className="text-xl font-semibold text-center text-monad-berry">Chats History</h2>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <FadeLoader color="purple" height={4} width={4} />
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-zinc-500 text-center py-4">
                    No chat history
                  </div>
                ) : (
                  chats.map((chat) => (
                    <motion.div
                      key={chat.id}
                      className={`
                        group relative rounded-lg p-3 border border-zinc-700
                        hover:bg-monad-berry hover:text-white hover:border-monad-berry
                        transition-all duration-200 cursor-pointer 
                        ${params?.chatId === chat.id
                          ? 'bg-zinc-100 text-black border-l-4 border-monad-berry'
                          : 'bg-monad-offwhite text-black'}
                      `}
                      onClick={() => router.push(`/chat/${chat.id}`)}
                      initial={chat.id === params?.chatId ? { opacity: 0, x: -20 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {editingChatId === chat.id ? (
                        <div className="flex items-center justify-center w-full">
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={() => handleEditTitle(chat.id, newTitle)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditTitle(chat.id, newTitle);
                              }
                            }}
                            className="w-full bg-transparent border-b border-monad-berry outline-none text-center"
                            autoFocus
                          />
                          {savingTitle && (
                            <div className="absolute right-3">
                              <SyncLoader color="#836EF9" size={4} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-sm block text-center truncate">
                            {chat.title || chat.id}
                          </span>
                          <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity duration-200 ${params?.chatId === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChatId(chat.id);
                                setNewTitle(chat.title || chat.id);
                              }}
                              className="p-1 rounded-md transition-colors duration-200"
                              disabled={deletingChatId === chat.id}
                            >
                              <PenSquare className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteChat(e, chat.id)}
                              className="p-1 rounded-md transition-all duration-200 group/delete"
                              disabled={deletingChatId === chat.id}
                            >
                              {deletingChatId === chat.id ? (
                                <SyncLoader color="#ef4444" size={4} />
                              ) : (
                                <Trash2 className="h-4 w-4 text-zinc-500 group-hover:text-white group-hover/delete:text-red-100" />
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-zinc-800 bg-monad-offwhite flex flex-col gap-2 justify-center border-b">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewChat}
                    className="flex-[0.8] flex items-center justify-center gap-2 p-2 bg-monad-berry hover:opacity-90 rounded-full text-white text-sm transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Chat</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push('/');
                      toast.success('Left chat room');
                    }}
                    className="flex-[0.2] p-2 rounded-md bg-red-900 hover:bg-red-500 text-white transition-colors flex items-center justify-center"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}