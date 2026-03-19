import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, CreditCard, ClipboardList, Phone, UserPlus, MessageSquare, Settings, Send } from "lucide-react";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Sheet", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Referral", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Messages", path: "/candidate-dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Settings", path: "/candidate-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

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
    return <DashboardLayout title="Messages" navItems={CANDIDATE_NAV}><p>Loading...</p></DashboardLayout>;
  }

  if (rooms.length === 0) {
    return (
      <DashboardLayout title="Messages" navItems={CANDIDATE_NAV}>
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground">No Messages Yet</h3>
            <p className="text-sm text-muted-foreground mt-2">Your group chat will be available once a recruiter is assigned to your profile.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Messages" navItems={CANDIDATE_NAV}>
      <Card className="flex flex-col h-[calc(100vh-200px)]">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-secondary" />
            {rooms.find(r => r.id === activeRoom)?.room_name || "Group Chat"}
          </CardTitle>
          <div className="flex gap-2 mt-1 flex-wrap">
            {rooms.find(r => r.id === activeRoom)?.participants.map((p, i) => (
              <span key={i} className="text-[11px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                {p.full_name} · {p.user_role}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.is_system_message ? "items-center" : msg.sender_name === user?.profile?.full_name ? "items-end" : "items-start"}`}
            >
              {msg.is_system_message ? (
                <div className="text-xs text-muted-foreground italic bg-muted/50 rounded-full px-3 py-1">{msg.message_text}</div>
              ) : (
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.sender_name === user?.profile?.full_name ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="text-[11px] font-medium opacity-70 mb-0.5">{msg.sender_name} · {msg.sender_role}</p>
                  <p className="text-sm">{msg.message_text}</p>
                  <p className="text-[10px] opacity-50 mt-1">{new Date(msg.sent_at).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t border-border p-3 flex gap-2">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={e => e.key === "Enter" && handleSend()}
            maxLength={2000}
          />
          <Button variant="hero" size="sm" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </DashboardLayout>
  );
};

export default CandidateMessagesPage;
