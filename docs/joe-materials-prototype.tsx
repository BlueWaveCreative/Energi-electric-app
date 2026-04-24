// REFERENCE ONLY — Joe's Claude-artifact prototype of the materials cost sheet / quoting tool.
// Source: https://claude.ai/public/artifacts/51be6aef-32e5-4034-8250-77086d5fa788
// Captured from Joe 2026-04-24 during Energi Electric App PRD discovery.
// NOT production code. Used to inform Milestone 3 (Materials DB + Quotes) speccing.
// Production version must use Energi branding (#045815 green) instead of the orange accent here.

import { useState, useCallback } from "react";

const PHASES = ["Rough-In", "Trim-Out", "Service/Panel", "Temporary Power", "Misc/Other"];

const DEFAULT_ITEMS = {
  "Rough-In": [
    { id: 1, name: "12/2 NM-B Wire", unit: "ft", price: 0.65, qty: 0 },
    { id: 2, name: "14/2 NM-B Wire", unit: "ft", price: 0.45, qty: 0 },
    { id: 3, name: "10/2 NM-B Wire", unit: "ft", price: 1.10, qty: 0 },
    { id: 4, name: "12/3 NM-B Wire", unit: "ft", price: 0.95, qty: 0 },
    { id: 5, name: "Single Gang Box (Plastic)", unit: "ea", price: 0.75, qty: 0 },
    { id: 6, name: "Double Gang Box (Plastic)", unit: "ea", price: 1.25, qty: 0 },
    { id: 7, name: "4\" Square Box", unit: "ea", price: 2.50, qty: 0 },
    { id: 8, name: "1/2\" Romex Staples (box)", unit: "box", price: 4.50, qty: 0 },
    { id: 9, name: "1/2\" EMT Conduit (10ft)", unit: "ea", price: 4.25, qty: 0 },
    { id: 10, name: "3/4\" EMT Conduit (10ft)", unit: "ea", price: 6.50, qty: 0 },
    { id: 11, name: "1/2\" EMT Connector", unit: "ea", price: 0.85, qty: 0 },
    { id: 12, name: "1/2\" EMT Coupling", unit: "ea", price: 0.65, qty: 0 },
    { id: 13, name: "Low Voltage Bracket", unit: "ea", price: 1.20, qty: 0 },
    { id: 14, name: "Old Work Box", unit: "ea", price: 2.10, qty: 0 },
  ],
  "Trim-Out": [
    { id: 20, name: "15A Duplex Receptacle", unit: "ea", price: 1.85, qty: 0 },
    { id: 21, name: "20A Duplex Receptacle", unit: "ea", price: 3.25, qty: 0 },
    { id: 22, name: "GFCI Receptacle 15A", unit: "ea", price: 14.50, qty: 0 },
    { id: 23, name: "GFCI Receptacle 20A", unit: "ea", price: 17.00, qty: 0 },
    { id: 24, name: "AFCI Receptacle", unit: "ea", price: 28.00, qty: 0 },
    { id: 25, name: "Single Pole Switch 15A", unit: "ea", price: 2.50, qty: 0 },
    { id: 26, name: "3-Way Switch", unit: "ea", price: 5.75, qty: 0 },
    { id: 27, name: "Dimmer Switch (Single Pole)", unit: "ea", price: 18.00, qty: 0 },
    { id: 28, name: "Decora Cover Plate", unit: "ea", price: 0.95, qty: 0 },
    { id: 29, name: "Standard Cover Plate", unit: "ea", price: 0.55, qty: 0 },
    { id: 30, name: "Smoke Detector (AC)", unit: "ea", price: 22.00, qty: 0 },
    { id: 31, name: "Combo Smoke/CO Detector", unit: "ea", price: 38.00, qty: 0 },
    { id: 32, name: "Wire Connector (bag/100)", unit: "bag", price: 8.50, qty: 0 },
  ],
  "Service/Panel": [
    { id: 40, name: "200A Main Breaker Panel", unit: "ea", price: 185.00, qty: 0 },
    { id: 41, name: "100A Main Breaker Panel", unit: "ea", price: 95.00, qty: 0 },
    { id: 42, name: "Single Pole Breaker 15A", unit: "ea", price: 8.50, qty: 0 },
    { id: 43, name: "Single Pole Breaker 20A", unit: "ea", price: 8.50, qty: 0 },
    { id: 44, name: "Double Pole Breaker 30A", unit: "ea", price: 14.00, qty: 0 },
    { id: 45, name: "Double Pole Breaker 50A", unit: "ea", price: 18.00, qty: 0 },
    { id: 46, name: "AFCI Breaker 15A", unit: "ea", price: 42.00, qty: 0 },
    { id: 47, name: "AFCI Breaker 20A", unit: "ea", price: 42.00, qty: 0 },
    { id: 48, name: "GFCI Breaker 20A", unit: "ea", price: 48.00, qty: 0 },
    { id: 49, name: "2/0 Aluminum Service Wire (ft)", unit: "ft", price: 2.85, qty: 0 },
    { id: 50, name: "200A Meter Socket", unit: "ea", price: 68.00, qty: 0 },
    { id: 51, name: "Ground Rod (8ft)", unit: "ea", price: 12.50, qty: 0 },
    { id: 52, name: "Ground Rod Clamp", unit: "ea", price: 3.25, qty: 0 },
    { id: 53, name: "2\" PVC Conduit (10ft)", unit: "ea", price: 9.50, qty: 0 },
    { id: 54, name: "2\" PVC LB", unit: "ea", price: 8.75, qty: 0 },
  ],
  "Temporary Power": [
    { id: 60, name: "Temp Power Pole", unit: "ea", price: 45.00, qty: 0 },
    { id: 61, name: "Spider Box (6-circuit)", unit: "ea", price: 185.00, qty: 0 },
    { id: 62, name: "50A Male Plug", unit: "ea", price: 18.00, qty: 0 },
    { id: 63, name: "30A Receptacle", unit: "ea", price: 12.00, qty: 0 },
    { id: 64, name: "GFCI Inline Cord", unit: "ea", price: 22.00, qty: 0 },
    { id: 65, name: "10/3 SO Cord (ft)", unit: "ft", price: 2.10, qty: 0 },
    { id: 66, name: "Extension Cord 100ft 12g", unit: "ea", price: 38.00, qty: 0 },
  ],
  "Misc/Other": [
    { id: 70, name: "Electrical Tape (roll)", unit: "ea", price: 1.85, qty: 0 },
    { id: 71, name: "Pull String (500ft)", unit: "ea", price: 12.00, qty: 0 },
    { id: 72, name: "Liquid Tight Connector 1/2\"", unit: "ea", price: 2.25, qty: 0 },
    { id: 73, name: "Weatherproof Cover (1g)", unit: "ea", price: 4.50, qty: 0 },
    { id: 74, name: "Weatherproof Cover (2g)", unit: "ea", price: 6.75, qty: 0 },
    { id: 75, name: "Conduit Strap 1/2\" (bag/10)", unit: "bag", price: 3.50, qty: 0 },
    { id: 76, name: "Knockouts (assorted)", unit: "set", price: 5.00, qty: 0 },
    { id: 77, name: "Anti-Short Bushings (bag)", unit: "bag", price: 2.75, qty: 0 },
    { id: 78, name: "Cable Ties (bag/100)", unit: "bag", price: 4.00, qty: 0 },
    { id: 79, name: "Label Tape", unit: "ea", price: 8.50, qty: 0 },
  ],
};

// Calculation logic from Joe's prototype:
//   phaseSubtotal = sum(price * qty for each item in phase)
//   materialsTotal = sum of all phaseSubtotals
//   markupAmt = markupOn ? materialsTotal * (markup/100) : 0
//   laborAmt = laborRate * laborHours       (NOT marked up)
//   subtotalBeforeTax = materialsTotal + markupAmt + laborAmt + (flatOn ? flatFee : 0)
//   taxAmt = taxOn ? subtotalBeforeTax * (tax/100) : 0    (tax applied to EVERYTHING)
//   grandTotal = subtotalBeforeTax + taxAmt
//
// Defaults: markup=20%, tax=8.5%, laborRate=$85/hr, flatFee=$0
//
// Full source code preserved below for Milestone 3 reference.
// See Joe's original at the Claude artifact URL above.
