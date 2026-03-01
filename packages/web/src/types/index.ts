import type { Config, Allocation } from "@subnetter/core";

export type { Config, Allocation };

export interface SavedConfig {
  id: string;
  userId: string;
  name: string;
  config: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigVersion {
  id: string;
  configId: string;
  config: string;
  createdAt: Date;
  message: string | null;
}

export interface ShareLink {
  id: string;
  configId: string;
  userId: string;
  includeAllocations: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}
