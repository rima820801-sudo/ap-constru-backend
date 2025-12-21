import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_admin_notification(tipo, mensaje, username):
    """
    Envía un correo electrónico al administrador informando sobre nuevo feedback.
    """
    admin_email = "sarsjs@gmail.com"
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")

    if not smtp_user or not smtp_pass:
        print("Aviso: Configuración de correo incompleta (SMTP_USER/SMTP_PASS faltantes). No se envió el correo.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = admin_email
        msg['Subject'] = f"APU Builder IA: Nuevo {tipo.upper()} de {username}"

        body = f"""
        Hola Administrador,
        
        Se ha recibido una nueva interacción en la plataforma:
        
        Usuario: {username}
        Tipo: {tipo}
        Mensaje: 
        ------------------------------------------
        {mensaje}
        ------------------------------------------
        
        Por favor ingresa al panel administrativo para gestionar esta solicitud.
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error enviando correo: {e}")
        return False
