import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "One World Morocco"

interface HotelPriceReportProps {
  refreshed?: number
  errorsCount?: number
  errors?: string[]
  checkIn?: string
  checkOut?: string
  date?: string
}

const HotelPriceReportEmail = ({
  refreshed = 0,
  errorsCount = 0,
  errors = [],
  checkIn = '',
  checkOut = '',
  date = '',
}: HotelPriceReportProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Rapport prix hôtels — {refreshed} mis à jour</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🏨 Rapport quotidien des prix hôtels</Heading>
        <Text style={dateText}>{date || new Date().toLocaleDateString('fr-FR')}</Text>
        <Hr style={hr} />

        <Section style={statsSection}>
          <Text style={statLabel}>Prix rafraîchis</Text>
          <Text style={statValue}>{refreshed}</Text>
        </Section>

        <Section style={statsSection}>
          <Text style={statLabel}>Dates</Text>
          <Text style={statValueSmall}>Check-in: {checkIn} — Check-out: {checkOut}</Text>
        </Section>

        {errorsCount > 0 && (
          <Section>
            <Hr style={hr} />
            <Text style={errorLabel}>⚠️ {errorsCount} erreur(s)</Text>
            {errors.slice(0, 10).map((err, i) => (
              <Text key={i} style={errorItem}>• {err}</Text>
            ))}
            {errors.length > 10 && (
              <Text style={errorItem}>... et {errors.length - 10} autres</Text>
            )}
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Rapport automatique — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: HotelPriceReportEmail,
  subject: (data: Record<string, any>) =>
    `[OWM] Prix hôtels: ${data.refreshed ?? 0} mis à jour — ${data.date || new Date().toLocaleDateString('fr-FR')}`,
  to: 'jf@oneworldmorocco.com',
  displayName: 'Rapport prix hôtels quotidien',
  previewData: {
    refreshed: 94,
    errorsCount: 2,
    errors: ['SerpAPI Essaouira: timeout', 'LiteAPI Marrakech: 429'],
    checkIn: '2026-03-27',
    checkOut: '2026-03-28',
    date: '26/03/2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#c2571a', margin: '0 0 8px' }
const dateText = { fontSize: '13px', color: '#888', margin: '0 0 16px' }
const hr = { borderColor: '#e5e5e5', margin: '16px 0' }
const statsSection = { marginBottom: '12px' }
const statLabel = { fontSize: '12px', color: '#888', margin: '0 0 2px', textTransform: 'uppercase' as const }
const statValue = { fontSize: '28px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0' }
const statValueSmall = { fontSize: '14px', color: '#333', margin: '0' }
const errorLabel = { fontSize: '14px', fontWeight: 'bold' as const, color: '#d97706', margin: '0 0 8px' }
const errorItem = { fontSize: '12px', color: '#666', margin: '0 0 4px', lineHeight: '1.4' }
const footer = { fontSize: '11px', color: '#aaa', margin: '16px 0 0', textAlign: 'center' as const }
