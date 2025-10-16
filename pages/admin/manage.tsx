import styles from "@/styles/admin.module.css";
import Menu from "@/components/menu";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type ItemType = {
  title: string,
  contents: string,
}

const Manage = () => {
  const router = useRouter();

  const [list, setList] = useState<Array<ItemType>>([{title: 'sample1', contents: 'yeah'}, {title: 'sample2', contents: 'yeah'}]);

  useEffect(() => {
    const query = router.query;
    const type = query.type;

    if (!type) {
      router.push("/admin");
    }
  }, []);

  return (
    <div className={`fullWidth flex flexColumn alignCenter ${styles.background}`}>
      <div className={`flex flexColumn ${styles.container}`}>
        <Menu />
        <p className={`pointer textCenter ${styles.add}`}>ADD</p>
        <div className={`${styles.list}`}>
          {
            list.map((item, index) => (
              <div className={`pointer ${styles.item}`} onClick={() => setList(list.filter((item, idx) => idx !== index))} key={index}>
                <div className="flex flexColumn justifyCenter textCenter">
                  <h3>{ item.title }</h3>
                  <p>{ item.contents }</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

export default Manage;