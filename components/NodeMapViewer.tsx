import styles from "@/styles/nodeMapViewer.module.css";
import { Tree } from "@/types/ontologyTypes";
import { treeUtils } from "@/utils";
import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NodeMapViewerProps {
  tree: Tree[];
  currentNode: Tree;
  mode: "landing" | "admin";

  /* landing-mode callbacks */
  onBack?: () => void;
  onPush?: (node: Tree) => void;

  /* admin-mode callbacks */
  adminCurrentNodeId?: string;
  onSelectNode?: (treeId: string, nodeId: string) => void;

  /* minimap toggle (admin) */
  isMinimap?: boolean;
  onExpandMinimap?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Layout helpers — simple level-offset tree layout                   */
/* ------------------------------------------------------------------ */

interface LayoutNode {
  nodeId: string;
  treeId: string;
  name: string;
  x: number;
  y: number;
  children: LayoutNode[];
  parentId: string | null;
  original: Tree;
}

const LEVEL_HEIGHT = 80;
const NODE_RADIUS = 18;
const MIN_SIBLING_GAP = 56;

function layoutTree(roots: Tree[]): { nodes: LayoutNode[]; edges: [string, string][] } {
  const all: LayoutNode[] = [];
  const edges: [string, string][] = [];

  /* First pass: build layout tree with widths */
  function measure(node: Tree): number {
    if (node.children.length === 0) return MIN_SIBLING_GAP;
    let total = 0;
    for (const c of node.children) {
      total += measure(c);
    }
    return Math.max(total, MIN_SIBLING_GAP);
  }

  function build(
    node: Tree,
    depth: number,
    leftX: number,
    width: number,
    parentId: string | null
  ): LayoutNode {
    const x = leftX + width / 2;
    const y = depth * LEVEL_HEIGHT + LEVEL_HEIGHT / 2;

    const ln: LayoutNode = {
      nodeId: node.nodeId,
      treeId: node.treeId,
      name: node.name,
      x,
      y,
      children: [],
      parentId,
      original: node,
    };
    all.push(ln);

    if (parentId) edges.push([parentId, node.nodeId]);

    if (node.children.length > 0) {
      const childWidths = node.children.map(c => measure(c));
      const totalWidth = childWidths.reduce((a, b) => a + b, 0);
      const startX = x - totalWidth / 2;
      let cx = startX;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const cw = childWidths[i];
        const childLayout = build(child, depth + 1, cx, cw, node.nodeId);
        ln.children.push(childLayout);
        cx += cw;
      }
    }

    return ln;
  }

  let offset = 0;
  for (const root of roots) {
    const w = measure(root);
    build(root, 0, offset, w, null);
    offset += w;
  }

  return { nodes: all, edges };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const NodeMapViewer = React.forwardRef<HTMLDivElement, NodeMapViewerProps>(
  (props, ref) => {
    const {
      tree,
      currentNode,
      mode,
      onBack,
      onPush,
      adminCurrentNodeId,
      onSelectNode,
      isMinimap = false,
      onExpandMinimap,
    } = props;

    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    /* pan / zoom state */
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
    const touchPrevDist = useRef<number | null>(null);

    /* layout */
    const [layout, setLayout] = useState<{ nodes: LayoutNode[]; edges: [string, string][] }>({ nodes: [], edges: [] });

    /* parent lookup */
    const parentMap = useRef<Map<string, string>>(new Map());
    const nodeMap = useRef<Map<string, LayoutNode>>(new Map());

    /* clickable set (landing mode) */
    const clickableIds = useRef<Set<string>>(new Set());

    useEffect(() => {
      if (tree.length === 0) return;
      const result = layoutTree(tree);
      setLayout(result);

      const pMap = new Map<string, string>();
      const nMap = new Map<string, LayoutNode>();
      for (const n of result.nodes) {
        nMap.set(n.nodeId, n);
        if (n.parentId) pMap.set(n.nodeId, n.parentId);
      }
      parentMap.current = pMap;
      nodeMap.current = nMap;

      /* fit view */
      if (result.nodes.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of result.nodes) {
          minX = Math.min(minX, n.x - NODE_RADIUS);
          minY = Math.min(minY, n.y - NODE_RADIUS);
          maxX = Math.max(maxX, n.x + NODE_RADIUS);
          maxY = Math.max(maxY, n.y + NODE_RADIUS);
        }
        const pad = 40;
        setViewBox({
          x: minX - pad,
          y: minY - pad,
          w: maxX - minX + pad * 2,
          h: maxY - minY + pad * 2,
        });
      }
    }, [tree]);

    /* update clickable IDs in landing mode */
    useEffect(() => {
      const set = new Set<string>();
      if (mode === "landing") {
        /* parent */
        const pid = parentMap.current.get(currentNode.nodeId);
        if (pid) set.add(pid);
        /* direct children */
        for (const c of currentNode.children) set.add(c.nodeId);
      }
      clickableIds.current = set;
    }, [currentNode, mode, layout]);

    /* center view on current node */
    useEffect(() => {
      const targetId = mode === "admin" ? adminCurrentNodeId : currentNode.nodeId;
      if (!targetId) return;
      const ln = nodeMap.current.get(targetId);
      if (!ln) return;

      setViewBox(prev => ({
        ...prev,
        x: ln.x - prev.w / 2,
        y: ln.y - prev.h / 2,
      }));
    }, [currentNode, adminCurrentNodeId, mode, layout]);

    /* node color helper */
    const getNodeStyle = useCallback(
      (nodeId: string): { fill: string; opacity: number; cursor: string } => {
        const activeId = mode === "admin" ? adminCurrentNodeId : currentNode.nodeId;

        if (nodeId === activeId) {
          return { fill: "#FFD700", opacity: 1, cursor: "default" };
        }

        if (mode === "admin") {
          return { fill: "rgba(180,210,255,0.9)", opacity: 1, cursor: "pointer" };
        }

        /* landing mode */
        if (clickableIds.current.has(nodeId)) {
          return { fill: "rgba(120,180,255,0.9)", opacity: 1, cursor: "pointer" };
        }

        return { fill: "rgba(120,180,255,0.35)", opacity: 0.3, cursor: "default" };
      },
      [currentNode, adminCurrentNodeId, mode]
    );

    /* handle node click */
    const handleNodeClick = useCallback(
      (ln: LayoutNode) => {
        if (mode === "admin") {
          onSelectNode?.(ln.treeId, ln.nodeId);
          return;
        }

        /* landing mode */
        if (!clickableIds.current.has(ln.nodeId)) return;

        const pid = parentMap.current.get(currentNode.nodeId);
        if (ln.nodeId === pid) {
          onBack?.();
        } else {
          const childNode = currentNode.children.find(c => c.nodeId === ln.nodeId);
          if (childNode) onPush?.(childNode);
        }
      },
      [currentNode, mode, onBack, onPush, onSelectNode]
    );

    /* ---- pan / zoom handlers ---- */
    const handleMouseDown = (e: React.MouseEvent) => {
      if (isMinimap) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isPanning.current || isMinimap) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const dx = (e.clientX - panStart.current.x) * scaleX;
      const dy = (e.clientY - panStart.current.y) * scaleY;
      setViewBox(prev => ({ ...prev, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
    };

    const handleMouseUp = () => {
      isPanning.current = false;
    };

    const handleWheel = (e: React.WheelEvent) => {
      if (isMinimap) return;
      e.stopPropagation();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
      const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
      const nw = viewBox.w * factor;
      const nh = viewBox.h * factor;
      setViewBox({
        x: mx - (mx - viewBox.x) * factor,
        y: my - (my - viewBox.y) * factor,
        w: nw,
        h: nh,
      });
    };

    /* touch pan/zoom */
    const handleTouchStart = (e: React.TouchEvent) => {
      if (isMinimap) return;
      if (e.touches.length === 1) {
        isPanning.current = true;
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, vx: viewBox.x, vy: viewBox.y };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchPrevDist.current = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (isMinimap) return;
      if (e.touches.length === 1 && isPanning.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;
        const dx = (e.touches[0].clientX - panStart.current.x) * scaleX;
        const dy = (e.touches[0].clientY - panStart.current.y) * scaleY;
        setViewBox(prev => ({ ...prev, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
      } else if (e.touches.length === 2 && touchPrevDist.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = touchPrevDist.current / dist;
        const cx = viewBox.x + viewBox.w / 2;
        const cy = viewBox.y + viewBox.h / 2;
        const nw = viewBox.w * factor;
        const nh = viewBox.h * factor;
        setViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
        touchPrevDist.current = dist;
      }
    };

    const handleTouchEnd = () => {
      isPanning.current = false;
      touchPrevDist.current = null;
    };

    /* minimap click */
    const handleMinimapClick = () => {
      if (isMinimap && onExpandMinimap) onExpandMinimap();
    };

    /* ---- render ---- */
    const vbStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

    return (
      <div
        ref={(el) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className={clsx(styles.container, {
          [styles.minimap]: isMinimap,
        })}
        onClick={isMinimap ? handleMinimapClick : undefined}
      >
        <svg
          ref={svgRef}
          className={clsx(styles.svg)}
          viewBox={vbStr}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* edges */}
          {layout.edges.map(([fromId, toId]) => {
            const from = nodeMap.current.get(fromId);
            const to = nodeMap.current.get(toId);
            if (!from || !to) return null;
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y + NODE_RADIUS}
                x2={to.x}
                y2={to.y - NODE_RADIUS}
                stroke="rgba(120,180,255,0.25)"
                strokeWidth={1.5}
              />
            );
          })}

          {/* nodes */}
          {layout.nodes.map(ln => {
            const style = getNodeStyle(ln.nodeId);
            return (
              <g
                key={ln.nodeId}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(ln); }}
                style={{ cursor: style.cursor }}
              >
                <circle
                  cx={ln.x}
                  cy={ln.y}
                  r={NODE_RADIUS}
                  fill={style.fill}
                  opacity={style.opacity}
                  stroke="rgba(120,180,255,0.4)"
                  strokeWidth={1}
                />
                <text
                  x={ln.x}
                  y={ln.y + NODE_RADIUS + 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize={isMinimap ? 8 : 11}
                  opacity={style.opacity}
                  pointerEvents="none"
                >
                  {ln.name.length > 10 ? ln.name.slice(0, 9) + "…" : ln.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }
);

NodeMapViewer.displayName = "NodeMapViewer";

export default NodeMapViewer;
