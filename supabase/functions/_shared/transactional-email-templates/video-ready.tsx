import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'One World Morocco'

interface VideoReadyProps {
  businessName?: string
  videoTitle?: string
  durationSec?: number
  studioUrl?: string
  videoUrl?: string
}

const VideoReadyEmail = ({
  businessName = '',
  videoTitle = '',
  durationSec,
  studioUrl = 'https://oneworldmorocco.com/studio-video',
  videoUrl = '',
}: VideoReadyProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre vidéo {videoTitle || businessName || ''} est prête</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Votre vidéo est prête 🎬</Heading>
        <Text style={text}>
          La génération de votre vidéo{businessName ? ` pour ${businessName}` : ''} est terminée.
        </Text>

        <Section style={detailsSection}>
          {videoTitle ? (
            <>
              <Text style={label}>Titre</Text>
              <Text style={value}>{videoTitle}</Text>
            </>
          ) : null}
          {durationSec ? (
            <>
              <Text style={label}>Durée</Text>
              <Text style={value}>{durationSec} secondes</Text>
            </>
          ) : null}
        </Section>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={studioUrl}>
            Ouvrir Studio Vidéo IA
          </Button>
        </Section>

        {videoUrl ? (
          <Text style={{ ...text, textAlign: 'center' as const, fontSize: '13px' }}>
            Lien direct de la vidéo : {videoUrl}
          </Text>
        ) : null}

        <Hr style={divider} />
        <Text style={footer}>
          Cet email a été envoyé automatiquement par {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VideoReadyEmail,
  subject: (data: Record<string, any>) =>
    `Votre vidéo ${data.businessName ? `— ${data.businessName} ` : ''}est prête`,
  displayName: 'Studio Vidéo — vidéo prête',
  previewData: {
    businessName: 'Riad Dar Najat',
    videoTitle: 'Présentation 30s',
    durationSec: 30,
    studioUrl: 'https://oneworldmorocco.com/studio-video',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#333333' }
const detailsSection = { backgroundColor: '#faf7f4', borderRadius: '10px', padding: '16px 18px', margin: '16px 0' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#8a8a8a', margin: '8px 0 2px' }
const value = { fontSize: '15px', color: '#1a1a1a', margin: '0' }
const button = {
  backgroundColor: '#C04F17', color: '#ffffff', borderRadius: '8px',
  padding: '12px 22px', fontSize: '15px', fontWeight: '600', textDecoration: 'none',
}
const divider = { borderColor: '#eeeeee', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#999999' }
