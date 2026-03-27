import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "One World Morocco"

interface AffiliateRequestProps {
  businessName?: string
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  city?: string
  website?: string
  multipleListings?: string
  contentReady?: string
  message?: string
}

const AffiliateRequestEmail = ({
  businessName = '',
  firstName = '',
  lastName = '',
  phone = '',
  email = '',
  city = '',
  website = '',
  multipleListings = '',
  contentReady = '',
  message = '',
}: AffiliateRequestProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouvelle demande d'affiliation — {businessName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouvelle demande d'affiliation</Heading>
        <Text style={label}>Établissement</Text>
        <Text style={value}>{businessName}</Text>

        <Text style={label}>Contact</Text>
        <Text style={value}>{firstName} {lastName}</Text>

        <Text style={label}>Téléphone</Text>
        <Text style={value}>{phone}</Text>

        <Text style={label}>Email</Text>
        <Text style={value}>{email}</Text>

        <Text style={label}>Ville</Text>
        <Text style={value}>{city}</Text>

        {website ? (
          <>
            <Text style={label}>Site web</Text>
            <Text style={value}>{website}</Text>
          </>
        ) : null}

        {multipleListings ? (
          <>
            <Text style={label}>Plusieurs fiches</Text>
            <Text style={value}>{multipleListings === 'yes' ? 'Oui' : 'Non'}</Text>
          </>
        ) : null}

        {contentReady ? (
          <>
            <Text style={label}>Contenu prêt</Text>
            <Text style={value}>{contentReady === 'yes' ? 'Oui' : 'Non'}</Text>
          </>
        ) : null}

        {message ? (
          <>
            <Hr style={hr} />
            <Text style={label}>Message</Text>
            <Text style={value}>{message}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>Envoyé depuis le formulaire {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AffiliateRequestEmail,
  subject: (data: Record<string, any>) => `Nouvelle demande d'affiliation — ${data.businessName || 'Sans nom'}`,
  to: 'jf@oneworldmorocco.com',
  displayName: 'Demande d\'affiliation',
  previewData: {
    businessName: 'Riad Exemple',
    firstName: 'Ahmed',
    lastName: 'Benani',
    phone: '+212 612345678',
    email: 'ahmed@example.com',
    city: 'Marrakech',
    website: 'https://riad-exemple.com',
    multipleListings: 'no',
    contentReady: 'yes',
    message: 'Je souhaite référencer mon riad.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 24px' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '16px 0 2px' }
const value = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 4px', lineHeight: '1.5' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '20px 0 0' }
