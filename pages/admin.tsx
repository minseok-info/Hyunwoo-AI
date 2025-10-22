import styles from "@/styles/admin.module.css";
import { useRouter } from "next/router";
import { useEffect } from "react";

const Admin = () => {
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem("auth");

    if (!auth) {
      router.replace("/sign");
    }
  }, []);

  return (
    <div className={`full flex flexColumn justifyCenter alignCenter ${styles.category}`}>
      <div className="flex">
        <p onClick={() => router.push("/admin/manage?type=leftNeuron")}>좌측 뉴런</p>
        <p onClick={() => router.push("/admin/manage?type=rightNeuron")}>우측 뉴런</p>
      </div>
      <p onClick={() => router.push("/")}>모델로 돌아가기</p>
    </div>
  );
}

export default Admin;