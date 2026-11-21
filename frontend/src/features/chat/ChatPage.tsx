import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Send, Hash } from "lucide-react";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

export function ChatPage() {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channels } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: () => api.get("/chat/channels").then((r) => r.data),
  });

  // Set initial channel
  useEffect(() => {
    if (channels?.length && !activeChannel) {
      setActiveChannel(channels[0].id);
    }
  }, [channels, activeChannel]);

  // Socket.IO connection
  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    socket.on("new_message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("new_message");
      disconnectSocket();
    };
  }, []);

  // Join channel and fetch history
  useEffect(() => {
    if (!activeChannel) return;

    const socket = getSocket();
    socket.emit("join_channel", activeChannel);

    api
      .get(`/chat/channels/${activeChannel}/messages`)
      .then(({ data }) => setMessages(data));

    return () => {
      socket.emit("leave_channel", activeChannel);
    };
  }, [activeChannel]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !activeChannel) return;
    const socket = getSocket();
    socket.emit("send_message", {
      channelId: activeChannel,
      content: input.trim(),
    });
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Channel list */}
      <Card className="w-56 shrink-0 overflow-y-auto p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
          Channels
        </p>
        {(channels ?? []).map((ch: any) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              activeChannel === ch.id
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            <Hash className="h-4 w-4" />
            {ch.name}
          </button>
        ))}
      </Card>

      {/* Messages */}
      <Card className="flex flex-1 flex-col p-0">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="font-semibold">
            #{channels?.find((c: any) => c.id === activeChannel)?.name ?? ""}
          </h2>
        </div>

        {/* Message list */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.user.id === user?.id ? "flex-row-reverse" : ""}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                {msg.user.name.charAt(0)}
              </div>
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  msg.user.id === user?.id
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <p className="text-xs font-medium opacity-70">
                  {msg.user.name}
                </p>
                <p>{msg.content}</p>
                <p className="mt-1 text-[10px] opacity-50">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
