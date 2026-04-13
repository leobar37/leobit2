# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e7]
      - generic [ref=e14]:
        - heading "Iniciar sesión" [level=1] [ref=e15]
        - paragraph [ref=e16]: Ingresa tus credenciales para continuar
    - generic [ref=e18]:
      - alert [ref=e19]:
        - generic [ref=e20]: Correo electrónico o contraseña inválidos
      - generic [ref=e21]:
        - generic [ref=e22]: Correo electrónico
        - textbox "Correo electrónico" [ref=e23]:
          - /placeholder: tu@email.com
          - text: demo@avileo.com
      - generic [ref=e24]:
        - generic [ref=e25]: Contraseña
        - generic [ref=e26]:
          - textbox "Tu contraseña" [ref=e27]: demo123456
          - button "Mostrar contraseña" [ref=e28]:
            - img
      - generic [ref=e29]:
        - generic [ref=e30]:
          - checkbox "Mantener sesión" [ref=e31]
          - checkbox
          - generic [ref=e32] [cursor=pointer]: Mantener sesión
        - link "¿Olvidaste tu contraseña?" [ref=e33] [cursor=pointer]:
          - /url: /forgot-password
      - button "Iniciar sesión" [ref=e34]
    - generic [ref=e35]:
      - text: ¿No tienes cuenta?
      - link "Crear cuenta" [ref=e36] [cursor=pointer]:
        - /url: /register
  - button "🔧" [ref=e38]:
    - generic [ref=e39]: 🔧
  - region "Notifications alt+T"
```