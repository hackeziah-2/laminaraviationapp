import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CPCPMonitoring } from "./CPCPMonitoring";

export function CPCPDetail() {
  const { id, msn } = useParams<{ id: string; msn: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/profile/${id}/maintenance-cpcp`);
  };

  if (!msn) {
    return null;
  }

  return (
    <CPCPMonitoring
      onBack={handleBack}
      msn={msn}
      aircraftId={id}
      registration="RP-C14"
      aftf="7895.4"
      tach="7894.8"
      date="20-Sep-25"
    />
  );
}
