import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Button, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'One World Morocco'

interface AffiliateWelcomeProps {
  affiliateName?: string
  contactName?: string
  email?: string
  actionUrl?: string
  dashboardUrl?: string
}

const AffiliateWelcomeEmail = ({
  affiliateName = '',
  contactName = '',
  email = '',
  actionUrl = '',
  dashboardUrl = 'https://oneworldmorocco.com/affiliates/dashboard',
}: AffiliateWelcomeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur {SITE_NAME} — créez votre mot de passe</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bienvenue sur {SITE_NAME}</Heading>

        <Text style={text}>
          {contactName ? `Bonjour ${contactName},` : 'Bonjour,'}
        </Text>

        <Text style={text}>
          Votre espace partenaire pour {SITE_NAME} est ouvert.
          Il vous permet de gérer votre présence, vos offres, vos avis clients et de suivre
          vos statistiques.
        </Text>

        <Text style={text}>
          Pour commencer, créez votre mot de passe associé à l'adresse
          {email ? ` ${email}` : ' de contact'} :
        </Text>

        {actionUrl ? (
          <Section style={btnSection}>
            <Button href={actionUrl} style={button}>
              Créer mon mot de passe
            </Button>
          </Section>
        ) : null}

        <Text style={small}>
          Ce lien est valable une seule fois et expire après 1 heure. Passé ce délai, demandez-en un nouveau depuis la page de connexion partenaire. Une fois votre mot de
          passe défini, connectez-vous à tout moment depuis{' '}
          <Link href={dashboardUrl} style={link}>votre espace partenaire</Link>.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AffiliateWelcomeEmail,
  subject: (data: Record<string, any>) =>
    `Bienvenue sur ${SITE_NAME}${data.affiliateName ? ` — ${data.affiliateName}` : ''}`,
  displayName: 'Bienvenue affilié',
  previewData: {
    affiliateName: 'Riad Dar Najat',
    contactName: 'Ahmed Benani',
    email: 'ahmed@example.com',
    actionUrl: 'https://oneworldmorocco.com/affiliates/reset-password',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 14px', lineHeight: '1.6' }
const btnSection = { margin: '26px 0' }
const button = {
  backgroundColor: '#C1613C',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '13px 26px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}
const small = { fontSize: '13px', color: '#666', margin: '0 0 8px', lineHeight: '1.6' }
const link = { color: '#C1613C' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
