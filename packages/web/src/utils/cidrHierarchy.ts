import type { Allocation } from "@subnetter/core";

export interface TreeNode {
  name: string;
  cidr?: string;
  type: "root" | "provider" | "account" | "region" | "az" | "subnet";
  usableIps?: number;
  subnetRole?: string;
  children?: TreeNode[];
}

export function buildCidrTree(
  allocations: Allocation[],
  baseCidr: string
): TreeNode {
  const root: TreeNode = {
    name: baseCidr,
    cidr: baseCidr,
    type: "root",
    children: [],
  };

  const providerMap = new Map<string, TreeNode>();

  for (const alloc of allocations) {
    // Provider level
    if (!providerMap.has(alloc.cloudProvider)) {
      const providerNode: TreeNode = {
        name: alloc.cloudProvider.toUpperCase(),
        type: "provider",
        children: [],
      };
      providerMap.set(alloc.cloudProvider, providerNode);
      root.children!.push(providerNode);
    }
    const providerNode = providerMap.get(alloc.cloudProvider)!;

    // Account level
    const accountKey = `${alloc.cloudProvider}:${alloc.accountName}`;
    let accountNode = providerNode.children!.find(
      (c) => c.name === alloc.accountName
    );
    if (!accountNode) {
      accountNode = {
        name: alloc.accountName,
        cidr: alloc.vpcCidr,
        type: "account",
        children: [],
      };
      providerNode.children!.push(accountNode);
    }

    // Region level
    let regionNode = accountNode.children!.find(
      (c) => c.name === alloc.regionName
    );
    if (!regionNode) {
      regionNode = {
        name: alloc.regionName,
        cidr: alloc.regionCidr,
        type: "region",
        children: [],
      };
      accountNode.children!.push(regionNode);
    }

    // AZ level
    let azNode = regionNode.children!.find(
      (c) => c.name === alloc.availabilityZone
    );
    if (!azNode) {
      azNode = {
        name: alloc.availabilityZone,
        cidr: alloc.azCidr,
        type: "az",
        children: [],
      };
      regionNode.children!.push(azNode);
    }

    // Subnet level
    azNode.children!.push({
      name: `${alloc.subnetRole} (${alloc.subnetCidr})`,
      cidr: alloc.subnetCidr,
      type: "subnet",
      usableIps: alloc.usableIps,
      subnetRole: alloc.subnetRole,
    });
  }

  return root;
}
