'use strict';

var assert = require('node:assert/strict');
var test = require('node:test');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

test('invoice figures match order pricing for HSN and coupon', function () {
  var order = {
    coupon: 'WELCOME',
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }]
  };
  var ledgerTotals = pricing.computeTotals(order.items, order.coupon);
  var invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    {
      subtotal: invoiceFigures.subtotal,
      discount: invoiceFigures.discount,
      tax: invoiceFigures.tax,
      cgst: invoiceFigures.cgst,
      sgst: invoiceFigures.sgst,
      total: invoiceFigures.total,
      rowGstPercent: invoiceFigures.rows[0].gstPercent,
      rowTax: invoiceFigures.rows[0].lineTax
    },
    {
      subtotal: ledgerTotals.subtotal,
      discount: ledgerTotals.discount,
      tax: ledgerTotals.tax,
      cgst: ledgerTotals.cgst,
      sgst: ledgerTotals.sgst,
      total: ledgerTotals.total,
      rowGstPercent: ledgerTotals.lines[0].gstPercent,
      rowTax: ledgerTotals.lines[0].tax
    }
  );
});

test('invoice render matches ledger totals after HSN and coupon calculation', function () {
  // In-memory order shaped like the record created by routes/orders.js.
  // No store or JSON data files are read or written by this test.
  var order = {
    id: 1001,
    date: '22/11/2026',
    customer: 'Test customer',
    paymentMode: 'cash',
    status: 'completed',
    coupon: 'WELCOME',
    items: [{ id: 1, sku: 'GRN-001', name: 'Rice', hsn: '1006', price: 100, qty: 1 }]
  };

  var ledgerTotals = pricing.computeTotals(order.items, order.coupon);
  order.total = ledgerTotals.total;

  var invoiceFigures = invoice.computeInvoiceFigures(order);
  assert.deepEqual(
    {
      subtotal: ledgerTotals.subtotal,
      discount: ledgerTotals.discount,
      tax: ledgerTotals.tax,
      total: ledgerTotals.total
    },
    { subtotal: 100, discount: 5, tax: 4.75, total: 99.75 }
  );
  assert.deepEqual(
    {
      subtotal: invoiceFigures.subtotal,
      discount: invoiceFigures.discount,
      tax: invoiceFigures.tax,
      cgst: invoiceFigures.cgst,
      sgst: invoiceFigures.sgst,
      total: invoiceFigures.total,
      rowGstPercent: invoiceFigures.rows[0].gstPercent
    },
    { subtotal: 100, discount: 5, tax: 4.75, cgst: 2.38, sgst: 2.37, total: 99.75, rowGstPercent: 5 }
  );

  var rendered = invoice.render(order);
  assert.match(rendered, /Invoice Total<\/td><td class="r">₹99\.75/);
  assert.doesNotMatch(rendered, /Accountant Reconciliation Notice/);
});

