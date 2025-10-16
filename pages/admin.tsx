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
      <p onClick={() => router.push("/admin/manage?type=planet")}>행성 관리</p>
      <p onClick={() => router.push("/admin/manage?type=neuron")}>뉴런 관리</p>
    </div>
  );
}

export default Admin;