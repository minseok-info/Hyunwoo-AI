import { Modal, NodeEditor, SidebarNavigator } from "@/components";
import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/admin.module.css";
import { Node, Ontology, Relation, Tree } from "@/types/ontologyTypes";
import { ontologyCompare, ontologyToTree, treeToOntology, treeUtils } from "@/utils";
import clsx from "clsx";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css"

const Admin = () => {
  const { query, pathname, push } = useRouter();
  const treeRef = useRef<Tree[]>([]);

  const serverUrlRef = useRef<string>("");
  const isUsingServerRef = useRef<boolean>(false);

  const initialOntologyRef = useRef<Ontology | null>(null);
  const [ontology, setOntology] = useState<Ontology | null>(null);

  const [treeId, setTreeId] = useState<Tree["treeId"]>("");
  const [nodePath, setNodePath] = useState<Tree[]>([]);
  const [tree, setTree] = useState<Tree[]>([]);
  const [sortedTree, setSortedTree] = useState<Tree[]>([]);

  const [nodeId, setNodeId] = useState<Tree["nodeId"]>("");

  const [modalTrigger, setModalTrigger] = useState<number>(0);
  const [modalData, setModalData] = useState<{ message: string; status: boolean }>({ message: "", status: false });

  const getOntology = async () => {
    if (isUsingServerRef.current) return;
    isUsingServerRef.current = true;

    let newOntology: Ontology | null = null;

    try {
      const serverUrl = serverUrlRef.current;
      const res = await fetch(`${serverUrl}ontology`, {
        method: "GET"
      });
      if (!res.ok) return;

      await res.json().then(j => {
        const resOnt = j["ontology"] as Ontology;

        const resNodes: Node[] = resOnt["nodes"].map((r: any) => ({ ...r, desc: r.description }));
        const resRels: Relation[] = resOnt["relations"].map((r: any) => ({ from: r.from_, to: r.to_, type: r.type }));

        newOntology = { nodes: resNodes, relations: resRels };
      });
    }
    catch (error) {
      console.error(error);
      setModalData({ message: "Failed to get ontology", status: false });
      setModalTrigger(prev => prev + 1);
    }
    finally {
      setOntology(newOntology);
      initialOntologyRef.current = newOntology;

      isUsingServerRef.current = false;
    }
  };

  const saveOntology = async () => {
    if (isUsingServerRef.current || !initialOntologyRef.current) return;
    isUsingServerRef.current = true;

    const treeCopied = treeRef.current;
    if (treeCopied.length < 1) return;

    const oldOntology = initialOntologyRef.current;
    const newOntology = treeToOntology(treeCopied);

    const ontologyDifference = ontologyCompare(oldOntology, newOntology);

    let status: boolean = false;

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };

    try {
      const serverUrl = serverUrlRef.current;
      const token = getCookie("access_token");
      const res = await fetch(`${serverUrl}ontology`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(ontologyDifference)
      });
      if (!res.ok) return;

      await res.json().then(j => {
        status = j["status"];
      });
    }
    catch (error) {
      console.error(error);
    }
    finally {
      if (status) setModalData({ message: "Successful", status: true });
      else setModalData({ message: "Failed", status: false });
      setModalTrigger(prev => prev + 1);

      initialOntologyRef.current = newOntology;
      isUsingServerRef.current = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s")) return;
    event.preventDefault();
    saveOntology();
  };

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };

  const handleSetTree = (newTree: Tree[]) => {
    setTree(newTree);
  };

  const handleSetId = (newTreeId: Tree["treeId"], newNodeId: Tree["nodeId"]) => {
    setTreeId(newTreeId);
    setNodeId(newNodeId);

    const nextQuery = { ...query };

    if (newTreeId === "") {
      delete nextQuery.treeId;
    }
    else {
      nextQuery.treeId = newTreeId;
    }

    if (newNodeId === "") {
      delete nextQuery.nodeId;
    }
    else {
      nextQuery.nodeId = newNodeId;
    }

    push({
      pathname: pathname,
      query: nextQuery
    }, undefined, { shallow: true });
  };

  useEffect(() => {
    if (typeof query.treeId === "string") setTreeId(query.treeId);

    const tempPath = treeUtils.traverseTree<Tree[]>(tree, (node, prevNode) => {
      if (node.treeId === query.treeId) return prevNode;
    }) || [];
    setNodePath(tempPath);
  }, [query.treeId]);

  useEffect(() => {
    if (typeof query.nodeId === "string") setNodeId(query.nodeId);
  }, [query.nodeId]);

  useEffect(() => {
    if (tree.length < 1) return;

    const sorted = treeUtils.sortTree(tree);
    treeRef.current = sorted;
    setSortedTree(sorted);
  }, [tree]);

  useEffect(() => {
    if (!ontology) return;
    setTree(ontologyToTree(ontology));
  }, [ontology]);

  useEffect(() => {
    const isDev = process.env.NODE_ENV === "development";
    serverUrlRef.current = isDev
      ? "http://127.0.0.1:8000/"
      : "https://hyunwoo-ai-backend.fly.dev/";
    serverUrlRef.current = "https://hyunwoo-ai-backend.fly.dev/";
    getOntology();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, []);

  return (
    <div className={clsx("fullScreen flex", styles.board, styles.colorAttr)}>
      <TreeContext.Provider value={{ treeId: treeId, nodePath: nodePath, nodeId: nodeId, oldOntology: ontology!, setTree: handleSetTree, setId: handleSetId, saveOntology: saveOntology }}>
        <SidebarNavigator tree={sortedTree} />
        <NodeEditor tree={sortedTree} />
      </TreeContext.Provider>
      <Modal data={modalData} trigger={modalTrigger} duration={2000} />
    </div>
  );
}

export default Admin;