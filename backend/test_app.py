import pytest
from backend.app import create_app
from backend.extensions import db
from backend.models import Material, ManoObra

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"
    })

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_material_creation(app):
    with app.app_context():
        m = Material(nombre="Cemento", unidad="kg", precio_unitario=5.0)
        db.session.add(m)
        db.session.commit()

        assert m.id is not None
        assert m.nombre == "Cemento"

def test_mano_obra_fasar(app):
    with app.app_context():
        mo = ManoObra(puesto="Albañil", salario_base=500.0)
        mo.refresh_fasar()
        db.session.add(mo)
        db.session.commit()

        assert mo.fasar > 1.0
        assert mo.id is not None
