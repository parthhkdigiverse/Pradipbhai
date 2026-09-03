import { useState, useRef, useEffect } from 'react';
import { Search, MessageSquare, Paperclip, Smile, Send, Phone, Video, Info } from 'lucide-react';

// Mock Data
const MOCK_CONTACTS = [
  { id: 1, name: "Pradip Bhai", type: "team", status: "online", lastMessage: "Can we review the latest designs?", time: "10:30 AM", unread: 2, avatar: "https://i.pravatar.cc/150?u=1" },
  { id: 3, name: "Sarah Smith", type: "team", status: "online", lastMessage: "I've uploaded the assets to the drive.", time: "09:15 AM", unread: 0, avatar: "https://i.pravatar.cc/150?u=3" },
  { id: 5, name: "Mike Johnson", type: "team", status: "offline", lastMessage: "Got it, thanks!", time: "Last Week", unread: 0, avatar: "https://i.pravatar.cc/150?u=5" },
];

const MOCK_MESSAGES: Record<number, any[]> = {
  1: [
    { id: 101, text: "Hey! Did you get a chance to look at the new mockups?", sender: "them", time: "10:15 AM" },
    { id: 102, text: "Yes, I just reviewed them. They look fantastic!", sender: "me", time: "10:20 AM" },
    { id: 103, text: "Can we review the latest designs?", sender: "them", time: "10:30 AM" },
  ],
  2: [
    { id: 201, text: "Hello, regarding the Q3 proposal...", sender: "them", time: "Yesterday, 2:00 PM" },
    { id: 202, text: "I've made the requested changes.", sender: "me", time: "Yesterday, 3:30 PM" },
    { id: 203, text: "The proposal looks great.", sender: "them", time: "Yesterday, 4:15 PM" },
  ]
};

export function ChatPage() {
  const [activeContactId, setActiveContactId] = useState<number | null>(1);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Record<number, any[]>>(MOCK_MESSAGES);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeContact = MOCK_CONTACTS.find(c => c.id === activeContactId);
  const currentMessages = activeContactId ? (messages[activeContactId] || []) : [];

  const filteredContacts = MOCK_CONTACTS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeContactId) return;

    const newMessage = {
      id: Date.now(),
      text: messageText,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMessage]
    }));
    
    setMessageText("");
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] min-h-[600px] flex gap-6 relative">
      
      {/* Left Pane - Contact List */}
      <div className="w-1/3 max-w-[350px] glass-panel border border-white/60 rounded-3xl flex flex-col overflow-hidden shadow-sm shrink-0">
        <div className="p-5 border-b border-white/40 bg-white/20">
          <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4">Messages</h2>
          
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/60 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <button 
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all mb-1 ${activeContactId === contact.id ? 'bg-primary/10 border-primary/50' : 'hover:bg-white/40 border-transparent'} border`}
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
                  <p className="text-xs text-gray-500 truncate font-medium">{contact.lastMessage}</p>
                </div>
                {contact.unread > 0 && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                    {contact.unread}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm font-medium">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Chat Window */}
      {activeContact ? (
        <div className="flex-1 glass-panel border border-white/60 rounded-3xl flex flex-col overflow-hidden shadow-sm relative">
          
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-white/40 bg-white/20 flex items-center justify-between shrink-0 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={activeContact.avatar} alt={activeContact.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${activeContact.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800">{activeContact.name}</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{activeContact.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-primary hover:bg-white/50 rounded-xl transition-all"><Phone className="w-5 h-5" /></button>
              <button className="p-2 text-gray-400 hover:text-primary hover:bg-white/50 rounded-xl transition-all"><Video className="w-5 h-5" /></button>
              <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all ml-2"><Info className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-white/10">
            {currentMessages.length > 0 ? (
              currentMessages.map(msg => {
                const isMe = msg.sender === "me";
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[70%] px-5 py-3 rounded-2xl shadow-sm relative group ${
                      isMe 
                        ? 'bg-primary text-white rounded-br-sm' 
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                    }`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 mt-1.5 px-1">{msg.time}</span>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <h4 className="text-gray-700 font-bold mb-1">No messages yet</h4>
                  <p className="text-gray-400 text-sm">Send a message to start the conversation</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white/30 border-t border-white/40 shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white/70 p-2 rounded-2xl shadow-sm border border-white">
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..." 
                className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-gray-800 font-medium placeholder-gray-400"
              />
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                <Smile className="w-5 h-5" />
              </button>
              <button 
                type="submit" 
                disabled={!messageText.trim()}
                className="p-2.5 bg-primary hover:bg-primary disabled:bg-gray-300 text-white rounded-xl transition-all shrink-0 shadow-md group"
              >
                <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="flex-1 glass-panel border border-white/60 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
          <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Your Messages</h2>
          <p className="text-gray-500 text-sm max-w-sm">Select a conversation from the sidebar or start a new one to begin chatting.</p>
        </div>
      )}
    </div>
  );
}
