import React from 'react'
import '../styles/globals.css'
import '@syncfusion/ej2-base/styles/material.css'
import '@syncfusion/ej2-react-documenteditor/styles/material.css'
import { registerLicense } from '@syncfusion/ej2-base'

// Register license synchronously on the client before first render
if (typeof window !== 'undefined') {
  try {
    const key = process.env.NEXT_PUBLIC_SYNCFUSION_KEY
    if (key) registerLicense(key)
  } catch (e) {
    // ignore registration errors
  }
}

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}
