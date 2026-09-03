# Runna Prompt Builder

Aplicación independiente para que una inmobiliaria construya y guarde prompts de alta calidad para sus páginas web. Cada prompt combina un embudo inmobiliario, contexto real del negocio, dirección de arte y criterios técnicos. El resultado puede copiarse o abrirse directamente en Lovable.

La interfaz utiliza la instalación manual oficial de Untitled UI: React Aria para los controles accesibles, Tailwind CSS para los tokens de tema y `@untitledui/icons` para la iconografía. El color de marca está centralizado como `#136F64` en `app/styles.css`.

## Ejecutar localmente

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 7000
```

Abre `http://localhost:7000`. Para identificar respuestas de distintos eventos o códigos QR, agrega un identificador a la URL:

```text
http://localhost:7000/?session=expo-tijuana-2026
```

Sin credenciales, la app funciona en modo demostración y guarda las respuestas en `data/submissions.json`, además del borrador del navegador. Este archivo local está ignorado por Git y no es apropiado para producción.

## Flujo del participante

1. Elige uno de seis embudos: propiedad destacada, captación de vendedores, búsqueda de propiedad, open house, desarrollo/preventa o marca de asesor.
2. Responde una pregunta por pantalla. Los botones específicos para cada embudo prellenan público, oferta, especialidad, diferenciador y pruebas de confianza; todo el texto queda editable.
3. Elige tono y canal de conversión mediante tarjetas visuales con ejemplos claros.
4. Elige una de seis direcciones de arte y ajusta su intensidad o color de marca mientras el prompt se actualiza en vivo.
5. Puede solicitar el IA Starter Pack por WhatsApp con consentimiento explícito.
6. Copia el prompt, abre Lovable con el contenido precargado o usa el prompt de revisión después de construir.

El botón **Generar otro prompt** crea una página independiente sin reemplazar la anterior. El WhatsApp consentido se conserva en `localStorage` para no volver a solicitarlo en cada página; la persona siempre puede cambiar sus datos o continuar sin agregar el nuevo prompt al Starter Pack.

## Enlace a Lovable

La integración usa el formato oficial `https://lovable.dev/#prompt=...`. Lovable se abre en una pestaña nueva con el prompt precargado; por diseño, la persona todavía revisa el contenido y presiona **Send**. La app no publica ni ejecuta el proyecto automáticamente.

## Conectar Supabase

1. Crea un proyecto de Supabase.
2. Ejecuta [`supabase/schema.sql`](./supabase/schema.sql) desde SQL Editor. El archivo también incluye la migración idempotente desde la primera versión.
3. Copia `.env.example` a `.env.local`.
4. Configura `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
5. Reinicia la aplicación.

La service role se usa exclusivamente dentro de la ruta del servidor y nunca se entrega al navegador. La tabla tiene RLS habilitado y no ofrece políticas públicas: todas las escrituras pasan por validación y límites básicos en `/api/submissions`. Para consultar resultados, usa el Table Editor de Supabase o un backend administrativo autenticado.

## Datos guardados

- Identificador anónimo por dispositivo, identificador único de cada página y nombre de la sesión.
- Progreso sutil dentro del flujo, sin etiquetas de pasos que distraigan.
- Tipo de página, marca, ubicación, especialidad y público.
- Detalles de la oferta, diferenciador, pruebas de confianza, tono y canal de conversión.
- Dirección visual, intensidad y color de marca opcional.
- Nombre opcional y WhatsApp obligatorio para el Starter Pack, con consentimiento explícito.
- Solicitud explícita del IA Starter Pack para organizar los envíos posteriores.
- Prompt generado, versión del generador y fecha de finalización.

## Validación

```bash
npm test
npm run build
```
