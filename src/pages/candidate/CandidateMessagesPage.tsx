import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Send,
  Loader2,
  AlertTriangle
} from "lucide-react";

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

const CandidateMessagesPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.myRooms().then(({ data }) => {
      setRooms(data);
      if (data.length === 1) setActiveRoom(data[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    chatApi.roomMessages(activeRoom).then(({ data }) => setMessages(data));
    const interval = setInterval(() => {
      chatApi.roomMessages(activeRoom).then(({ data }) => setMessages(data));
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeRoom) return;
    await chatApi.sendMessage(activeRoom, newMessage.trim());
    setNewMessage("");
    const { data } = await chatApi.roomMessages(activeRoom);
    setMessages(data);
  };

  if (loading) {
    return <div className="py-20 text-center"><p className="text-muted-foreground animate-pulse font-medium">Loading messages...</p></div>;
  }

  if (rooms.length === 0) {
    return (
      <Card className="max-w-lg mx-auto mt-12 glass-card border-none shadow-2xl overflow-hidden animate-in">
        <CardContent className="py-16 text-center">
          <div className="mx-auto h-20 w-20 bg-muted/20 rounded-3xl flex items-center justify-center mb-6">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-2xl font-bold text-card-foreground">No Messages Yet</h3>
          <p className="text-muted-foreground mt-3 text-base max-w-[280px] mx-auto leading-relaxed">Your group chat will be available once a recruiter is assigned to your profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Messages
        </h1>
        <p className="text-muted-foreground">
          Communicate with your assigned support team.
        </p>
      </div>

      <Card className="flex flex-col h-[600px] border-none shadow-xl bg-card transition-all overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {rooms.find(r => r.id === activeRoom)?.room_name || "Group Chat"}
            </CardTitle>
            <div className="flex gap-2 flex-wrap justify-end">
              {rooms.find(r => r.id === activeRoom)?.participants.map((p, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/5 text-primary border-primary/10">
                  {p.full_name} · {p.user_role}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.is_system_message ? "items-center" : msg.sender_name === user?.profile?.full_name ? "items-end" : "items-start"}`}
            >
              {msg.is_system_message ? (
                <div className="text-[11px] text-muted-foreground/60 font-bold uppercase tracking-widest bg-muted/30 rounded-full px-4 py-1 mb-2 italic">
                  {msg.message_text}
                </div>
              ) : (
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${msg.sender_name === user?.profile?.full_name ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border/50 rounded-tl-none"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${msg.sender_name === user?.profile?.full_name ? "text-primary-foreground/70" : "text-primary"}`}>
                      {msg.sender_name}
                    </p>
                    <span className="text-[9px] opacity-40 font-bold">•</span>
                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-tighter italic">
                      {msg.sender_role}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.message_text}</p>
                  <p className={`text-[9px] mt-2 font-medium opacity-40 text-right`}>
                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t border-border/40 p-4 bg-muted/10 flex gap-3 items-center">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Write your message..."
            className="flex-1 bg-background/80 border-border/50 h-12 rounded-xl px-4 focus-visible:ring-primary/20"
            onKeyDown={e => e.key === "Enter" && handleSend()}
            maxLength={2000}
          />
          <Button 
            variant="hero" 
            size="icon" 
            className={`h-12 w-12 rounded-xl transition-all ${newMessage.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
            onClick={handleSend} 
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CandidateMessagesPage;
