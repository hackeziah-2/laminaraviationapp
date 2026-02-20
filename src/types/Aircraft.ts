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

  // Airframe Information
  airframeServiceManual: string;
  airframeIpc: string;

  // Engine Information
  engineModel: string;
  engineSerialNumber: string;
  engineLifeTimeLimit: number;
  engineArc: string;

  //  Propeller Information
  propellerModel: string;
  propellerSerialNumber: string;
  propellerLifeTimeLimit: number;
  propellerArc: string;
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

  // Airframe Information
  airframeServiceManual: string;
  airframeIpc: string;

  // Engine Information
  engineModel: string;
  engineSerialNumber: string;
  engineLifeTimeLimit: string;

  //  Propeller Information
  propellerModel: string;
  propellerSerialNumber: string;
  propellerLifeTimeLimit: string;

  engineArc?: File | null;
  propellerArc?: File | null;
}
