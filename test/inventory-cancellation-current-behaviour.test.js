'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

test('stock check accepts exactly the remaining sellable quantity', () => {
  const products = [
    { id: 6, name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 },
    { id: 11, name: 'Byadgi Kashmiri Chilli Powder 500g', stock: 4, reserved: 3 }
  ];

  assert.deepEqual(inventory.check(products, [
    { id: 6, qty: 1 },
    { id: 11, qty: 1 }
  ]), { ok: true });
  assert.equal(inventory.check(products, [{ id: 11, qty: 2 }]).ok, false);
});

test('cancelling pending order #1007 restores physical and sellable stock', () => {
  const products = [
    { id: 6, name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 },
    { id: 4, name: 'Cold-Pressed Sunflower Oil 1L', stock: 22, reserved: 4 }
  ];
  const order = {
    id: 1007,
    status: 'pending',
    paymentMode: 'khata',
    customerId: 4,
    total: 1407,
    items: [{ id: 6, qty: 2 }, { id: 4, qty: 2 }]
  };
  const db = {
    products,
    orders: [order],
    customers: [{
      id: 4,
      openingBalance: 1200,
      totalBilled: 1407,
      totalSettled: 1000
    }]
  };

  const result = orders.cancel(db, order.id, 'Characterization fixture');

  assert.equal(result.ok, true);
  assert.equal(order.status, 'cancelled');
  assert.equal(products[0].stock, 3);
  assert.equal(inventory.getSellableStock(products[0]), 3);
  assert.equal(products[1].stock, 24);
  assert.equal(products[1].reserved, 4);
  assert.equal(inventory.getSellableStock(products[1]), 20);
});
