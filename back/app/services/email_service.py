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
        <div style="display:inline-block;background:#1e40af;color:#fff;font-weight:700;font-size:18px;
                    width:40px;height:40px;line-height:40px;border-radius:10px;margin-bottom:12px;">F</div>
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
        <div style="display:inline-block;background:#1e40af;color:#fff;font-weight:700;font-size:18px;
                    width:40px;height:40px;line-height:40px;border-radius:10px;margin-bottom:12px;">F</div>
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


def send_welcome_email(to_email: str, name: str) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0f172a;">¡Bienvenido a Fast-IT, {name}!</h2>
      <p style="color:#334155;">Tu correo ya está verificado y tu cuenta está activa. Puedes acceder al catálogo de hardware crítico, armar pedidos y usar el asesor técnico.</p>
      <p style="color:#64748b;font-size:13px;">Fast-IT</p>
    </div>
    """
    _send(to_email, "¡Bienvenido a Fast-IT!", html)
