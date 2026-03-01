import Papa from "papaparse";
import type { Allocation } from "@subnetter/core";
import { CSV_COLUMNS } from "./constants";

export function allocationsToCsv(allocations: Allocation[]): string {
  const rows = allocations.map((a) => ({
    "Cloud Provider": a.cloudProvider,
    "Account Name": a.accountName,
    "VPC Name": a.vpcName,
    "Region Name": a.regionName,
    "Availability Zone": a.availabilityZone,
    "Region CIDR": a.regionCidr,
    "VPC CIDR": a.vpcCidr,
    "AZ CIDR": a.azCidr,
    "Subnet CIDR": a.subnetCidr,
    "Subnet Role": a.subnetRole,
    "Usable IPs": a.usableIps,
  }));

  return Papa.unparse(rows, {
    columns: [...CSV_COLUMNS],
  });
}
