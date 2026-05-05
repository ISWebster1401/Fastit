"""
Servicio de email vía SendGrid.
Si SENDGRID_API_KEY no está configurada, imprime el link en consola (útil para desarrollo).
"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html: str) -> bool:
    if not settings.SENDGRID_API_KEY:
        logger.warning("[EMAIL — sin SendGrid] Para: %s | Asunto: %s", to_email, subject)
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


def send_welcome_email(to_email: str, name: str) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0f172a;">¡Bienvenido a Fast-IT, {name}!</h2>
      <p style="color:#334155;">Tu cuenta está activa. Ahora puedes acceder al catálogo de hardware crítico B2B de NADILOP.</p>
      <p style="color:#64748b;font-size:13px;">Fast-IT</p>
    </div>
    """
    _send(to_email, "¡Bienvenido a Fast-IT!", html)
