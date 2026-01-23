// UPI Deep Link Generator for Dhandha

interface UPIParams {
  upiId: string;
  amount: number;
  businessName?: string;
  transactionNote?: string;
  transactionRef?: string;
}

export const generateUPILink = ({
  upiId,
  amount,
  businessName = 'CHATR Pay',
  transactionNote = 'Payment',
  transactionRef
}: UPIParams): string => {
  const params = new URLSearchParams({
    pa: upiId, // Payee address (UPI ID)
    pn: businessName, // Payee name
    am: amount.toFixed(2), // Amount
    cu: 'INR', // Currency
    tn: transactionNote, // Transaction note
  });

  if (transactionRef) {
    params.set('tr', transactionRef); // Transaction reference
  }

  return `upi://pay?${params.toString()}`;
};

export const generatePaymentCard = ({
  upiId,
  amount,
  businessName,
  transactionRef
}: UPIParams): string => {
  // Generate a shareable text card
  return `💰 *Payment Request*
━━━━━━━━━━━━━━
🏪 ${businessName || 'Shop'}
💵 Amount: ₹${amount.toLocaleString('en-IN')}
━━━━━━━━━━━━━━

📱 Pay via UPI:
${upiId}

🔗 Or tap to pay:
${generateUPILink({ upiId, amount, businessName, transactionRef })}

_Powered by CHATR_`;
};

export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
