export interface Aircraft {
  id: number;
  registration: string;
  manufacturer: string;
  reportDescription: string;
  model: string;
  msn: string;
  base: string;
  ownership: string;
  status: "Active" | "Inactive" | "Maintenance";

  // Aircraft Information
  modelYear?: number | null;

  // Airframe Information
  airframeServiceManual: string;
  airframeIpc: string;

  // Engine Information
  engineModel: string;
  engineSerialNumber: string;
  engineLifeTimeLimit: number;
  engineArc: string;
  engineTsn?: number | null;
  engineTso?: number | null;

  //  Propeller Information
  propellerModel: string;
  propellerSerialNumber: string;
  propellerLifeTimeLimit: number;
  propellerArc: string;
  propellerTsn?: number | null;
  propellerTso?: number | null;
}

export interface AircraftForm {
  registration: string;
  manufacturer: string;
  reportDescription: string;
  model: string;
  msn: string;
  base: string;
  ownership: string;
  status: "Active" | "Inactive" | "Maintenance";

  // Aircraft Information
  modelYear: string;

  // Airframe Information
  airframeServiceManual: string;
  airframeIpc: string;

  // Engine Information
  engineModel: string;
  engineSerialNumber: string;
  engineLifeTimeLimit: string;
  engineTsn: string;
  engineTso: string;

  //  Propeller Information
  propellerModel: string;
  propellerSerialNumber: string;
  propellerLifeTimeLimit: string;
  propellerTsn: string;
  propellerTso: string;

  engineArc?: File | null;
  propellerArc?: File | null;
}
