import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <Link to="/" className="text-xs text-[#64748b] dark:text-white/40 hover:text-[#1e40af] transition-colors">← Volver al inicio</Link>
        <h1 className="text-2xl font-semibold text-[#0f172a] dark:text-white mt-3">Política de Privacidad</h1>
        <p className="text-xs text-[#94a3b8] dark:text-white/25 mt-1">Última actualización: junio 2026</p>
      </div>

      <div className="card p-8 space-y-6 text-sm leading-relaxed text-[#374151] dark:text-white/70">

        <Section title="1. Responsable del tratamiento">
          Fast-IT, operado por Nadilop Ltda. (en adelante "Fast-IT", "nosotros"), es el responsable del tratamiento de los datos personales recopilados a través de esta plataforma, de conformidad con la Ley N° 19.628 sobre Protección de la Vida Privada de Chile.
        </Section>

        <Section title="2. Datos que recopilamos">
          Recopilamos los siguientes datos personales:
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li>Datos de identificación: nombre, RUT, correo electrónico.</li>
            <li>Datos empresariales: razón social, giro, RUT empresa (para facturas).</li>
            <li>Datos de envío: dirección, comuna, región.</li>
            <li>Datos de uso: páginas visitadas, productos consultados, historial de compras.</li>
          </ul>
        </Section>

        <Section title="3. Finalidad del tratamiento">
          Utilizamos sus datos para:
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li>Gestionar su cuenta y autenticación.</li>
            <li>Procesar y despachar sus órdenes.</li>
            <li>Emitir boletas y facturas electrónicas.</li>
            <li>Enviar comunicaciones transaccionales (confirmación de compra, estado del envío).</li>
            <li>Mejorar la experiencia de uso de la plataforma.</li>
          </ul>
        </Section>

        <Section title="4. Base de legitimidad">
          El tratamiento de sus datos se basa en (a) la ejecución del contrato de compraventa celebrado al realizar una orden, (b) su consentimiento explícito al registrarse en la plataforma, y (c) el cumplimiento de obligaciones legales de facturación.
        </Section>

        <Section title="5. Destinatarios de los datos">
          Sus datos pueden ser compartidos con:
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li><strong>Transbank / Flow.cl:</strong> para el procesamiento seguro de pagos.</li>
            <li><strong>Chilexpress:</strong> para la gestión del despacho y seguimiento de envíos.</li>
            <li><strong>SendGrid:</strong> para el envío de correos transaccionales.</li>
            <li><strong>OpenAI:</strong> para el procesamiento de consultas al Asesor IA (sin datos de identificación personal).</li>
          </ul>
          No vendemos ni cedemos sus datos a terceros con fines comerciales.
        </Section>

        <Section title="6. Seguridad">
          Implementamos medidas técnicas y organizativas para proteger sus datos, incluyendo cifrado en tránsito (TLS), almacenamiento de contraseñas con hash bcrypt, y control de acceso por roles. Sin embargo, ningún sistema es completamente seguro; en caso de brecha de seguridad, le notificaremos según lo exige la ley.
        </Section>

        <Section title="7. Retención de datos">
          Conservamos sus datos mientras su cuenta esté activa o sea necesario para cumplir con nuestras obligaciones legales (por ejemplo, el SII exige conservar documentos tributarios por al menos 6 años). Puede solicitar la eliminación de su cuenta en cualquier momento.
        </Section>

        <Section title="8. Sus derechos">
          De conformidad con la Ley N° 19.628, usted tiene derecho a:
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li>Acceder a sus datos personales.</li>
            <li>Rectificar datos inexactos.</li>
            <li>Solicitar la eliminación de sus datos.</li>
            <li>Oponerse al tratamiento de sus datos.</li>
          </ul>
          Para ejercer estos derechos, contáctenos en <a href="mailto:privacidad@fastit.cl" className="text-[#1e40af] dark:text-blue-400 hover:underline">privacidad@fastit.cl</a>.
        </Section>

        <Section title="9. Cookies">
          La plataforma utiliza almacenamiento local del navegador (localStorage) para mantener su sesión y preferencias (tema claro/oscuro, carrito). No utilizamos cookies de seguimiento de terceros con fines publicitarios.
        </Section>

        <Section title="10. Cambios en esta política">
          Podemos actualizar esta política periódicamente. Le notificaremos los cambios relevantes por correo electrónico o mediante un aviso en la plataforma. La fecha de la última actualización siempre estará visible al inicio de este documento.
        </Section>

        <div className="pt-4 border-t border-[#e2e8f0] dark:border-white/[0.07] text-xs text-[#94a3b8] dark:text-white/25">
          ¿Tienes preguntas sobre tus datos? <Link to="/contact" className="text-[#1e40af] dark:text-blue-400 hover:underline">Contáctanos</Link>.
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-[#0f172a] dark:text-white text-base">{title}</h2>
      <div>{children}</div>
    </div>
  )
}
