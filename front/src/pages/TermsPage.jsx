import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <Link to="/" className="text-xs text-[#64748b] dark:text-white/40 hover:text-[#1e40af] transition-colors">← Volver al inicio</Link>
        <h1 className="text-2xl font-semibold text-[#0f172a] dark:text-white mt-3">Términos y Condiciones</h1>
        <p className="text-xs text-[#94a3b8] dark:text-white/25 mt-1">Última actualización: junio 2026</p>
      </div>

      <div className="card p-8 prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-[#374151] dark:text-white/70">

        <Section title="1. Aceptación de los términos">
          Al acceder y utilizar la plataforma Fast-IT, usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.
        </Section>

        <Section title="2. Descripción del servicio">
          Fast-IT es una plataforma B2B de comercio electrónico especializada en hardware de tecnología crítica (almacenamiento, servidores y networking). Operamos bajo el modelo cross-docking a través de Nadilop Ltda., lo que significa que los productos son enviados directamente desde nuestros proveedores hacia el cliente final.
        </Section>

        <Section title="3. Registro y cuenta">
          Para realizar compras en Fast-IT debe crear una cuenta con información veraz y actualizada. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso. Fast-IT no se hace responsable por accesos no autorizados derivados de negligencia del usuario en la protección de sus credenciales.
        </Section>

        <Section title="4. Precios y facturación">
          Todos los precios publicados en la plataforma son en pesos chilenos (CLP) y corresponden a precios netos (sin IVA), salvo indicación contraria. Fast-IT emite boletas y facturas según lo seleccionado en el proceso de compra. Los precios pueden variar sin previo aviso debido a fluctuaciones del tipo de cambio o disponibilidad de stock.
        </Section>

        <Section title="5. Proceso de compra y disponibilidad">
          La publicación de un producto en la plataforma no garantiza su disponibilidad inmediata. En caso de que un producto no esté disponible tras la confirmación del pago, Fast-IT se compromete a contactar al cliente para ofrecer alternativas o proceder con la devolución íntegra del pago.
        </Section>

        <Section title="6. Envíos y despacho">
          Los envíos son realizados a través de Chilexpress u otros operadores logísticos según disponibilidad. Los plazos de entrega son estimativos y pueden verse afectados por factores externos como huelgas, condiciones climáticas o retrasos del proveedor. Fast-IT no se responsabiliza por demoras ocasionadas por terceros.
        </Section>

        <Section title="7. Devoluciones y garantías">
          Los productos están sujetos a la garantía del fabricante. Para solicitar una devolución o cambio, el cliente debe contactar a soporte dentro de los 10 días hábiles posteriores a la recepción del producto. El producto debe estar en su embalaje original y sin señales de uso.
        </Section>

        <Section title="8. Limitación de responsabilidad">
          Fast-IT no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de usar el servicio. En ningún caso la responsabilidad de Fast-IT superará el monto pagado por el cliente en la transacción en cuestión.
        </Section>

        <Section title="9. Propiedad intelectual">
          Todo el contenido de la plataforma (textos, imágenes, logotipos, código fuente) es propiedad de Fast-IT o sus licenciantes y está protegido por las leyes de propiedad intelectual chilenas e internacionales. Queda prohibida su reproducción sin autorización expresa.
        </Section>

        <Section title="10. Modificaciones">
          Fast-IT se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización. El uso continuado de la plataforma tras la publicación de cambios implica su aceptación.
        </Section>

        <Section title="11. Ley aplicable y jurisdicción">
          Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa será sometida a los tribunales ordinarios de justicia de la ciudad de Santiago de Chile.
        </Section>

        <div className="pt-4 border-t border-[#e2e8f0] dark:border-white/[0.07] text-xs text-[#94a3b8] dark:text-white/25">
          ¿Tienes preguntas? <Link to="/contact" className="text-[#1e40af] dark:text-blue-400 hover:underline">Contáctanos</Link>.
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-[#0f172a] dark:text-white text-base">{title}</h2>
      <p>{children}</p>
    </div>
  )
}
