"""
Servicio de email vía SendGrid.
Si SENDGRID_API_KEY no está configurada, imprime el link en consola (útil para desarrollo).
"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html: str) -> bool:
    """
    Envío vía SendGrid. Requiere SENDGRID_API_KEY y SENDGRID_FROM_EMAIL en el entorno
    (p. ej. variables en Render). Verificación de correo y recuperación de contraseña usan este método.
    """
    if not settings.SENDGRID_API_KEY:
        logger.warning(
            "[EMAIL — sin SendGrid] Para: %s | Asunto: %s "
            "(configura SENDGRID_API_KEY en Render para envío real)",
            to_email,
            subject,
        )
        return False
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        msg = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html,
        )
        SendGridAPIClient(settings.SENDGRID_API_KEY).send(msg)
        logger.info("[SendGrid] Correo enviado OK → %s | %s", to_email, subject)
        return True
    except Exception:
        logger.exception("Error enviando email a %s", to_email)
        return False


def send_verification_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    logger.info("[VERIFICACIÓN] %s → %s", to_email, link)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
      <div style="text-align:center;margin-bottom:28px;">
        <img src="{settings.FRONTEND_URL}/logo.png" alt="Fast-IT" style="height:48px;width:auto;margin-bottom:12px;" />
        <h1 style="margin:0;font-size:22px;color:#0f172a;">Verifica tu correo</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Fast-IT</p>
      </div>

      <p style="color:#334155;font-size:15px;line-height:1.6;">
        Hola, gracias por registrarte. Haz clic en el botón para activar tu cuenta:
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="{link}"
           style="background:#1e40af;color:#fff;padding:13px 32px;border-radius:999px;
                  font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
          Verificar correo
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;">
        Si no creaste esta cuenta, ignora este mensaje.<br>
        Este enlace expira en 24 horas.
      </p>
    </div>
    """
    _send(to_email, "Verifica tu correo en Fast-IT", html)


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    logger.info("[RESET PASSWORD] %s → %s", to_email, link)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
      <div style="text-align:center;margin-bottom:28px;">
        <img src="{settings.FRONTEND_URL}/logo.png" alt="Fast-IT" style="height:48px;width:auto;margin-bottom:12px;" />
        <h1 style="margin:0;font-size:22px;color:#0f172a;">Restablece tu contraseña</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Fast-IT</p>
      </div>

      <p style="color:#334155;font-size:15px;line-height:1.6;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        Haz clic en el botón para crear una nueva contraseña:
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="{link}"
           style="background:#1e40af;color:#fff;padding:13px 32px;border-radius:999px;
                  font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
          Restablecer contraseña
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;">
        Si no solicitaste este cambio, ignora este mensaje.<br>
        Este enlace expira en 1 hora.
      </p>
    </div>
    """
    _send(to_email, "Restablece tu contraseña en Fast-IT", html)


ORDER_STATUS_CONTENT = {
    "Pending": (
        "Recibimos tu orden #{order_id}",
        "Tu orden fue registrada. Una vez confirmado el pago, la despachamos al proveedor.",
    ),
    "Supplier_Ordered": (
        "Tu orden #{order_id} fue confirmada",
        "Tu pago se procesó correctamente y ya pedimos tu equipo al proveedor.",
    ),
    "In_Transit_to_Nadilop": (
        "Tu orden #{order_id} está en tránsito",
        "Tu equipo viene en camino a nuestra bodega antes de despacharlo hacia ti.",
    ),
    "Ready_to_Ship": (
        "Tu orden #{order_id} está lista para despacho",
        "Tu equipo ya está embalado y listo para salir hacia tu dirección.",
    ),
    "Shipped": (
        "Tu orden #{order_id} fue despachada",
        "Tu equipo ya está en camino contigo.",
    ),
    "Delivered": (
        "Tu orden #{order_id} fue entregada",
        "Tu equipo llegó a destino. Gracias por comprar en Fast-IT.",
    ),
}


def send_order_status_email(to_email: str, order_id: int, status: str, total_amount: float) -> bool:
    """
    Notifica al cliente un cambio de estado de su orden. No lanza excepciones:
    si SendGrid falla o no está configurado, solo lo deja en el log — nunca debe
    interrumpir el flujo de checkout/pago/admin que la dispara.
    """
    if not to_email:
        return False
    subject_tpl, body = ORDER_STATUS_CONTENT.get(status, (f"Actualización de tu orden #{{order_id}}", f"Tu orden cambió de estado a {status}."))
    subject = subject_tpl.format(order_id=order_id)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
      <div style="text-align:center;margin-bottom:28px;">
        <img src="{settings.FRONTEND_URL}/logo.png" alt="Fast-IT" style="height:48px;width:auto;margin-bottom:12px;" />
        <h1 style="margin:0;font-size:22px;color:#0f172a;">{subject}</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Fast-IT</p>
      </div>

      <p style="color:#334155;font-size:15px;line-height:1.6;">{body}</p>

      <table style="width:100%;margin:24px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;">Orden</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;text-align:right;font-weight:600;">#{order_id}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;">Total</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;text-align:right;font-weight:600;">${total_amount:,.0f} CLP</td>
        </tr>
      </table>

      <div style="text-align:center;margin:28px 0;">
        <a href="{settings.FRONTEND_URL}/orders/{order_id}"
           style="background:#1e40af;color:#fff;padding:13px 32px;border-radius:999px;
                  font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
          Ver mi orden
        </a>
      </div>
    </div>
    """
    return _send(to_email, subject, html)


def send_quote_request_email(to_email: str, order_id: int, total_amount: float) -> None:
    """Confirmación al cliente de que su solicitud de cotización fue recibida."""
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
      <div style="text-align:center;margin-bottom:28px;">
        <img src="{settings.FRONTEND_URL}/logo.png" alt="Fast-IT" style="height:48px;width:auto;margin-bottom:12px;" />
        <h1 style="margin:0;font-size:22px;color:#0f172a;">Recibimos tu solicitud de cotización</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:14px;">Fast-IT</p>
      </div>

      <p style="color:#334155;font-size:15px;line-height:1.6;">
        Gracias por tu interés. Nuestro equipo técnico va a revisar tu solicitud
        (referencia #{order_id}) y te va a contactar a la brevedad para confirmar
        disponibilidad, precio final y condiciones de despacho.
      </p>

      <table style="width:100%;margin:24px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;">Referencia</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;text-align:right;font-weight:600;">#{order_id}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;">Total estimado</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;text-align:right;font-weight:600;">${total_amount:,.0f} CLP</td>
        </tr>
      </table>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;">
        Este es un valor estimado; el precio final puede variar según disponibilidad del proveedor.
      </p>
    </div>
    """
    _send(to_email, f"Recibimos tu solicitud de cotización #{order_id}", html)

    if settings.SALES_NOTIFICATION_EMAIL:
        internal_html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;">Nueva solicitud de cotización #{order_id}</h2>
          <p style="color:#334155;">Cliente: {to_email}</p>
          <p style="color:#334155;">Total estimado: ${total_amount:,.0f} CLP</p>
          <p style="color:#64748b;font-size:13px;">Revisar en el panel de administración.</p>
        </div>
        """
        _send(settings.SALES_NOTIFICATION_EMAIL, f"[RFQ] Nueva cotización #{order_id}", internal_html)


def send_welcome_email(to_email: str, name: str) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0f172a;">¡Bienvenido a Fast-IT, {name}!</h2>
      <p style="color:#334155;">Tu correo ya está verificado y tu cuenta está activa. Puedes acceder al catálogo de hardware crítico, armar pedidos y usar el asesor técnico.</p>
      <p style="color:#64748b;font-size:13px;">Fast-IT</p>
    </div>
    """
    _send(to_email, "¡Bienvenido a Fast-IT!", html)
