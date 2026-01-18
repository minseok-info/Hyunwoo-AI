import { useRouter } from "next/router";
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

const Sign = () => {
  const router = useRouter();

  const idRef = useRef<HTMLInputElement>(null);
  const pwdRef = useRef<HTMLInputElement>(null);

  const [id, setId] = useState<string>('');
  const [pwd, setPwd] = useState<string>('');

  const [enableSignIn, setEnableSignIn] = useState<boolean>(false);

  const signIn = async () => {
    if (!enableSignIn) return;
    setEnableSignIn(false);

    const auth = new FormData();
    auth.append("id", id);
    auth.append("pwd", pwd);

    try {
      const res = await fetch("https://hyunwoo-ai-backend.fly.dev/auth", {
        method: "POST",
        body: auth
      });

      if (res.ok) {
        await res.json().then((data) => {
          if (data.status === "failed") {
            window.alert(`Reason: ${data.reason}`);

            if (data.reason === "id") {
              setId("");
              setPwd("");
              idRef.current?.focus();
            }
            else {
              setPwd("");
              pwdRef.current?.focus();
            }
          }
          else {
            sessionStorage.setItem("auth", "true");
            router.replace("/admin");
          }
        }).catch(() => { window.alert("Call Adminstrator") });
      }
      else {
        router.reload();
      }
    }
    catch (error) {
      window.alert("Server Error");
    }
    finally {
      setEnableSignIn(true);
    }
  }

  useEffect(() => {
    if (id.length > 0 && pwd.length > 0) setEnableSignIn(true);
    else setEnableSignIn(false);
  }, [id, pwd]);

  return (
    <div className={`full flex flexColumn justifyCenter alignCenter`}>
      <div className={`flex flexColumn justifyCenter`}>
        <div className={`flex flexColumn`}>
          <input ref={idRef} type="text" value={id} onChange={(event: ChangeEvent<HTMLInputElement>) => setId(event.target.value)} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { event.key === "Enter" && signIn() }} />
          <input ref={pwdRef} type="password" value={pwd} onChange={(event: ChangeEvent<HTMLInputElement>) => setPwd(event.target.value)} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { event.key === "Enter" && signIn() }} />
        </div>
        <input type="button" className="pointer textCenter" value={'Sign In'} onClick={signIn} disabled={!enableSignIn} />
      </div>
    </div>
  );
}

export default Sign;