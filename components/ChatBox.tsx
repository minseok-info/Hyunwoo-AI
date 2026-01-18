import styles from "@/styles/chatBox.module.css";
import clsx from "clsx";

const ChatBox = ({ isToggled }: { isToggled: boolean }) => {
  return (
    <div className={clsx(styles.chatBox, { [styles.expand]: isToggled })}>
      <div>
      </div>
      <div>
        <input type="text" placeholder="Chat with AI" />
      </div>
    </div>
  );
};

export default ChatBox;