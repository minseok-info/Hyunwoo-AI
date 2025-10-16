import styles from "@/styles/menu.module.css";
import { useRouter } from "next/router";

const Menu = () => {
  const router = useRouter();

  return (
    <div className="flex">
      <h4 className={`pointer ${styles.menu}`} onClick={() => router.back()}>{`< 뒤로가기`}</h4>
    </div>
  );
}

export default Menu;