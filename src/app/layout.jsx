import Head from 'next/head'
import { Geist, Geist_Mono } from 'next/font/google'
import NextToast from '../components/NextToast'
import WagmiContext from '@/contexts/WagmiContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from './Layout.module.scss'

import './Globals.scss'
import './GoogleFont.css'
import './../styles/Global.scss'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL),
  title: {
    template: `${process.env.NEXT_PUBLIC_NAME} | %s`,
    default: process.env.NEXT_PUBLIC_NAME,
  },
  description: process.env.NEXT_PUBLIC_DESCRIPTION,
  keywords: [process.env.NEXT_PUBLIC_KEYWORDS],
  author: { name: process.env.NEXT_PUBLIC_AUTHOR, url: process.env.NEXT_PUBLIC_AUTHOR_URL },
  creator: process.env.NEXT_PUBLIC_CREATOR,
  openGraph: {
    images: '/og-image.png',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/shortcut-icon.png',
    apple: '/apple-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed.png',
      url: '/apple-touch-icon-precomposed.png',
    },
  },
  manifest: '/manifest.json',
  category: 'Social',
}

export const viewport = {
  themeColor: '#2E90FA',
}

export default async function RootLayout({ children }) {
  return (
    <html lang="en-US">
      <Head>
        <link rel="icon" href="https://example.com/favicon.ico" type="image/svg+xml" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
     integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
     crossorigin=""/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
     integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
     crossorigin="" ></script>
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable} ms-Fabric`}>
        <NextToast />
        <WagmiContext>
          <Header />
          <main className={`${styles.main}`}>{children}</main>
          <Footer />
        </WagmiContext>
      </body>
    </html>
  )
}
