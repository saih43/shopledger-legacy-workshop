'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const orders = require('../lib/orders');
const ledger = require('../lib/ledger');

test('order history sorts orders newest first by calendar date', () => {
  const db = {
    orders: [
      { id: 1004, date: '30/01/2022' },
      { id: 1001, date: '28/12/2021' },
      { id: 1008, date: '15/03/2022' },
      { id: 1007, date: '04/03/2022' }
    ]
  };

  assert.deepEqual(orders.list(db, {}).map(order => order.id), [1008, 1007, 1004, 1001]);
});

test('date range filters include only orders inside the calendar date range', () => {
  const db = {
    orders: [
      { id: 1001, date: '28/12/2021' },
      { id: 1002, date: '05/01/2022' },
      { id: 1003, date: '14/01/2022' },
      { id: 1004, date: '30/01/2022' },
      { id: 1005, date: '02/02/2022' },
      { id: 1006, date: '18/02/2022' },
      { id: 1007, date: '04/03/2022' },
      { id: 1008, date: '15/03/2022' }
    ]
  };

  assert.deepEqual(
    orders.list(db, { from: '2022-01-01', to: '2022-01-31' }).map(order => order.id),
    [1004, 1003, 1002]
  );
});

test('string settlement amount is added numerically to the customer balance', () => {
  const customer = {
    id: 1,
    name: 'Meera Joshi',
    openingBalance: 450,
    totalBilled: 1982.01,
    totalSettled: 1200
  };
  const db = { customers: [customer], nextSettlementId: 501, settlements: [] };

  const result = ledger.recordSettlement(db, 1, '500', 'upi', 'Test settlement');

  assert.equal(result.ok, true);
  assert.equal(customer.totalSettled, 1700);
  assert.equal(customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});
