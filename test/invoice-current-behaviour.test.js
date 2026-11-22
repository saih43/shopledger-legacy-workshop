'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

function makeOrder() {
  const items = [{
    id: 1,
    sku: 'RICE-001',
    name: 'Rice',
    hsn: '1006',
    price: 600,
    qty: 1
  }];
  const billed = pricing.computeTotals(items, 'SAVE10');

  return {
    id: 42,
    date: '22/11/2026',
    customer: 'Test Customer',
    paymentMode: 'cash',
    status: 'completed',
    items,
    coupon: 'SAVE10',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  };
}

test('CURRENT BEHAVIOUR: checkout applies HSN GST after the coupon discount', () => {
  const order = makeOrder();
  const totals = pricing.computeTotals(order.items, order.coupon);

  assert.deepEqual({
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxable: totals.taxable,
    tax: totals.tax,
    cgst: totals.cgst,
    sgst: totals.sgst,
    total: totals.total,
    line: totals.lines[0]
  }, {
    subtotal: 600,
    discount: 60,
    taxable: 540,
    tax: 27,
    cgst: 13.5,
    sgst: 13.5,
    total: 567,
    line: {
      id: 1,
      name: 'Rice',
      hsn: '1006',
      gstPercent: 5,
      gross: 600,
      discount: 60,
      taxable: 540,
      tax: 27,
      net: 567
    }
  });
});

test('invoice totals and GST breakdown match checkout billing', () => {
  const order = makeOrder();
  const figures = invoice.computeInvoiceFigures(order);
  const html = invoice.render(order);

  assert.deepEqual({
    subtotal: figures.subtotal,
    discount: figures.discount,
    tax: figures.tax,
    cgst: figures.cgst,
    sgst: figures.sgst,
    total: figures.total,
    rowRate: figures.rows[0].gstPercent,
    rowTax: figures.rows[0].lineTax
  }, {
    subtotal: 600,
    discount: order.discount,
    tax: order.tax,
    cgst: 13.5,
    sgst: 13.5,
    total: order.total,
    rowRate: 5,
    rowTax: 27
  });
  assert.match(html, /5%/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹567\.00/);
  assert.doesNotMatch(html, /Reconciliation Notice/);
});

test('GST reconciliation marks checkout-matching invoice figures as matched', () => {
  const order = makeOrder();
  const reconciliation = reports.getGstReconciliation({ orders: [order] });

  assert.equal(reconciliation.totalChecked, 1);
  assert.equal(reconciliation.mismatchCount, 0);
  assert.equal(reconciliation.totalDelta, 0);
  assert.equal(reconciliation.rows[0].ledgerTax, 27);
  assert.equal(reconciliation.rows[0].invoiceTax, 27);
  assert.equal(reconciliation.rows[0].ledgerTotal, 567);
  assert.equal(reconciliation.rows[0].invoiceTotal, 567);
  assert.equal(reconciliation.rows[0].delta, 0);
  assert.equal(reconciliation.rows[0].matched, true);
});
