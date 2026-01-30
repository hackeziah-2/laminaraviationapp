import apiClient from "./index";
import { toCamel } from "../utility/utils";

export interface Account {
  id: number;
  fullName: string;
  licenseNo: string;
  designation: string;
}

export interface AccountResponse {
  id: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  license_no: string;
  designation: string;
}

export interface AccountListResponse {
  id: number;
  fullname: string;
  license_no: string;
}

// Get accounts filtered by designation and search
export const getAccountsByDesignation = async (
  designations: string[],
  search: string = ""
): Promise<Account[]> => {
  try {
    const params = new URLSearchParams();
    designations.forEach((designation) => {
      params.append("designation", designation);
    });
    if (search.trim()) {
      params.append("search", search.trim());
    }

    const response = await apiClient.get(
      `account-information/account-informations-list?${params.toString()}`
    );
    
    // Response is directly an array: [{ id, fullname, license_no }]
    const dataArray: AccountListResponse[] = Array.isArray(response.data)
      ? response.data
      : [];
    
    // Transform response data
    const accounts: Account[] = dataArray
      .filter((item) => item && item.id)
      .map((item: AccountListResponse) => ({
        id: item.id,
        fullName: item.fullname || "",
        licenseNo: item.license_no || "",
        designation: "", // Not provided in this endpoint response
      }));

    return accounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
};

// Get all accounts (alternative endpoint if needed)
export const getAllAccounts = async (): Promise<Account[]> => {
  try {
    const response = await apiClient.get("account-information/account-informations-list");
    
    // Response is directly an array: [{ id, fullname, license_no }]
    const dataArray: AccountListResponse[] = Array.isArray(response.data)
      ? response.data
      : [];
    
    const accounts: Account[] = dataArray
      .filter((item) => item && item.id)
      .map((item: AccountListResponse) => ({
        id: item.id,
        fullName: item.fullname || "",
        licenseNo: item.license_no || "",
        designation: "", // Not provided in this endpoint
      }));

    return accounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
};
