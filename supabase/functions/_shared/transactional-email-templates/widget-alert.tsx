import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Button, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'One World Morocco'

interface AlertItem {
  title: string
  detail: string
}

interface WidgetAlertProps {
  cityName?: string
  nickname?: string
  dateLabel?: string
  alerts?: AlertItem[]
  widgetUrl?: string
  unsubscribeUrl?: string
}

const WidgetAlertEmail = ({
  cityName = '',
  nickname = '',
  dateLabel = '',
  alerts = [],
  widgetUrl = 'https://oneworldmorocco.com/widgets',
  unsubscribeUrl = '',
}: WidgetAlertProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Alerte ${cityName} — ${alerts.map((a) => a.title).join(', ')}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🌊 Alerte {cityName}</Heading>
        <Text style={text}>
          {nickname ? `Bonjour ${nickname}, ` : 'Bonjour, '}
          voici les conditions prévues à {cityName}{dateLabel ? ` pour ${dateLabel}` : ''}.
        </Text>

        {alerts.map((a, i) => (
          <Section key={i} style={card}>
            <Text style={cardTitle}>{a.title}</Text>
            <Text style={cardDetail}>{a.detail}</Text>
          </Section>
        ))}

        <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
          <Button style={button} href={widgetUrl}>
            Voir les marées & vents
          </Button>
        </Section>

        <Hr style={divider} />
        <Text style={footer}>
          Prévisions modélisées (Open-Meteo) — usage plage & loisirs, jamais pour la navigation.
          {unsubscribeUrl ? (
            <>
              {' '}
              <Link href={unsubscribeUrl} style={{ color: '#9ca3af' }}>Se désinscrire des alertes</Link>.
            </>
          ) : null}
        </Text>
        <Text style={footer}>Envoyé automatiquement par {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: WidgetAlertEmail,
  subject: (data: Record<string, any>) => {
    const titles = Array.isArray(data.alerts) ? data.alerts.map((a: AlertItem) => a.title) : []
    return `Alerte ${data.cityName || 'côte marocaine'} — ${titles.join(' · ') || 'conditions du jour'}`
  },
  displayName: 'Widget — alerte marées & vents',
  previewData: {
    cityName: 'Essaouira',
    nickname: 'Julien',
    dateLabel: 'demain',
    alerts: [
      { title: 'Grande marée', detail: 'Coefficient estimé 104 — marnage 3,1 m. Pleine mer à 11h20.' },
      { title: 'Conditions idéales pour le kitesurf', detail: 'Vent 28 km/h (rafales 36) de secteur NNE entre 12h et 18h.' },
    ],
    widgetUrl: 'https://oneworldmorocco.com/widgets',
  },
}

const main = { backgroundColor: '#f6f6f6', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '28px', maxWidth: '560px', borderRadius: '12px' }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: 'bold', margin: '0 0 16px' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '24px', margin: '0 0 12px' }
const card = { backgroundColor: '#f3f4f6', borderRadius: '10px', padding: '14px 16px', margin: '0 0 10px' }
const cardTitle = { color: '#111827', fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }
const cardDetail = { color: '#4b5563', fontSize: '14px', lineHeight: '21px', margin: 0 }
const button = { backgroundColor: '#C0562B', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: 'bold', padding: '12px 22px', textDecoration: 'none' }
const divider = { borderColor: '#e5e7eb', margin: '24px 0 14px' }
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px', margin: '0 0 6px' }
