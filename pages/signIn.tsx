import styles from "@/styles/signIn.module.css";
import clsx from "clsx";
import { useRouter } from "next/router";
import { useState } from "react";

const SignIn = () => {
  const router = useRouter();

  const [id, setId] = useState<string>("");
  const [pwd, setPwd] = useState<string>("");

  return (
    <div className={clsx(styles.signIn)}>
      <div className={clsx(styles.form)}>
        <div className={clsx(styles.input)}>
          <input type="text" />
          <input type="password" />
        </div>
        <input type="button" value={"Sign In"} />
      </div>
    </div>
  );
};

export default SignIn;