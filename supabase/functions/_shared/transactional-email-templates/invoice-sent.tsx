import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Row, Column, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'One World Morocco'
const LOGO = 'https://oneworldmorocco.com/__l5e/assets-v1/7e389239-045b-4478-a02a-89e4b3b35e13/owm-invoice-logo.png'
const LEGAL = [
  'One World Morocco SAS', '84 bd Mohammed Zerktouni', 'N°18 Résidence Alice 1er étage',
  'Gueliz', '40000 Marrakech', 'info@oneworldmorocco.com', 'RCS n°185205', 'ICE : 003939548000076',
]

interface Item { label: string; quantity: number; line_total_ttc: number; vat_rate?: number; vat_exempt?: boolean }
interface Props {
  number?: string; recipientName?: string; currency?: string; date?: string
  totalHt?: number; totalVat?: number; totalTtc?: number; paid?: boolean; items?: Item[]; pdfUrl?: string | null
}

const fmt = (n: number | undefined, c: string) => `${Number(n ?? 0).toFixed(2)} ${c}`

const InvoiceEmail = ({
  number = '', recipientName = '', currency = 'MAD', date = '',
  totalHt = 0, totalVat = 0, totalTtc = 0, paid = false, items = [], pdfUrl = null,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre facture {number} — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO} width="64" height="64" alt={SITE_NAME} style={{ marginBottom: '16px' }} />
        <Heading style={h1}>Facture {number}</Heading>
        <Text style={text}>{recipientName ? `Bonjour ${recipientName},` : 'Bonjour,'}</Text>
        <Text style={text}>Veuillez trouver ci-dessous votre facture {SITE_NAME}{date ? ` du ${date}` : ''}.</Text>
        <Section style={table}>
          {items.map((it, i) => (
            <Row key={i} style={rowStyle}>
              <Column style={cellL}>{it.label} × {it.quantity}{it.vat_exempt ? ' (exonéré)' : it.vat_rate != null ? ` (TVA ${it.vat_rate}%)` : ''}</Column>
              <Column style={cellR}>{fmt(it.line_total_ttc, currency)}</Column>
            </Row>
          ))}
        </Section>
        <Text style={small}>Total HT : {fmt(totalHt, currency)} · TVA : {fmt(totalVat, currency)}</Text>
        <Text style={total}>Total TTC : {fmt(totalTtc, currency)}</Text>
        <Text style={small}>{paid ? 'Statut : payée. Merci.' : 'Statut : à régler.'}</Text>
        {pdfUrl ? (
          <Section style={{ margin: '8px 0 18px' }}>
            <Button href={pdfUrl} style={btn}>Télécharger la facture PDF</Button>
            <Text style={small}>Lien valable 30 jours.</Text>
          </Section>
        ) : null}
        <Text style={text}>Pour toute question, répondez simplement à cet email.</Text>
        <Hr style={hr} />
        {LEGAL.map((l) => <Text key={l} style={footer}>{l}</Text>)}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceEmail,
  subject: (d: Record<string, any>) => `Votre facture ${d.number ?? ''} — ${SITE_NAME}`,
  displayName: 'Facture envoyée',
  previewData: {
    number: 'FAC-2026-0001', recipientName: 'Julien Fontaine', currency: 'MAD', date: '15/10/2026',
    totalHt: 166.67, totalVat: 33.33, totalTtc: 200, paid: false,
    items: [{ label: 'Abonnement partenaire', quantity: 1, line_total_ttc: 200, vat_rate: 20 }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 14px', lineHeight: '1.6' }
const table = { margin: '10px 0 16px', borderTop: '1px solid #e5e5e5' }
const rowStyle = { borderBottom: '1px solid #e5e5e5' }
const cellL = { fontSize: '14px', color: '#1a1a1a', padding: '8px 0' }
const cellR = { fontSize: '14px', color: '#1a1a1a', padding: '8px 0', textAlign: 'right' as const }
const total = { fontSize: '16px', fontWeight: 'bold' as const, color: '#C1613C', margin: '0 0 14px' }
const small = { fontSize: '13px', color: '#666', margin: '0 0 8px', lineHeight: '1.6' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#999', margin: '0', lineHeight: '1.5' }
