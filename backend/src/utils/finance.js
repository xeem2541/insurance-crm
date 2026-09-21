/**
 * src/utils/finance.js
 * Utility functions for handling financial logic safely
 */

const Big = require('big.js');

// Ensure an amount is a valid non-negative number
const validateAmount = (amount, fieldName = 'Amount') => {
    let val = parseFloat(amount);
    if (isNaN(val) || val < 0) {
        const err = new Error(`${fieldName} must be a valid non-negative number`);
        err.statusCode = 400;
        throw err;
    }
    return val;
};

// Calculate total premium safely
const calculateTotalPremium = (netPremium, stampDuty, vat) => {
    const net = new Big(validateAmount(netPremium, 'Net Premium'));
    const stamp = new Big(validateAmount(stampDuty, 'Stamp Duty'));
    const vatAmt = new Big(validateAmount(vat, 'VAT'));
    
    // exact summation, then convert to Number for compatibility
    return Number(net.plus(stamp).plus(vatAmt).toFixed(2));
};

// Calculate new balance securely
const calculateBalance = (totalAmount, currentPaid, incomingPaid) => {
    const total = new Big(validateAmount(totalAmount, 'Total Amount'));
    const paid = new Big(validateAmount(currentPaid, 'Current Paid'));
    const incoming = new Big(validateAmount(incomingPaid, 'Incoming Paid'));
    
    if (incoming.lte(0)) {
        const err = new Error('Payment amount must be greater than zero');
        err.statusCode = 400;
        throw err;
    }
    
    const newTotalPaid = paid.plus(incoming);
    const balance = total.minus(newTotalPaid);
    
    if (balance.lt(0)) {
        const err = new Error('Payment exceeds the remaining balance (Overpayment)');
        err.statusCode = 400;
        throw err;
    }
    
    return {
        newTotalPaidAmount: Number(newTotalPaid.toFixed(2)),
        newBalanceAmount: Number(balance.toFixed(2))
    };
};

// Validate that expiry date is strictly after start date
const validateDates = (startDate, expiryDate) => {
    if (startDate && expiryDate) {
        const start = new Date(startDate);
        const end = new Date(expiryDate);
        if (end <= start) {
            const err = new Error('Expiry date must be after start date');
            err.statusCode = 400;
            throw err;
        }
    }
};

module.exports = {
    validateAmount,
    calculateTotalPremium,
    calculateBalance,
    validateDates
};
