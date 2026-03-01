"use client";

import { useRef, useEffect } from "react";
import * as d3Hierarchy from "d3-hierarchy";
import * as d3Selection from "d3-selection";
import * as d3Shape from "d3-shape";
import * as d3Zoom from "d3-zoom";
import type { Allocation } from "@subnetter/core";
import { buildCidrTree, type TreeNode } from "@/utils/cidrHierarchy";
import { PROVIDER_COLORS } from "@/utils/constants";

interface CidrTreeProps {
  allocations: Allocation[];
  baseCidr: string;
}

function getNodeColor(node: TreeNode): string {
  switch (node.type) {
    case "root":
      return "#6b7280";
    case "provider":
      return PROVIDER_COLORS[node.name.toLowerCase()] || "#6b7280";
    case "account":
      return "#8b5cf6";
    case "region":
      return "#06b6d4";
    case "az":
      return "#10b981";
    case "subnet":
      return "#f59e0b";
    default:
      return "#6b7280";
  }
}

export function CidrTree({ allocations, baseCidr }: CidrTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !allocations.length) return;

    const treeData = buildCidrTree(allocations, baseCidr);
    const svg = d3Selection.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 600;

    const root = d3Hierarchy.hierarchy(treeData);
    const treeLayout = d3Hierarchy.tree<TreeNode>().size([height - 40, width - 300]);
    treeLayout(root);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", "translate(150, 20)");

    // Apply zoom
    const zoom = d3Zoom
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Draw links
    const linkGenerator = d3Shape
      .linkHorizontal<d3Hierarchy.HierarchyPointLink<TreeNode>, d3Hierarchy.HierarchyPointNode<TreeNode>>()
      .x((d) => d.y!)
      .y((d) => d.x!);

    g.selectAll(".link")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("d", linkGenerator as unknown as string)
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-width", 1.5);

    // Draw nodes
    const nodes = g
      .selectAll(".node")
      .data(root.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    nodes
      .append("circle")
      .attr("r", 6)
      .attr("fill", (d) => getNodeColor(d.data))
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    nodes
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => (d.children ? -10 : 10))
      .attr("text-anchor", (d) => (d.children ? "end" : "start"))
      .attr("font-size", "11px")
      .attr("fill", "currentColor")
      .text((d) => d.data.name);
  }, [allocations, baseCidr]);

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
      <svg ref={svgRef} className="w-full" style={{ height: 600 }} />
    </div>
  );
}
