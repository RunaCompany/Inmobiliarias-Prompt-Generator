import './styles.css';

export const metadata = {
  title: 'Prompt Builder para inmobiliarias · Runna',
  description: 'Construye un prompt claro y personalizado para la página web de tu inmobiliaria.',
  icons: { icon: '/runna-mark.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f1eb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
