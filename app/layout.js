import './globals.css'

export const metadata = {
  title: 'Amex Tracker',
  description: 'Walters household spend tracker',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="bg-cream font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
