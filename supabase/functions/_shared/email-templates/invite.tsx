/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vous êtes invité·e à rejoindre One World Morocco</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>One World Morocco</Text>
          <Text style={tagline}>La Première Plateforme Solidaire du Maroc</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Vous êtes invité·e 🎉</Heading>
          <Text style={text}>
            Rejoignez <Link href={siteUrl} style={link}><strong>One World Morocco</strong></Link>{' '}
            et créez votre compte en cliquant sur le bouton ci-dessous.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>Accepter l'invitation</Button>
          </Section>
          <Text style={footer}>
            Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
          </Text>
        </Section>
        <Text style={signature}>
          <Link href={siteUrl} style={signatureLink}>oneworldmorocco.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Avenir, "Nunito Sans", Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '8px 0 24px' }
const brand = { fontFamily: 'Montserrat, Arial, sans-serif', fontSize: '22px', fontWeight: 'bold' as const, color: '#C04F17', margin: '0' }
const tagline = { fontSize: '12px', color: '#7A6A55', margin: '4px 0 0', letterSpacing: '0.3px' }
const card = { backgroundColor: '#FBF6EE', border: '1px solid #ECD6B8', borderRadius: '12px', padding: '28px 24px' }
const h1 = { fontFamily: 'Montserrat, Arial, sans-serif', fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3B3B3B', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#C04F17', textDecoration: 'underline' }
const button = { backgroundColor: '#C04F17', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#7A6A55', margin: '24px 0 0', lineHeight: '1.5' }
const signature = { fontSize: '12px', color: '#7A6A55', textAlign: 'center' as const, margin: '24px 0 0' }
const signatureLink = { color: '#C04F17', textDecoration: 'none' }
