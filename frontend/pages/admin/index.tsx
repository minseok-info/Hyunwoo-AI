import { Modal, NodeEditor, NodeMapViewer, SidebarNavigator } from "@/components";
import nodeMapStyles from "@/styles/nodeMapViewer.module.css";
import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/admin.module.css";
import { MODEL_IDS } from "@/types/modelParams";
import { Node, Ontology, Relation, Tree } from "@/types/ontologyTypes";
import { ontologyCompare, ontologyToTree, treeToOntology, treeUtils } from "@/utils";
import clsx from "clsx";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import "katex/dist/katex.min.css"

const Admin = ({ initialOntology: ssrOntology }: { initialOntology: Ontology | null }) => {
  const { query, pathname, push } = useRouter();
  const treeRef = useRef<Tree[]>([]);

  const serverUrlRef = useRef<string>("");
  const isUsingServerRef = useRef<boolean>(false);

  const initialOntologyRef = useRef<Ontology | null>(ssrOntology);
  const [ontology, setOntology] = useState<Ontology | null>(ssrOntology);

  const [treeId, setTreeId] = useState<Tree["treeId"]>("");
  const [nodePath, setNodePath] = useState<Tree[]>([]);
  const [tree, setTree] = useState<Tree[]>([]);
  const [sortedTree, setSortedTree] = useState<Tree[]>([]);

  const [nodeId, setNodeId] = useState<Tree["nodeId"]>("");

  const [modalTrigger, setModalTrigger] = useState<number>(0);
  const [modalData, setModalData] = useState<{ message: string; status: boolean; loading?: boolean }>({ message: "", status: false });

  const [nodeMapExpanded, setNodeMapExpanded] = useState<boolean>(false);

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
    let syncCommit: string | null = null;

    setModalData({ message: "Saving...", status: true, loading: true });
    setModalTrigger(prev => prev + 1);

    try {
      const serverUrl = serverUrlRef.current;
      const res = await fetch(`${serverUrl}ontology`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(ontologyDifference)
      });
      if (!res.ok) return;

      const j = await res.json();
      status = j["status"];
      if (j["sync"]?.status) syncCommit = j["sync"].commit as string;
    }
    catch (error) {
      console.error(error);
    }
    finally {
      if (status) {
        const msg = syncCommit
          ? `Saved & Synced (${syncCommit.slice(0, 7)})`
          : "Saved";
        setModalData({ message: msg, status: true });
      } else {
        setModalData({ message: "Failed", status: false });
      }
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
    if (!ssrOntology) getOntology();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, []);

  const adminMinimapTree = useMemo(() => {
    if (sortedTree.length === 0) return [];
    const humanNode: Tree = {
      treeId: MODEL_IDS.human,
      nodeId: MODEL_IDS.human,
      name: "Human",
      desc: "",
      tags: [],
      children: sortedTree
    };
    return [humanNode];
  }, [sortedTree]);

  const handleNodeMapSelect = (selectedTreeId: string, selectedNodeId: string) => {
    if (selectedNodeId === MODEL_IDS.human) return;
    handleSetId(selectedTreeId, selectedNodeId);
    setNodeMapExpanded(false);
  };

  return (
    <div className={clsx("fullScreen flex", styles.board, styles.colorAttr)} style={{ position: "relative" }}>
      <TreeContext.Provider value={{ treeId: treeId, nodePath: nodePath, nodeId: nodeId, oldOntology: ontology!, setTree: handleSetTree, setId: handleSetId, saveOntology: saveOntology }}>
        <SidebarNavigator tree={sortedTree} />
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <NodeEditor tree={sortedTree} />
          {adminMinimapTree.length > 0 && (
            nodeMapExpanded ? (
              <div key="overlay" className={clsx(nodeMapStyles.adminOverlay)}>
                <div className={clsx(nodeMapStyles.adminOverlayHeader)}>
                  <h4>NODE MAP</h4>
                  <span className={clsx(nodeMapStyles.adminOverlayClose)} onClick={() => setNodeMapExpanded(false)}>✕</span>
                </div>
                <div className={clsx(nodeMapStyles.adminOverlayBody)}>
                  <NodeMapViewer
                    tree={adminMinimapTree}
                    currentNode={adminMinimapTree[0]}
                    mode="admin"
                    adminCurrentNodeId={nodeId}
                    onSelectNode={handleNodeMapSelect}
                  />
                </div>
              </div>
            ) : (
              <div key="minimap" className={clsx(nodeMapStyles.adminMinimap)} onClick={() => setNodeMapExpanded(true)}>
                <NodeMapViewer
                  tree={adminMinimapTree}
                  currentNode={adminMinimapTree[0]}
                  mode="admin"
                  adminCurrentNodeId={nodeId}
                  isMinimap
                  onExpandMinimap={() => setNodeMapExpanded(true)}
                />
              </div>
            )
          )}
        </div>
      </TreeContext.Provider>
      <Modal data={modalData} trigger={modalTrigger} duration={2000} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<{ initialOntology: Ontology | null }> = async () => {
  try {
    const res = await fetch("https://hyunwoo-ai-backend.fly.dev/ontology", { method: "GET" });
    if (!res.ok) return { props: { initialOntology: null } };

    const j = await res.json();
    const resOnt = j["ontology"] as { nodes: any[]; relations: any[] };

    const nodes: Node[] = resOnt.nodes.map((r: any) => ({ id: r.id, name: r.name, desc: r.description, tags: r.tags }));
    const relations: Relation[] = resOnt.relations.map((r: any) => ({ from: r.from_, to: r.to_, type: r.type }));

    return { props: { initialOntology: { nodes, relations } } };
  } catch {
    return { props: { initialOntology: null } };
  }
};

export default Admin;