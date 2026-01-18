import { useState, useCallback } from "react";
import RAGChat from "./RAGChat";
import { queryRAGStream } from "@/utils/ragApi";

type Source = {
  name: string;
  tags: string[];
  score: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

const RAGChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");

  const handleSendMessage = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);
    setStreamingContent("");

    try {
      let fullContent = "";
      let sources: Source[] = [];

      for await (const event of queryRAGStream(message)) {
        if (event.type === "chunk" && event.content) {
          fullContent += event.content;
          setStreamingContent(fullContent);
        } else if (event.type === "done" && event.sources) {
          sources = event.sources.map((s) => ({
            name: s.name,
            tags: s.tags,
            score: s.score,
          }));
        }
      }

      setStreamingContent("");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullContent, sources },
      ]);
    } catch (error) {
      console.error("RAG query failed:", error);
      setStreamingContent("");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, an error occurred. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <RAGChat
      onSendMessage={handleSendMessage}
      messages={messages}
      isLoading={isLoading}
      streamingContent={streamingContent}
    />
  );
};

export default RAGChatContainer;
