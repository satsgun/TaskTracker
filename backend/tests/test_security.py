class TestHashPassword:
    def test_hash_password_returns_different_string_than_input(self):
        from app.security import hash_password

        hashed = hash_password("super-secret")

        assert hashed != "super-secret"

    def test_hash_password_returns_a_non_empty_string(self):
        from app.security import hash_password

        hashed = hash_password("super-secret")

        assert isinstance(hashed, str)
        assert hashed != ""


class TestVerifyPassword:
    def test_verify_password_succeeds_for_correct_password(self):
        from app.security import hash_password, verify_password

        hashed = hash_password("super-secret")

        assert verify_password("super-secret", hashed) is True

    def test_verify_password_fails_for_incorrect_password(self):
        from app.security import hash_password, verify_password

        hashed = hash_password("super-secret")

        assert verify_password("wrong-password", hashed) is False


class TestGenerateSessionToken:
    def test_generate_session_token_returns_a_non_empty_string(self):
        from app.security import generate_session_token

        token = generate_session_token()

        assert isinstance(token, str)
        assert token != ""

    def test_generate_session_token_returns_unique_values_each_call(self):
        from app.security import generate_session_token

        first = generate_session_token()
        second = generate_session_token()

        assert first != second
