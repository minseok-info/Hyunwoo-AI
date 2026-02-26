import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { Tree } from "@/types/ontologyTypes";

function sanitizeName(name: string): string {
  /* Remove filesystem-unsafe characters */
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "unnamed";
}

function saveNode(node: Tree, basePath: string): void {
  const safeName = sanitizeName(node.name);

  const frontmatter = [
    "---",
    `nodeId: ${node.nodeId}`,
    `treeId: ${node.treeId}`,
    `name: ${node.name}`,
    `tags: [${node.tags.join(", ")}]`,
    "---",
    "",
  ].join("\n");

  const content = frontmatter + node.desc;

  if (node.children.length === 0) {
    /* Leaf node: single .md file */
    const filePath = path.join(basePath, `${safeName}.md`);
    fs.writeFileSync(filePath, content, "utf-8");
  } else {
    /* Branch node: folder + NodeName.md (e.g. Brain/Brain.md) */
    const dirPath = path.join(basePath, safeName);
    fs.mkdirSync(dirPath, { recursive: true });

    const indexPath = path.join(dirPath, `${safeName}.md`);
    fs.writeFileSync(indexPath, content, "utf-8");

    for (const child of node.children) {
      saveNode(child, dirPath);
    }
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tree } = req.body as { tree: Tree[] };

    if (!tree || !Array.isArray(tree)) {
      return res.status(400).json({ error: "Invalid tree data" });
    }

    /* Target: project root / markdowns */
    const markdownsDir = path.join(process.cwd(), "markdowns");

    /* Clear existing */
    if (fs.existsSync(markdownsDir)) {
      fs.rmSync(markdownsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(markdownsDir, { recursive: true });

    /* Recursively save */
    for (const root of tree) {
      saveNode(root, markdownsDir);
    }

    return res.status(200).json({ status: true, path: markdownsDir });
  } catch (error) {
    console.error("save-markdowns error:", error);
    return res.status(500).json({ status: false, error: "Failed to save markdowns" });
  }
}
