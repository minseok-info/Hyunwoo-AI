import styles from "@/styles/admin.module.css";
import Menu from "@/components/menu";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";

type ItemType = {
  id?: number,
  title: string,
  content: string,
}

type DataType = { type: "leftNeuron" | "rightNeuron" } & ItemType

type Props = {
  query: any,
}

const Manage = ({ query }: Props) => {
  const router = useRouter();

  const [data, setData] = useState<DataType[]>([]);
  const [list, setList] = useState<ItemType[]>([]);

  const [changeList, setChangeList] = useState<DataType[]>([]);
  const [deleteList, setDeleteList] = useState<number[]>([]);

  const [enableSave, setEnableSave] = useState<boolean>(true);

  const addItem = () => {
    const tempItem: ItemType = {
      title: "새로운 제목",
      content: "새로운 내용",
    }

    setList([tempItem, ...list]);
  }

  const changeDesc = (event: ChangeEvent<HTMLInputElement>, type: "title" | "content", index: number) => {
    const desc = event.target.value;
    let tempList: ItemType[] = [...list];

    const title = type === "title" ? desc : list[index].title;
    const content = type === "content" ? desc : list[index].content;

    tempList[index] = {
      ...tempList[index],
      title: title,
      content: content,
    }

    setList(tempList);
    let changedList: DataType[] = [...changeList];

    if (list[index].id) {
      const changedIndex = changedList.findIndex(item => item.id === list[index].id);

      if (changedIndex !== -1) {
        changedList[changedIndex] = {
          type: query.type,
          ...list[index],
          title: title,
          content: content,
        }

        setChangeList(changedList);
      }
      else {
        setChangeList([...changeList, {
          type: query.type,
          ...list[index],
          title: title,
          content: content,
        }]);
      }
    }
  }

  const deleteItem = (index: number) => {
    if (list[index].id) {
      setDeleteList([...deleteList, list[index].id]);
    }

    setList(list.filter((item, idx) => idx !== index));
  }

  const save = async () => {
    setEnableSave(false);

    const addList = list.filter(item => !item.id).map(item => ({
      type: query.type,
      ...item,
    }));
    const updateList = [...addList, ...changeList];

    try {
      if (updateList.length > 0) {
        const response = await fetch("https://hyunwoo-ai-backend.fly.dev/thoughts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updateList),
        });
  
        if (response.ok) {
          const result = await response.json();
          console.log(result);
        }
        else {
          window.alert("Call Adminstrator");
          router.reload();
        }
      }
  
      if (deleteList.length > 0) {
        const response = await fetch("https://hyunwoo-ai-backend.fly.dev/thoughts", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(deleteList),
        });
  
        if (response.ok) {
          const result = await response.json();
          console.log(result);
        }
        else {
          window.alert("Call Adminstrator");
          router.reload();
        }
      }
    }
    catch (error) {
      console.error(error)
      window.alert("Call Adminstrator");
      router.reload();
    }

    setEnableSave(true);
  }

  useEffect(() => {
    let tempList: ItemType[] = [];
    data.forEach((item) => {
      if (item.type === query.type) {
        tempList.push({ id: item.id, title: item.title, content: item.content });
      }
    });

    setList(tempList);
  }, [data]);

  useEffect(() => {
    const auth = sessionStorage.getItem("auth");
    if (!auth) {
      router.replace("/sign");
    }

    const type = query.type;
    if (!type) {
      router.push("/admin");
    }

    const fetchData = async () => {
      try {
        const res = await fetch("https://hyunwoo-ai-backend.fly.dev/thoughts", {
          method: "GET",
        });
  
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      }
      catch (error) {
        setData([]);
      }
    }

    fetchData();
  }, []);

  return (
    <div className={`fullWidth flex flexColumn alignCenter ${styles.background}`}>
      <div className={`flex flexColumn ${styles.container}`}>
        <Menu />
        <input type="button" className={`pointer ${styles.save}`} onClick={save} value={"저장"} disabled={!enableSave} />
        <p className={`pointer textCenter ${styles.add}`} onClick={addItem}>ADD</p>
        <div className={`${styles.list}`}>
          {
            list.map((item, index) => (
              <div className={`${styles.item}`} key={index}>
                <div className="flex justifyCenter textCenter">
                  <div className={`flex flexColumn textStart ${styles.desc}`}>
                    <input type="text" value={item.title} onChange={(event: ChangeEvent<HTMLInputElement>) => changeDesc(event, "title", index)} />
                    <input type="text" value={item.content} onChange={(event: ChangeEvent<HTMLInputElement>) => changeDesc(event, "content", index)} />
                  </div>
                  <div className={`pointer flex alignCenter textEnd ${styles.del}`} onClick={() => deleteItem(index)}>
                    <h4>x</h4>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { query } = context;

  return {
    props: {
      query: query,
    },
  }
}

export default Manage;