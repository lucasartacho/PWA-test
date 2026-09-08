from django.core import signing

TOKEN_SALT = "agricultor-auth"
TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 dias


def gerar_token(cpf):
    return signing.dumps({"cpf": cpf}, salt=TOKEN_SALT)


def verificar_token(token):
    data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    return data["cpf"]
