
export enum InspectionStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  PENDING = 'PENDING'
}

export interface Defect {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  /** Bounding box as [ymin, xmin, ymax, xmax] scaled 0-1000 */
  boundingBox?: [number, number, number, number];
}

export interface InspectionResult {
  id: string;
  timestamp: string;
  status: InspectionStatus;
  confidence: number;
  defects: Defect[];
  imageUrl: string;
  productType: string;
}

export interface QCStats {
  totalInspected: number;
  passed: number;
  failed: number;
  defectTrends: { name: string; count: number }[];
}
