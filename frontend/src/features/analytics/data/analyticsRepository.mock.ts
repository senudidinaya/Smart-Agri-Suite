import { ClassStats } from "../domain/types";
export async function getAnalytics(): Promise<ClassStats> {
  return { totalHa: 520.4, bareHa: 142.6, vegetationHa: 271.8, builtHa: 106.0 };
}
