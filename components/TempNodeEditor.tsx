// import TreeContext from "@/contexts/TreeContext";
// import styles from "@/styles/tempNodeEditor.module.css";
// import { Tree } from "@/types/ontologyTypes";
// import { debounceTimer, treeUtils } from "@/utils";
// import clsx from "clsx";
// import { ChangeEvent, useContext, useEffect, useRef, useState } from "react";

// const List = ({ nodes, parentIds, onClick }: { nodes: Tree[], parentIds: Tree["nodeId"][], onClick: (id: Tree["nodeId"]) => void }) => {
//   return (
//     <div className={clsx(styles.list)}>
//       {nodes.map((n, i) => (
//         <div className={clsx({ [styles.selected]: parentIds.includes(n.nodeId) })} onClick={() => onClick(n.nodeId)} key={i}>
//           <p>{ n.name }</p>
//         </div>
//       ))}
//     </div>
//   );
// };

// const EmptyState = () => {
//   return (
//     <div className={clsx(styles.nothing)}>
//       <p>{`Select any :D`}</p>
//     </div>
//   );
// };

// const NodeEditor = ({ tree }: { tree: Tree[] }) => {
//   const { nodeId, setTree } = useContext(TreeContext);

//   const timerRef = useRef<NodeJS.Timeout | null>(null);

//   const [node, setNode] = useState<Tree | null>(null);

//   const [name, setName] = useState<Tree["name"]>("");
//   const [desc, setDesc] = useState<Tree["desc"]>("");
//   const [parentIds, setParentIds] = useState<Tree["nodeId"][]>([]);

//   const [searchingByName, setSearchingByName] = useState<string>("");
//   const [searchedParents, setSearchedParents] = useState<Tree[]>([]);

//   const handleChangeName = (event: ChangeEvent<HTMLInputElement>) => {
//     const value = event.target.value;
//     setName(value);
//   };
//   const handleChangeDesc = (event: ChangeEvent<HTMLTextAreaElement>) => {
//     const value = event.target.value;
//     setDesc(value);
//   };
//   const handleChangeTree = () => {
//     const newTree = treeUtils.updateNode(tree, nodeId, n => {
//       return { ...n, name, desc };
//     });
//     setTree(newTree);
//   };

//   const handleChangeSearchingByName = (event: ChangeEvent<HTMLInputElement>) => {
//     const value = event.target.value;
//     setSearchingByName(value);
//   }
//   const handleSearchParents = () => {
//     const childrenIds: Tree["nodeId"][] = [];
//     treeUtils.traverseTree(node!.children, n => {
//       if (!childrenIds.includes(n.nodeId)) childrenIds.push(n.nodeId);
//     });

//     const filteredParents: Tree[] = [];
//     treeUtils.traverseTree(tree, n => {
//       const parentName = n.name.toLowerCase();
//       const searchingName = searchingByName.toLowerCase();
      
//       if (filteredParents.some(p => p.nodeId === n.nodeId)) return;
//       else if (n.nodeId === nodeId) return;
//       else if (childrenIds.includes(n.nodeId)) return;
      
//       if (parentName.includes(searchingName)) {
//         filteredParents.push(n);
//       }
//     });
    
//     setSearchedParents(filteredParents);
//   }
//   const handleUpdateParent = (id: Tree["nodeId"]) => {
//     let tempIds = [...parentIds];
//     if (parentIds.includes(id)) tempIds = tempIds.filter(ti => ti !== id);
//     else tempIds.push(id);
//     setParentIds(tempIds);

//     const newTree = treeUtils.updateParents(tree, nodeId, [...tempIds]);
//     setTree(newTree);
//   }

//   useEffect(() => {
//     if (nodeId === "") {
//       setNode(null);
//       return;
//     }

//     treeUtils.traverseTree(tree, n => {
//       if (n.nodeId === nodeId) {
//         setNode(n);
//         return true;
//       }
//     });
//   }, [nodeId]);

//   useEffect(() => {
//     if (!node) return;
//     setName(node.name);
//     setDesc(node.desc);

//     const tempParentIds: Tree["nodeId"][] = [];
//     treeUtils.traverseTree(tree, n => {
//       if (tempParentIds.includes(n.nodeId)) return;
//       if (n.children.some(c => c.nodeId === nodeId)) tempParentIds.push(n.nodeId);
//     });
//     setParentIds(tempParentIds);
//     handleSearchParents();
//   }, [node]);
  
//   useEffect(() => {
//     if (!node) return;
//     if (node.name === name && node.desc === desc) return;
//     debounceTimer(timerRef, handleChangeTree);
//   }, [name, desc]);
  
//   useEffect(() => {
//     if (!node) return;
//     debounceTimer(timerRef, handleSearchParents);
//   }, [searchingByName]);
  
//   return (
//     <div className={clsx(styles.editor)}>
//       {!node ? <EmptyState /> : (
//         <div className={clsx(styles.attribute)}>
//           <div>
//             <p>NAME</p>
//             <input type="text" placeholder="Write Name" value={name} onChange={handleChangeName} />
//           </div>
//           <div>
//             <p>DESCRIPTION</p>
//             <textarea placeholder="Write Desc" value={desc} onChange={handleChangeDesc} />
//           </div>
//           <div>
//             <p>PARENTS</p>
//             <input type="text" placeholder="Search by Name" value={searchingByName} onChange={handleChangeSearchingByName} />
//             <List nodes={searchedParents} parentIds={parentIds} onClick={handleUpdateParent} />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NodeEditor;