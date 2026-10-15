import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'One World Morocco'

interface Item { label: string; quantity: number; unit_price_ht: number; total_ttc: number }
interface Props {
  number?: string
  recipientName?: string
  currency?: string
  subtotalHt?: number
  totalVat?: number
  totalTtc?: number
  expiresAt?: string | null
  items?: Item[]
  payUrl?: string | null
}

const fmt = (n: number | undefined, c: string) => `${Number(n ?? 0).toFixed(2)} ${c}`

const QuoteSentEmail = ({
  number = '', recipientName = '', currency = 'MAD',
  subtotalHt = 0, totalVat = 0, totalTtc = 0, expiresAt = null, items = [], payUrl = null,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre devis {number} — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Devis {number}</Heading>
        <Text style={text}>{recipientName ? `Bonjour ${recipientName},` : 'Bonjour,'}</Text>
        <Text style={text}>Veuillez trouver ci-dessous le détail de votre devis {SITE_NAME}.</Text>
        <Section style={table}>
          {items.map((it, i) => (
            <Row key={i} style={rowStyle}>
              <Column style={cellL}>{it.label} × {it.quantity}</Column>
              <Column style={cellR}>{fmt(it.total_ttc, currency)}</Column>
            </Row>
          ))}
        </Section>
        <Text style={small}>Total HT : {fmt(subtotalHt, currency)} · TVA : {fmt(totalVat, currency)}</Text>
        <Text style={total}>Total TTC : {fmt(totalTtc, currency)}</Text>
        {expiresAt ? <Text style={small}>Devis valable jusqu'au {expiresAt}.</Text> : null}
        {payUrl ? (
          <Section style={{ margin: '24px 0' }}>
            <Button href={payUrl} style={button}>Payer {fmt(totalTtc, currency)} en ligne</Button>
          </Section>
        ) : null}
        <Text style={text}>Pour toute question, répondez simplement à cet email.</Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: QuoteSentEmail,
  subject: (d: Record<string, any>) => `Votre devis ${d.number ?? ''} — ${SITE_NAME}`,
  displayName: 'Devis envoyé',
  previewData: {
    number: 'DEV-2026-0001', recipientName: 'Julien Fontaine', currency: 'EUR',
    subtotalHt: 195, totalVat: 39, totalTtc: 234, expiresAt: null,
    payUrl: 'https://oneworldmorocco.com/payer-devis/demo',
    items: [{ label: 'Abonnement partenaire', quantity: 1, unit_price_ht: 195, total_ttc: 234 }],
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
const footer = { fontSize: '12px', color: '#999', margin: '0' }
const button = { backgroundColor: '#C1613C', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, padding: '13px 26px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
