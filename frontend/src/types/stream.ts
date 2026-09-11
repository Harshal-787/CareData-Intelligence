export interface PatientInfo {
  id: string;
  mrn: string;
  lastName: string;
  firstName: string;
  dob: string;
  gender: string;
  address?: string;
  phone?: string;
}

export interface VisitInfo {
  visitNumber: string;
  patientClass: string;
  assignedUnit: string;
  assignedRoom: string;
  assignedBed: string;
  attendingDoctor: string;
}

export interface ObservationResult {
  setId: string;
  valueType: string;
  identifier: string;
  description: string;
  value: string;
  numericValue?: number;
  units: string;
  referenceRange: string;
  abnormalFlag: string; // "LL", "L", "HH", "H", "N", "CRITICAL"
  status: string;
}

export interface HL7Message {
  rawMessage: string;
  messageType: string;
  eventCode: string;
  messageControlId: string;
  sendingApp: string;
  sendingFacility: string;
  timestamp: string;
  patient: PatientInfo;
  visit: VisitInfo;
  observations: ObservationResult[];
  anomalyFlags: string[];
  riskScore: number;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  clinicalSummary: string;
}

export interface StreamEvent {
  id: string;
  type: string; // "HL7_EVENT", "CRITICAL_ALERT", "THROUGHPUT_PULSE", "HEARTBEAT"
  source: string;
  timestamp: string;
  payload?: HL7Message;
  rawText?: string;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  clinicalSummary?: string;
}

export interface StreamStats {
  totalEvents: number;
  criticalAlerts: number;
  connectedClients: number;
  eventsPerSec: number;
  uptimeSeconds: number;
  mllpServerRunning: boolean;
  mllpPort: number;
  mllpTotalPackets: number;
  mllpActiveSockets: number;
  fhirActiveChannels: number;
  status: string;
}
