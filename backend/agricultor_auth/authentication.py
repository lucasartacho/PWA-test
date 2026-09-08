from rest_framework import authentication, exceptions

from .tokens import verificar_token


class AgricultorIdentity:
    def __init__(self, cpf):
        self.cpf = cpf
        self.is_authenticated = True


class AgricultorTokenAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = request.headers.get("Authorization")
        if not header or not header.startswith(f"{self.keyword} "):
            return None
        token = header[len(self.keyword) + 1 :]
        try:
            cpf = verificar_token(token)
        except Exception as exc:
            raise exceptions.AuthenticationFailed("Token inválido ou expirado") from exc
        return (AgricultorIdentity(cpf), None)

    def authenticate_header(self, request):
        return self.keyword
