import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Loader2 } from "lucide-react";

interface ChatRoom {
  id: string;
  room_name: string;
  participants: { full_name: string; user_role: string }[];
}

interface ChatMsg {
  id: string;
  sender_name: string;
  sender_role: string;
  message_text: string;
  is_system_message: boolean;
  sent_at: string;
}

interface ChatTabProps {
  candidateId: string;
}

const ChatTab = ({ candidateId }: ChatTabProps) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.myRooms().then(({ data }) => {
      // Find the room associated with this candidate
      // Since rooms are often named after the candidate or involve them
      const candidateRoom = data.find((r: ChatRoom) => 
        r.room_name.toLowerCase().includes(candidateId.toLowerCase()) || 
        r.participants.some(p => p.user_role === 'candidate')
      );
      
      setRooms(data);
      if (candidateRoom) {
        setActiveRoom(candidateRoom.id);
      } else if (data.length > 0) {
        // Fallback to first room if specific one not found by ID/name
        setActiveRoom(data[0].id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [candidateId]);

  useEffect(() => {
    if (!activeRoom) return;
    
    const fetchMessages = () => {
      chatApi.roomMessages(activeRoom).then(({ data }) => setMessages(data));
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeRoom) return;
    const msg = newMessage.trim();
    setNewMessage("");
    try {
      await chatApi.sendMessage(activeRoom, msg);
      const { data } = await chatApi.roomMessages(activeRoom);
      setMessages(data);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading chat...</div>;
  }

  if (!activeRoom) {
    return (
      <Card className="border-none shadow-sm bg-card/50">
        <CardContent className="py-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground">No Chat Case Found</h3>
          <p className="text-sm text-muted-foreground mt-2">A chat room will be created automatically for assigned candidates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-3 bg-muted/20">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-secondary" />
          {rooms.find(r => r.id === activeRoom)?.room_name || "Group Chat"}
        </CardTitle>
        <div className="flex gap-2 mt-1 flex-wrap">
          {rooms.find(r => r.id === activeRoom)?.participants.map((p, i) => (
            <span key={i} className="text-[10px] bg-background/50 border border-border/50 rounded-full px-2 py-0.5 text-muted-foreground font-medium">
              {p.full_name} · <span className="capitalize">{p.user_role}</span>
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.is_system_message ? "items-center" : msg.sender_name === user?.profile?.full_name ? "items-end" : "items-start"}`}
          >
            {msg.is_system_message ? (
              <div className="text-[10px] text-muted-foreground/70 italic bg-muted/30 rounded-full px-3 py-1 border border-border/20">{msg.message_text}</div>
            ) : (
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.sender_name === user?.profile?.full_name ? "bg-secondary text-secondary-foreground" : "bg-background border border-border/50 text-card-foreground"}`}>
                <div className="flex items-center justify-between gap-4 mb-1">
                   <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">{msg.sender_name} · {msg.sender_role}</p>
                   <p className="text-[9px] opacity-60 font-medium">{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-3 bg-muted/10 border-t border-border/50 flex gap-2">
        <Input
          className="bg-background/50 text-sm border-border/50 focus-visible:ring-secondary/30"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type your message to the candidate pool..."
          onKeyDown={e => e.key === "Enter" && handleSend()}
          maxLength={2000}
        />
        <Button variant="secondary" size="icon" className="shrink-0 h-10 w-10 text-white rounded-xl" onClick={handleSend} disabled={!newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default ChatTab;
