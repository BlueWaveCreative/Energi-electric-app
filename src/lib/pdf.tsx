import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#32373C', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, alignItems: 'flex-start' },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#32373C' },
  companySubtitle: { fontSize: 10, color: '#888', marginTop: 2 },
  invoiceTitleBlock: { textAlign: 'right' },
  invoiceTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#32373C', marginBottom: 4 },
  invoiceNumber: { fontSize: 11, color: '#888' },
  metaRow: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  metaBlock: { flex: 1 },
  label: { fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 12, color: '#32373C' },
  statusBadgePaid: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '3 8', borderRadius: 4 },
  statusBadgeDue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#a16207', backgroundColor: '#fef9c3', padding: '3 8', borderRadius: 4 },
  invoiceSubtitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 12, color: '#32373C' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: '6 8', marginBottom: 2 },
  tableHeaderText: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', borderBottomStyle: 'solid' },
  cellText: { fontSize: 11, color: '#374151' },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  divider: { borderTopWidth: 1, borderTopColor: '#e5e7eb', borderTopStyle: 'solid', marginTop: 12, marginBottom: 8 },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 2 },
  totalsLabel: { fontSize: 11, color: '#6b7280', width: 120, textAlign: 'right', paddingRight: 12 },
  totalsValue: { fontSize: 11, color: '#374151', width: 80, textAlign: 'right' },
  grandLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#32373C', width: 120, textAlign: 'right', paddingRight: 12 },
  grandValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#045815', width: 80, textAlign: 'right' },
  notes: { marginTop: 20, fontSize: 10, color: '#555', backgroundColor: '#f9fafb', padding: 10, borderRadius: 4 },
  notesLabel: { fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  footer: { position: 'absolute', bottom: 32, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#9ca3af' },
})

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export interface InvoicePDFProps {
  invoiceNumber: number
  title: string
  status: 'sent' | 'paid'
  issuedDate: string
  dueDate: string | null
  customerName: string
  projectName: string | null
  notes: string | null
  taxAmount: number
  lineItems: { description: string; quantity: number; unit_price: number }[]
}

export function InvoicePDF({
  invoiceNumber, title, status, issuedDate, dueDate, customerName, projectName,
  notes, taxAmount, lineItems,
}: InvoicePDFProps) {
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const total = subtotal + taxAmount

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>Blue Shores Electric</Text>
            <Text style={styles.companySubtitle}>Wilmington, NC · (910) 619-2000</Text>
          </View>
          <View style={styles.invoiceTitleBlock}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.value}>{customerName}</Text>
            {projectName && <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{projectName}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{formatDate(issuedDate)}</Text>
          </View>
          {dueDate && (
            <View style={styles.metaBlock}>
              <Text style={styles.label}>Due</Text>
              <Text style={styles.value}>{formatDate(dueDate)}</Text>
            </View>
          )}
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Status</Text>
            <Text style={status === 'paid' ? styles.statusBadgePaid : styles.statusBadgeDue}>
              {status === 'paid' ? 'Paid' : 'Payment Due'}
            </Text>
          </View>
        </View>

        <Text style={styles.invoiceSubtitle}>{title}</Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc] as Style[]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty] as Style[]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice] as Style[]}>Unit Price</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal] as Style[]}>Total</Text>
        </View>

        {/* Line items */}
        {lineItems.map((item, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.cellText, styles.colDesc] as Style[]}>{item.description}</Text>
            <Text style={[styles.cellText, styles.colQty] as Style[]}>{item.quantity}</Text>
            <Text style={[styles.cellText, styles.colPrice] as Style[]}>{formatCurrency(item.unit_price)}</Text>
            <Text style={[styles.cellText, styles.colTotal] as Style[]}>{formatCurrency(item.quantity * item.unit_price)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.divider} />
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Subtotal</Text>
          <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
        </View>
        {taxAmount > 0 && (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>{formatCurrency(taxAmount)}</Text>
          </View>
        )}
        <View style={[styles.totalsRow, { marginTop: 4 }] as Style[]}>
          <Text style={styles.grandLabel}>Total</Text>
          <Text style={styles.grandValue}>{formatCurrency(total)}</Text>
        </View>

        {notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text>{notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Blue Shores Electric · (910) 619-2000 · blueshoresnc.com
        </Text>
      </Page>
    </Document>
  )
}
