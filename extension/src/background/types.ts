export interface Config {
  keywords: string[];
  groups: string[];
  scanInterval: number;
  activeFrom: string;
  activeTo: string;
  monitoringMode: "default" | "power";
}
