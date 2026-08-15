/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as hotelPriceReport } from './hotel-price-report.tsx'
import { template as affiliateRequest } from './affiliate-request.tsx'
import { template as affiliateRequestReceived } from './affiliate-request-received.tsx'
import { template as hotelPriceList } from './hotel-price-list.tsx'
import { template as contactForm } from './contact-form.tsx'
import { template as videoReady } from './video-ready.tsx'
import { template as affiliateWelcome } from './affiliate-welcome.tsx'
import { template as widgetAlert } from './widget-alert.tsx'
import { template as clubWelcome } from './club-welcome.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'hotel-price-report': hotelPriceReport,
  'affiliate-request': affiliateRequest,
  'affiliate-request-received': affiliateRequestReceived,
  'hotel-price-list': hotelPriceList,
  'contact-form': contactForm,
  'video-ready': videoReady,
  'affiliate-welcome': affiliateWelcome,
  'widget-alert': widgetAlert,
  'club-welcome': clubWelcome,
}


