"use client";

import { useRef, useEffect } from "react";
import * as d3Hierarchy from "d3-hierarchy";
import * as d3Selection from "d3-selection";
import type { Allocation } from "@subnetter/core";
import { buildCidrTree, type TreeNode } from "@/utils/cidrHierarchy";
import { PROVIDER_COLORS } from "@/utils/constants";

interface CidrTreemapProps {
  allocations: Allocation[];
  baseCidr: string;
}

function getNodeFill(node: TreeNode): string {
  if (node.type === "subnet") {
    return PROVIDER_COLORS[findProvider(node)] || "#6b7280";
  }
  return "transparent";
}

function findProvider(node: TreeNode): string {
  // Walk up to find provider name - use the subnetRole to infer
  return "";
}

export function CidrTreemap({ allocations, baseCidr }: CidrTreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !allocations.length) return;

    const treeData = buildCidrTree(allocations, baseCidr);
    const svg = d3Selection.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 500;

    const root = d3Hierarchy
      .hierarchy(treeData)
      .sum((d) => d.usableIps || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3Hierarchy.treemap<TreeNode>().size([width, height]).padding(2)(root);

    const g = svg.attr("viewBox", `0 0 ${width} ${height}`).append("g");

    type RectNode = d3Hierarchy.HierarchyRectangularNode<TreeNode>;
    const leaves = root.leaves() as RectNode[];

    const cells = g
      .selectAll<SVGGElement, RectNode>("g")
      .data(leaves)
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    cells
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => {
        // Color by provider ancestor
        let current: RectNode | null = d;
        while (current) {
          if (current.data.type === "provider") {
            return (
              PROVIDER_COLORS[current.data.name.toLowerCase()] || "#6b7280"
            );
          }
          current = current.parent as RectNode | null;
        }
        return "#6b7280";
      })
      .attr("opacity", 0.7)
      .attr("rx", 2)
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 1);

    cells
      .append("text")
      .attr("x", 4)
      .attr("y", 14)
      .attr("font-size", "10px")
      .attr("fill", "white")
      .text((d) => {
        if (d.x1 - d.x0 < 40) return "";
        return d.data.cidr || d.data.name;
      });
  }, [allocations, baseCidr]);

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
      <svg ref={svgRef} className="w-full" style={{ height: 500 }} />
    </div>
  );
}
