# Faturix - Gestão e Faturação para Carpintarias

O **Faturix** é uma plataforma de gestão e emissão de documentos (faturas e guias) desenvolvida especificamente para as necessidades de pequenas empresas. O projeto foca-se na simplicidade de utilização, segurança de dados e organização documental.

## Funcionalidades Principais
- **Autenticação Segura (MFA):** Login protegido com verificação de código via e-mail (SendGrid).
- **Gestão de Clientes e Artigos:** Base de dados centralizada para rápida consulta e inserção.
- **Emissão de Documentos:** Geração dinâmica de Faturas e Guias em formato PDF.
- **Isolamento de Dados:** Cada utilizador apenas acede aos seus próprios registos.
- **Interface Desktop-First:** Otimizada para ambiente de escritório e gestão administrativa.

## 🛠️ Tecnologias Utilizadas
- **Backend:** (Python)
- **Base de Dados:** (Alojado em [Neon](https://neon.tech/))
- **Frontend:** HTML5, CSS3, JS 
- **Deployment:** [Render](https://render.com/)
- **Segurança & DNS:** [Cloudflare](https://www.cloudflare.com/)
- **Envio de E-mail:** [Twilio SendGrid](https://sendgrid.com/)

## 💻 Instalação e Execução Local

1. **Clonar o repositório:**
   ```bash
   git clone [https://github.com/Rodrigosbessa/faturix.git](https://github.com/Rodrigosbessa/faturix.git)