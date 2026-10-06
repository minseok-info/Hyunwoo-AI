import styles from "@/styles/signIn.module.css";
import clsx from "clsx";
import { useRouter } from "next/router";
import { KeyboardEvent, useEffect, useState } from "react";

const SignIn = () => {
  const router = useRouter();

  const [id, setId] = useState<string>("");
  const [pwd, setPwd] = useState<string>("");

  const [isSubmitAbled, setIsSubmitAbled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!isSubmitAbled) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append("id", id);
    formData.append("pwd", pwd);

    try {
      const serverUrl = "https://hyunwoo-ai-backend.fly.dev/";
      const res = await fetch(`${serverUrl}signin`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) return;

      await res.json().then(j => {
        if (j.status === "failed") {
          window.alert(`Reason: ${j.reason}`);

          if (j.reason === "id") {
            setId("");
            setPwd("");
          }
          else {
            setPwd("");
          }
        }
        else {
          document.cookie = `access_token=${j.access_token}; path=/; max-age=${6*60*60}; SameSite=Lax`;
          router.replace("/admin");
        }
      });
    }
    catch(error) {
      window.alert("Server Error");
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    const key = event.key;

    if (key === "Enter") handleSubmit();
  };
  
  useEffect(() => {
    const normalizedId = id.replace(/ /g, "");
    const normalizedPwd = pwd.replace(/ /g, "");

    if (normalizedId !== "" && normalizedPwd !== "") setIsSubmitAbled(true);
    else setIsSubmitAbled(false);
  }, [id, pwd]);

  return (
    <div className={clsx(styles.signIn)}>
      <div className={clsx(styles.form)}>
        <div className={clsx(styles.input)}>
          <input type="text" placeholder="ID" value={id} onChange={(event) => setId(event.target.value)} onKeyDown={handleEnter} />
          <input type="password" placeholder="PWD" value={pwd} onChange={(event) => setPwd(event.target.value)} onKeyDown={handleEnter} />
        </div>
        <input type="button" value={isLoading ? "Loading" : "Sign In"} onClick={handleSubmit} disabled={!isSubmitAbled || isLoading} />
      </div>
    </div>
  );
};

export default SignIn;