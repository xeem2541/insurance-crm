const { calculateTotalPremium, calculateBalance } = require('../src/utils/finance');

describe('Finance Logic (big.js)', () => {
    test('calculateTotalPremium works precisely without floating point drift', () => {
        // If we did 1.13 + 0.01 = 1.1400000000000001 in normal float
        const net = 1000.13;
        const stamp = 4.01;
        const vat = 70.01;
        
        const total = calculateTotalPremium(net, stamp, vat);
        // 1000.13 + 4.01 + 70.01 = 1074.15
        expect(total).toBe(1074.15);
    });

    test('calculateBalance correctly handles edge cases', () => {
        // payment 10.005 could cause rounding issues if * 100 was used and math.round applied
        const totalAmount = 100.00;
        const currentPaid = 0;
        const incomingPaid = 33.33;
        
        const result1 = calculateBalance(totalAmount, currentPaid, incomingPaid);
        expect(result1.newTotalPaidAmount).toBe(33.33);
        expect(result1.newBalanceAmount).toBe(66.67);
        
        // Next payment with remaining exact float
        const result2 = calculateBalance(totalAmount, result1.newTotalPaidAmount, 66.67);
        expect(result2.newTotalPaidAmount).toBe(100.00);
        expect(result2.newBalanceAmount).toBe(0.00);
    });
    
    test('calculateBalance throws on overpayment', () => {
        expect(() => {
            calculateBalance(100, 90, 15); // total 100, paid 90, incoming 15 -> overpayment
        }).toThrow('Payment exceeds the remaining balance (Overpayment)');
    });
});
