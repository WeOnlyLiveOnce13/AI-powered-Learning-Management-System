/**
 * PayFast ITN (Instant Transaction Notification) payload
 * https://developers.payfast.co.za/docs#step-4-confirm-payment
 */
export interface PayFastITNPayload {
  // Transaction identification
  m_payment_id: string;        // Your unique payment ID (we use invoice number or payment ID)
  pf_payment_id: string;       // PayFast's unique payment ID
  
  // Buyer details
  name_first?: string;
  name_last?: string;
  email_address?: string;
  
  // Merchant details
  merchant_id: string;
  
  // Transaction amounts
  amount_gross: string;        // Total amount in ZAR
  amount_fee: string;          // PayFast fee
  amount_net: string;          // Amount after fee
  
  // Transaction info
  custom_str1?: string;        // Custom string 1 (we use for userId)
  custom_str2?: string;        // Custom string 2 (we use for invoiceId)
  custom_str3?: string;
  custom_str4?: string;
  custom_str5?: string;
  custom_int1?: string;
  custom_int2?: string;
  custom_int3?: string;
  custom_int4?: string;
  custom_int5?: string;
  
  // Payment status
  payment_status: PayFastPaymentStatus;
  
  // Item details
  item_name: string;
  item_description?: string;
  
  // Signature
  signature: string;
}

export type PayFastPaymentStatus = 
  | "COMPLETE"
  | "FAILED"
  | "PENDING"
  | "CANCELLED";

export interface PayFastValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ProcessedPayFastPayment {
  success: boolean;
  paymentId: string;
  pfPaymentId: string;
  status: PayFastPaymentStatus;
  message: string;
}