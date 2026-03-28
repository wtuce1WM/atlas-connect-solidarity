import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "One World Morocco"

interface PriceRow {
  name: string
  price: number
  currency: string
  source: string
  city: string
}

interface HotelPriceListProps {
  prices?: PriceRow[]
  date?: string
}

const HotelPriceListEmail = ({
  prices = [],
  date = '',
}: HotelPriceListProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Liste des prix hôteliers — {prices.length} établissements</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🏨 Prix par nuit — {date || new Date().toLocaleDateString('fr-FR')}</Heading>
        <Text style={subtitle}>{prices.length} tarifs stockés en base, du moins cher au plus cher</Text>
        <Hr style={hr} />

        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Établissement</th>
              <th style={thRight}>Prix/nuit</th>
              <th style={thCenter}>Source</th>
              <th style={thCenter}>Ville</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p, i) => (
              <tr key={i} style={i % 2 === 0 ? trEven : trOdd}>
                <td style={tdName}>{p.name}</td>
                <td style={tdPrice}>{p.price} {p.currency}</td>
                <td style={tdSource}>
                  <span style={p.source === 'liteapi' ? badgeLiteapi : badgeSerpapi}>
                    {p.source === 'liteapi' ? 'LiteAPI' : 'SerpAPI'}
                  </span>
                </td>
                <td style={tdCity}>{p.city}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Hr style={hr} />
        <Text style={footer}>
          Rapport généré à la demande — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: HotelPriceListEmail,
  subject: (data: Record<string, any>) =>
    `[OWM] Liste prix hôtels — ${data.prices?.length ?? 0} tarifs — ${data.date || new Date().toLocaleDateString('fr-FR')}`,
  displayName: 'Liste prix hôtels',
  previewData: {
    date: '28/03/2026',
    prices: [
      { name: 'Hostel La Smala', price: 19, currency: 'EUR', source: 'serpapi', city: 'Essaouira' },
      { name: 'Royal Mansour', price: 2736, currency: 'EUR', source: 'liteapi', city: 'Marrakech' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 16px', maxWidth: '640px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#c2571a', margin: '0 0 4px' }
const subtitle = { fontSize: '13px', color: '#888', margin: '0 0 12px' }
const hr = { borderColor: '#e5e5e5', margin: '14px 0' }
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }
const th = { textAlign: 'left' as const, padding: '6px 8px', borderBottom: '2px solid #c2571a', color: '#333', fontSize: '11px', textTransform: 'uppercase' as const }
const thRight = { ...th, textAlign: 'right' as const }
const thCenter = { ...th, textAlign: 'center' as const }
const trEven = { backgroundColor: '#fafafa' }
const trOdd = { backgroundColor: '#ffffff' }
const tdName = { padding: '5px 8px', color: '#1a1a1a', fontWeight: '500' as const }
const tdPrice = { padding: '5px 8px', textAlign: 'right' as const, color: '#1a1a1a', fontWeight: 'bold' as const }
const tdSource = { padding: '5px 8px', textAlign: 'center' as const }
const tdCity = { padding: '5px 8px', textAlign: 'center' as const, color: '#666' }
const badgeLiteapi = { backgroundColor: '#7c3aed', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' as const }
const badgeSerpapi = { backgroundColor: '#0d9488', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' as const }
const footer = { fontSize: '11px', color: '#aaa', margin: '12px 0 0', textAlign: 'center' as const }
