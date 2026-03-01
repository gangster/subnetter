import { create } from "zustand";
import type { Config } from "@subnetter/core";

interface ConfigState {
  config: Partial<Config>;
  rawJson: string;
  setConfig: (config: Partial<Config>) => void;
  setRawJson: (json: string) => void;
  updateField: <K extends keyof Config>(key: K, value: Config[K]) => void;
  reset: () => void;
}

const defaultConfig: Partial<Config> = {
  baseCidr: "",
  prefixLengths: { account: 16, region: 20, az: 24 },
  accounts: [],
  subnetTypes: {},
};

export const useConfigStore = create<ConfigState>((set) => ({
  config: { ...defaultConfig },
  rawJson: "",
  setConfig: (config) =>
    set({ config, rawJson: JSON.stringify(config, null, 2) }),
  setRawJson: (rawJson) => set({ rawJson }),
  updateField: (key, value) =>
    set((state) => {
      const newConfig = { ...state.config, [key]: value };
      return {
        config: newConfig,
        rawJson: JSON.stringify(newConfig, null, 2),
      };
    }),
  reset: () =>
    set({ config: { ...defaultConfig }, rawJson: "" }),
}));
