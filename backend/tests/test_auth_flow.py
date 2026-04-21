import os
import unittest
from pathlib import Path


TEST_DATABASE_PATH = Path(__file__).resolve().parent / "test_auth.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DATABASE_PATH.as_posix()}"
os.environ["DATABASE_SSL_MODE"] = "prefer"
os.environ["SECRET_KEY"] = "test-secret-key"

from fastapi.security import HTTPAuthorizationCredentials

from app.database import Base, engine
from app.dependencies import get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.auth_service import AuthService


class AuthFlowTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        from app.database import SessionLocal

        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def register_user(self, email: str = "learner@example.com"):
        service = AuthService(self.db)
        return service.register(
            RegisterRequest(
                email=email,
                password="Password1!",
                full_name="SpeakFlo Learner",
            )
        )

    def test_register_login_and_protected_me_flow(self):
        register_response = self.register_user()
        self.assertEqual(register_response.user.email, "learner@example.com")
        self.assertTrue(register_response.tokens.access_token)
        self.assertTrue(register_response.tokens.refresh_token)

        service = AuthService(self.db)
        login_response = service.login(
            LoginRequest(
                email="learner@example.com",
                password="Password1!",
            )
        )
        access_token = login_response.tokens.access_token
        refresh_token = login_response.tokens.refresh_token

        current_user = get_current_user(
            credentials=HTTPAuthorizationCredentials(
                scheme="Bearer",
                credentials=access_token,
            ),
            db=self.db,
        )
        self.assertEqual(current_user.full_name, "SpeakFlo Learner")

        refresh_response = service.refresh_token(refresh_token)
        self.assertTrue(refresh_response["access_token"])

    def test_login_rejects_bad_password(self):
        self.register_user(email="wrongpass@example.com")

        service = AuthService(self.db)
        with self.assertRaises(Exception) as context:
            service.login(
                LoginRequest(
                    email="wrongpass@example.com",
                    password="WrongPassword1!",
                )
            )

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail, "Invalid email or password")


if __name__ == "__main__":
    unittest.main()
