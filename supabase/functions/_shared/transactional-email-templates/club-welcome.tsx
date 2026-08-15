import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Button, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'One World Morocco'
const SITE_URL = 'https://oneworldmorocco.com'

interface ClubWelcomeProps {
  nickname?: string
  email?: string
  clubUrl?: string
}

const ClubWelcomeEmail = ({
  nickname = '',
  clubUrl = `${SITE_URL}/club`,
}: ClubWelcomeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue au Club {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Text style={tagline}>La Première Plateforme Solidaire du Maroc</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>Bienvenue au Club 🎉</Heading>

          <Text style={text}>
            {nickname ? `Bonjour ${nickname},` : 'Bonjour,'}
          </Text>

          <Text style={text}>
            Votre adhésion au Club <strong>{SITE_NAME}</strong> est enregistrée. Vous avez
            désormais accès à l'assistant IA, aux bonnes adresses de Marrakech et Essaouira,
            aux événements et aux avantages réservés aux membres.
          </Text>

          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button href={clubUrl} style={button}>
              Accéder à mon espace Club
            </Button>
          </Section>

          <Text style={small}>
            Complétez votre profil pour recevoir des recommandations adaptées à vos envies.
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
  component: ClubWelcomeEmail,
  subject: `Bienvenue au Club ${SITE_NAME}`,
  displayName: 'Bienvenue Club',
  previewData: {
    nickname: 'Julien',
    email: 'julien@example.com',
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
const button = { backgroundColor: '#C04F17', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#ECD6B8', margin: '24px 0 12px' }
const signature = { fontSize: '12px', color: '#7A6A55', textAlign: 'center' as const, margin: '0' }
const signatureLink = { color: '#C04F17', textDecoration: 'none' }
