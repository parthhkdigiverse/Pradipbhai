import { useState, useRef, useEffect } from 'react';
import { 
  Search, MessageSquare, Paperclip, Smile, Send, Check, CheckCheck, 
  Reply, Forward, Copy, Download, Trash2, Edit3, Star, MoreVertical, 
  X, FileText, Eye
} from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  type: 'image' | 'file';
  size?: string;
}

interface ReplyInfo {
  id: number;
  text: string;
  senderName: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'them';
  time: string;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: ReplyInfo | null;
  attachment?: Attachment | null;
  reactions?: Record<string, string[]>; // emoji -> array of user names/types
  isStarred?: boolean;
  isForwarded?: boolean;
  isEdited?: boolean;
}

interface Contact {
  id: number;
  name: string;
  type: string;
  status: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}

const MOCK_CONTACTS: Contact[] = [
  { id: 1, name: "Pradip Bhai", type: "team", status: "online", lastMessage: "Can we review the latest designs?", time: "10:30 AM", unread: 2, avatar: "https://i.pravatar.cc/150?u=1" },
  { id: 2, name: "Sarah Smith", type: "team", status: "online", lastMessage: "I've uploaded the assets to the drive.", time: "09:15 AM", unread: 0, avatar: "https://i.pravatar.cc/150?u=3" },
  { id: 3, name: "Mike Johnson", type: "team", status: "offline", lastMessage: "Got it, thanks!", time: "Yesterday", unread: 0, avatar: "https://i.pravatar.cc/150?u=5" },
  { id: 4, name: "Alex Turner", type: "client", status: "online", lastMessage: "When can we expect the final invoice?", time: "2 days ago", unread: 1, avatar: "https://i.pravatar.cc/150?u=4" }
];

const INITIAL_MESSAGES: Record<number, Message[]> = {
  1: [
    { 
      id: 101, 
      text: "Hey! Did you get a chance to look at the new project mockups?", 
      sender: "them", 
      time: "10:15 AM",
      status: "read",
      reactions: { "👍": ["me"] }
    },
    { 
      id: 102, 
      text: "Yes, I just reviewed them. They look fantastic! Here is the revised preview image.", 
      sender: "me", 
      time: "10:20 AM",
      status: "read",
      attachment: {
        name: "dashboard_preview.png",
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        type: "image",
        size: "1.2 MB"
      }
    },
    { 
      id: 103, 
      text: "Can we review the latest designs?", 
      sender: "them", 
      time: "10:30 AM",
      status: "read",
      replyTo: { id: 102, text: "Yes, I just reviewed them. They look fantastic!", senderName: "Me" }
    }
  ],
  2: [
    { id: 201, text: "Hello, regarding the Q3 proposal assets...", sender: "them", time: "Yesterday, 2:00 PM", status: "read" },
    { id: 202, text: "I've uploaded the assets to the drive.", sender: "them", time: "09:15 AM", status: "read" }
  ],
  3: [
    { id: 301, text: "Can you verify the payment receipt?", sender: "them", time: "Yesterday, 4:00 PM", status: "read" },
    { id: 302, text: "Got it, thanks!", sender: "me", time: "Yesterday, 4:05 PM", status: "read" }
  ],
  4: [
    { id: 401, text: "When can we expect the final invoice?", sender: "them", time: "2 days ago", status: "delivered" }
  ]
};

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "👏", "✅"];

export function ChatPage() {
  const [activeContactId, setActiveContactId] = useState<number | null>(1);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Record<number, Message[]>>(INITIAL_MESSAGES);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showSearchInChat, setShowSearchInChat] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  
  // Interactive features states
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const activeContact = MOCK_CONTACTS.find(c => c.id === activeContactId);
  
  const rawMessages = activeContactId ? (messages[activeContactId] || []) : [];
  
  const currentMessages = rawMessages.filter(m => {
    if (showStarredOnly && !m.isStarred) return false;
    if (chatSearchQuery.trim() && !m.text.toLowerCase().includes(chatSearchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredContacts = MOCK_CONTACTS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContactId, pendingAttachments]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuMsgId !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('.msg-menu-container')) {
          setActiveMenuMsgId(null);
        }
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuMsgId]);

  // Handle Send or Update Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageText.trim() && pendingAttachments.length === 0) || !activeContactId) return;

    if (editingMsgId !== null) {
      // Edit existing message
      setMessages(prev => ({
        ...prev,
        [activeContactId]: (prev[activeContactId] || []).map(m => 
          m.id === editingMsgId ? { ...m, text: messageText, isEdited: true } : m
        )
      }));
      setEditingMsgId(null);
      setMessageText("");
      showToast("Message edited");
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Handle multiple attachments or text
    const newMsgs: Message[] = [];

    if (pendingAttachments.length > 0) {
      pendingAttachments.forEach((att, idx) => {
        newMsgs.push({
          id: Date.now() + idx,
          text: idx === 0 ? messageText : "",
          sender: "me",
          time: timeStr,
          status: "sent",
          attachment: att,
          replyTo: idx === 0 && replyingTo ? {
            id: replyingTo.id,
            text: replyingTo.text || (replyingTo.attachment ? `[${replyingTo.attachment.type}] ${replyingTo.attachment.name}` : ""),
            senderName: replyingTo.sender === "me" ? "Me" : activeContact?.name || "Them"
          } : null
        });
      });
    } else {
      newMsgs.push({
        id: Date.now(),
        text: messageText,
        sender: "me",
        time: timeStr,
        status: "sent",
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.attachment ? `[${replyingTo.attachment.type}] ${replyingTo.attachment.name}` : ""),
          senderName: replyingTo.sender === "me" ? "Me" : activeContact?.name || "Them"
        } : null
      });
    }

    setMessages(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), ...newMsgs]
    }));

    setMessageText("");
    setPendingAttachments([]);
    setReplyingTo(null);
    setEmojiPickerOpen(false);

    // Simulate contact typing and reply after 2s
    setTimeout(() => {
      setMessages(prev => ({
        ...prev,
        [activeContactId]: (prev[activeContactId] || []).map(m => 
          newMsgs.some(nm => nm.id === m.id) ? { ...m, status: "read" } : m
        )
      }));
    }, 1500);
  };

  // Drag and Drop Files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAtts: Attachment[] = fileArray.map(file => {
      const isImg = file.type.startsWith('image/');
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      return {
        name: file.name,
        url: URL.createObjectURL(file),
        type: isImg ? 'image' : 'file',
        size: sizeMb
      };
    });
    setPendingAttachments(prev => [...prev, ...newAtts]);
    showToast(`Added ${newAtts.length} attachment(s)`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(e.clipboardData.files);
    }
  };

  // File Upload via Button
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Copy Message Text
  const handleCopyMessage = (msg: Message) => {
    const content = msg.text || msg.attachment?.url || "";
    navigator.clipboard.writeText(content);
    showToast("Copied to clipboard!");
    setActiveMenuMsgId(null);
  };

  // Delete Message
  const handleDeleteMessage = (msgId: number) => {
    if (!activeContactId) return;
    setMessages(prev => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).filter(m => m.id !== msgId)
    }));
    showToast("Message deleted");
    setActiveMenuMsgId(null);
  };

  // Toggle Starred
  const handleToggleStar = (msgId: number) => {
    if (!activeContactId) return;
    setMessages(prev => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).map(m => 
        m.id === msgId ? { ...m, isStarred: !m.isStarred } : m
      )
    }));
    showToast("Updated starred status");
    setActiveMenuMsgId(null);
  };

  // React to Message
  const handleAddReaction = (msgId: number, emoji: string) => {
    if (!activeContactId) return;
    setMessages(prev => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).map(m => {
        if (m.id !== msgId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const users = currentReactions[emoji] || [];
        if (users.includes('me')) {
          currentReactions[emoji] = users.filter(u => u !== 'me');
          if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = [...users, 'me'];
        }
        return { ...m, reactions: currentReactions };
      })
    }));
    setActiveMenuMsgId(null);
  };

  // Forward Message
  const handleForwardSubmit = (targetContactId: number) => {
    if (!forwardingMsg) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const fwdMsg: Message = {
      id: Date.now(),
      text: forwardingMsg.text,
      sender: "me",
      time: timeStr,
      status: "sent",
      attachment: forwardingMsg.attachment,
      isForwarded: true
    };

    setMessages(prev => ({
      ...prev,
      [targetContactId]: [...(prev[targetContactId] || []), fwdMsg]
    }));

    const targetContact = MOCK_CONTACTS.find(c => c.id === targetContactId);
    showToast(`Forwarded to ${targetContact?.name}`);
    setForwardingMsg(null);
  };

  // Download / Save file
  const handleDownloadAttachment = (att: Attachment) => {
    const a = document.createElement('a');
    a.href = att.url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${att.name}...`);
  };

  return (
    <div className="w-full h-[calc(100vh-8.5rem)] min-h-[620px] flex gap-5 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-10 bg-gray-900/90 text-white px-4 py-2.5 rounded-xl shadow-xl z-50 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={lightboxImage} alt="Enlarged preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <button 
              onClick={() => setLightboxImage(null)} 
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleDownloadAttachment({ name: 'image.png', url: lightboxImage, type: 'image' })}
              className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all shadow-lg"
            >
              <Download className="w-4 h-4" /> Save Image
            </button>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardingMsg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setForwardingMsg(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white/60 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Forward className="w-5 h-5 text-primary" /> Forward Message
              </h3>
              <button onClick={() => setForwardingMsg(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="my-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 font-medium italic truncate">
              "{forwardingMsg.text || forwardingMsg.attachment?.name}"
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Recipient</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {MOCK_CONTACTS.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleForwardSubmit(contact.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/20 group"
                >
                  <div className="flex items-center gap-3">
                    <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-gray-800">{contact.name}</h4>
                      <p className="text-xs text-gray-400 font-medium capitalize">{contact.type}</p>
                    </div>
                  </div>
                  <span className="p-2 bg-primary/10 text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <Send className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Left Pane - Contact List */}
      <div className="w-1/3 max-w-[340px] glass-panel border border-white/60 rounded-3xl flex flex-col overflow-hidden shadow-sm shrink-0">
        <div className="p-5 border-b border-white/40 bg-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Chats</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowStarredOnly(!showStarredOnly)} 
                title="Starred Messages" 
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  showStarredOnly ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/60 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              const contactMsgs = messages[contact.id] || [];
              const lastMsgObj = contactMsgs[contactMsgs.length - 1];
              const displayLastMsg = lastMsgObj ? (lastMsgObj.text || (lastMsgObj.attachment ? `📷 Attachment` : '')) : contact.lastMessage;
              
              return (
                <button 
                  key={contact.id}
                  onClick={() => {
                    setActiveContactId(contact.id);
                    setReplyingTo(null);
                    setEditingMsgId(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    activeContactId === contact.id ? 'bg-primary/10 border-primary/40 shadow-sm' : 'hover:bg-white/40 border-transparent'
                  } border`}
                >
                  <div className="relative">
                    <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm" />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${contact.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className={`text-sm font-bold truncate ${activeContactId === contact.id ? 'text-primary' : 'text-gray-800'}`}>{contact.name}</h4>
                      <span className="text-[10px] font-semibold text-gray-400 shrink-0">{contact.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate font-medium">{displayLastMsg}</p>
                  </div>
                  {contact.unread > 0 && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                      {contact.unread}
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm font-medium">
              No chats found.
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Active Conversation Window */}
      {activeContact ? (
        <div 
          ref={chatContainerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 glass-panel border border-white/60 rounded-3xl flex flex-col overflow-hidden shadow-sm relative"
        >
          {/* Drag & Drop Visual Backdrop */}
          {isDragging && (
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-md z-40 flex flex-col items-center justify-center border-4 border-dashed border-primary rounded-3xl animate-in fade-in duration-150">
              <div className="p-6 bg-white rounded-3xl shadow-2xl flex flex-col items-center gap-3">
                <Paperclip className="w-12 h-12 text-primary animate-bounce" />
                <h3 className="text-lg font-black text-gray-800">Drop files here to send</h3>
                <p className="text-xs text-gray-500 font-medium">Images & Documents supported</p>
              </div>
            </div>
          )}

          {/* WhatsApp Header (Clean & Functional: Search in chat, Starred filter toggle) */}
          <div className="px-6 py-4 border-b border-white/40 bg-white/30 flex items-center justify-between shrink-0 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={activeContact.avatar} alt={activeContact.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${activeContact.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
              </div>
              <div>
                <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                  {activeContact.name}
                </h3>
                <p className="text-[11px] font-bold text-emerald-600 tracking-wide">
                  {activeContact.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Top Bar Actions (WhatsApp Search & Filters) */}
            <div className="flex items-center gap-2">
              {showSearchInChat ? (
                <div className="flex items-center gap-2 bg-white/80 border border-white/80 rounded-xl px-3 py-1 shadow-inner animate-in fade-in slide-in-from-right-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in chat..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-xs focus:outline-none w-36 text-gray-800 font-medium"
                    autoFocus
                  />
                  <button onClick={() => { setShowSearchInChat(false); setChatSearchQuery(""); }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowSearchInChat(true)}
                  className="p-2 text-gray-500 hover:text-primary hover:bg-white/50 rounded-xl transition-all"
                  title="Search messages"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white/10 to-white/20">
            {currentMessages.length > 0 ? (
              currentMessages.map(msg => {
                const isMe = msg.sender === "me";
                const isMenuOpen = activeMenuMsgId === msg.id;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                    
                    {/* Forwarded Tag */}
                    {msg.isForwarded && (
                      <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 mb-1 px-1 italic">
                        <Forward className="w-3 h-3" /> Forwarded
                      </span>
                    )}

                    {/* Message Bubble Container */}
                    <div className="relative flex items-center max-w-[75%] gap-2 msg-menu-container">
                      
                      {/* Action Menu Trigger (Visible on Hover / Click) */}
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'order-first' : 'order-last'}`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuMsgId(isMenuOpen ? null : msg.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 bg-white/60 rounded-lg backdrop-blur-sm shadow-sm hover:bg-white transition-all"
                          title="Message Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dropdown Options Box */}
                      {isMenuOpen && (
                        <div className={`absolute top-8 ${isMe ? 'right-0' : 'left-0'} z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 w-44 space-y-1 animate-in fade-in zoom-in-95`}>
                          
                          {/* Quick Emoji Reaction Row */}
                          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-xl mb-1 border border-gray-100 overflow-x-auto">
                            {COMMON_EMOJIS.slice(0, 5).map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleAddReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform text-sm p-1 rounded hover:bg-white"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => { setReplyingTo(msg); setActiveMenuMsgId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <Reply className="w-3.5 h-3.5" /> Reply
                          </button>

                          <button
                            onClick={() => handleCopyMessage(msg)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Text
                          </button>

                          <button
                            onClick={() => { setForwardingMsg(msg); setActiveMenuMsgId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <Forward className="w-3.5 h-3.5" /> Forward
                          </button>

                          <button
                            onClick={() => handleToggleStar(msg.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                          >
                            <Star className={`w-3.5 h-3.5 ${msg.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} /> 
                            {msg.isStarred ? 'Unstar' : 'Star Message'}
                          </button>

                          {msg.attachment && (
                            <button
                              onClick={() => { handleDownloadAttachment(msg.attachment!); setActiveMenuMsgId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                            >
                              <Download className="w-3.5 h-3.5" /> Download File
                            </button>
                          )}

                          {isMe && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setMessageText(msg.text);
                                  setActiveMenuMsgId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit Message
                              </button>

                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Main Message Content */}
                      <div className={`px-4 py-3 rounded-2xl shadow-sm relative ${
                        isMe 
                          ? 'bg-primary text-white rounded-br-sm' 
                          : 'bg-white text-gray-800 rounded-bl-sm border border-white/80'
                      }`}>

                        {/* Quoted / Replied Snippet */}
                        {msg.replyTo && (
                          <div className={`mb-2 p-2 rounded-xl text-xs border-l-4 ${
                            isMe 
                              ? 'bg-white/15 border-white text-white/90' 
                              : 'bg-gray-100 border-primary text-gray-700'
                          }`}>
                            <p className="font-bold text-[10px] opacity-80">{msg.replyTo.senderName}</p>
                            <p className="truncate font-medium">{msg.replyTo.text}</p>
                          </div>
                        )}

                        {/* Attachment Content (Images / Documents) */}
                        {msg.attachment && (
                          <div className="mb-2">
                            {msg.attachment.type === 'image' ? (
                              <div className="relative group/img overflow-hidden rounded-xl cursor-pointer" onClick={() => setLightboxImage(msg.attachment!.url)}>
                                <img src={msg.attachment.url} alt={msg.attachment.name} className="max-w-xs max-h-60 rounded-xl object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                                  <Eye className="w-4 h-4" /> View
                                </div>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                                isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                              }`}>
                                <FileText className="w-8 h-8 shrink-0 opacity-80" />
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                                  <p className="text-[10px] opacity-75">{msg.attachment.size || 'Document'}</p>
                                </div>
                                <button
                                  onClick={() => handleDownloadAttachment(msg.attachment!)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 text-gray-700'
                                  }`}
                                  title="Download File"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Text */}
                        {msg.text && (
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        )}

                        {/* Bottom Status / Meta Line inside bubble */}
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          {msg.isStarred && <Star className={`w-3 h-3 ${isMe ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'}`} />}
                          {msg.isEdited && <span className="text-[9px] opacity-75 italic">edited</span>}
                          <span className={`text-[10px] font-semibold ${isMe ? 'text-white/80' : 'text-gray-400'}`}>{msg.time}</span>
                          {isMe && (
                            <span className="text-white/90">
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 opacity-80" />
                              ) : (
                                <Check className="w-3.5 h-3.5 opacity-80" />
                              )}
                            </span>
                          )}
                        </div>

                      </div>

                    </div>

                    {/* Reactions Pill Display below bubble */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'mr-2' : 'ml-2'}`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className="bg-white/90 border border-gray-200 shadow-sm rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1 hover:scale-105 transition-transform"
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] text-gray-500">{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <h4 className="text-gray-700 font-bold mb-1">No messages found</h4>
                  <p className="text-gray-400 text-sm">Send a message or drag & drop files to start</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachments Bar */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 py-2 bg-white/80 border-t border-white/60 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-gray-500 shrink-0">Attachments:</span>
              {pendingAttachments.map((att, index) => (
                <div key={index} className="relative group bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm shrink-0">
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-xs font-medium text-gray-700 max-w-[120px] truncate">{att.name}</span>
                  <button 
                    onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== index))}
                    className="text-gray-400 hover:text-rose-500 rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Reply Banner Above Input */}
          {replyingTo && (
            <div className="px-5 py-2.5 bg-primary/10 border-t border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 min-w-0">
                <Reply className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0 text-xs">
                  <span className="font-bold text-primary">Replying to {replyingTo.sender === "me" ? "yourself" : activeContact.name}:</span>
                  <p className="text-gray-600 truncate font-medium">{replyingTo.text || (replyingTo.attachment ? `[Attachment]` : "")}</p>
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Editing Banner */}
          {editingMsgId && (
            <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 min-w-0 text-xs">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold text-amber-800">Editing message</span>
              </div>
              <button onClick={() => { setEditingMsgId(null); setMessageText(""); }} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* WhatsApp Chat Input Footer */}
          <div className="p-4 bg-white/40 border-t border-white/50 shrink-0 relative">

            {/* Emoji Selector Popover */}
            {emojiPickerOpen && (
              <div className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-30 w-64 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500">Pick Emoji</span>
                  <button onClick={() => setEmojiPickerOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setMessageText(prev => prev + emoji);
                        setEmojiPickerOpen(false);
                      }}
                      className="text-xl p-2 hover:bg-gray-100 rounded-xl transition-transform hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white/80 p-2 rounded-2xl shadow-sm border border-white">
              
              {/* Paperclip File Upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-primary hover:bg-white rounded-xl transition-all shrink-0"
                title="Attach file (or drag & drop / paste)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Multiline Textarea Input (Shift+Enter for newline, Enter to send) */}
              <textarea 
                rows={1}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={editingMsgId ? "Edit your message... (Shift+Enter for new line)" : "Type a message... (Shift+Enter for new line)"} 
                className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-gray-800 font-medium placeholder-gray-400 resize-none max-h-32 min-h-[40px] py-2 overflow-y-auto"
              />

              {/* Emoji Button */}
              <button 
                type="button" 
                onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                className={`p-2 rounded-xl transition-all shrink-0 ${emojiPickerOpen ? 'text-primary bg-primary/10' : 'text-gray-500 hover:text-gray-700 hover:bg-white'}`}
                title="Add emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={!messageText.trim() && pendingAttachments.length === 0}
                className="p-2.5 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white rounded-xl transition-all shrink-0 shadow-md group"
                title={editingMsgId ? "Save edit" : "Send message"}
              >
                {editingMsgId ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                )}
              </button>
            </form>

          </div>

        </div>
      ) : (
        <div className="flex-1 glass-panel border border-white/60 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
          <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Your Messages</h2>
          <p className="text-gray-500 text-sm max-w-sm">Select a conversation from the left to view messages and chat in real-time.</p>
        </div>
      )}

    </div>
  );
}
