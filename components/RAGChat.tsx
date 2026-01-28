import styles from "@/styles/ragchat.module.css";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

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

type RAGChatProps = {
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
  isLoading: boolean;
  streamingContent?: string;
};

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

const RAGChat = ({ onSendMessage, messages, isLoading, streamingContent }: RAGChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderSources = (sources: Source[]) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className={styles.sources}>
        <div className={styles.sourcesTitle}>Sources</div>
        {sources.map((source, idx) => (
          <div key={idx}>
            <div className={styles.sourceItem}>
              <span className={styles.sourceName}>{source.name}</span>
              <span className={styles.sourceScore}>{(source.score * 100).toFixed(0)}%</span>
            </div>
            {source.tags && source.tags.length > 0 && (
              <div className={styles.sourceTags}>
                {source.tags.slice(0, 3).map((tag, tagIdx) => (
                  <span key={tagIdx} className={styles.sourceTag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <button
        className={styles.chatButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>

      <div className={clsx(styles.chatPanel, { [styles.chatPanelOpen]: isOpen })}>
        <div className={styles.chatHeader}>
          <span className={styles.chatTitle}>Knowledge Base</span>
          <button
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.messagesContainer}>
          {messages.length === 0 && !streamingContent && !isLoading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <BrainIcon />
              </div>
              <p className={styles.emptyText}>
                Ask anything about my knowledge base.
                <br />
                I'll search through my notes to help you.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    styles.message,
                    msg.role === "user" ? styles.userMessage : styles.assistantMessage
                  )}
                >
                  {msg.content}
                  {msg.role === "assistant" && msg.sources && renderSources(msg.sources)}
                </div>
              ))}

              {streamingContent && (
                <div className={clsx(styles.message, styles.assistantMessage)}>
                  {streamingContent}
                </div>
              )}

              {isLoading && !streamingContent && (
                <div className={styles.loadingIndicator}>
                  <div className={styles.loadingDot} />
                  <div className={styles.loadingDot} />
                  <div className={styles.loadingDot} />
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.inputContainer} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="Ask a question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
};

export default RAGChat;
