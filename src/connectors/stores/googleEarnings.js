const path = require('path');
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse/sync');

// Informe de ganancias de Google Play (Play Console -> Descargar informes ->
// Financiero -> Informes de ganancias). Cada mes es un ZIP con un CSV
// "PlayApps_AAAAMM.csv" que tiene UNA fila por movimiento (cobro, comision de
// Google, reembolso, impuesto...) de TODAS las apps de la cuenta. Estructura
// verificada contra un informe real (sep 2026): UTF-8, columnas entre otras
// "Package ID", "Transaction Type", "Sku Id", "Amount (Merchant Currency)".
//
// Todo se lee en memoria; nada del ZIP se extrae a disco ni se ejecuta.

const MAX_CSV_BYTES = 20 * 1024 * 1024;
const CSV_NAME = /^PlayApps_(\d{6})\.csv$/i;

const toNumber = (v) => Number(String(v ?? '').replace(/,/g, '')) || 0;
const round2 = (n) => Math.round(n * 100) / 100;

// -> { month: 'AAAAMM', rows: [...] }. Lanza si el ZIP no es un informe de ganancias.
function readEarningsZip(buffer) {
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new Error('El archivo no es un ZIP válido');
  }

  const entries = zip.getEntries().filter((e) => !e.isDirectory && CSV_NAME.test(path.basename(e.entryName)));
  if (!entries.length) throw new Error('El ZIP no contiene un informe de ganancias (PlayApps_AAAAMM.csv)');

  let month = null;
  const rows = [];
  for (const entry of entries) {
    if (entry.header.size > MAX_CSV_BYTES) throw new Error('El informe es demasiado grande');
    const entryMonth = path.basename(entry.entryName).match(CSV_NAME)[1];
    if (month && month !== entryMonth) throw new Error('El ZIP mezcla informes de meses distintos');
    month = entryMonth;
    const text = entry.getData().toString('utf8').replace(/^﻿/, '');
    rows.push(...parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }));
  }
  return { month, rows };
}

// Resume lo de UNA app (por su package id). "net" es la suma de TODAS las
// lineas tal como las reporta Google (cobros menos comision, reembolsos,
// impuestos...); "gross" son solo los cobros; "fees" las comisiones de Google.
function summarizeEarnings(rows, packageName) {
  const mine = rows.filter((r) => r['Package ID'] === packageName);
  if (!mine.length) return null;

  const currencies = [...new Set(mine.map((r) => r['Merchant Currency']).filter(Boolean))];
  const typeOf = (r) => String(r['Transaction Type'] || '');
  const amount = (r) => toNumber(r['Amount (Merchant Currency)']);

  const charges = mine.filter((r) => typeOf(r) === 'Charge');
  const bySku = {};
  for (const r of charges) {
    const sku = r['Sku Id'] || r['Product Title'] || 'sin SKU';
    bySku[sku] = bySku[sku] || { charges: 0, gross: 0 };
    bySku[sku].charges += 1;
    bySku[sku].gross = round2(bySku[sku].gross + amount(r));
  }

  return {
    currency: currencies[0] || 'USD',
    mixedCurrencies: currencies.length > 1,
    gross: round2(charges.reduce((s, r) => s + amount(r), 0)),
    fees: round2(mine.filter((r) => typeOf(r).startsWith('Google fee')).reduce((s, r) => s + amount(r), 0)),
    net: round2(mine.reduce((s, r) => s + amount(r), 0)),
    charges: charges.length,
    refunds: mine.filter((r) => /refund/i.test(typeOf(r)) && !typeOf(r).startsWith('Google fee')).length,
    bySku,
    types: [...new Set(mine.map(typeOf))],
  };
}

module.exports = { readEarningsZip, summarizeEarnings };
