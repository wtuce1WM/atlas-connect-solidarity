import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'One World Morocco'
const SITE_URL = 'https://oneworldmorocco.com'

interface AffiliateRequestReceivedProps {
  businessName?: string
  firstName?: string
  city?: string
}

const AffiliateRequestReceivedEmail = ({
  businessName = '',
  firstName = '',
  city = '',
}: AffiliateRequestReceivedProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande d'affiliation est bien reçue</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Text style={tagline}>La Première Plateforme Solidaire du Maroc</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>Demande reçue ✅</Heading>

          <Text style={text}>
            {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
          </Text>

          <Text style={text}>
            Merci pour votre demande d'affiliation{businessName ? ` pour ${businessName}` : ''}
            {city ? ` (${city})` : ''}. Elle est enregistrée et notre équipe l'étudie.
          </Text>

          <Text style={text}>
            Nous revenons vers vous sous 48 heures ouvrées. Si votre dossier est retenu, vous
            recevrez un second email pour créer votre mot de passe et accéder à votre espace
            partenaire.
          </Text>

          <Text style={small}>
            Une question d'ici là ? Répondez simplement à cet email.
          </Text>
        </Section>

        <Hr style={hr} />
        <Text style={signature}>
          <Link href={SITE_URL} style={signatureLink}>oneworldmorocco.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AffiliateRequestReceivedEmail,
  subject: (data: Record<string, any>) =>
    `Votre demande d'affiliation${data.businessName ? ` — ${data.businessName}` : ''} est bien reçue`,
  displayName: 'Accusé de réception affiliation',
  previewData: {
    businessName: 'Riad Dar Najat',
    firstName: 'Ahmed',
    city: 'Marrakech',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Avenir, "Nunito Sans", Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '8px 0 24px' }
const brand = { fontFamily: 'Montserrat, Arial, sans-serif', fontSize: '22px', fontWeight: 'bold' as const, color: '#C04F17', margin: '0' }
const tagline = { fontSize: '12px', color: '#7A6A55', margin: '4px 0 0', letterSpacing: '0.3px' }
const card = { backgroundColor: '#FBF6EE', border: '1px solid #ECD6B8', borderRadius: '12px', padding: '28px 24px' }
const h1 = { fontFamily: 'Montserrat, Arial, sans-serif', fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3B3B3B', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '13px', color: '#7A6A55', lineHeight: '1.6', margin: '0' }
const hr = { borderColor: '#ECD6B8', margin: '24px 0 12px' }
const signature = { fontSize: '12px', color: '#7A6A55', textAlign: 'center' as const, margin: '0' }
const signatureLink = { color: '#C04F17', textDecoration: 'none' }
