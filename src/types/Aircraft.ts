export interface Aircraft {
  id: number;
  registration: string;
  manufacturer: string;
  reportDescription: string;
  type: string;
  model: string;
  msn: string;
  base: string;
  ownership: string;
  status: "Active" | "Inactive" | "Maintenance";

  // Airframe Information
  airframeModel: string;
  airframeServiceManual: string;
  airframeSerialNumber: string;
  airframeIpc: string;

  // Engine Information
  engineModel: string;
  engineSerialNumber: string;
  engineArc: string;

  //  Propeller Information
  propellerModel: string;
  propellerSerialNumber: string;
  propellerArc: string;
}

export interface AircraftForm {
  registration: string;
  manufacturer: string;
  reportDescription: string;
  type: string;
  model: string;
  msn: string;
  base: string;
  ownership: string;
  status: "Active" | "Inactive" | "Maintenance";

  // Airframe Information
  airframe_model: string;
  airframeServiceManual: string;
  airframeSerialNumber: string;
  airframeIpc: string;

  // Engine Information
  engineModel: string;
  engineSerialNumber: string;

  //  Propeller Information
  propellerModel: string;
  propellerSerialNumber: string;

  engineArc?: File | null;
  propellerArc?: File | null;
}
