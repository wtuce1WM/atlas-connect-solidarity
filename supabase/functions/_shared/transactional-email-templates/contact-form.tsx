import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "One World Morocco"

interface ContactFormProps {
  name?: string
  email?: string
  message?: string
}

const ContactFormEmail = ({
  name = '',
  email = '',
  message = '',
}: ContactFormProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau message de contact de {name || 'un visiteur'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouveau message de contact</Heading>
        <Text style={text}>
          Vous avez reçu un nouveau message via le formulaire de contact du site {SITE_NAME}.
        </Text>

        <Section style={detailsSection}>
          <Text style={label}>Nom</Text>
          <Text style={value}>{name || '—'}</Text>

          <Text style={label}>Email</Text>
          <Text style={value}>{email || '—'}</Text>

          <Hr style={divider} />

          <Text style={label}>Message</Text>
          <Text style={value}>{message || '—'}</Text>
        </Section>

        <Text style={footer}>
          Cet email a été envoyé automatiquement par {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactFormEmail,
  subject: (data: Record<string, any>) =>
    `Contact: ${data.name || 'Nouveau message'}`,
  to: 'jf@oneworldmorocco.com',
  displayName: 'Formulaire de contact',
  previewData: { name: 'Jean Dupont', email: 'jean@example.com', message: 'Bonjour, je souhaite en savoir plus sur vos services.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#C05621', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const detailsSection = { backgroundColor: '#faf8f5', borderRadius: '8px', padding: '20px', margin: '0 0 25px' }
const label = { fontSize: '12px', color: '#888888', textTransform: 'uppercase' as const, margin: '12px 0 2px', letterSpacing: '0.5px' }
const value = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px' }
const divider = { borderColor: '#e5e5e5', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
